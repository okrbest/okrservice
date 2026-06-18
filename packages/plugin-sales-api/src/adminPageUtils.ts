import { sendCoreMessage } from "./messageBroker";

export function stripEmailQuote(body: string): string {
  if (!body) return "";

  // Gmail_attr (작성자/시간 줄): 열린 태그부터 닫는 태그까지 제거
  // gmail_attr 뒤에 오는 blockquote(gmail_quote) + Outlook divRplyFwdMsg까지
  // → 첫 번째 gmail_attr 또는 gmail_quote 위치부터 잘라냄
  let result = body;

  // 1. Gmail 외부 컨테이너 div (gmail_quote, gmail_quote_container 등)
  const gmailContainerIdx = result.search(/<div[^>]+class="[^"]*gmail_quote[^"]*"/i);
  if (gmailContainerIdx !== -1) {
    result = result.slice(0, gmailContainerIdx);
  }

  // 2. blockquote class에 gmail_quote 포함
  const gmailBlockquoteIdx = result.search(/<blockquote[^>]+class="[^"]*gmail_quote[^"]*"/i);
  if (gmailBlockquoteIdx !== -1) {
    result = result.slice(0, gmailBlockquoteIdx);
  }

  // 3. gmail_attr 단독 (위에서 못 잡은 경우)
  const gmailAttrIdx = result.search(/<div[^>]+class="[^"]*gmail_attr[^"]*"/i);
  if (gmailAttrIdx !== -1) {
    result = result.slice(0, gmailAttrIdx);
  }

  // 4. Outlook divRplyFwdMsg
  const outlookIdx = result.search(/<div id="divRplyFwdMsg"/i);
  if (outlookIdx !== -1) {
    result = result.slice(0, outlookIdx);
  }

  result = result.replace(/(<br\s*\/?>|\s)+$/gi, "").trim();

  // plain text 처리
  if (!result.includes("<")) {
    result = result.replace(/\n*\d{4}년 \d+월 \d+일[\s\S]*(님이 작성:|wrote:)[\s\S]*/i, "").trim();
    result = result.replace(/\n*On .+wrote:[\s\S]*/i, "").trim();
    result = result.split("\n").filter(line => !line.startsWith(">")).join("\n").trim();
  }

  return result;
}

export const DEAL_FIELD_NAMES = [
  "관심모듈",
  "진행",
  "데모생성",
  "견적",
  "미팅",
  "비고",
  "직원규모",
  "유입경로",
] as const;

export type DealFieldName = (typeof DEAL_FIELD_NAMES)[number];

export interface CustomerInfo {
  회사명: string;
  담당자: string;
  연락처: string;
  이메일: string;
}

export interface AdminPageDealPayload {
  // 고객 정보
  회사명: string;
  담당자: string;
  연락처: string;
  이메일: string;
  // 문의 내용
  제목: string;
  내용: string;
  첨부파일: string[];
  // 영업 필드 (수정 가능 8개)
  직전소통일: string;
  안내자: string;
  관심모듈: string;
  진행: string;
  데모생성: string;
  견적: string;
  미팅: string;
  비고: string;
  직원규모: string;
  유입경로: string;
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

export async function resolveCustomerInfo(
  subdomain: string,
  deal: any
): Promise<CustomerInfo> {
  // 관리 웹에서 생성한 딜은 extraData에 고객 정보가 저장돼 있음
  if (deal.extraData?.adminPageCustomer) {
    return deal.extraData.adminPageCustomer as CustomerInfo;
  }

  const customerIds: string[] = deal.customerIds || [];
  if (!customerIds.length) {
    return { 회사명: "", 담당자: "", 연락처: "", 이메일: "" };
  }

  try {
    const customers = await sendCoreMessage({
      subdomain,
      action: "customers.find",
      data: { query: { _id: { $in: customerIds } } },
      isRPC: true,
      defaultValue: [],
    });

    const customer = Array.isArray(customers) ? customers[0] : null;
    if (!customer) {
      return { 회사명: "", 담당자: "", 연락처: "", 이메일: "" };
    }

    return {
      담당자: customer.details?.fullName || customer.visitorContactInfo?.name || "",
      이메일: customer.primaryEmail || (customer.emails || [])[0] || "",
      연락처: customer.primaryPhone || (customer.phones || [])[0] || "",
      회사명: customer.companyName || "",
    };
  } catch (_e) {
    return { 회사명: "", 담당자: "", 연락처: "", 이메일: "" };
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
    직원규모: null,
    유입경로: null,
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

/**
 * 파이프라인의 커스텀 필드에 값을 일괄 설정해 customFieldsData 배열을 반환합니다.
 * 딜 생성 시 초기값 세팅에 사용합니다.
 */
export async function buildCustomFieldsData(
  subdomain: string,
  pipelineId: string,
  fieldValues: Partial<Record<DealFieldName, string>>
): Promise<Array<{ field: string; value: string; stringValue: string }>> {
  const fieldIds = await resolveDealFieldIds(subdomain, pipelineId);
  const result: Array<{ field: string; value: string; stringValue: string }> = [];

  for (const [name, value] of Object.entries(fieldValues)) {
    const fieldId = fieldIds[name as DealFieldName];
    if (fieldId && value !== undefined && value !== "") {
      result.push({ field: fieldId, value, stringValue: value });
    }
  }

  return result;
}
