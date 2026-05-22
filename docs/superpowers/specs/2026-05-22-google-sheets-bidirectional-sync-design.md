# Google Sheets 양방향 동기화 설계

날짜: 2026-05-22

## 개요

현재 erxes → 스프레드시트 단방향 동기화를 양방향으로 확장한다.
스프레드시트에서 셀을 편집하면 Apps Script가 변경을 감지해 REST webhook을 호출하고,
서버가 충돌을 판단한 뒤 erxes 딜/고객/회사 데이터를 업데이트한다.

---

## 아키텍처

```
[erxes 딜 변경]
      ↓
syncDealsToGoogleSheet()
      ↓
시트 전체 덮어쓰기 (각 행에 deal_id, erxes_updated_at 숨김 컬럼 포함)

[시트 셀 편집]
      ↓
Apps Script onEdit(e) 트리거
      ↓
POST /sheets-webhook  (X-Sheets-Secret 헤더)
      ↓
충돌 판단 (deal.modifiedAt vs sheetEditedAt)
      ↓
dealsEdit() / customer update / company update
```

---

## 컬럼 정의

### 시트 컬럼 순서 (변경)

| # | 컬럼명 | erxes 매핑 | 방향 |
|---|--------|-----------|------|
| 1 | 메일발송일 | customer.customFieldsData (필드명 매칭) | 양방향 |
| 2 | 발송상태 | deal 또는 customer.customFieldsData (필드명 "발송상태") | 양방향 |
| 3 | 오류메시지 | deal 또는 customer.customFieldsData (필드명 "오류메시지") | 양방향 |
| 4 | 직전소통일 | customer.customFieldsData (필드명 매칭) | 양방향 |
| 5 | 제목 | deal.name | 양방향 |
| 6 | 내용 | deal.description (HTML 스트립) | 양방향 |
| 7 | 담당자 | customer 표시명 | 양방향 |
| 8 | 회사명 | company.name | 양방향 |
| 9 | 연락처 | customer.phones[0] | 양방향 |
| 10 | E-MAIL 주소 | customer.emails[0] | 양방향 |
| 11 | 안내자 | deal.assignedUserIds → 표시명 | 양방향 |
| 12 | 첨부파일1 | deal.attachments[0] HYPERLINK | 읽기 전용 |
| 13 | 첨부파일2 | deal.attachments[1] HYPERLINK | 읽기 전용 |
| 14 | 첨부파일3 | deal.attachments[2] HYPERLINK | 읽기 전용 |
| 15~ | 커스텀 필드들 | deal.customFieldsData (필드명 매칭) | 양방향 |
| N-1 | deal_id | deal._id | 숨김, 읽기 전용 |
| N | erxes_updated_at | deal.modifiedAt (ISO string) | 숨김, 읽기 전용 |

### 읽기 전용 컬럼 (시트 편집 시 webhook 무시)
- 첨부파일1, 첨부파일2, 첨부파일3
- deal_id
- erxes_updated_at

---

## 충돌 해결

**원칙: 마지막 수정 시간이 더 최신인 쪽이 이긴다.**

```
Apps Script 전송 페이로드:
{
  dealId: string,
  columnName: string,
  newValue: string,
  sheetEditedAt: string  // ISO 8601, Apps Script가 기록한 편집 시각
}

서버 판단:
1. DB에서 deal.modifiedAt 조회
2. deal.modifiedAt > sheetEditedAt → 시트 편집 무시 (erxes가 더 최신)
3. deal.modifiedAt <= sheetEditedAt → dealsEdit() 호출 (시트가 더 최신)
```

---

## REST 엔드포인트

### POST /sheets-webhook

**위치**: `packages/plugin-sales-api/src/configs.ts` onServerInit 블록에 추가

**인증**: 요청 헤더 `X-Sheets-Secret` 값을 환경변수 `SHEETS_WEBHOOK_SECRET`과 대조.
불일치 시 401 반환.

**요청 형식**:
```json
{
  "dealId": "abc123",
  "columnName": "연락처",
  "newValue": "010-1234-5678",
  "sheetEditedAt": "2026-05-22T10:30:00.000Z"
}
```

**응답 형식**:
```json
{ "ok": true }
// 또는
{ "ok": false, "reason": "conflict" }
// 또는
{ "ok": false, "reason": "readonly_column" }
```

**처리 흐름**:
1. secret 검증
2. dealId로 deal 조회 (없으면 404)
3. 충돌 판단
4. columnName → erxes 필드 매핑
5. 해당 필드 업데이트 (deal / customer / company)
6. 응답 반환

---

## 컬럼명 → erxes 필드 매핑 로직

```typescript
// 고정 매핑 (컬럼명이 확정된 필드)
const FIXED_COLUMN_MAP = {
  '제목': { target: 'deal', field: 'name' },
  '내용': { target: 'deal', field: 'description' },
  '담당자': { target: 'customer', field: 'firstName' },
  '회사명': { target: 'company', field: 'name' },
  '연락처': { target: 'customer', field: 'phone' },
  'E-MAIL 주소': { target: 'customer', field: 'email' },
  '안내자': { target: 'deal', field: 'assignedUsers' },
}

// 커스텀 필드 매핑: 위 고정 매핑에 없는 컬럼은
// deal.customFieldsData 또는 customer.customFieldsData에서
// field.text === columnName 인 항목을 찾아 업데이트
```

---

## Apps Script 코드

파이프라인마다 한 번 설정. 스프레드시트 → 확장 프로그램 → Apps Script에 붙여넣기.

```javascript
const WEBHOOK_URL = 'https://api.okrbiz.com/sales/sheets-webhook';
const WEBHOOK_SECRET = '<환경변수 SHEETS_WEBHOOK_SECRET 값>';
const DEAL_ID_COL_HEADER = 'deal_id';
const ERXES_UPDATED_AT_COL_HEADER = 'erxes_updated_at';
const READONLY_COLUMNS = ['첨부파일1', '첨부파일2', '첨부파일3', 'deal_id', 'erxes_updated_at'];

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  // 헤더 행 편집 무시
  if (row === 1) return;

  // 헤더 행에서 컬럼명, deal_id, erxes_updated_at 위치 파악
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnName = headers[col - 1];

  // 읽기 전용 컬럼 무시
  if (READONLY_COLUMNS.includes(columnName)) return;

  const dealIdCol = headers.indexOf(DEAL_ID_COL_HEADER) + 1;
  const erxesUpdatedAtCol = headers.indexOf(ERXES_UPDATED_AT_COL_HEADER) + 1;

  if (dealIdCol === 0 || erxesUpdatedAtCol === 0) return;

  const dealId = sheet.getRange(row, dealIdCol).getValue();
  if (!dealId) return;

  const payload = {
    dealId: String(dealId),
    columnName: columnName,
    newValue: String(e.value || ''),
    sheetEditedAt: new Date().toISOString()
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Sheets-Secret': WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

---

## 환경변수 추가

```
SHEETS_WEBHOOK_SECRET=<랜덤 32자 이상 문자열>
```

---

## 구현 범위 (변경 파일)

| 파일 | 변경 내용 |
|------|----------|
| `googleSheetsSync.ts` | 컬럼 순서 변경, 숨김 컬럼 2개 추가, 발송상태/오류메시지 추가 |
| `configs.ts` | POST /sheets-webhook 엔드포인트 추가 |
| `googleSheetsSync.ts` | `handleSheetWebhook()` 함수 추가 (충돌 판단 + 필드 업데이트) |

---

## 제약사항 및 고려사항

- Apps Script `onEdit` 트리거는 **단순 편집(Simple Trigger)** 으로 `UrlFetchApp` 사용 불가.
  → **설치형 트리거(Installable Trigger)** 로 설정해야 함 (`onEdit` 함수를 트리거로 등록).
- 다중 셀 동시 편집(붙여넣기) 시 트리거가 한 번만 발생할 수 있음 → 단일 셀 편집 기준으로 처리.
- webhook 엔드포인트는 HTTPS 필수 (Apps Script의 `UrlFetchApp` 요구사항).
