import { generateModels, IModels } from "./connectionResolver";
import {
  AdminPageDealPayload,
  getCustomFieldValue,
  resolveAssignedUserNames,
  resolveDealFieldIds,
  resolveLastContactDate,
} from "./adminPageUtils";

export type AdminPageSyncEvent = "created" | "updated" | "moved";

interface AdminPageSyncPayload {
  event: AdminPageSyncEvent;
  dealId: string;
  stageId: string;
  stageName: string;
  pipelineId: string;
  deal: AdminPageDealPayload;
  modifiedAt: string;
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
