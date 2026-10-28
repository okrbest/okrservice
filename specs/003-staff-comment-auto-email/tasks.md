---
description: "직원 댓글 뒤 고객 알림 메일 자동 발송 작업 목록"
---

# Tasks: 직원 댓글 뒤 고객 알림 메일 자동 발송

**Input**: [plan.md](./plan.md), [spec.md](./spec.md)

**Tests**: 순수 로직은 테스트 먼저(RED 확인 후 GREEN). 실동작은 로컬 서버로 확인.

## Phase 1: 기반

- [X] T001 tickets-api 타입 오류 기준값 기록(`npx tsc --noEmit` 오류 수)
- [X] T002 [P] `packages/plugin-tickets-api/test/autoCustomerEmail.test.ts` 작성: `autoEmailDueAt(now)`=now+10분, `processDueAutoCustomerEmails`가 ① 예정 지난 티켓을 하나씩 가져가며 트리거를 보냄 ② 가져갈 게 없으면 멈춤 ③ 보관(archived) 티켓은 보내지 않음 ④ 트리거 payload(type·triggerSource·manualEmailRequest:true·emailSent 그대로) ⑤ 보내기 실패해도 다음 티켓 계속·예외 밖으로 안 던짐 ⑥ 한 번에 처리 개수 상한. 실행해 **실패** 확인
- [X] T003 `packages/plugin-tickets-api/src/autoCustomerEmail.ts` 구현해 T002 통과(전송 함수는 주입 가능하게)

## Phase 2: US1·US2 — 직원 댓글 예약과 자동 발송 (P1)

- [X] T004 `src/models/definitions/tickets.ts`에 `autoEmailDueAt?: Date` 필드, `src/models/Tickets.ts`에 희소 색인 `{ autoEmailDueAt: 1 }`
- [X] T005 `src/messageBroker.ts` `tickets:widgets.commentAdd`의 직원 분기(`userType !== 'client'`) `$set`에 `autoEmailDueAt: autoEmailDueAt(new Date())` 추가
- [X] T006 `src/configs.ts` onServerInit에서 `startAutoCustomerEmailScheduler()` 시작(VERSION이 saas면 시작 안 함)

## Phase 3: US3 — 직접 누르면 취소 (P1)

- [X] T007 `src/graphql/resolvers/mutations/utils.ts` 수동 발송 뒤 `updateOne`에 `$unset: { autoEmailDueAt: '' }` 추가

## Phase 4: 확인·마무리

- [X] T008 단위 테스트 재실행, 타입 오류 수 비교
- [X] T009 로컬 실동작(실제 메일 없음): 이메일 없는 테스트 티켓으로 댓글 → 예약 저장, 두 번째 댓글로 미뤄짐, 시각 당김 → 1분 안에 트리거·자동화 실행 기록, `emailSent` 그대로, 필드 지워짐. 확인 조회 소요 시간 측정. 테스트 데이터 정리
- [X] T010 code-reviewer 에이전트 검토 후 CRITICAL·HIGH 반영, 완료 표시
