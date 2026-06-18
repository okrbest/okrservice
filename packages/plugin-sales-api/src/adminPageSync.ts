import { generateModels, IModels } from "./connectionResolver";
import {
  AdminPageDealPayload,
  getCustomFieldValue,
  resolveAssignedUserNames,
  resolveCustomerInfo,
  resolveDealFieldIds,
  resolveLastContactDate,
} from "./adminPageUtils";

export type AdminPageSyncEvent = "upsert" | "delete";

interface AdminPageUpsertPayload {
  event: "upsert";
  dealId: string;
  mailStatus: string;
  mailSentAt: string;
  deal: AdminPageDealPayload;
}

interface AdminPageDeletePayload {
  event: "delete";
  dealId: string;
}

type AdminPageWebPushPayload = AdminPageUpsertPayload | AdminPageDeletePayload;

export async function buildAdminPageUpsertPayload(
  subdomain: string,
  deal: any,
  pipelineId: string,
): Promise<AdminPageUpsertPayload> {
  const [assignedUserNames, lastContactDateFromCustomer, dealFieldIds, customerInfo] = await Promise.all([
    resolveAssignedUserNames(subdomain, deal.assignedUserIds || []),
    resolveLastContactDate(subdomain, deal.customerIds || []),
    resolveDealFieldIds(subdomain, pipelineId),
    resolveCustomerInfo(subdomain, deal),
  ]);

  // extraData에 저장된 값과 고객 커스텀 필드 값 중 더 최신값 사용
  const lastContactDate = deal.extraData?.lastContactAt || lastContactDateFromCustomer;

  const customFieldsData: any[] = Array.isArray(deal.customFieldsData)
    ? deal.customFieldsData
    : [];

  const attachments: string[] = (Array.isArray(deal.attachments) ? deal.attachments : [])
    .map((a: any) => (typeof a === "string" ? a : a?.url || ""))
    .filter(Boolean);

  return {
    event: "upsert",
    dealId: String(deal._id),
    mailStatus: deal.extraData?.mailStatus || "미발송",
    mailSentAt: deal.extraData?.mailSentAt || "",
    deal: {
      // 고객 정보
      회사명: customerInfo.회사명,
      담당자: customerInfo.담당자,
      연락처: customerInfo.연락처,
      이메일: customerInfo.이메일,
      // 문의 내용
      제목: deal.name || "",
      내용: deal.description || "",
      첨부파일: attachments,
      // 영업 필드
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
      직원규모: dealFieldIds.직원규모
        ? getCustomFieldValue(customFieldsData, dealFieldIds.직원규모)
        : (deal.extraData?.adminPageCustomer?.직원규모 || ""),
      유입경로: dealFieldIds.유입경로
        ? getCustomFieldValue(customFieldsData, dealFieldIds.유입경로)
        : (deal.extraData?.adminPageCustomer?.유입경로 || ""),
    },
  };
}

export interface SyncDealResult {
  ok: boolean;
  reason?: string;
}

async function sendWebPush(
  adminPageUrl: string,
  adminPageSecret: string,
  payload: AdminPageWebPushPayload,
): Promise<SyncDealResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${adminPageUrl}/deals/web-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminPageSecret ? { "X-ADMIN-SECRET": adminPageSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, reason: `HTTP ${response.status}${text ? `: ${text}` : ""}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getPipelineAdminConfig(
  models: IModels,
  deal: any,
): Promise<{ adminPageUrl: string; adminPageSecret: string; pipelineId: string } | null> {
  const stage = await models.Stages.findOne({ _id: deal.stageId }).lean() as any;
  const pipelineId: string = stage?.pipelineId || "";
  if (!pipelineId) return null;

  const pipeline = await models.Pipelines.findOne({ _id: pipelineId }).lean() as any;
  if (!pipeline) return null;

  const adminPageEnabled: boolean = pipeline.adminPageEnabled ?? false;
  if (!adminPageEnabled) return null;

  const adminPageUrl: string = (pipeline.adminPageUrl || "").trim();
  if (!adminPageUrl) return null;

  return {
    adminPageUrl,
    adminPageSecret: (pipeline.adminPageSecret || "").trim(),
    pipelineId,
  };
}

export async function syncDealToAdminPage(
  models: IModels,
  subdomain: string,
  deal: any,
): Promise<SyncDealResult> {
  const config = await getPipelineAdminConfig(models, deal);
  if (!config) return { ok: false, reason: "admin_page_not_configured" };

  const payload = await buildAdminPageUpsertPayload(subdomain, deal, config.pipelineId);
  return sendWebPush(config.adminPageUrl, config.adminPageSecret, payload);
}

export async function syncDealDeleteToAdminPage(
  models: IModels,
  dealId: string,
  pipelineId: string,
): Promise<SyncDealResult> {
  const pipeline = await models.Pipelines.findOne({ _id: pipelineId }).lean() as any;
  if (!pipeline) return { ok: false, reason: "pipeline_not_found" };

  const adminPageEnabled: boolean = pipeline.adminPageEnabled ?? false;
  if (!adminPageEnabled) return { ok: false, reason: "admin_page_not_configured" };

  const adminPageUrl: string = (pipeline.adminPageUrl || "").trim();
  if (!adminPageUrl) return { ok: false, reason: "admin_page_url_missing" };

  const adminPageSecret: string = (pipeline.adminPageSecret || "").trim();
  const payload: AdminPageDeletePayload = { event: "delete", dealId };
  return sendWebPush(adminPageUrl, adminPageSecret, payload);
}

export function triggerAdminPageSyncIfConfigured(
  models: IModels,
  subdomain: string,
  dealId: string,
): void {
  setTimeout(async () => {
    try {
      const freshModels = await generateModels(subdomain);
      const deal = await freshModels.Deals.findOne({ _id: dealId }).lean();
      if (!deal) return;

      await syncDealToAdminPage(freshModels, subdomain, deal);
    } catch (_e) {
      // 백그라운드 처리 - 에러 무시
    }
  }, 800);
}

export function triggerAdminPageDeleteSyncIfConfigured(
  subdomain: string,
  dealId: string,
  pipelineId: string,
): void {
  setTimeout(async () => {
    try {
      const freshModels = await generateModels(subdomain);
      await syncDealDeleteToAdminPage(freshModels, dealId, pipelineId);
    } catch (_e) {
      // 백그라운드 처리 - 에러 무시
    }
  }, 800);
}
