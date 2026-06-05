import { generateModels, IModels } from "./connectionResolver";
import { sendCoreMessage } from "./messageBroker";

export type AdminPageSyncEvent = "created" | "updated" | "moved";

const DEAL_FIELD_NAMES = [
  "관심모듈",
  "진행",
  "데모생성",
  "견적",
  "미팅",
  "비고",
] as const;

type DealFieldName = (typeof DEAL_FIELD_NAMES)[number];

interface AdminPageDealPayload {
  직전소통일: string;
  안내자: string;
  관심모듈: string;
  진행: string;
  데모생성: string;
  견적: string;
  미팅: string;
  비고: string;
}

interface AdminPageSyncPayload {
  event: AdminPageSyncEvent;
  dealId: string;
  stageId: string;
  stageName: string;
  pipelineId: string;
  deal: AdminPageDealPayload;
  modifiedAt: string;
}

function getCustomFieldValue(customFieldsData: any[] | undefined, fieldId: string): string {
  if (!customFieldsData?.length) return "";
  const entry = customFieldsData.find((d: any) => d.field === fieldId);
  if (!entry?.value) return "";
  if (Array.isArray(entry.value)) return entry.value.join(", ");
  return String(entry.value);
}

async function resolveAssignedUserNames(
  subdomain: string,
  assignedUserIds: string[]
): Promise<string> {
  if (!assignedUserIds?.length) return "";

  try {
    const users = await sendCoreMessage({
      subdomain,
      action: "users.find",
      data: {
        query: { _id: { $in: assignedUserIds } },
        fields: { _id: 1, details: 1, email: 1, username: 1 },
        limit: assignedUserIds.length,
      },
      isRPC: true,
      defaultValue: [],
    });

    return (Array.isArray(users) ? users : [])
      .map((u: any) => u.details?.fullName || u.email || u.username || "")
      .filter(Boolean)
      .join(", ");
  } catch (_e) {
    return "";
  }
}

async function resolveLastContactDate(
  subdomain: string,
  customerIds: string[]
): Promise<string> {
  if (!customerIds?.length) return "";

  try {
    const groups = await sendCoreMessage({
      subdomain,
      action: "fieldsGroups.find",
      data: { query: { contentType: "core:customer" } },
      isRPC: true,
      defaultValue: [],
    });

    let lastContactDateFieldId: string | null = null;

    for (const group of Array.isArray(groups) ? groups : []) {
      const fields = await sendCoreMessage({
        subdomain,
        action: "fields.find",
        data: { query: { groupId: group._id } },
        isRPC: true,
        defaultValue: [],
      });
      for (const f of Array.isArray(fields) ? fields : []) {
        const name = ((f.text || f.name) || "").trim();
        if (name === "직전소통일" || name === "직전 소통일") {
          lastContactDateFieldId = f._id;
          break;
        }
      }
      if (lastContactDateFieldId) break;
    }

    if (!lastContactDateFieldId) return "";

    const customers = await sendCoreMessage({
      subdomain,
      action: "customers.find",
      data: { _id: { $in: customerIds } },
      isRPC: true,
      defaultValue: [],
    });

    const firstCustomer = Array.isArray(customers) ? customers[0] : null;
    if (!firstCustomer?.customFieldsData?.length) return "";

    const entry = firstCustomer.customFieldsData.find(
      (d: any) => d.field === lastContactDateFieldId
    );
    if (!entry?.value) return "";
    return String(entry.value);
  } catch (_e) {
    return "";
  }
}

async function resolveDealFieldIds(
  subdomain: string,
  pipelineId: string
): Promise<Record<DealFieldName, string | null>> {
  const result: Record<DealFieldName, string | null> = {
    관심모듈: null,
    진행: null,
    데모생성: null,
    견적: null,
    미팅: null,
    비고: null,
  };

  try {
    const groups = await sendCoreMessage({
      subdomain,
      action: "fieldsGroups.find",
      data: {
        query: {
          contentType: "sales:deal",
          $or: [
            { "config.pipelineIds": { $in: [pipelineId] } },
            { "config.pipelineIds": { $size: 0 } },
            { "config.boardsPipelines.pipelineIds": { $in: [pipelineId] } },
          ],
        },
      },
      isRPC: true,
      defaultValue: [],
    });

    for (const group of Array.isArray(groups) ? groups : []) {
      const fields = await sendCoreMessage({
        subdomain,
        action: "fields.find",
        data: { query: { groupId: group._id } },
        isRPC: true,
        defaultValue: [],
      });

      for (const f of Array.isArray(fields) ? fields : []) {
        const name = ((f.text || f.name) || "").trim() as DealFieldName;
        if (DEAL_FIELD_NAMES.includes(name) && !result[name]) {
          result[name] = f._id;
        }
      }
    }
  } catch (_e) {
    // 필드 조회 실패 시 빈 결과 반환
  }

  return result;
}

async function buildAdminPagePayload(
  subdomain: string,
  deal: any,
  event: AdminPageSyncEvent,
  pipelineId: string,
  stageName: string
): Promise<AdminPageSyncPayload> {
  const [assignedUserNames, lastContactDate, dealFieldIds] = await Promise.all([
    resolveAssignedUserNames(subdomain, deal.assignedUserIds || []),
    resolveLastContactDate(subdomain, deal.customerIds || []),
    resolveDealFieldIds(subdomain, pipelineId),
  ]);

  const customFieldsData: any[] = Array.isArray(deal.customFieldsData)
    ? deal.customFieldsData
    : [];

  const dealPayload: AdminPageDealPayload = {
    직전소통일: lastContactDate,
    안내자: assignedUserNames,
    관심모듈: dealFieldIds.관심모듈
      ? getCustomFieldValue(customFieldsData, dealFieldIds.관심모듈)
      : "",
    진행: dealFieldIds.진행
      ? getCustomFieldValue(customFieldsData, dealFieldIds.진행)
      : "",
    데모생성: dealFieldIds.데모생성
      ? getCustomFieldValue(customFieldsData, dealFieldIds.데모생성)
      : "",
    견적: dealFieldIds.견적
      ? getCustomFieldValue(customFieldsData, dealFieldIds.견적)
      : "",
    미팅: dealFieldIds.미팅
      ? getCustomFieldValue(customFieldsData, dealFieldIds.미팅)
      : "",
    비고: dealFieldIds.비고
      ? getCustomFieldValue(customFieldsData, dealFieldIds.비고)
      : "",
  };

  return {
    event,
    dealId: String(deal._id),
    stageId: String(deal.stageId || ""),
    stageName,
    pipelineId,
    deal: dealPayload,
    modifiedAt: deal.modifiedAt
      ? new Date(deal.modifiedAt).toISOString()
      : new Date().toISOString(),
  };
}

export async function syncDealToAdminPage(
  models: IModels,
  subdomain: string,
  deal: any,
  event: AdminPageSyncEvent
): Promise<void> {
  const stage = await models.Stages.findOne({ _id: deal.stageId }).lean() as any;
  const pipelineId: string = stage?.pipelineId || "";

  if (!pipelineId) return;

  const pipeline = await models.Pipelines.findOne({ _id: pipelineId }).lean() as any;
  if (!pipeline) return;

  const adminPageEnabled: boolean = pipeline.adminPageEnabled ?? false;
  if (!adminPageEnabled) return;

  const adminPageUrl: string = (pipeline.adminPageUrl || "").trim();
  const adminPageSecret: string = (pipeline.adminPageSecret || "").trim();

  if (!adminPageUrl) return;

  const stageName: string = stage?.name || "";
  const payload = await buildAdminPagePayload(subdomain, deal, event, pipelineId, stageName);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${adminPageUrl}/deals/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminPageSecret ? { "X-ADMIN-SECRET": adminPageSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.text().catch(() => undefined);
    }
  } catch (_error) {
    // 백그라운드 처리 - 에러 무시
  } finally {
    clearTimeout(timeoutId);
  }
}

export function triggerAdminPageSyncIfConfigured(
  models: IModels,
  subdomain: string,
  dealId: string,
  event: AdminPageSyncEvent
): void {
  const delayMs = 800;

  setTimeout(async () => {
    try {
      const freshModels = await generateModels(subdomain);
      const deal = await freshModels.Deals.findOne({ _id: dealId }).lean();
      if (!deal) return;

      await syncDealToAdminPage(freshModels, subdomain, deal, event);
    } catch (_e) {
      // 백그라운드 처리 - 에러 무시
    }
  }, delayMs);
}
