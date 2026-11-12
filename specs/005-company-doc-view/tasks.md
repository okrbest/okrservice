# Tasks: 우리 회사 문서 본문 보기

**Input**: Design documents from `/specs/005-company-doc-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/company-doc-content-api.md, quickstart.md

**Tests**: 포함한다 — 사용자 전역 규칙(TDD: 테스트 먼저 → 실패 확인 → 구현). 각 테스트 작업 뒤 "실패 확인"이 끝나야 구현 작업으로 넘어간다.

**경로 표기**: `TG/` = `/Users/shin-yeji/teamplgpt/`, `OK/` = `/Users/shin-yeji/okrservice/`

**실행**: TeamplGPT jest는 `TG/server`에서 `npx jest <path>`, 위젯 jest는 `OK/widgets`에서 `npx jest <path>` (Node 20 PATH 필요).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 앞선 미완료 작업에 의존하지 않음 → 병렬 가능
- **[Story]**: US1 본문 보기 / US2 회사별 독립 공간 / US3 볼 수 없는 상태

---

## Phase 1: Setup

- [X] T001 시험 환경 확인: TeamplGPT 3011 서버 응답(`curl localhost:3011/api/ping`), 위젯 3200·webpack watch 동작, 기존 테스트 기준선 기록 — `TG/server`에서 `npx jest __tests__/endpoints/embedCompanyDocuments.test.js __tests__/utils/companyDocs`, `OK/widgets`에서 `npx jest client/messenger/components/chatbot client/messenger/components/ticket` 전건 PASS 확인

---

## Phase 2: Foundational (TeamplGPT 본문 읽기 — 모든 스토리의 전제)

- [X] T002 `readCompanyDocumentContent(row)` 단위 테스트 작성 (신규) `TG/server/__tests__/utils/companyDocs/content.test.js` — 임시 폴더를 `companyDocsPath()`로 mock하고: (a) `<hash>/x.json`의 `pageContent` 반환, (b) `location`이 `row.company_hash/`로 시작하지 않으면 null, (c) `../`로 회사 폴더 밖을 가리키면 null, (d) 파일 없음·JSON 깨짐이면 null, (e) `pageContent`가 문자열이 아니면 null. 실행해 **실패 확인**
- [X] T003 `readCompanyDocumentContent(row)` 구현·export `TG/server/utils/companyDocs/process.js` — `companyDocsPath()/<row.company_hash>` 기준 `isWithin` 검사 후 동기 읽기·JSON 파싱, 실패는 null(로그는 호출부). T002 PASS 확인

**Checkpoint**: 본문 읽기 함수가 회사 폴더 밖을 절대 열지 않는다

---

## Phase 3: User Story 1 - 올린 문서의 내용 확인 (Priority: P1) 🎯 MVP

**Goal**: 사용 가능 문서의 보기 → 같은 패널에 머리글 + 본문 전체 → ← 목록 복귀

**Independent Test**: quickstart 시나리오 1(성공 케이스)·3(보기·복귀·긴 문서)

### Tests (먼저 작성, 실패 확인)

- [X] T004 [P] [US1] content 라우트 성공 테스트 추가 `TG/server/__tests__/endpoints/embedCompanyDocuments.test.js` — `describe("GET content")`: ready 소유 문서 → 200 `{ document: toPublic 형태, content }`, 응답에 `location`·`company_hash` 없음, `getOwned`가 `(id, embed.id, hash)`로 호출됨. 기존 `jest.mock("../../utils/companyDocs/process")`에 `readCompanyDocumentContent: jest.fn()` 추가
- [X] T005 [P] [US1] `getCompanyDocContent` 테스트 추가 `OK/widgets/client/messenger/components/chatbot/__tests__/companyDocs.test.ts` — URL `…/ai-chat/company-documents/12/content?companyName=…`(인코딩), 성공 시 `{document, content}`, `signal` 전달
- [X] T006 [P] [US1] 본문 화면 테스트 작성 (신규) `OK/widgets/client/messenger/components/chatbot/__tests__/CompanyDocViewer.test.tsx` — 불러오는 중 표시 → 파일 이름·올린 사람·날짜·본문 표시, 본문 `<b>x</b>`가 글자 그대로(요소 생성 안 됨), 빈 본문이면 "There is no content to show", ← 목록(`Back to list`) 클릭 시 `onBack` 호출, 언마운트 시 요청 abort
- [X] T007 [P] [US1] 패널 전환 테스트 추가 `OK/widgets/client/messenger/components/chatbot/__tests__/CompanyDocsPanel.test.tsx` — ready 문서 행에 `View` 버튼, 누르면 본문 화면(dialog 안 목록 사라짐), 목록 복귀 시 목록 그대로, 패널 다시 열면 목록부터
- [X] T008 [US1] T004~T007 실행해 **실패 확인** (실패 사유가 "아직 없음"인지 확인)

### Implementation

- [X] T009 [US1] content 라우트 구현 `TG/server/endpoints/embedCompanyDocuments.js` — `app.get("/embed/:embedId/company-documents/:id/content", [validEmbedConfig, companyDocsAllowed], …)`: `resolveCompany` → 400 COMPANY_REQUIRED, `getOwned` → 404 NOT_FOUND, `status !== "ready"` → 409 NOT_READY, `readCompanyDocumentContent` null → `console.warn` + 404 CONTENT_MISSING, 성공 200. 500은 기존 라우트와 같은 형태. T004 PASS
- [X] T010 [US1] 위젯 서버 중계 추가 `OK/widgets/server/index.ts` — `app.get('/ai-chat/company-documents/:id/content', …)`: id 검사(양의 정수 아니면 404 NOT_FOUND), `companyDocsUpstream(\`/${id}/content\`, companyNameQuery(req))`, 미설정 503, `relayCompanyDocs(res, \`content id=${id}\`, …)`
- [X] T011 [P] [US1] `getCompanyDocContent(companyName, id, signal?)` 구현 `OK/widgets/client/messenger/components/chatbot/companyDocs.ts` — 실패 시 기존 `errorFrom`. T005 PASS
- [X] T012 [US1] 본문 화면 구현 (신규) `OK/widgets/client/messenger/components/chatbot/CompanyDocViewer.tsx` — props `{ companyName, doc, onBack, onMissing }`, `AbortController`로 요청·언마운트 시 abort, 머리글(파일 이름·올린 사람·날짜·"This is the text the chatbot reads from this document"), 본문은 텍스트 노드 + `whiteSpace: 'pre-wrap'`, `overflowY: auto`, `chatbotTheme` 인라인 스타일(패널과 동일 관행). T006 PASS
- [X] T013 [US1] 패널에 보기·전환 추가 `OK/widgets/client/messenger/components/chatbot/CompanyDocsPanel.tsx` — `viewing` 상태, ready 행에만 `View` 버튼(삭제 버튼 옆), `viewing`이면 목록 대신 `CompanyDocViewer`, 날짜 표시는 기존 `formatDate` 재사용(뷰어로 넘기거나 공용화 — 중복 금지). T007 PASS
- [X] T014 [P] [US1] 문구 추가 `OK/widgets/locales/ko.json`, `OK/widgets/locales/en.json` — contracts 표의 View·Back to list·Loading…·There is no content to show·This is the text the chatbot reads from this document

**Checkpoint**: 회사 문서 하나로 보기 → 본문 → 목록이 실제 위젯에서 동작

---

## Phase 4: User Story 2 - 회사마다 완전히 따로 운영 (Priority: P1)

**Goal**: 다른 회사·다른 embed 문서는 본문도, 존재도 드러나지 않는다

**Independent Test**: quickstart 시나리오 1의 B사·다른 embed 요청, 시나리오 5의 격리 E2E

- [X] T015 [US2] 격리 테스트 추가 `TG/server/__tests__/endpoints/embedCompanyDocuments.test.js` — 다른 회사(`getOwned` null) → 404 NOT_FOUND이고 `readCompanyDocumentContent` 호출 안 됨, 응답 본문이 "없는 id"와 동일, id `abc`·`-1` → 404, embed 비허용 → 403(기존 gating 재사용 확인). 실행해 결과 확인(T009가 이미 처리하면 PASS — 회귀 방지용 고정)
- [X] T016 [US2] T002의 경로 제한 케이스가 다른 회사 해시 폴더(`<other_hash>/x.json`)도 거부하는지 케이스 추가 `TG/server/__tests__/utils/companyDocs/content.test.js`

**Checkpoint**: 다른 공간 요청이 전부 NOT_FOUND, 회사 폴더 밖 파일은 읽지 않음

---

## Phase 5: User Story 3 - 볼 수 없는 상태의 문서 (Priority: P2)

**Goal**: 처리 중·실패 문서엔 보기 없음, 삭제된 문서·연결 실패는 구분된 안내

**Independent Test**: quickstart 시나리오 3의 삭제 후 보기

### Tests (먼저 작성, 실패 확인)

- [X] T017 [P] [US3] 상태별 서버 테스트 `TG/server/__tests__/endpoints/embedCompanyDocuments.test.js` — processing·failed → 409 NOT_READY, ready인데 읽기 null → 404 CONTENT_MISSING
- [X] T018 [P] [US3] 화면 오류 테스트 `OK/widgets/client/messenger/components/chatbot/__tests__/CompanyDocViewer.test.tsx`·`CompanyDocsPanel.test.tsx` — processing·failed 행에 `View` 없음(삭제는 있음), NOT_FOUND → "This document has already been deleted" + `onMissing`(패널이 목록 새로 고침), NOT_READY → "This document is still being processed", 그 외 → "Couldn't load the content. Please try again" + `Try again` 재요청, 불러오는 중 ← 목록 후 늦은 응답이 화면을 바꾸지 않음
- [X] T019 [US3] T017·T018 **실패 확인**

### Implementation

- [X] T020 [US3] 서버 상태 분기 보완(T009에서 빠진 부분만) `TG/server/endpoints/embedCompanyDocuments.js`. T017 PASS
- [X] T021 [US3] 뷰어 오류 안내·다시 시도·`onMissing` 구현 `OK/widgets/client/messenger/components/chatbot/CompanyDocViewer.tsx`, 패널에서 `onMissing` 시 `viewing=null` + `refresh()` `OK/widgets/client/messenger/components/chatbot/CompanyDocsPanel.tsx`. T018 PASS
- [X] T022 [P] [US3] 문구 추가 `OK/widgets/locales/ko.json`, `OK/widgets/locales/en.json` — already deleted·still being processed·Couldn't load…·Try again

**Checkpoint**: 모든 예외 상황이 빈 화면 없이 안내된다

---

## Phase 6: Polish & 실동작 검증

- [X] T023 [P] TeamplGPT 계약 정본에 본문 조회 절 추가 `TG/specs/021-widget-company-docs-rag/contracts/embed-company-docs-api.md` (okrservice `specs/005-company-doc-view/contracts/company-doc-content-api.md` 참조)
- [X] T024 전체 테스트: `TG/server` companyDocs·endpoint jest, `OK/widgets` chatbot·ticket jest 전건 PASS, 위젯 `npx tsc --noEmit -p .`에서 변경 파일 오류 0
- [X] T025 TeamplGPT 3011 재시작(라우트 반영) 후 quickstart 시나리오 1·2 — 시험 embed는 회사 문서 E2E runner `E2E_KEEP=1`로 준비, 위젯 서버는 `TEAMPLGPT_BASE_URL=http://localhost:3011`로 별도 포트 실행
- [X] T026 quickstart 시나리오 3 — playwright로 위젯 구동(보기·본문·복귀·삭제 후 보기·긴 문서 3초·꺾쇠 문자), 스크린샷 확인
- [X] T027 quickstart 시나리오 4·5 — 본문 값과 챗봇 답 일치, 회사 문서 E2E 전건 PASS(격리 포함)
- [X] T028 정리 — `E2E_KEEP` 자원 삭제, 별도 위젯 서버 종료, code-reviewer 에이전트로 변경 검토 후 CRITICAL·HIGH 반영

---

## Dependencies & Execution Order

- Phase 1 → Phase 2(T002→T003) → US1 → US2·US3 → Polish
- US1 안: T004~T007 병렬 작성 → T008 실패 확인 → T009·T011 병렬 → T010 → T012 → T013 → T014
- US2는 T009 위에 테스트만 더한다(코드 변경이 생기면 T009 파일에서)
- US3는 US1 화면(T012·T013) 위에 얹는다
- T025~T027은 모든 구현 후

## Parallel Example: User Story 1

```text
T004 (TG 라우트 테스트)  |  T005 (위젯 조회 함수 테스트)  |  T006 (뷰어 테스트)  |  T007 (패널 테스트)
→ T008 실패 확인
T009 (TG 라우트)  |  T011 (위젯 조회 함수)  |  T014 (문구)
```

## Implementation Strategy

- **MVP = Phase 2 + US1 + US2**: 본문 보기가 되고 회사 공간이 지켜지면 배포 가능한 단위(US2는 보안 조건이라 MVP에 포함).
- US3는 같은 작업 묶음 안에서 이어서 끝낸다(예외 안내 없이 내보내지 않는다).
- 커밋은 사용자가 요청할 때만 — 저장소별로 나눔: TeamplGPT `feat(widget-company-docs-rag): …`, okrservice `feat(messenger): …`.
