import { sendCoreMessage } from "./messageBroker";

export const DEAL_FIELD_NAMES = [
  "관심모듈",
  "진행",
  "데모생성",
  "견적",
  "미팅",
  "비고",
] as const;

export type DealFieldName = (typeof DEAL_FIELD_NAMES)[number];

export interface AdminPageDealPayload {
  직전소통일: string;
  안내자: string;
  관심모듈: string;
  진행: string;
  데모생성: string;
  견적: string;
  미팅: string;
  비고: string;
}

export function getCustomFieldValue(
  customFieldsData: any[] | undefined,
  fieldId: string
): string {
  if (!customFieldsData?.length) return "";
  const entry = customFieldsData.find((d: any) => d.field === fieldId);
  if (!entry?.value) return "";
  if (Array.isArray(entry.value)) return entry.value.join(", ");
  return String(entry.value);
}

export async function resolveAssignedUserNames(
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

export async function resolveLastContactDate(
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

export async function resolveDealFieldIds(
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
