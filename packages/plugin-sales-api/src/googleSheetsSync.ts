import { google } from "googleapis";
import { getEnv } from "@erxes/api-utils/src";
import { generateModels, IModels } from "./connectionResolver";
import { IUserDocument } from "@erxes/api-utils/src/types";
import {
  generateDealCommonFilters,
  getItemList,
} from "./graphql/resolvers/queries/utils";
import dealResolvers from "./graphql/resolvers/customResolvers/deal";
import { sendCoreMessage } from "./messageBroker";

const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];
const DEFAULT_SHEET_NAME = "Sheet1";

export interface SyncDealsToSheetsParams {
  pipelineId: string;
  spreadsheetId: string;
  sheetName?: string;
  /** 프론트엔드와 동일한 첨부 다운로드용 (댓글에서 쓰는 REACT_APP_API_URL). 있으면 이걸 써서 절대 URL 생성 */
  fileBaseUrl?: string;
}

function formatDate(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
}

function getCustomerCustomFieldValue(
  customers: any[],
  fieldId: string | null
): string {
  if (!fieldId || !customers?.length) return "-";
  const first = customers[0];
  if (!first?.customFieldsData?.length) return "-";
  const data = first.customFieldsData.find((d: any) => d.field === fieldId);
  if (!data?.value) return "-";
  if (Array.isArray(data.value)) return data.value.join(", ");
  if (typeof data.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(data.value)) {
    try {
      const d = new Date(data.value);
      if (!isNaN(d.getTime())) return formatDate(d);
    } catch (_) {}
  }
  return String(data.value);
}

function getDealCustomFieldValue(
  customFieldsData: any[] | undefined,
  fieldId: string
): string {
  if (!customFieldsData?.length) return "-";
  const data = customFieldsData.find((d: any) => d.field === fieldId);
  if (!data?.value) return "-";
  if (Array.isArray(data.value)) return data.value.join(", ");
  return String(data.value);
}

/** HTML 태그 제거 후 텍스트만 (딜 내용 시트 출력용) */
function stripHtml(html: any): string {
  if (html == null || html === undefined) return "";
  const s = String(html);
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
}

/** 첨부파일 하나의 다운로드 URL 생성. clientApiBase(댓글과 동일한 REACT_APP_API_URL)가 있으면 그걸로 절대 URL, 없으면 domain + /gateway/pl:core/read-file 또는 경로만 */
function getAttachmentDownloadUrl(
  att: { url?: string; name?: string },
  baseUrl: string,
  isClientApiBase: boolean
): string {
  const url = att?.url?.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const key = encodeURIComponent(url);
  const name = att?.name ? `&name=${encodeURIComponent(att.name)}` : "";
  const pathSuffix = `?key=${key}${name}`;
  if (!baseUrl || !String(baseUrl).trim()) {
    return `/gateway/pl:core/read-file${pathSuffix}`;
  }
  const base = String(baseUrl).replace(/\/$/, "").trim();
  const domain = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const pathPrefix = isClientApiBase ? "/read-file" : "/gateway/pl:core/read-file";
  return `${domain}${pathPrefix}${pathSuffix}`;
}

/** 딜 첨부파일들을 구글 시트 셀용 텍스트로 (한 줄에 하나씩 URL 또는 경로) */
function formatAttachmentsForSheet(
  attachments: any[] | undefined,
  baseUrl: string,
  isClientApiBase: boolean
): string {
  if (!Array.isArray(attachments) || attachments.length === 0) return "-";
  const parts = attachments
    .map((a) => getAttachmentDownloadUrl(a, baseUrl, isClientApiBase))
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "-";
}

async function getDealListCustomFields(
  subdomain: string,
  pipelineId: string
): Promise<{ _id: string; text: string; order: number }[]> {
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

  const list: { _id: string; text: string; order: number }[] = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    const fields = await sendCoreMessage({
      subdomain,
      action: "fields.find",
      data: { query: { groupId: group._id } },
      isRPC: true,
      defaultValue: [],
    });
    const arr = Array.isArray(fields) ? fields : [];
    for (const f of arr) {
      if (f.isDefinedByErxes) continue;
      if (!f.isVisible) continue;
      const label = (f.text || f.name || "").trim();
      if (!label) continue;
      list.push({
        _id: f._id,
        text: label,
        order: f.order ?? 999,
      });
    }
  }
  list.sort((a, b) => a.order - b.order);
  return list;
}

async function getCustomerDateFieldIds(subdomain: string): Promise<{
  mailSentDateFieldId: string | null;
  lastContactDateFieldId: string | null;
}> {
  const groups = await sendCoreMessage({
    subdomain,
    action: "fieldsGroups.find",
    data: { query: { contentType: "core:customer" } },
    isRPC: true,
    defaultValue: [],
  });

  let mailSentDateFieldId: string | null = null;
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
      const lower = name.toLowerCase().replace(/\s+/g, "");
      if (
        (lower.includes("메일") && (lower.includes("발송") || lower.includes("보낸"))) ||
        name === "메일발송일" ||
        name === "메일 발송일"
      ) {
        mailSentDateFieldId = f._id;
      }
      if (
        (lower.includes("직전") && lower.includes("소통")) ||
        name === "직전소통일" ||
        name === "직전 소통일"
      ) {
        lastContactDateFieldId = f._id;
      }
    }
  }
  return { mailSentDateFieldId, lastContactDateFieldId };
}

/**
 * 영업 파이프라인 딜 목록을 가져와서 Google 시트에 동기화합니다.
 * GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되어 있어야 합니다.
 */
export async function syncDealsToGoogleSheet(
  models: IModels,
  subdomain: string,
  user: IUserDocument,
  params: SyncDealsToSheetsParams
): Promise<{ syncedCount: number; message: string }> {
  const { pipelineId, spreadsheetId, sheetName = DEFAULT_SHEET_NAME } = params;

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다."
    );
  }

  const filter = await generateDealCommonFilters(
    models,
    subdomain,
    user._id,
    { pipelineId } as any
  );

  const getExtraFields = async (item: any) => ({
    amount: await dealResolvers.amount(item),
    unUsedAmount: await dealResolvers.unUsedAmount(item),
  });

  const deals = await getItemList(
    models,
    subdomain,
    filter,
    { pipelineId, skip: 0, limit: 5000 } as any,
    user,
    "deal",
    { productsData: 1, extraData: 1, description: 1, attachments: 1 },
    getExtraFields,
    undefined
  );

  const [dealCustomFields, { mailSentDateFieldId, lastContactDateFieldId }] =
    await Promise.all([
      getDealListCustomFields(subdomain, pipelineId),
      getCustomerDateFieldIds(subdomain),
    ]);

  // 첨부파일 링크용: 프론트에서 넘긴 fileBaseUrl(댓글과 동일한 REACT_APP_API_URL) 우선, 없으면 core/env 도메인 사용
  const fileBaseUrlFromClient = params.fileBaseUrl?.trim() || "";
  let attachmentBaseUrl: string;
  let attachmentIsClientApiBase: boolean;
  if (fileBaseUrlFromClient) {
    attachmentBaseUrl = fileBaseUrlFromClient;
    attachmentIsClientApiBase = true;
  } else {
    const configDomainRes = await sendCoreMessage({
      subdomain,
      action: "getConfig",
      data: { code: "DOMAIN", defaultValue: "" },
      isRPC: true,
      defaultValue: "",
    });
    attachmentBaseUrl =
      (typeof configDomainRes === "object" && configDomainRes?.data != null
        ? configDomainRes.data
        : configDomainRes) ||
      getEnv({ name: "DOMAIN", subdomain }) ||
      getEnv({ name: "DOMAIN" }) ||
      process.env.DOMAIN ||
      process.env.MAIN_APP_DOMAIN ||
      "";
    attachmentIsClientApiBase = false;
  }

  // 담당자: getItemList의 $lookup이 비어 있을 수 있으므로 assignedUserIds로 core에서 사용자 조회
  const allAssignedIds = [...new Set((deals || []).flatMap((d: any) => d.assignedUserIds || []))];
  const usersList = allAssignedIds.length
    ? await sendCoreMessage({
        subdomain,
        action: "users.find",
        data: {
          query: { _id: { $in: allAssignedIds } },
          fields: { _id: 1, details: 1, email: 1, username: 1 },
          limit: allAssignedIds.length,
        },
        isRPC: true,
        defaultValue: [],
      })
    : [];
  const userDisplayMap: Record<string, string> = {};
  for (const u of Array.isArray(usersList) ? usersList : []) {
    const name = u.details?.fullName || u.email || u.username || u._id || "";
    if (name) userDisplayMap[String(u._id)] = name;
  }

  const headers = [
    "메일발송일",
    "직전소통일",
    "제목",
    "내용",
    "담당자",
    "회사명",
    "연락처",
    "E-MAIL 주소",
    "안내자",
    "첨부파일",
    ...dealCustomFields.map((f) => f.text),
  ];

  const rows: string[][] = [headers];

  for (const item of deals) {
    const customers = (item.customers || []) as any[];
    const companies = (item.companies || []) as any[];
    const assignedUsers = (item.assignedUsers || []) as any[];
    const assignedIds = item.assignedUserIds || [];

    let assigneeNames = assignedUsers
      .map((u: any) => u.details?.fullName || u.email || u.username || "")
      .filter(Boolean)
      .join(", ");
    if (!assigneeNames && assignedIds.length) {
      assigneeNames = assignedIds
        .map((id: string) => userDisplayMap[String(id)])
        .filter(Boolean)
        .join(", ") || "-";
    }
    if (!assigneeNames) assigneeNames = "-";

    // 담당자 = 고객(연결), 안내자 = 담당(assigned user) — 리스트와 동일
    const customerNames =
      (customers || [])
        .map(
          (c: any) =>
            [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") ||
            c.primaryEmail ||
            c.primaryPhone ||
            "-"
        )
        .join(", ") || "-";

    const customerEmail =
      customers.map((c) => c.primaryEmail || c.emails?.[0] || "").filter(Boolean).join(", ") || "-";
    const customerPhone =
      customers.map((c) => c.primaryPhone || c.phones?.[0] || "").filter(Boolean).join(", ") || "-";
    const companyNames =
      companies.map((c) => c.primaryName || "-").join(", ") || "-";

    rows.push([
      getCustomerCustomFieldValue(customers, mailSentDateFieldId),
      getCustomerCustomFieldValue(customers, lastContactDateFieldId),
      item.name || "",
      stripHtml(item.description || ""),
      customerNames,
      companyNames,
      customerPhone,
      customerEmail,
      assigneeNames,
      formatAttachmentsForSheet(item.attachments, attachmentBaseUrl, attachmentIsClientApiBase),
      ...dealCustomFields.map((f) =>
        getDealCustomFieldValue(item.customFieldsData, f._id)
      ),
    ]);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: SHEETS_SCOPE,
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    });
  } catch (e: any) {
    if (e?.code !== 404 && e?.message?.indexOf("Unable to parse range") !== 0) {
      throw e;
    }
  }

  if (rows.length === 0) {
    return { syncedCount: 0, message: "동기화할 딜이 없습니다." };
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });

  // 첫 행(헤더) 배경색 #d9ead3 적용
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });
  const sheet = (meta.data.sheets || []).find(
    (s: any) => (s.properties?.title || "") === sheetName
  );
  const sheetId = sheet?.properties?.sheetId;
  if (typeof sheetId === "number") {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 217 / 255,
                    green: 234 / 255,
                    blue: 211 / 255,
                  },
                  textFormat: { bold: true },
                },
              },
              fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold",
            },
          },
        ],
      },
    });
  }

  return {
    syncedCount: rows.length - 1,
    message: `${rows.length - 1}건의 딜이 Google 시트에 동기화되었습니다.`,
  };
}

/**
 * 파이프라인에 Google 시트 자동 동기화가 설정되어 있으면 비동기로 동기화 실행.
 * 딜 추가/수정/이동 후 호출용. 응답을 블로킹하지 않음.
 * 콜백 내부에서 generateModels를 사용해 요청 종료 후에도 유효한 모델로 동기화 수행.
 * 딜 추가 직후에는 DB 반영이 아직 안 됐을 수 있으므로 짧은 지연 후 실행.
 */
export function triggerGoogleSheetSyncIfConfigured(
  models: IModels,
  subdomain: string,
  user: IUserDocument,
  pipelineId: string
): void {
  const delayMs = 800;
  setTimeout(async () => {
    try {
      const freshModels = await generateModels(subdomain);
      const pipeline = await freshModels.Pipelines.getPipeline(pipelineId);
      const spreadsheetId = (pipeline as any).googleSpreadsheetId;
      const sheetName = (pipeline as any).googleSheetName;
      if (!spreadsheetId || !spreadsheetId.trim()) return;
      await syncDealsToGoogleSheet(freshModels, subdomain, user, {
        pipelineId,
        spreadsheetId: spreadsheetId.trim(),
        sheetName: (sheetName && String(sheetName).trim()) || undefined,
      });
    } catch (e) {
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        console.error("[Google Sheet auto-sync]", e);
      }
    }
  }, delayMs);
}
