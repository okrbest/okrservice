# Google Sheets 양방향 동기화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스프레드시트 셀 편집 시 Apps Script가 webhook을 호출하고, 서버가 충돌을 판단해 erxes 딜/고객/회사 데이터를 업데이트하는 양방향 동기화 구현

**Architecture:** `syncDealsToGoogleSheet()`가 각 행 끝에 `deal_id`·`erxes_updated_at` 숨김 컬럼을 추가한다. Apps Script `onEdit` 설치형 트리거가 편집된 셀 정보와 `deal_id`·`sheetEditedAt`을 POST `/sheets-webhook`으로 전송한다. 서버는 `deal.modifiedAt`과 `sheetEditedAt`을 비교해 시트가 더 최신이면 erxes 데이터를 업데이트한다.

**Tech Stack:** TypeScript, Google Sheets API v4 (googleapis), MongoDB/Mongoose (erxes models), Express (app router), Google Apps Script

---

## 파일 변경 범위

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `packages/plugin-sales-api/src/googleSheetsSync.ts` | 수정 | 컬럼 추가, handleSheetWebhook 함수 추가 |
| `packages/plugin-sales-api/src/configs.ts` | 수정 | POST /sheets-webhook 엔드포인트 추가 |
| `docs/superpowers/apps-script/sheets-webhook-trigger.gs` | 신규 | 사용자가 복붙할 Apps Script 코드 |

---

## Task 1: 발송상태·오류메시지 커스텀 필드 ID 조회 함수 추가

**Files:**
- Modify: `packages/plugin-sales-api/src/googleSheetsSync.ts` (기존 `getCustomerDateFieldIds` 함수 아래)

`발송상태`와 `오류메시지`는 딜 또는 고객 커스텀 필드에 있을 수 있다. 딜 커스텀 필드를 먼저 확인하고, 없으면 고객 커스텀 필드를 확인하는 함수를 추가한다.

- [ ] **Step 1: `getCustomerDateFieldIds` 함수 확장 — 발송상태·오류메시지 필드 ID 함께 반환**

`getCustomerDateFieldIds` 함수(현재 `mailSentDateFieldId`, `lastContactDateFieldId` 반환)를 아래와 같이 교체한다.

```typescript
async function getCustomerSpecialFieldIds(subdomain: string): Promise<{
  mailSentDateFieldId: string | null;
  lastContactDateFieldId: string | null;
  sendStatusFieldId: string | null;        // 발송상태 (customer)
  errorMessageFieldId: string | null;      // 오류메시지 (customer)
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
  let sendStatusFieldId: string | null = null;
  let errorMessageFieldId: string | null = null;

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
        name === "메일발송일" || name === "메일 발송일"
      ) {
        mailSentDateFieldId = f._id;
      }
      if (
        (lower.includes("직전") && lower.includes("소통")) ||
        name === "직전소통일" || name === "직전 소통일"
      ) {
        lastContactDateFieldId = f._id;
      }
      if (name === "발송상태") sendStatusFieldId = f._id;
      if (name === "오류메시지") errorMessageFieldId = f._id;
    }
  }
  return { mailSentDateFieldId, lastContactDateFieldId, sendStatusFieldId, errorMessageFieldId };
}
```

- [ ] **Step 2: getDealSpecialFieldIds 함수 추가 — 딜 커스텀 필드에서 발송상태·오류메시지 검색**

```typescript
async function getDealSpecialFieldIds(
  subdomain: string,
  pipelineId: string
): Promise<{ sendStatusFieldId: string | null; errorMessageFieldId: string | null }> {
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

  let sendStatusFieldId: string | null = null;
  let errorMessageFieldId: string | null = null;

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
      if (name === "발송상태") sendStatusFieldId = f._id;
      if (name === "오류메시지") errorMessageFieldId = f._id;
    }
  }
  return { sendStatusFieldId, errorMessageFieldId };
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice
yarn workspace @erxes/plugin-sales-api tsc --noEmit 2>&1 | head -30
```

예상 결과: `getCustomerDateFieldIds` 호출부가 깨졌다는 오류 (다음 Task에서 수정 예정)

- [ ] **Step 4: 커밋**

```bash
git add packages/plugin-sales-api/src/googleSheetsSync.ts
git commit -m "feat(sheets): 발송상태·오류메시지 커스텀 필드 ID 조회 함수 추가"
```

---

## Task 2: syncDealsToGoogleSheet — 컬럼 순서 변경 및 숨김 컬럼 추가

**Files:**
- Modify: `packages/plugin-sales-api/src/googleSheetsSync.ts` (`syncDealsToGoogleSheet` 함수 내부)

헤더 순서를 `[메일발송일, 발송상태, 오류메시지, 직전소통일, 제목, ...]`로 바꾸고, 각 행 끝에 `deal_id`·`erxes_updated_at`을 추가한다. 동기화 후 이 두 컬럼을 시트에서 숨긴다.

- [ ] **Step 1: `syncDealsToGoogleSheet` 내부 Promise.all 호출 수정**

기존 코드:
```typescript
const [dealCustomFields, { mailSentDateFieldId, lastContactDateFieldId }] =
  await Promise.all([
    getDealListCustomFields(subdomain, pipelineId),
    getCustomerDateFieldIds(subdomain),
  ]);
```

아래로 교체:
```typescript
const [
  dealCustomFields,
  { mailSentDateFieldId, lastContactDateFieldId, sendStatusFieldId: customerSendStatusFieldId, errorMessageFieldId: customerErrorMessageFieldId },
  { sendStatusFieldId: dealSendStatusFieldId, errorMessageFieldId: dealErrorMessageFieldId },
] = await Promise.all([
  getDealListCustomFields(subdomain, pipelineId),
  getCustomerSpecialFieldIds(subdomain),
  getDealSpecialFieldIds(subdomain, pipelineId),
]);

// 발송상태·오류메시지: 딜 커스텀 필드 우선, 없으면 고객 커스텀 필드
const sendStatusFieldId = dealSendStatusFieldId ?? customerSendStatusFieldId;
const errorMessageFieldId = dealErrorMessageFieldId ?? customerErrorMessageFieldId;
const sendStatusIsDeal = !!dealSendStatusFieldId;
const errorMessageIsDeal = !!dealErrorMessageFieldId;
```

- [ ] **Step 2: headers 배열 수정**

기존 headers 배열:
```typescript
const headers = [
  "메일발송일",
  "직전소통일",
  "제목",
  ...
];
```

아래로 교체:
```typescript
const headers = [
  "메일발송일",
  "발송상태",
  "오류메시지",
  "직전소통일",
  "제목",
  "내용",
  "담당자",
  "회사명",
  "연락처",
  "E-MAIL 주소",
  "안내자",
  ...Array.from({ length: MAX_ATTACHMENT_COLUMNS }, (_, i) => `첨부파일${i + 1}`),
  ...dealCustomFields.map((f) => f.text),
  "deal_id",
  "erxes_updated_at",
];
```

- [ ] **Step 3: rows.push 내부 수정**

기존 rows.push:
```typescript
rows.push([
  getCustomerCustomFieldValue(customers, mailSentDateFieldId),
  getCustomerCustomFieldValue(customers, lastContactDateFieldId),
  item.name || "",
  ...
]);
```

아래로 교체:
```typescript
const sendStatusValue = sendStatusIsDeal
  ? getDealCustomFieldValue(item.customFieldsData, sendStatusFieldId!)
  : getCustomerCustomFieldValue(customers, sendStatusFieldId);
const errorMessageValue = errorMessageIsDeal
  ? getDealCustomFieldValue(item.customFieldsData, errorMessageFieldId!)
  : getCustomerCustomFieldValue(customers, errorMessageFieldId);

rows.push([
  getCustomerCustomFieldValue(customers, mailSentDateFieldId),
  sendStatusValue,
  errorMessageValue,
  getCustomerCustomFieldValue(customers, lastContactDateFieldId),
  item.name || "",
  stripHtml(item.description || ""),
  customerNames,
  companyNames,
  customerPhone,
  customerEmail,
  assigneeNames,
  ...formatAttachmentsAsColumns(item.attachments, attachmentBaseUrl, attachmentIsClientApiBase),
  ...dealCustomFields.map((f) => getDealCustomFieldValue(item.customFieldsData, f._id)),
  String(item._id || ""),
  item.modifiedAt ? new Date(item.modifiedAt).toISOString() : "",
]);
```

- [ ] **Step 4: 헤더 색상 적용 후 deal_id·erxes_updated_at 컬럼 숨기기**

기존 `batchUpdate` 호출(헤더 배경색) 다음에, 숨김 컬럼 처리를 추가한다.

기존 코드 (헤더 batchUpdate):
```typescript
if (typeof sheetId === "number") {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: { ... },
        },
      ],
    },
  });
}
```

아래로 교체 (숨김 컬럼 request 추가):
```typescript
if (typeof sheetId === "number") {
  const totalCols = headers.length;
  const hiddenStartCol = totalCols - 2; // deal_id, erxes_updated_at (0-indexed)

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
                backgroundColor: { red: 217 / 255, green: 234 / 255, blue: 211 / 255 },
                textFormat: { bold: true },
              },
            },
            fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: hiddenStartCol,
              endIndex: totalCols,
            },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });
}
```

- [ ] **Step 5: 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice
yarn workspace @erxes/plugin-sales-api tsc --noEmit 2>&1 | head -30
```

예상 결과: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add packages/plugin-sales-api/src/googleSheetsSync.ts
git commit -m "feat(sheets): 발송상태·오류메시지 컬럼 추가 및 deal_id·erxes_updated_at 숨김 컬럼 추가"
```

---

## Task 3: handleSheetWebhook 함수 구현

**Files:**
- Modify: `packages/plugin-sales-api/src/googleSheetsSync.ts` (파일 끝에 추가)

시트에서 편집된 셀 정보를 받아 충돌 판단 후 erxes 데이터를 업데이트하는 함수.

- [ ] **Step 1: 타입 및 상수 정의 추가**

파일 상단 상수 영역(SHEETS_SCOPE 선언 근처)에 추가:

```typescript
export interface SheetWebhookPayload {
  dealId: string;
  columnName: string;
  newValue: string;
  sheetEditedAt: string; // ISO 8601
}

export type SheetWebhookResult =
  | { ok: true }
  | { ok: false; reason: "conflict" | "readonly_column" | "deal_not_found" | "field_not_found" | "unknown_error" };

const READONLY_COLUMNS = new Set([
  "첨부파일1", "첨부파일2", "첨부파일3",
  "deal_id", "erxes_updated_at",
]);

// 고정 컬럼 → erxes 필드 매핑
type FixedTarget = { target: "deal"; field: "name" | "description" }
  | { target: "customer"; field: "primaryPhone" | "primaryEmail" | "firstName" }
  | { target: "company"; field: "primaryName" }
  | { target: "deal_assignedUsers"; field: "assignedUserIds" };

const FIXED_COLUMN_MAP: Record<string, FixedTarget> = {
  "제목":       { target: "deal", field: "name" },
  "내용":       { target: "deal", field: "description" },
  "담당자":     { target: "customer", field: "firstName" },
  "회사명":     { target: "company", field: "primaryName" },
  "연락처":     { target: "customer", field: "primaryPhone" },
  "E-MAIL 주소":{ target: "customer", field: "primaryEmail" },
  "안내자":     { target: "deal_assignedUsers", field: "assignedUserIds" },
};
```

- [ ] **Step 2: handleSheetWebhook 함수 추가**

파일 끝(`triggerGoogleSheetSyncIfConfigured` 아래)에 추가:

```typescript
/**
 * Apps Script가 시트 편집 감지 후 호출하는 webhook 처리.
 * 충돌 판단(수정 시간 비교) 후 erxes 딜/고객/회사 데이터 업데이트.
 */
export async function handleSheetWebhook(
  models: IModels,
  subdomain: string,
  payload: SheetWebhookPayload
): Promise<SheetWebhookResult> {
  const { dealId, columnName, newValue, sheetEditedAt } = payload;

  // 읽기 전용 컬럼 무시
  if (READONLY_COLUMNS.has(columnName)) {
    return { ok: false, reason: "readonly_column" };
  }

  // 딜 조회
  const deal = await models.Deals.findOne({ _id: dealId }).lean();
  if (!deal) return { ok: false, reason: "deal_not_found" };

  // 충돌 판단: deal.modifiedAt이 시트 편집 시각보다 최신이면 erxes 우선
  const dealModifiedAt = deal.modifiedAt ? new Date(deal.modifiedAt).getTime() : 0;
  const sheetEditedAtMs = new Date(sheetEditedAt).getTime();
  if (dealModifiedAt > sheetEditedAtMs) {
    return { ok: false, reason: "conflict" };
  }

  try {
    // 고정 컬럼 처리
    const fixed = FIXED_COLUMN_MAP[columnName];
    if (fixed) {
      await applyFixedColumnUpdate(models, subdomain, deal, fixed, newValue);
      return { ok: true };
    }

    // 커스텀 필드: 딜 → 고객 순으로 매핑 시도
    const updated = await applyCustomFieldUpdate(models, subdomain, deal, columnName, newValue);
    if (!updated) return { ok: false, reason: "field_not_found" };

    return { ok: true };
  } catch (_e) {
    return { ok: false, reason: "unknown_error" };
  }
}

async function applyFixedColumnUpdate(
  models: IModels,
  subdomain: string,
  deal: any,
  fixed: FixedTarget,
  newValue: string
): Promise<void> {
  const now = new Date();

  if (fixed.target === "deal") {
    await models.Deals.updateOne(
      { _id: deal._id },
      { $set: { [fixed.field]: newValue, modifiedAt: now } }
    );
    return;
  }

  if (fixed.target === "deal_assignedUsers") {
    // 안내자: 이름으로 사용자 ID 검색 후 설정
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
      { $set: { assignedUserIds: matchedIds, modifiedAt: now } }
    );
    return;
  }

  // customer / company 업데이트
  const customerIds: string[] = deal.customerIds || [];
  const companyIds: string[] = deal.companyIds || [];

  if (fixed.target === "customer" && customerIds.length > 0) {
    await sendCoreMessage({
      subdomain,
      action: "contacts:customers.updateCustomer",
      data: { _id: customerIds[0], doc: { [fixed.field]: newValue } },
      isRPC: true,
      defaultValue: null,
    });
  }

  if (fixed.target === "company" && companyIds.length > 0) {
    await sendCoreMessage({
      subdomain,
      action: "contacts:companies.updateCompany",
      data: { _id: companyIds[0], doc: { [fixed.field]: newValue } },
      isRPC: true,
      defaultValue: null,
    });
  }
}

async function applyCustomFieldUpdate(
  models: IModels,
  subdomain: string,
  deal: any,
  columnName: string,
  newValue: string
): Promise<boolean> {
  const now = new Date();

  // deal에는 pipelineId가 없으므로 stage를 통해 조회
  const stage = await models.Stages.findOne({ _id: deal.stageId }).lean();
  const pipelineId = (stage as any)?.pipelineId || '';

  // 1. 딜 커스텀 필드에서 columnName 매칭
  const dealGroups = await sendCoreMessage({
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

  for (const group of Array.isArray(dealGroups) ? dealGroups : []) {
    const fields = await sendCoreMessage({
      subdomain,
      action: "fields.find",
      data: { query: { groupId: group._id } },
      isRPC: true,
      defaultValue: [],
    });
    const matched = (Array.isArray(fields) ? fields : []).find(
      (f: any) => ((f.text || f.name) || "").trim() === columnName
    );
    if (matched) {
      const existing: any[] = Array.isArray(deal.customFieldsData) ? deal.customFieldsData : [];
      const updated = existing.filter((d: any) => d.field !== matched._id);
      updated.push({ field: matched._id, value: newValue });
      await models.Deals.updateOne(
        { _id: deal._id },
        { $set: { customFieldsData: updated, modifiedAt: now } }
      );
      return true;
    }
  }

  // 2. 고객 커스텀 필드에서 columnName 매칭
  const customerIds: string[] = deal.customerIds || [];
  if (customerIds.length === 0) return false;

  const customerGroups = await sendCoreMessage({
    subdomain,
    action: "fieldsGroups.find",
    data: { query: { contentType: "core:customer" } },
    isRPC: true,
    defaultValue: [],
  });

  for (const group of Array.isArray(customerGroups) ? customerGroups : []) {
    const fields = await sendCoreMessage({
      subdomain,
      action: "fields.find",
      data: { query: { groupId: group._id } },
      isRPC: true,
      defaultValue: [],
    });
    const matched = (Array.isArray(fields) ? fields : []).find(
      (f: any) => ((f.text || f.name) || "").trim() === columnName
    );
    if (matched) {
      await sendCoreMessage({
        subdomain,
        action: "contacts:customers.updateCustomer",
        data: {
          _id: customerIds[0],
          doc: {
            customFieldsData: [{ field: matched._id, value: newValue }],
          },
        },
        isRPC: true,
        defaultValue: null,
      });
      return true;
    }
  }

  return false;
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice
yarn workspace @erxes/plugin-sales-api tsc --noEmit 2>&1 | head -30
```

예상 결과: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add packages/plugin-sales-api/src/googleSheetsSync.ts
git commit -m "feat(sheets): handleSheetWebhook 함수 구현 (충돌 판단 + 역방향 필드 업데이트)"
```

---

## Task 4: POST /sheets-webhook REST 엔드포인트 추가

**Files:**
- Modify: `packages/plugin-sales-api/src/configs.ts` (`onServerInit` 블록)

- [ ] **Step 1: import 추가**

`configs.ts` 상단 import에 추가:

```typescript
import { handleSheetWebhook } from './googleSheetsSync';
import type { SheetWebhookPayload } from './googleSheetsSync';
```

- [ ] **Step 2: onServerInit 블록에 엔드포인트 추가**

기존 `/file-export` 라우트 뒤에 추가:

```typescript
app.post(
  '/sheets-webhook',
  routeErrorHandling(async (req: any, res) => {
    const secret = req.headers['x-sheets-secret'];
    const expectedSecret = process.env.SHEETS_WEBHOOK_SECRET || '';

    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({ ok: false, reason: 'unauthorized' });
    }

    const { dealId, columnName, newValue, sheetEditedAt } =
      req.body as SheetWebhookPayload;

    if (!dealId || !columnName || newValue === undefined || !sheetEditedAt) {
      return res.status(400).json({ ok: false, reason: 'missing_fields' });
    }

    const subdomain = getSubdomain(req);
    const models = await generateModels(subdomain);

    const result = await handleSheetWebhook(models, subdomain, {
      dealId,
      columnName,
      newValue: String(newValue),
      sheetEditedAt,
    });

    return res.json(result);
  })
);
```

- [ ] **Step 3: JSON body 파싱 미들웨어 확인**

`app`이 이미 JSON body 파싱을 하는지 확인:

```bash
grep -n "json\|bodyParser" /Users/shin-yeji/okrservice/node_modules/@erxes/api-utils/src/app.ts 2>/dev/null | head -20
# 또는
grep -rn "express.json\|bodyParser.json" /Users/shin-yeji/okrservice/packages/plugin-sales-api/src/ | head -10
```

결과에 `express.json()` 또는 `bodyParser.json()`이 없으면 `onServerInit` 시작 부분에 추가:

```typescript
// JSON 파싱이 없는 경우에만 추가
import express from 'express';
app.use(express.json());
```

- [ ] **Step 4: 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice
yarn workspace @erxes/plugin-sales-api tsc --noEmit 2>&1 | head -30
```

예상 결과: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add packages/plugin-sales-api/src/configs.ts
git commit -m "feat(sheets): POST /sheets-webhook 엔드포인트 추가"
```

---

## Task 5: Apps Script 파일 작성

**Files:**
- Create: `docs/superpowers/apps-script/sheets-webhook-trigger.gs`

- [ ] **Step 1: Apps Script 파일 작성**

```javascript
// ============================================================
// Google Sheets → erxes 양방향 동기화 Apps Script
// ============================================================
// 설정 방법:
// 1. 이 파일 전체를 복사해서 스프레드시트 > 확장 프로그램 > Apps Script에 붙여넣기
// 2. WEBHOOK_URL과 WEBHOOK_SECRET을 실제 값으로 변경
// 3. 저장 (Ctrl+S)
// 4. 트리거 등록: 왼쪽 시계 아이콘 > 트리거 추가
//    - 실행할 함수: onSheetEdit
//    - 이벤트 소스: 스프레드시트에서
//    - 이벤트 유형: 편집 시
// 5. 권한 승인 (구글 계정으로 승인)
// ============================================================

const WEBHOOK_URL = 'https://api.okrbiz.com/sales/sheets-webhook'; // 실제 URL로 변경
const WEBHOOK_SECRET = 'YOUR_SECRET_HERE'; // 환경변수 SHEETS_WEBHOOK_SECRET 값으로 변경

const DEAL_ID_COL_HEADER = 'deal_id';
const READONLY_COLUMNS = ['첨부파일1', '첨부파일2', '첨부파일3', 'deal_id', 'erxes_updated_at'];

function onSheetEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    // 헤더 행(1행) 편집 무시
    if (row === 1) return;

    // 헤더 읽기
    const lastCol = sheet.getLastColumn();
    if (lastCol < 1) return;
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const columnName = String(headers[col - 1] || '');

    // 빈 컬럼명 또는 읽기 전용 컬럼 무시
    if (!columnName || READONLY_COLUMNS.includes(columnName)) return;

    // deal_id 컬럼 위치 찾기
    const dealIdColIndex = headers.indexOf(DEAL_ID_COL_HEADER);
    if (dealIdColIndex < 0) return;

    // 현재 행의 deal_id 읽기
    const dealId = String(sheet.getRange(row, dealIdColIndex + 1).getValue() || '');
    if (!dealId) return;

    const payload = {
      dealId: dealId,
      columnName: columnName,
      newValue: String(e.value !== undefined ? e.value : ''),
      sheetEditedAt: new Date().toISOString(),
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Sheets-Secret': WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    // 실패 시 로그 (Apps Script 실행 로그에서 확인 가능)
    const code = response.getResponseCode();
    if (code !== 200) {
      console.log('[sheets-webhook] 실패: HTTP ' + code + ' / ' + response.getContentText());
    }
  } catch (err) {
    console.log('[sheets-webhook] 오류: ' + String(err));
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add docs/superpowers/apps-script/sheets-webhook-trigger.gs
git commit -m "docs(sheets): Apps Script 양방향 동기화 트리거 코드 추가"
```

---

## Task 6: 환경변수 설정 확인 및 수동 테스트

- [ ] **Step 1: SHEETS_WEBHOOK_SECRET 환경변수 설정 확인**

서버의 `.env` 또는 환경변수 설정 파일에서 확인:

```bash
grep -r "SHEETS_WEBHOOK_SECRET" /Users/shin-yeji/okrservice/.env* 2>/dev/null || echo "설정 필요"
```

없으면 `.env` 파일에 추가 (운영 서버에도 동일하게 설정 필요):

```
SHEETS_WEBHOOK_SECRET=<openssl rand -base64 32 결과값>
```

비밀값 생성:
```bash
openssl rand -base64 32
```

- [ ] **Step 2: 서버 로컬 실행 후 webhook 엔드포인트 수동 테스트**

```bash
# 서버가 실행 중인 상태에서 (포트 4005 또는 실제 포트로 변경)
curl -X POST http://localhost:4005/sheets-webhook \
  -H "Content-Type: application/json" \
  -H "X-Sheets-Secret: WRONG_SECRET" \
  -d '{"dealId":"test","columnName":"제목","newValue":"테스트","sheetEditedAt":"2026-01-01T00:00:00Z"}'
```

예상 결과: `{"ok":false,"reason":"unauthorized"}`

- [ ] **Step 3: 올바른 secret으로 테스트**

```bash
curl -X POST http://localhost:4005/sheets-webhook \
  -H "Content-Type: application/json" \
  -H "X-Sheets-Secret: <실제_시크릿>" \
  -d '{"dealId":"INVALID_ID","columnName":"제목","newValue":"테스트","sheetEditedAt":"2026-01-01T00:00:00Z"}'
```

예상 결과: `{"ok":false,"reason":"deal_not_found"}`

- [ ] **Step 4: 실제 deal_id로 제목 업데이트 테스트**

erxes DB에서 실제 deal _id를 하나 조회 후:

```bash
curl -X POST http://localhost:4005/sheets-webhook \
  -H "Content-Type: application/json" \
  -H "X-Sheets-Secret: <실제_시크릿>" \
  -d "{\"dealId\":\"<실제_deal_id>\",\"columnName\":\"제목\",\"newValue\":\"시트에서 수정됨\",\"sheetEditedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

예상 결과: `{"ok":true}`
erxes에서 해당 딜의 제목이 "시트에서 수정됨"으로 바뀌어 있어야 함

- [ ] **Step 5: 최종 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice
yarn workspace @erxes/plugin-sales-api tsc --noEmit 2>&1 | head -30
```

예상 결과: 오류 없음

---

## Apps Script 설치 가이드 (운영자용)

1. 동기화할 스프레드시트 열기
2. **확장 프로그램 → Apps Script** 클릭
3. `docs/superpowers/apps-script/sheets-webhook-trigger.gs` 내용 붙여넣기
4. `WEBHOOK_URL`을 실제 서버 URL로 변경 (`https://api.okrbiz.com/sales/sheets-webhook`)
5. `WEBHOOK_SECRET`을 환경변수 `SHEETS_WEBHOOK_SECRET` 값으로 변경
6. **저장** (Ctrl+S)
7. 왼쪽 **시계 아이콘(트리거)** → **트리거 추가**
   - 실행할 함수: `onSheetEdit`
   - 이벤트 소스: `스프레드시트에서`
   - 이벤트 유형: `편집 시`
8. **저장** → 구글 계정 권한 승인

> **중요**: 단순 트리거(`onEdit`)가 아닌 **설치형 트리거**로 등록해야 `UrlFetchApp` 사용 가능

---

## 알려진 제약

- 다중 셀 동시 붙여넣기 시 트리거가 한 번만 발생할 수 있음 (단일 셀 편집 기준으로 설계)
- `안내자` 컬럼 역방향 업데이트는 이름 문자열 매칭으로 처리 (동명이인 시 첫 번째 매칭 사용)
- 고객 커스텀 필드 업데이트 시 기존 값 배열을 병합하지 않고 해당 필드만 덮어씀 (core 서비스 API 제약)
