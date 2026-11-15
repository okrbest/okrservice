# Implementation Plan: "위젯" 요청 유형을 운영자 보드로 따로 받기

**Branch**: `006-widget-ticket-own-board` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

## Summary

요청 유형 `widget`(이름 "위젯", 설명 "위젯·챗봇 관련 문의")을 추가하고, tickets-api의 위젯 티켓 생성(`widgets.createTicket`)에서 이 유형만 운영 설정값 `WIDGET_TICKET_STAGE_ID`의 단계로 바꿔 넣는다. 고객 화면은 기존 흐름 그대로, 관리 화면은 유형 이름·색·필터만 추가한다. 004 티켓 수정에서는 `widget` ↔ 다른 유형 전환을 서버(tickets-api)와 화면 양쪽에서 막는다.

## Technical Context

- **위젯**: React(TypeScript), `widgets/client/messenger` — 요청 유형 목록은 `TicketSubmitForm.tsx`의 `REQUEST_TYPES`, 표시 이름은 `widgets/locales/*.json`의 유형 값 키.
- **tickets-api**: `messageBroker.ts`의 `tickets:widgets.createTicket` → `itemsAdd`. 004 수정은 `src/widgetTicketEdit.ts`.
- **inbox-api**: 004 수정 입력 검증 `src/widgetTicketEdit.ts`의 `REQUEST_TYPES`.
- **관리 화면**: `packages/ui-tickets`(TicketItem·TicketEditForm·Archive*), `packages/plugin-tickets-ui`(TicketFilterDrawer), `packages/core-ui/public/locales`.
- **테스트**: tickets-api·inbox-api는 widgets jest로 실행(004와 같은 방식), 위젯은 widgets jest.

## 결정

| 결정 | 이유 |
|---|---|
| 보드 선택은 tickets-api 생성 시점에서 | 고객 화면이 보낸 단계 값과 무관하게 서버가 정한다(FR-002). 생성 경로가 한 곳이다. |
| 설정은 tickets-api 환경변수 `WIDGET_TICKET_STAGE_ID` | 운영 환경마다 다른 값, 코드 고정 금지(FR-003). 운영 configs의 tickets-api env에 넣는다. |
| 설정 단계가 없으면 원래 단계 + `console.warn` | 제출 실패 0건(FR-004, SC-004). |
| 004 전환 금지는 tickets-api에서 `TICKET_EDIT_INVALID_INPUT` | 004 계약에 있는 오류 코드를 재사용. inbox-api 목록엔 `widget`을 넣어 유형을 바꾸지 않는 수정은 통과시킨다. |
| 티켓 번호 | 같은 번호 형식 파이프라인은 lastNum을 공유(`createBoardItem`의 updateMany) — 겹치지 않음, 변경 없음. |

## 운영 확인 사항 (코드 밖)

- "위젯" 파이프라인이 비공개(private)면 번호로 진행 상황 조회(`widgets.fetchTicketProgress`)가 권한 검사에서 실패한다(`checkItemPermByUser`가 user 없이 `user._id` 접근). 공개로 두거나 별도 수정이 필요 — 사용자 결정.
- 처리 완료 안내 자동화 트리거는 운영자가 추가(US5).

## Constitution Check

- 최소 범위: 유형 추가·생성 시 단계 교체·전환 금지·표시 이름만. 통과.
- perf: 생성 시 단계 존재 확인 쿼리 1회(`widget` 유형일 때만). 통과.
- 시크릿 없음. 단계 ID는 설정값. 통과.
