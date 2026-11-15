---

description: "Task list for 위젯 티켓 접수 후 수정"
---

# Tasks: 위젯 티켓 접수 후 수정

**Input**: Design documents from `/specs/004-widget-ticket-edit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql.md, quickstart.md

**Tests**: 헌장 결합 원칙(테스트 인프라 있는 패키지는 TDD)에 따라 순수 함수 단위 테스트를 구현보다 먼저 작성한다. 화면은 quickstart.md 시나리오로 실제 구동 확인한다.

**Organization**: 사용자 스토리별로 묶는다. US1·US2·US3은 P1, US4는 P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이고 미완료 작업에 의존하지 않아 병렬 가능
- **[Story]**: US1~US4 (spec.md 사용자 스토리)

## 테스트 실행 명령 (참고)

- tickets-api: `cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/widgetTicketEdit.test.ts"]}'`
- inbox-api: 위 명령에서 `plugin-tickets-api` → `plugin-inbox-api`
- widgets: `cd widgets && npx jest client/messenger/components/ticket/__tests__/editHelpers.test.ts`

---

## Phase 1: Setup

**Purpose**: 테스트 실행 경로 확인

- [X] T001 기존 테스트가 위 명령 방식으로 통과하는지 확인: `packages/plugin-tickets-api/test/ticketViewLink.test.ts`, `packages/plugin-inbox-api/test/ticketViewWidget.test.ts`, `widgets/client/messenger/components/ticket/__tests__/submitHelpers.test.ts` (기준선 기록)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 서버 판정·저장 규칙과 GraphQL 계약. 모든 스토리가 이것에 의존한다.

**⚠️ CRITICAL**: 이 단계가 끝나야 스토리 작업을 시작한다.

### 테스트 먼저 (실패 확인)

- [X] T002 [P] tickets-api 순수 함수 테스트 작성 `packages/plugin-tickets-api/test/widgetTicketEdit.test.ts` — `isTicketOwner`(customerIds 포함/비었을 때 conformity 목록 사용/회사 연결 무시), `isFirstStage`(archived 단계 제외·order 정렬·단계 1개), `toWidgetDescriptionHtml`(접수 경로와 같은 결과: 줄마다 `<p>`, 빈 줄 제거, 태그 있으면 그대로), `computeChangedFields`(보낸 필드만 비교, 첨부는 url 목록 비교, 변화 없으면 빈 배열), `validateEditAttachments`(기존 url 허용·저장 키 허용·외부 주소 거절·개수 상한), `decideEdit`(본인 아님/보관 → NOT_ALLOWED, 첫 단계 아님 + visibility 외 변경 → STAGE_LOCKED, 첫 단계 아님 + visibility만 → 허용)
- [X] T003 [P] inbox-api 입력 형식 검증 테스트 작성 `packages/plugin-inbox-api/test/widgetTicketEdit.test.ts` — `validateWidgetTicketEdit`: visibility는 `public`/`private`만, type은 요청 구분 7가지만, description은 보냈다면 공백만 금지·길이 상한(댓글 상한과 같은 값), 첨부 개수 상한·`url`/`name` 문자열 필수. 실패 시 `TICKET_EDIT_INVALID_INPUT`

### 구현

- [X] T004 tickets-api 판정·저장 모듈 신규 `packages/plugin-tickets-api/src/widgetTicketEdit.ts` — 오류 코드 상수 3종(`TICKET_EDIT_NOT_ALLOWED`, `TICKET_EDIT_STAGE_LOCKED`, `TICKET_EDIT_INVALID_INPUT`), T002의 순수 함수들, `getWidgetTicketEditState(models, subdomain, sendCore, { customerId, ticketId })`(본인 아니거나 티켓 없으면 `{canEdit:false, canEditContent:false, ticket:null}`), `saveWidgetTicketEdit(models, subdomain, sendCore, input)`(decideEdit → 변화 없으면 저장 없이 상태 반환 → `updateOne $set`(type이면 requestType 동시, modifiedAt) → `ticketsPipelinesChanged:{pipelineId}` 발행 → 갱신된 상태 반환). 활동 기록 호출 자리는 US4에서 추가. `itemsEdit` 사용 금지(research R7). T002 통과 확인
- [X] T005 tickets-api RPC 등록 `packages/plugin-tickets-api/src/messageBroker.ts` — `tickets:widgets.ticketEdit.state`, `tickets:widgets.ticketEdit.save` (`widgets.ticketViewLink.create` 등록 방식과 동일하게 `{status:'success', data}` 반환, 오류는 throw)
- [X] T006 [P] inbox-api 입력 검증 신규 `packages/plugin-inbox-api/src/widgetTicketEdit.ts` — `validateWidgetTicketEdit`(T003 통과), 상한 값은 `ticketViewWidget.ts`의 상수 재사용
- [X] T007 inbox-api 스키마 `packages/plugin-inbox-api/src/graphql/widgetTypeDefs.ts` — `tickets` 조건 블록 안에 `type WidgetTicketEditState`, 조회 `widgetsTicketEditState(customerId: String!, ticketId: String!)`, 뮤테이션 `widgetsTicketEdit(customerId, ticketId, type, description, attachments, visibility)` — 제목 인자 없음 (contracts/graphql.md)
- [X] T008 [P] inbox-api 조회 리졸버 `packages/plugin-inbox-api/src/graphql/resolvers/widgetQueries.ts` — `widgetsTicketEditState` → `sendTicketsMessage('widgets.ticketEdit.state')`, 실패 시 `defaultValue`로 버튼 숨김 상태
- [X] T009 [P] inbox-api 뮤테이션 리졸버 `packages/plugin-inbox-api/src/graphql/resolvers/widgetMutations.ts` — `widgetsTicketEdit`: `validateWidgetTicketEdit` → `sendTicketsMessage('widgets.ticketEdit.save', isRPC)`, 오류 메시지 그대로 전달
- [X] T010 [P] 위젯 GraphQL 문서 `widgets/client/messenger/graphql/queries.ts`(`TICKET_EDIT_STATE`), `widgets/client/messenger/graphql/mutations.ts`(`TICKET_EDIT`) — 둘 다 `canEdit canEditContent ticket` 선택
- [X] T011 위젯 수정 도우미 테스트 먼저 `widgets/client/messenger/components/ticket/__tests__/editHelpers.test.ts` — `descriptionToText`(`<p>a</p><p>b</p>`→`a\nb`, `<br>`→줄바꿈, 태그 제거, `&amp; &lt; &gt; &quot; &#39; &nbsp;` 복원), `buildEditVariables`(설명은 바뀐 경우만, 첨부는 url 목록이 다를 때만, 새 첨부는 저장 키 그대로, `canEditContent=false`면 visibility만), `editErrorNotice`(오류 코드 3종 → 안내 문구, 그 밖은 일반 문구)
- [X] T012 위젯 수정 도우미 구현 `widgets/client/messenger/components/ticket/editHelpers.ts` — T011 통과

**Checkpoint**: 서버 계약 완성, 단위 테스트 통과. GraphQL로 수정 상태 조회·저장 가능.

---

## Phase 3: User Story 1 - 접수한 티켓 내용 고치기 (Priority: P1) 🎯 MVP

**Goal**: 첫 단계 본인 티켓을 수정 화면에서 고쳐 저장하고 진행 상황 화면에 바로 반영.

**Independent Test**: quickstart 시나리오 1~5.

- [X] T013 [P] [US1] 상단 카드 "수정" 버튼 `widgets/client/messenger/components/ticket/TicketProgressHero.tsx` — `edit?: { onClick: () => void }` prop, 번호·상태 줄에 버튼(새 탭 버튼 옆). prop이 없으면 그리지 않음(새 탭 화면 영향 없음)
- [X] T014 [P] [US1] 접수 폼 수정 모드 `widgets/client/messenger/components/ticket/TicketSubmitForm.tsx` — props `mode?: 'submit' | 'edit'`, `contentLocked?: boolean`, `lockedNotice?: string`, `saveNotice?: string`, `onBack?`. edit 모드: 제목 `readOnly`·`aria-readonly`, 연락처 영역 숨김, 제목 `Container`는 "티켓 수정", `backRoute="ticket-progress"`, 버튼 "저장하기", `isSubmitted` 자동 이동 효과는 submit 모드에서만. 기본값은 지금 동작 그대로
- [X] T015 [US1] 수정 화면 컨테이너 신규 `widgets/client/messenger/containers/ticket/TicketEditContainer.tsx` — 진입 시 `TICKET_EDIT_STATE`를 `network-only`로 조회, 결과로 formData(ticketType·title·description=`descriptionToText`·visibility)와 files(기존 첨부) 채움, 저장 시 `buildEditVariables` → `TICKET_EDIT`, 성공하면 `setTicketData({...ticketData, ...ticket})` 후 `setRoute('ticket-progress')`, 실패하면 `editErrorNotice`로 안내하고 입력 유지. `canEdit=false`면 안내 후 진행 상황으로
- [X] T016 [US1] 라우트 추가 `widgets/client/messenger/components/Messenger.tsx` — `case "ticket-edit"` → `TicketEditContainer`
- [X] T017 [US1] 진행 상황 컨테이너 수정 상태 조회 `widgets/client/messenger/containers/ticket/TicketShowProgress.tsx` — `TICKET_EDIT_STATE`(`cache-and-network`, `skip: !ticketData._id || !customerId`), `canEdit`이면 `edit = { onClick: () => setRoute('ticket-edit') }`를 넘김
- [X] T018 [US1] edit prop 전달 `widgets/client/messenger/components/ticket/TicketShowPropgress.tsx` → `TicketProgressHero`
- [X] T019 [P] [US1] 스타일 `widgets/client/messenger/sass/components/_ticket.scss` — 수정 버튼(`.tp-edit`, `.tp-newtab`와 같은 톤), 읽기 전용 제목(`.ts-input[readonly]`), 안내(`.ts-notice`). 빌드 산출 `widgets/client/messenger/sass/style.css`·`style.min.css` 갱신(기존 커밋 관행)
- [ ] T020 [US1] quickstart 시나리오 1~5 실제 위젯 구동 확인(설명 줄바꿈 왕복, 첨부 빼기·추가, 저장 없이 뒤로)

**Checkpoint**: 첫 단계 티켓 수정 MVP 동작.

---

## Phase 4: User Story 2 - 처리 시작 후 공개 설정 바꾸기 (Priority: P1)

**Goal**: 첫 단계가 지난 본인 티켓에서 공개 설정만 바꿀 수 있다.

**Independent Test**: quickstart 시나리오 6·7.

- [X] T021 [US2] 잠금 모드 표시 `widgets/client/messenger/components/ticket/TicketSubmitForm.tsx` — `contentLocked`면 요청 구분 칩 `disabled`·설명 `readOnly`·첨부 버튼 숨김·칩 삭제 버튼 숨김(파일은 보기만), 상단에 `lockedNotice`("처리가 시작되어 공개 설정만 바꿀 수 있어요"), 저장 가능 조건은 공개 설정만 보고 판단
- [X] T022 [US2] 컨테이너 연결 `widgets/client/messenger/containers/ticket/TicketEditContainer.tsx` — `contentLocked = !canEditContent`, 저장 변수는 `buildEditVariables`가 visibility만 만들도록
- [ ] T023 [US2] quickstart 시나리오 6·7 실제 구동 확인(동료 B의 회사 티켓 목록에서 사라지는지 포함)

**Checkpoint**: 단계와 상관없이 공개 설정 변경 가능.

---

## Phase 5: User Story 3 - 수정할 수 없는 경우 막기 (Priority: P1)

**Goal**: 동료·방문자·남의 티켓은 버튼 없음·요청 거절, 처리 시작 후 내용 변경은 거절하고 안내.

**Independent Test**: quickstart 시나리오 8~10, 12.

- [X] T024 [US3] 단계 잠김 응답 처리 `widgets/client/messenger/containers/ticket/TicketEditContainer.tsx` — `TICKET_EDIT_STAGE_LOCKED`를 받으면 안내 표시 + `TICKET_EDIT_STATE` 재조회로 잠금 모드 전환, 쓴 글(formData)은 덮어쓰지 않음
- [ ] T025 [US3] quickstart 시나리오 8~10, 12 실제 구동 확인(GraphQL 직접 요청으로 `NOT_ALLOWED`·`STAGE_LOCKED` 확인, 새 탭에 버튼 없음)

**Checkpoint**: 경계 조건 모두 서버·화면에서 막힘.

---

## Phase 6: User Story 4 - 담당자가 고객 수정 사실 확인 (Priority: P2)

**Goal**: 값이 바뀐 저장마다 직원 활동 기록에 "고객이 수정함 — 바뀐 항목".

**Independent Test**: quickstart 시나리오 11.

- [X] T026 [US4] 테스트 추가 `packages/plugin-tickets-api/test/widgetTicketEdit.test.ts` — `buildCustomerEditActivity(ticketId, customerId, changedFields)`가 `{ action:'customerEdit', data:{ contentType:'ticket', contentId, action:'customerEdit', createdBy, content:{ changedFields } } }`를 만드는지
- [X] T027 [US4] 활동 기록 남기기 `packages/plugin-tickets-api/src/widgetTicketEdit.ts` — `buildCustomerEditActivity` 구현, `saveWidgetTicketEdit`에서 `changedFields`가 있을 때만 `putActivityLog`(`../logUtils`) 호출
- [X] T028 [P] [US4] 직원 화면 표시 부품 신규 `packages/plugin-tickets-ui/src/activityLogs/components/CustomerEditLog.tsx` — "고객이 티켓을 수정했습니다" + 바뀐 항목 한국어 이름(요청 구분·설명·첨부파일·공개 설정) + 시각(`CreatedLog`와 같은 레이아웃)
- [X] T029 [US4] 분기 추가 `packages/plugin-tickets-ui/src/activityLogs/activityLog.tsx` — `case "customerEdit"` → `renderDetail(activity.contentType, <CustomerEditLog activity={activity} />)`
- [X] T030 [US4] quickstart 시나리오 11 실제 구동 확인(값 변화 없는 저장은 기록 없음 포함)

**Checkpoint**: 모든 스토리 완료.

---

## Phase 7: Polish & Cross-Cutting

- [X] T031 [P] 타입체크: `widgets`(tsc), `packages/plugin-tickets-api`, `packages/plugin-inbox-api`, `packages/plugin-tickets-ui` 변경 파일 오류 없음 확인
- [ ] T032 [P] 성능 확인: 진행 상황 화면 네트워크 탭에서 추가 조회가 `widgetsTicketEditState` 1건뿐이고 목록·단계 조회 횟수가 그대로인지
- [ ] T033 quickstart.md 전체 재실행, 결과(통과·실패·건너뜀)를 있는 그대로 기록

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: 기준선 확인 후 시작
- **Phase 2**: T002·T003 먼저(병렬) → T004 → T005 / T006 → T007 → T008·T009(병렬). T010, T011 → T012는 서버와 병렬 가능
- **US1 (Phase 3)**: Phase 2 완료 후. T013·T014·T019 병렬 → T015 → T016 → T017 → T018 → T020
- **US2 (Phase 4)**: US1의 T014·T015에 의존(같은 파일 확장)
- **US3 (Phase 5)**: 서버 거절은 Phase 2에서 완성. 화면 처리 T024는 T015 이후
- **US4 (Phase 6)**: Phase 2 이후 언제든. 직원 UI(T028·T029)는 위젯 작업과 병렬 가능
- **Polish**: 모든 스토리 이후

## Parallel Examples

```text
# Phase 2 테스트 먼저
Task: T002 tickets-api widgetTicketEdit.test.ts
Task: T003 inbox-api widgetTicketEdit.test.ts
Task: T011 widgets editHelpers.test.ts

# US1 화면 부품
Task: T013 TicketProgressHero.tsx 수정 버튼
Task: T014 TicketSubmitForm.tsx 수정 모드
Task: T019 _ticket.scss 스타일

# US4 직원 화면 (위젯과 병렬)
Task: T028 CustomerEditLog.tsx
```

## Implementation Strategy

1. **MVP**: Phase 1·2 + US1 → 첫 단계 티켓 수정 동작 확인 후 멈춰서 검증
2. US2(공개 설정 상시 변경) → US3(거절 화면 처리) → US4(직원 활동 기록)
3. 커밋은 사용자 요청 시에만. 나눈다면: `feat(tickets): 위젯 티켓 수정 API 추가`(서버) / `feat(messenger): 위젯에서 접수한 티켓 수정`(위젯) / `feat(tickets): 고객 티켓 수정 활동 기록 표시`(직원 UI)

## Notes

- 접수 경로(`widgets.createTicket`)·목록 핸들러(`widgets.ticketList.find`)는 수정하지 않는다(plan 후속 제안 참고)
- 제목(`name`)은 어떤 입력에도 넣지 않는다
