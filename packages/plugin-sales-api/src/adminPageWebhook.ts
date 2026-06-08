import { IModels } from "./connectionResolver";
import { sendCoreMessage, sendCommonMessage } from "./messageBroker";
import { isEnabled } from "@erxes/api-utils/src/serviceDiscovery";
import {
  getCustomFieldValue,
  resolveAssignedUserNames,
  resolveDealFieldIds,
  resolveLastContactDate,
} from "./adminPageUtils";

export interface AdminWebhookResult {
  success: boolean;
  updatedFields?: string[];
  deal?: {
    직전소통일: string;
    안내자: string;
    관심모듈: string;
    진행: string;
    데모생성: string;
    견적: string;
    미팅: string;
    비고: string;
  };
  error?: "UNAUTHORIZED" | "DEAL_NOT_FOUND";
  statusCode?: number;
}

async function applyAssignedUsersUpdate(
  models: IModels,
  subdomain: string,
  deal: any,
  newValue: string
): Promise<void> {
  const users = await sendCoreMessage({
    subdomain,
    action: "users.find",
    data: {
      query: {},
      fields: { _id: 1, details: 1, email: 1, username: 1 },
      limit: 500,
    },
    isRPC: true,
    defaultValue: [],
  });

  const names = newValue.split(",").map((n) => n.trim()).filter(Boolean);
  const matchedIds = (Array.isArray(users) ? users : [])
    .filter((u: any) => {
      const full = u.details?.fullName || u.email || u.username || "";
      return names.some((n) => full.includes(n) || n.includes(full));
    })
    .map((u: any) => u._id);

  await models.Deals.updateOne(
    { _id: deal._id },
    { $set: { assignedUserIds: matchedIds, modifiedAt: new Date() } }
  );
}

async function applyLastContactDateUpdate(
  subdomain: string,
  deal: any,
  newValue: string
): Promise<void> {
  const customerIds: string[] = deal.customerIds || [];
  if (!customerIds.length) return;

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

  if (!lastContactDateFieldId) return;

  await sendCoreMessage({
    subdomain,
    action: "contacts:customers.updateCustomer",
    data: {
      _id: customerIds[0],
      doc: {
        customFieldsData: [{ field: lastContactDateFieldId, value: newValue }],
      },
    },
    isRPC: true,
    defaultValue: null,
  });
}

async function applyDealCustomFieldUpdate(
  models: IModels,
  subdomain: string,
  deal: any,
  pipelineId: string,
  fieldName: string,
  newValue: string
): Promise<boolean> {
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
    const matched = (Array.isArray(fields) ? fields : []).find(
      (f: any) => ((f.text || f.name) || "").trim() === fieldName
    );
    if (matched) {
      const existing: any[] = Array.isArray(deal.customFieldsData) ? deal.customFieldsData : [];
      const updated = existing.filter((d: any) => d.field !== matched._id);
      updated.push({ field: matched._id, value: newValue, stringValue: newValue });
      await models.Deals.updateOne(
        { _id: deal._id },
        { $set: { customFieldsData: updated, modifiedAt: new Date() } }
      );
      return true;
    }
  }

  return false;
}

async function buildDealPayload(
  models: IModels,
  subdomain: string,
  dealId: string,
  pipelineId: string
): Promise<AdminWebhookResult["deal"]> {
  const freshDeal = await models.Deals.findOne({ _id: dealId }).lean() as any;

  const [assignedUserNames, lastContactDate, dealFieldIds] = await Promise.all([
    resolveAssignedUserNames(subdomain, freshDeal?.assignedUserIds || []),
    resolveLastContactDate(subdomain, freshDeal?.customerIds || []),
    resolveDealFieldIds(subdomain, pipelineId),
  ]);

  const customFieldsData: any[] = Array.isArray(freshDeal?.customFieldsData)
    ? freshDeal.customFieldsData
    : [];

  return {
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
}

export interface AdminSendMailResult {
  success: boolean;
  error?: "UNAUTHORIZED" | "DEAL_NOT_FOUND";
  statusCode?: number;
}

async function verifyAdminSecret(
  models: IModels,
  dealId: string,
  secret: string
): Promise<{ ok: true; deal: any; pipelineId: string } | { ok: false; statusCode: 401 | 404 }> {
  const deal = await models.Deals.findOne({ _id: dealId }).lean() as any;
  if (!deal) {
    return { ok: false, statusCode: 404 };
  }

  const stage = await models.Stages.findOne({ _id: deal.stageId }).lean() as any;
  const pipelineId: string = stage?.pipelineId || "";

  const pipeline = pipelineId
    ? (await models.Pipelines.findOne({ _id: pipelineId }).lean() as any)
    : null;

  const adminPageSecret: string = (pipeline?.adminPageSecret || "").trim();
  if (!adminPageSecret || secret !== adminPageSecret) {
    return { ok: false, statusCode: 401 };
  }

  return { ok: true, deal, pipelineId };
}

export async function handleAdminDealSendMail(
  models: IModels,
  subdomain: string,
  secret: string,
  dealId: string
): Promise<AdminSendMailResult> {
  const verification = await verifyAdminSecret(models, dealId, secret);
  if (!verification.ok) {
    const errorType = verification.statusCode === 404 ? "DEAL_NOT_FOUND" : "UNAUTHORIZED";
    return { success: false, error: errorType, statusCode: verification.statusCode };
  }

  const { deal } = verification;

  const isAutomationsAvailable = await isEnabled("automations");
  if (isAutomationsAvailable) {
    sendCommonMessage({
      serviceName: "automations",
      subdomain,
      action: "trigger",
      data: {
        type: "sales:deal.manualMail",
        targets: [deal],
      },
      isRPC: false,
    }).catch(() => {
      /* fire-and-forget: 실패 무시 */
    });
  }

  return { success: true };
}

export async function handleAdminPageWebhook(
  models: IModels,
  subdomain: string,
  secret: string,
  dealId: string,
  changes: Record<string, string>
): Promise<AdminWebhookResult> {
  const verification = await verifyAdminSecret(models, dealId, secret);
  if (!verification.ok) {
    const errorType = verification.statusCode === 404 ? "DEAL_NOT_FOUND" : "UNAUTHORIZED";
    return { success: false, error: errorType, statusCode: verification.statusCode };
  }

  const { deal, pipelineId } = verification;

  const updatedFields: string[] = [];

  for (const [fieldName, newValue] of Object.entries(changes)) {
    try {
      if (fieldName === "안내자") {
        await applyAssignedUsersUpdate(models, subdomain, deal, newValue);
        updatedFields.push(fieldName);
        continue;
      }

      if (fieldName === "직전소통일") {
        await applyLastContactDateUpdate(subdomain, deal, newValue);
        updatedFields.push(fieldName);
        continue;
      }

      const updated = await applyDealCustomFieldUpdate(
        models,
        subdomain,
        deal,
        pipelineId,
        fieldName,
        newValue
      );
      if (updated) {
        updatedFields.push(fieldName);
      }
    } catch (_e) {
      // 개별 필드 업데이트 실패 시 건너뜀
    }
  }

  const dealPayload = await buildDealPayload(models, subdomain, String(deal._id), pipelineId);

  return {
    success: true,
    updatedFields,
    deal: dealPayload,
  };
}
