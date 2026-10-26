---
description: "위젯 티켓 '새 탭에서 보기' 작업 목록"
---

# Tasks: 위젯 티켓 "새 탭에서 보기"

**Input**: `specs/001-widget-ticket-new-tab/` — [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/graphql.md](./contracts/graphql.md), [quickstart.md](./quickstart.md)

**Tests**: 포함. 사용자 규칙(TDD)과 research D11에 따라 순수 함수는 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 화면은 quickstart 시나리오를 로컬 Playwright로 확인한다.

**Organization**: 스펙의 사용자 시나리오별로 묶었다. US1·US2·US3은 P1, US4는 P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이라 동시에 해도 되는 작업
- **[Story]**: US1(새 탭에서 보기), US2(댓글), US3(만료·남의 링크 차단), US4(새 소식 반영)

## 공통 참고 (모든 작업에 적용)

- Node는 `~/.nvm` 20.18.0, pm2 개발 스택은 `cli-okrservice/ecosystem.config.js`.
- tickets-api 테스트 실행(자체 jest 없음 — widgets jest를 빌려 씀):
  `cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/ticketViewLink.test.ts"]}'`
- widgets 테스트 실행: `cd widgets && npx jest <경로>`
- RPC에서 던진 오류는 `errorMessage`로 호출 쪽에 다시 던져진다(`packages/api-utils/src/messageBroker.ts`). 오류 코드는 계약대로 `TICKET_VIEW_LINK_EXPIRED`·`TICKET_VIEW_NOT_FOUND`·`TICKET_VIEW_NOT_ALLOWED`를 `new Error(코드)`로 던진다.
- 위젯 스타일은 `widgets/client/messenger/sass/components/*.scss`를 고치고, 같은 규칙을 `sass/style.css`와 `sass/style.min.css`에도 넣는다(앱은 `style.min.css`를 불러옴).
- 새 문구는 `widgets/locales/ko.json`과 `widgets/locales/en.json`에 넣는다(다른 언어는 키 문구로 보임).
- 기존 위젯 연산·화면 동작은 바꾸지 않는다(FR-015).

---

## Phase 1: Setup (공통 뼈대)

**Purpose**: 새 탭 페이지가 서버에서 열리고 빈 화면이라도 그려지게 한다.

- [X] T001 `widgets/webpack.config.js`의 `entry`에(운영용 `webpack.prod.config.js`는 공통 설정을 물려받아 수정 불필요) `ticketview: './client/ticketview/index.tsx'`를 추가한다(기존 진입점 순서·설정 유지).
- [X] T002 [P] `widgets/server/index.ts`에 `app.get('/ticket-view', …)`를 추가해 `res.render('widget', { type: 'ticketview', env: getEnv(req) })`로 내려 준다(`/messenger` 경로와 같은 방식). 열쇠는 주소 조각(#)이라 서버에서 읽지 않는다.
- [X] T003 [P] `widgets/client/ticketview/index.tsx`를 만들어 `#root`에 "불러오는 중" 문구만 그린다(뒤 작업에서 채움). `widgets` 개발 서버에서 `http://localhost:3200/ticket-view?lang=ko#test`가 열리는지 확인한다.

**Checkpoint**: 새 경로가 열리고 `ticketview.bundle.js`가 실린다.

---

## Phase 2: Foundational (링크 열쇠 — 모든 시나리오의 전제)

**Purpose**: 열쇠 발급·확인·연장. 이것이 없으면 어떤 시나리오도 동작하지 않는다.

- [X] T004 [P] `packages/plugin-tickets-api/test/ticketViewLink.test.ts`에 순수 함수 테스트를 먼저 쓴다(`../src/ticketViewLink`에서 가져옴):
  - `generateToken()`: base64url 문자만, 길이 43, 두 번 부르면 다름
  - `hashToken(token)`: 같은 입력 → 같은 64자 hex, 다른 입력 → 다름
  - `isLinkActive({ expiresAt }, now)`: `expiresAt > now`일 때만 true(같은 시각은 false)
  - `nextExpiry(now)`: `now + 24시간`
  - `shouldExtend({ lastUsedAt }, now)`: 마지막 사용 후 5분 이상이면 true, 미만이면 false
  - `canIssueLink({ customerId, ticketCustomerIds, conformityCustomerIds, customerCompanyIds, ticketCompanyIds })`: 티켓 고객 목록 또는 티켓–고객 연결에 있으면 true, 고객 회사와 티켓 회사가 겹치면 true, 아니면 false, `customerId`가 비면 false
  - 실행해 실패(모듈 없음)를 확인한다.
- [X] T005 `packages/plugin-tickets-api/src/ticketViewLink.ts`에 T004의 함수들을 구현해 테스트를 통과시킨다(`crypto.randomBytes(32).toString('base64url')`, `crypto.createHash('sha256')`, 상수 `TICKET_VIEW_LINK_TTL_MS = 24h`, `TICKET_VIEW_EXTEND_THROTTLE_MS = 5min`).
- [X] T006 [P] `packages/plugin-tickets-api/src/models/definitions/ticketViewLinks.ts`에 스키마를 만든다(data-model.md: `_id`, `tokenHash`(unique 인덱스), `ticketId`, `customerId`, `integrationId`, `createdAt`, `lastUsedAt`, `expiresAt`(인덱스 `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`)). 기존 `definitions/comments.ts`의 작성 방식(`schemaWrapper`, `field` 등)을 따른다.
- [X] T007 `packages/plugin-tickets-api/src/models/TicketViewLinks.ts`에 `loadTicketViewLinkClass(models)`와 `ITicketViewLinkModel`을 만든다(`models/Comments.ts` 방식):
  - `createLink({ ticketId, customerId, integrationId })` → 열쇠 생성, 지문만 저장, `{ token, expiresAt }` 반환
  - `useLink(token, now = new Date())` → 지문으로 찾고 `isLinkActive`가 아니면 `new Error('TICKET_VIEW_LINK_EXPIRED')`; `shouldExtend`면 `lastUsedAt`·`expiresAt` 갱신; `{ ticketId, customerId, integrationId }` 반환. 열쇠가 형식에 안 맞거나 없어도 같은 오류
- [X] T008 `packages/plugin-tickets-api/src/connectionResolver.ts`에 `TicketViewLinks` 모델을 등록한다(`IModels`에 필드 추가, `db.model('ticket_view_links', …)` — `Comments` 등록과 같은 방식).
- [X] T009 `packages/plugin-tickets-api/src/messageBroker.ts`에 RPC 2개를 추가한다:
  - `tickets:widgets.ticketViewLink.create` `{ customerId, ticketId, integrationId }`: 티켓을 찾고(없으면 `TICKET_VIEW_NOT_ALLOWED`), 고객이 볼 수 있는지 `canIssueLink`로 판단한다. 판단 재료는 `tickets:widgets.ticketList.find`(같은 파일)와 같은 출처를 쓴다: `ticket.customerIds`, core `conformities.findConformities`(ticket↔customer), core `customers.findOne`의 `companyIds`와 티켓의 회사 연결. 허용이면 `models.TicketViewLinks.createLink`, 아니면 `new Error('TICKET_VIEW_NOT_ALLOWED')`. 응답 `{ status: 'success', data: { token, expiresAt } }`
  - `tickets:widgets.ticketViewLink.use` `{ token }`: `models.TicketViewLinks.useLink(token)` 결과를 `{ status: 'success', data }`로
- [X] T010 T004 테스트를 다시 실행해 모두 통과하는지, tickets-api가 오류 없이 재시작되는지(`~/.pm2/logs/tickets-api-*.log`) 확인한다.

**Checkpoint**: tickets-api에서 열쇠를 만들고 확인할 수 있다.

---

## Phase 3: User Story 1 — 티켓을 새 탭에서 넓게 보기 (P1) 🎯 MVP

**Goal**: 위젯 진행 상황 화면의 버튼으로 그 티켓을 새 탭에서 본다.

**Independent Test**: quickstart 1·2·3·15 — 버튼 → 새 탭에 진행 단계·설명·첨부·처리 기록·댓글, 위젯을 닫아도 유지, 휴대폰 크기에서도 동작, 주소에 고객·티켓 식별 정보 없음.

### Tests (먼저 작성, 실패 확인)

- [X] T011 [P] [US1] `widgets/client/messenger/components/ticket/__tests__/openTicketView.test.ts`에 테스트를 쓴다:
  - `buildTicketViewUrl({ rootUrl, token, lang })` → `${rootUrl}/ticket-view?lang=${lang}#${token}`; `rootUrl` 끝의 `/` 하나 제거; `lang`이 없으면 `?lang=` 생략; 결과 주소에 토큰은 # 뒤에만 있음
  - `planOpenResult(blankWindow)` → 창이 null이면 `'fallback-link'`, 있으면 `'navigate'`

### Server

- [X] T012 [US1] `packages/plugin-tickets-api/src/messageBroker.ts`에 `tickets:widgets.ticketView.detail` `{ ticketId }` RPC를 추가한다: 티켓이 없거나 `status === 'archived'`면 `new Error('TICKET_VIEW_NOT_FOUND')`. 있으면 `{ ticket, stages, comments }`:
  - `ticket`: `widgets.ticketList.find`가 주는 필드 범위(`_id, number, name, description, stage{_id,name}, attachments, createdAt, requestType, type, status`)
  - `stages`: 같은 파이프라인 단계 `{ _id, name, order, status }`(inbox-api `widgetsTicketStages`와 같은 규칙)
  - `comments`: `tickets:widgets.comments.find`와 같은 모양
- [X] T013 [US1] `packages/plugin-inbox-api/src/graphql/widgetTypeDefs.ts`에 contracts의 `WidgetTicketViewLink`, `WidgetTicketView` 타입과 `widgetsTicketViewLinkCreate`(Mutation), `widgetsTicketView`(Query)를 추가한다.
- [X] T014 [US1] `packages/plugin-inbox-api/src/graphql/resolvers/widgetMutations.ts`에 `widgetsTicketViewLinkCreate`를 추가해 `sendTicketsMessage({ action: 'widgets.ticketViewLink.create', isRPC: true, … })`로 넘긴다(오류는 그대로 던짐).
- [X] T015 [US1] `packages/plugin-inbox-api/src/graphql/resolvers/widgetQueries.ts`에 `widgetsTicketView(token)`를 추가한다: `widgets.ticketViewLink.use` → `widgets.ticketView.detail` → core `activityLogs.findOne`(`contentType: 'tickets:ticket'`, 기존 `widgetsTicketActivityLogs`와 같은 호출) → `models.Integrations.findOne({ _id: integrationId })`의 `messengerData.allowedFileTypes`(없으면 빈 배열). 실패 시 RPC 오류 코드를 그대로 던진다.

### Widget — 버튼

- [X] T016 [US1] `widgets/client/messenger/components/ticket/openTicketView.ts`에 T011 함수를 구현해 통과시킨다.
- [X] T017 [P] [US1] `widgets/client/messenger/graphql/mutations.ts`에 `TICKET_VIEW_LINK_CREATE`(`widgetsTicketViewLinkCreate(customerId, ticketId, integrationId) { token expiresAt }`)를 추가하고 export 목록에 넣는다.
- [X] T018 [US1] `widgets/client/messenger/components/ticket/TicketProgressHero.tsx`에 선택 prop `onOpenInNewTab?: () => void`를 추가해, 있으면 카드 머리줄(번호·단계 표시 줄)에 "새 탭에서 보기" 작은 텍스트 버튼을 그린다. 없으면 지금과 똑같이 그린다(새 탭 페이지는 이 prop을 넘기지 않음).
- [X] T019 [US1] (구현 중 변경 — research D7: 화면을 열 때 링크를 받아 두고 버튼을 일반 링크로, `containers/ticket/useTicketViewLink.ts`) `widgets/client/messenger/containers/ticket/TicketShowProgress.tsx`에 여는 동작을 만든다: 클릭 즉시 `window.open('', '_blank')`로 빈 탭을 열고(`opener = null`), `TICKET_VIEW_LINK_CREATE`(`customerId: connection.data.customerId`, `ticketId: ticketData._id`, `integrationId: connection.data.integrationId`)를 부른 뒤 `buildTicketViewUrl`(`rootUrl`: `getEnv().ROOT_URL`, `lang`: 위젯의 현재 언어)로 그 탭을 이동한다. 빈 탭이 null이면 받은 주소를 화면 상태에 담아 "새 탭에서 열기" 링크(`target="_blank" rel="noopener noreferrer"`)로 보여 준다(FR-017). 발급 실패 시 빈 탭을 닫고 "잠시 후 다시 시도해 주세요" 안내(FR-012). 진행 상황 컴포넌트 `components/ticket/TicketShowPropgress.tsx`를 거쳐 `TicketProgressHero`에 `onOpenInNewTab`과 대체 링크를 넘긴다.

### Widget — 새 탭 페이지

- [X] T020 [P] [US1] `widgets/client/ticketview/graphql.ts`에 `TICKET_VIEW` 쿼리(`widgetsTicketView(token) { ticket stages comments activityLogs allowedFileTypes }`)를 만든다.
- [X] T021 [US1] `widgets/client/ticketview/TicketViewPage.tsx`를 만든다: `useQuery(TICKET_VIEW, { variables: { token }, fetchPolicy: 'network-only' })`. 정상이면 `progressSteps`·`buildThread`(`components/ticket/progressHelpers`)로 `TicketProgressHero`·`TicketThread`를 넓은 단일 열(가운데 정렬, 최대 폭 약 760px)로 그린다. 위쪽에 브랜드 없이 "티켓 진행 상황" 제목. 로딩 표시 포함(만료·없음·오류 화면은 US3).
- [X] T022 [US1] `widgets/client/ticketview/index.tsx`를 완성한다: `location.hash`에서 열쇠, `?lang`에서 언어를 읽고 `setLocale`(`client/utils`) 후 `ApolloProvider`(`client/apollo-client`)로 `TicketViewPage`를 그린다. `../messenger/sass/style.min.css`를 불러온다. 열쇠가 없으면 바로 만료 안내 상태로 넘긴다.
- [X] T023 [P] [US1] `widgets/client/messenger/sass/components/_ticket-view.scss`에 새 탭 배치(바탕, 가운데 열, 제목, 카드 간격, 버튼·대체 링크 모양)를 만들고 `sass/style.scss`에서 불러온 뒤, 같은 규칙을 `sass/style.css`·`sass/style.min.css`에 넣는다.
- [X] T024 [P] [US1] 문구 추가(`widgets/locales/ko.json`, `en.json`): "Open in new tab"→"새 탭에서 보기", "Open in a new tab"→"새 탭에서 열기", "Please try again in a moment."→"잠시 후 다시 시도해 주세요.", "Loading…"(없으면).
- [X] T025 [US1] T011 테스트 통과 확인 후, `specs/001-widget-ticket-new-tab/quickstart.md`의 시나리오 1·2·3·15를 로컬 위젯(확인용 페이지: `showTicket: true`, 가짜 메일 고객)으로 확인한다. 테스트 데이터는 끝나고 지운다.

**Checkpoint**: US1만으로 새 탭에서 티켓을 볼 수 있다(MVP).

---

## Phase 4: User Story 2 — 새 탭에서 댓글 달기 (P1)

**Goal**: 새 탭에서 댓글·첨부를 보내면 위젯에서 단 것과 같은 고객 댓글로 등록.

**Independent Test**: quickstart 4 — 새 탭에서 댓글+첨부 → 새 탭·위젯·직원 화면에 같은 고객 댓글.

- [X] T026 [US2] `packages/plugin-inbox-api/src/graphql/widgetTypeDefs.ts`에 `widgetsTicketViewCommentAdd(token, content, attachments): TicketComment` Mutation을 추가한다(기존 `widgetsTicketCommentAdd`와 같은 반환 타입).
- [X] T027 [US2] `packages/plugin-inbox-api/src/graphql/resolvers/widgetMutations.ts`에 `widgetsTicketViewCommentAdd`를 추가한다: `widgets.ticketViewLink.use`로 `{ ticketId, customerId }`를 얻고, 기존 `widgets.commentAdd`를 `{ type: 'ticket', typeId: ticketId, content, userType: 'client', customerId, attachments }`로 부른다. 티켓 id는 입력으로 받지 않는다(FR-008).
- [X] T028 [P] [US2] `widgets/client/messenger/components/ticket/useAttachUpload.ts`가 선택 인자 `allowedFileTypes?: string[]`를 받게 한다. 넘기지 않으면 지금처럼 `connection.data.messengerData.allowedFileTypes`를 쓴다(기존 호출부 수정 없음).
- [X] T029 [P] [US2] `widgets/client/ticketview/graphql.ts`에 `TICKET_VIEW_COMMENT_ADD` 뮤테이션을 추가한다.
- [X] T030 [US2] `widgets/client/ticketview/TicketViewPage.tsx` 아래쪽에 `TicketComposer`를 붙인다: 첨부는 `useAttachUpload(…, allowedFileTypes)`, 보내기는 `TICKET_VIEW_COMMENT_ADD` 후 `TICKET_VIEW`를 다시 불러 화면 갱신, 성공하면 입력·첨부 비우기, 실패하면 입력 유지.
- [X] T031 [US2] `specs/001-widget-ticket-new-tab/quickstart.md` 시나리오 4를 확인한다(직원 화면의 고객 댓글 표시 포함). 테스트 데이터 정리.

**Checkpoint**: 보기와 댓글이 모두 된다.

---

## Phase 5: User Story 3 — 오래된 링크·남의 링크 차단 (P1)

**Goal**: 만료·지어낸·다른 티켓용 링크로는 아무것도 보이거나 등록되지 않고, 안내만 보인다.

**Independent Test**: quickstart 5~13.

- [X] T032 [P] [US3] `widgets/client/ticketview/__tests__/viewState.test.ts`에 테스트를 쓴다: `viewStateFromError(error)` — 메시지가 `TICKET_VIEW_LINK_EXPIRED`면 `'expired'`, `TICKET_VIEW_NOT_FOUND`면 `'notFound'`, 그 밖(네트워크 등)은 `'error'`; GraphQL 오류 배열 안의 메시지도 인식.
- [X] T033 [US3] `widgets/client/ticketview/viewState.ts`를 구현해 통과시킨다.
- [X] T034 [US3] `widgets/client/ticketview/TicketViewPage.tsx`에 상태별 화면을 붙인다: `expired` → "링크가 만료됐어요. 위젯에서 '새 탭에서 보기'를 다시 눌러 주세요"(티켓 내용 없음), `notFound` → "티켓을 찾을 수 없어요", `error` → 다시 시도 버튼. 댓글 보내기가 `expired`로 실패하면 만료 안내를 띄우되 입력한 글은 지우지 않는다(FR-014).
- [X] T035 [P] [US3] 문구 추가(`ko.json`, `en.json`): 만료 안내, "티켓을 찾을 수 없어요", "다시 시도".
- [X] T036 [US3] `specs/001-widget-ticket-new-tab/quickstart.md` 시나리오 5~13을 확인한다: DB에서 `ticket_view_links`의 `expiresAt`을 과거로(5·6), `lastUsedAt`을 23시간 전으로(7, 연장 확인), 버튼 재발급(8), 연산 직접 호출로 다른 티켓·다른 고객 시도(9·11), 지어낸 열쇠(10), 티켓 보관(12), 팝업 차단(13). 테스트 데이터 정리.

**Checkpoint**: 링크 유출·만료 상황에서 정보가 새지 않는다.

---

## Phase 6: User Story 4 — 새 탭에 새 소식 반영 (P2)

**Goal**: 열어 둔 새 탭에서 새로 고침하면 직원 답변이 보인다.

**Independent Test**: quickstart US4 — 직원이 답변 → 새 탭 새로 고침 → 보임. 위젯과 새 탭 양쪽 댓글 일치.

- [X] T037 [US4] 새로 고침 시 주소 조각(#)의 열쇠가 유지되고 `network-only` 조회로 새 답변이 보이는지 확인한다. 위젯에서 단 댓글이 새 탭 새로 고침에, 새 탭에서 단 댓글이 위젯에 보이는지 확인한다. 코드 변경이 필요하면 `widgets/client/ticketview/TicketViewPage.tsx`에서만 고친다.

---

## Phase 7: Polish & Cross-Cutting

- [X] T038 [P] 전체 테스트: tickets-api `ticketViewLink.test.ts`, widgets `npx jest client/ticketview client/messenger/components/ticket`.
- [X] T039 `specs/001-widget-ticket-new-tab/quickstart.md` 시나리오 14: 기존 위젯 티켓 목록·상세·댓글·접수가 이전과 같은지 확인(FR-015, SC-005). 버튼 → 새 탭 표시까지 3초 이내인지 확인(SC-001).
- [X] T040 code-reviewer 에이전트로 전체 변경(`packages/plugin-tickets-api/src`, `packages/plugin-inbox-api/src/graphql`, `widgets/client`, `widgets/server/index.ts`) 리뷰, security-reviewer 에이전트로 열쇠·공개 연산 보안 리뷰. CRITICAL·HIGH 지적은 반영.
  - 반영 내용과 반영하지 않은 제안은 research.md D12. 확인은 quickstart.md 시나리오 15~24(실제 브라우저, 팝업 차단 켠 상태).
  - 그 결과 앞 작업의 일부가 바뀌었다: 열쇠의 `integrationId` 제거(T006·T007·T009·T014·T017), RPC `use` 입력은 `{ tokenHash, forComment? }`(T009·T015), 조회의 `ticket`은 JSON(T012·T013·T020), RPC 처리는 `packages/plugin-tickets-api/src/ticketViewRpc.ts`로 분리, 새 inbox-api 도우미 `packages/plugin-inbox-api/src/ticketViewWidget.ts`(+ `test/ticketViewWidget.test.ts`).
- [X] T041 커밋을 나눈다(`.specify/memory/constitution.md` V): tickets-api `feat(tickets): …`, inbox-api `feat(messenger): …`(위젯 공개 연산), widgets `feat(messenger): …`. 본문에 배포 순서(tickets-api → inbox-api → widgets) 명시. 사용자가 요청할 때만 커밋·푸시.
  - `4574683823` tickets-api, `e9026b1b7f` inbox-api, `65b2b96306` widgets, 이어서 스펙 문서. 푸시는 하지 않음.

---

## Dependencies & Execution Order

- **Setup (T001~T003)** → 어디서나 먼저.
- **Foundational (T004~T010)** → 모든 시나리오의 전제. T004 → T005, T006 → T007 → T008 → T009 → T010.
- **US1 (T011~T025)**: Foundational 뒤. 서버(T012→T013→T014→T015)와 위젯 버튼(T016~T019), 새 탭 페이지(T020~T024)는 서로 다른 파일이라 나눠 진행 가능. T025는 모두 끝난 뒤.
- **US2 (T026~T031)**: US1의 T015·T021 뒤(같은 파일에 덧붙임).
- **US3 (T032~T036)**: US1 뒤. 열쇠 차단 자체는 Foundational에서 이미 동작하고, 여기서는 화면 상태와 검증.
- **US4 (T037)**: US1·US2 뒤, 확인 위주.
- **Polish (T038~T041)**: 마지막.

시나리오 간 순서: US1(MVP) → US2 → US3 → US4. US2와 US3은 US1 뒤에 서로 독립.

## Parallel Example

```text
# Foundational
T004(테스트) ∥ T006(스키마)

# US1 — 서로 다른 파일
T011(위젯 테스트) ∥ T017(위젯 뮤테이션) ∥ T020(새 탭 쿼리) ∥ T023(스타일) ∥ T024(문구)

# US2
T028(업로드 훅) ∥ T029(새 탭 뮤테이션)

# US3
T032(상태 테스트) ∥ T035(문구)
```

## Implementation Strategy

1. **MVP**: Setup → Foundational → US1. 여기서 멈춰 quickstart 1·2·3·15를 확인하면 "넓게 보기"는 출시 가능.
2. **US2**로 댓글을 붙이고, **US3**로 만료·차단 화면과 보안 검증을 마친다. 링크가 공개 열쇠라 **US3 확인 전에는 운영 배포하지 않는다**.
3. **US4** 확인 후 Polish(리뷰·회귀·커밋).
4. 배포: tickets-api → inbox-api → widgets.
