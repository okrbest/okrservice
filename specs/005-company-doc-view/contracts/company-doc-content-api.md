# Contract: 회사 문서 본문 조회

기존 계약 정본: TeamplGPT `specs/021-widget-company-docs-rag/contracts/embed-company-docs-api.md`. 구현 시 이 절을 그 문서에도 추가한다.

## TeamplGPT — GET `/api/embed/:embedId/company-documents/:id/content?companyName=오이사공`

- 미들웨어: 기존과 동일 `validEmbedConfig` → `companyDocsAllowed` (403 `COMPANY_DOCS_DISABLED`, 401 `ORIGIN_NOT_ALLOWED`).
- `companyName` 누락·공백 → `400 { "error": "COMPANY_REQUIRED" }`
- 행이 없거나 `embed_id`·`company_hash`가 요청과 다름 → `404 { "error": "NOT_FOUND" }` (두 경우를 구분하지 않는다)
- `status`가 `ready`가 아님 → `409 { "error": "NOT_READY" }`
- `location`이 그 회사 폴더(`<company_hash>/`) 밖이거나, 파일이 없거나, JSON을 읽지 못함 → `404 { "error": "CONTENT_MISSING" }`
- 성공 → `200`

```json
{
  "document": {
    "id": 12,
    "filename": "2026 취업규칙.pdf",
    "uploaderName": "홍길동",
    "status": "ready",
    "error": null,
    "createdAt": "2026-11-10T01:23:45.000Z"
  },
  "content": "제1장 총칙\n제1조(목적) …"
}
```

`document`는 목록과 같은 공개 형태(`toPublic`). `content`는 저장된 `pageContent` 문자열 그대로. 내부 경로·해시는 넣지 않는다.

## 위젯 서버 — GET `/ai-chat/company-documents/:id/content?companyName=…`

- `:id`가 양의 정수가 아니면 `404 { "error": "NOT_FOUND" }` (TeamplGPT 호출 안 함)
- TeamplGPT 미설정 → `503 { "error": "AI chat is not configured" }`
- 그 외: TeamplGPT 응답 상태·본문을 그대로 중계, 연결 실패 → `502`

## 위젯 — `getCompanyDocContent(companyName, id, signal?)`

- 성공 시 `{ document, content }` 반환, 실패 시 `CompanyDocsError(code)` throw (`code` = 응답의 `error` 또는 `HTTP_<status>`).

## 위젯 안내 문구 (ko/en)

| 상황 | en key → ko |
|---|---|
| 보기 버튼 | View → 보기 |
| 목록으로 | Back to list → 목록 |
| 불러오는 중 | Loading… → 불러오는 중… |
| NOT_FOUND | This document has already been deleted → 이미 삭제된 문서입니다 |
| NOT_READY | This document is still being processed → 아직 처리 중인 문서입니다 |
| 그 외 오류 | Couldn't load the content. Please try again → 내용을 불러오지 못했습니다. 다시 시도해 주세요 |
| 다시 시도 버튼 | Try again → 다시 시도 |
| 본문이 빈 경우 | There is no content to show → 표시할 내용이 없습니다 |
| 머리글 보조 문구 | This is the text the chatbot reads from this document → 챗봇이 이 문서에서 읽는 글입니다 |

NOT_FOUND 안내를 보여 줄 때 목록을 새로 고친다.
