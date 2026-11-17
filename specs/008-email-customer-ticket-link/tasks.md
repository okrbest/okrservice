# Tasks: 자동화 메일에 고객용 티켓 바로 열기 링크

**Input**: `specs/008-email-customer-ticket-link/` (plan.md, spec.md, research.md, data-model.md, contracts/rpc.md, quickstart.md)

**Tests**: 규칙은 순수 함수로 두고 TDD(테스트 먼저). 메일 발송·링크 열기는 quickstart.md 2절 실동작 확인.

경로 기준: `T = packages/plugin-tickets-api`, `A = packages/plugin-automations-api`, `W = widgets`

## Phase 1: Setup

- [X] T001 테스트 실행 확인: quickstart.md 1절 명령으로 `T/test/ticketViewLink.test.ts`가 통과하고, `A/test/`(새 폴더)의 빈 테스트가 jest에 잡히는지 확인

## Phase 2: Foundational (열쇠 종류 — 모든 스토리가 의존)

- [X] T002 [P] `T/test/ticketViewLink.test.ts`에 실패하는 테스트 추가: 위젯 TTL 2일(`nextExpiry`), 메일 링크 `isLinkActive`(14일 안 활성·지나면 비활성·7일 최대 제한 미적용·폐기면 비활성), `emailLinkExpiry`(발급+14일), `linksToPrune` 메일 상한 20, `shouldRecheck`(checkedAt 없음/5분 지남 → true, 5분 안 → false)
- [X] T003 `T/src/ticketViewLink.ts`: `TICKET_VIEW_LINK_TTL_MS` 2일, 메일 상수(14일·20개·재확인 5분), `isLinkActive`에 `kind` 분기, `emailLinkExpiry`, `shouldRecheck` 추가 → T002 통과
- [X] T004 `T/src/models/definitions/ticketViewLinks.ts`: `kind`(선택, 'widget'|'email'), `checkedAt`(선택) 필드 추가
- [X] T005 `T/src/models/TicketViewLinks.ts`: `createLink(target, now, kind?)` — 위젯은 1분 발급 제한·5개 상한을 위젯 링크만 세고(`kind: { $ne: 'email' }`), 메일은 제한 없이 `expiresAt = emailLinkExpiry`, `checkedAt = now`, 메일 링크만 세어 20개 상한. `useLink`는 메일 링크면 만료 연장 안 함, 반환값에 `kind`·`checkedAt`·`_id` 포함. `markChecked(id, now)`, `revoke(id, now)` 추가

## Phase 3: User Story 1 + 2 — 메일 링크 발급·받는 사람별 바꾸기 (P1) 🎯 MVP

US1(고객이 열기)과 US2(받으면 안 되는 사람 제외)는 같은 발송 경로라 한 단계로 묶는다.

**Independent Test**: quickstart.md 2절 #1~#3, #7

- [X] T006 [US1] `T/src/ticketViewRpc.ts`: `createTicketViewLink`의 권한 판단을 `canCustomerViewTicket(models, subdomain, sendCore, { ticket, customerId })`로 분리(동작 동일), 위젯 발급은 이 함수를 쓰도록 변경
- [X] T007 [P] [US1] `T/test/ticketViewEmailLink.test.ts`(신규)에 실패하는 테스트: `createEmailTicketViewLink` — 티켓 고객이면 token 반환(kind email), 티켓 없음·보관·권한 없음이면 `null`(오류 아님), 연결 고객·공개+같은 회사 판단은 위젯과 같음(가짜 models/sendCore)
- [X] T008 [US1] `T/src/ticketViewRpc.ts`: `createEmailTicketViewLink` 구현 → T007 통과
- [X] T009 [US1] `T/src/messageBroker.ts`: `consumeRPCQueue('tickets:ticketView.createEmailLink')` 등록(오류 시에도 `data: null`로 응답)
- [X] T010 [US1] `T/src/fieldUtils.ts`: 자동화 속성 목록에 `customerTicketLink`(label 'Customer ticket link') 추가
- [X] T011 [P] [US2] `A/test/customerTicketLink.test.ts`(신규)에 실패하는 테스트: `hasCustomerTicketLink`(공백·인코딩 형태 감지), `buildCustomerTicketLinkHtml(url)`(`<a>` 태그·target _blank·이스케이프), `fillCustomerTicketLink(html, linkHtml)`(여러 개 모두, 인코딩 href 형태는 빈 값, 링크 없으면 빈 문자열), `resolveCustomerTicketLink`(가짜 deps: 직원 계정이면 발급 안 함, 고객 없음·티켓 자동화 아님·WIDGETS_DOMAIN 없음·RPC 실패/null이면 '', 발급되면 URL `${domain}/ticket-view#${token}`)
- [X] T012 [US2] `A/src/common/customerTicketLink.ts`(신규) 구현 → T011 통과. 로그에 본문·열쇠 출력 금지
- [X] T013 [US2] `A/src/common/emailUtils.ts`: `customerMapByEmail` 값에 고객 `_id`(customerId) 추가(두 곳), `sendEmails`에 `ticketId`(티켓 자동화일 때 target._id) 전달, 받는 사람 반복에서 `hasCustomerTicketLink(customHtml)`일 때만 `resolveCustomerTicketLink` → `mailOptions.html`에 바꾼 본문. `emailDeliveries.create`/`logAutomationDelivery`의 `body`는 원본 `customHtml` 그대로
- [X] T014 [US1] tickets-api·automations-api 변경 파일 타입 확인(ts-node 재시작 시 컴파일 오류 없음, `createBoardItem` 때처럼 반환 타입이 `unknown`이 되지 않게)

**Checkpoint**: quickstart 2절 #1~#3 — 고객 메일에 링크, 직원 메일엔 빈 자리, 발송 기록에 열쇠 없음

## Phase 4: User Story 3 — 14일·권한 재확인·안내 문구 (P1)

**Independent Test**: quickstart.md 2절 #4, #5

- [X] T015 [P] [US3] `T/test/ticketViewEmailLink.test.ts`에 실패하는 테스트: `useTicketViewLink` — 메일 링크이고 재확인 시각이 지났으면 `canCustomerViewTicket` 재확인, 통과하면 `markChecked`, 실패하면 `revoke` 후 `TICKET_VIEW_LINK_EXPIRED`, 5분 안이면 재확인 안 함, 위젯 링크는 재확인 안 함
- [X] T016 [US3] `T/src/ticketViewRpc.ts`: `useTicketViewLink(models, data, deps?)`에 재확인 추가(subdomain·sendCore 필요 → messageBroker 등록부에서 넘김) → T015 통과
- [X] T017 [US3] `T/src/messageBroker.ts`: `tickets:widgets.ticketViewLink.use` 호출에 subdomain·sendCoreMessage 전달
- [X] T018 [P] [US3] `W/client/ticketview/TicketViewPage.tsx` 만료 문구(영문 기본)와 `W/locales/ko.json`·`en.json`·`ja.json` 번역 교체(contracts/rpc.md 5절)

## Phase 5: User Story 4 — 위젯 링크 2일 (P3)

- [X] T019 [US4] `W/client/messenger/components/ticket/openTicketView.ts` 등 "하루" 주석을 2일로(동작은 서버 expiresAt 기준이라 코드 변경 없음). 관련 위젯 테스트 통과 확인

## Phase 6: Polish & 검증

- [X] T020 전체 단위 테스트(tickets-api·automations-api·widgets ticket 관련) 통과
- [ ] T021 (부분 완료: 발급·열기·댓글·권한 재확인·위젯 2일은 실제 서버로 확인. 실제 메일 발송은 로컬에 메일 설정·automations-api가 없어 단위 테스트로만 확인) 로컬 `WIDGETS_DOMAIN`을 automations-api에 설정하고 quickstart.md 2절 #1~#7 실동작 확인(메일 본문은 발송 로그/수신함으로 확인)
- [X] T022 code-reviewer 리뷰 후 CRITICAL/HIGH 반영

## Dependencies

- T002→T003→T004→T005 (기반) → Phase 3, 4
- T006→T007→T008→T009; T011→T012→T013 (T009 RPC 이름에 의존)
- T015→T016→T017 (T006 분리된 판단 함수에 의존)
- T018, T019는 서버와 독립

## Parallel

- T002, T007, T011, T015 테스트 작성은 서로 다른 파일 — 병렬 가능
- T018(위젯 문구)은 언제든 병렬

## MVP

Phase 1~3(메일에 고객 링크가 들어가고 열림). Phase 4의 권한 재확인은 출시 전 필수(스펙 P1).
