# Tasks: "위젯" 요청 유형을 운영자 보드로 따로 받기

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Phase 1: US1 위젯·챗봇 문의는 운영자 보드로 (P1)

- [X] T001 [US1] 단계 결정 테스트 `packages/plugin-tickets-api/test/widgetTicketRouting.test.ts` (위젯→설정 단계, 다른 유형 그대로, 설정 없음/없는 단계→원래 단계 + 기록)
- [X] T002 [US1] `packages/plugin-tickets-api/src/widgetTicketRouting.ts`의 `resolveWidgetTicketStageId`
- [X] T003 [US1] `packages/plugin-tickets-api/src/messageBroker.ts` `widgets.createTicket`에서 `WIDGET_TICKET_STAGE_ID`로 단계 교체
- [X] T004 [US1] 위젯 접수 유형 목록을 `widgets/client/messenger/components/ticket/requestTypes.ts`로 옮기고 "위젯 / 위젯·챗봇 관련 문의" 추가 (테스트 `__tests__/requestTypes.test.ts`)

## Phase 2: US2 고객 화면 동일 동작 (P1)

- [X] T005 [US2] `widgets/locales/{ko,en,ja}.json`에 `widget`·`위젯`(·설명) 표시 이름
- [ ] T006 [US2] 운영: "위젯" 파이프라인 공개 범위 확인 — 비공개면 번호로 진행 상황 조회가 실패(plan.md 운영 확인 사항)

## Phase 3: US3 관리 화면 (P2)

- [X] T007 [P] [US3] `packages/ui-tickets` TicketItem·TicketEditForm·ArchiveLeftPanel·ArchiveGroupList·ArchiveModal에 `widget` 이름·색
- [X] T008 [P] [US3] `packages/plugin-tickets-ui/src/tickets/components/TicketFilterDrawer.tsx` 필터에 `widget`

## Phase 4: US4 수정 시 전환 금지 (P2)

- [X] T009 [US4] `isWidgetTypeSwitch` 테스트·구현 (`widgetTicketRouting.ts`)
- [X] T010 [US4] `packages/plugin-tickets-api/src/widgetTicketEdit.ts` 저장 시 전환이면 `TICKET_EDIT_INVALID_INPUT`
- [X] T011 [US4] `packages/plugin-inbox-api/src/widgetTicketEdit.ts` 입력 검증 목록에 `widget` (유형 유지 수정 통과)
- [X] T012 [US4] 위젯 수정 화면: `selectableRequestTypes`로 위젯 티켓은 위젯만, 다른 티켓은 위젯 제외 (`TicketSubmitForm.tsx`, `TicketEditContainer.tsx`)

## Phase 5: US5 메일 + 배포 확인 (P3, 운영)

- [ ] T013 운영 tickets-api 환경변수 `WIDGET_TICKET_STAGE_ID` = 위젯 파이프라인 "요청" 단계 ID 설정 후 재배포
- [ ] T014 자동화 "이메일 보내기(요청,완료)"에 위젯 파이프라인 "완료" 단계 트리거 → 처리 완료 안내 연결
- [ ] T015 운영 확인: 위젯 유형 1건·단순문의 1건 제출 → 각 보드 확인, 위젯 티켓 진행 상황 조회, 완료 시 완료 안내만 수신
