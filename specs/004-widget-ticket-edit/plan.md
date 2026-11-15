# Implementation Plan: 위젯 티켓 접수 후 수정

**Branch**: `004-widget-ticket-edit` (현재 작업 브랜치: `feature/skill-modify-hrchat-merge`) | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-widget-ticket-edit/spec.md`

## Summary

고객이 위젯에서 접수한 티켓을 진행 상황 화면의 "수정" 버튼으로 고친다. 제목은 바꿀 수 없고, 요청 구분·설명·첨부는 파이프라인 첫 단계에서만, 공개 설정은 단계와 상관없이(보관 제외) 접수자 본인만 바꾼다. 서버(tickets-api)가 본인·첫 단계·보관 여부를 판단해 수정 상태 조회와 저장 양쪽에서 같은 규칙을 적용하고, 값이 바뀐 저장만 활동 기록 `customerEdit`로 남긴다. 화면은 접수 폼(`TicketSubmitForm`)을 수정 모드로 재사용한다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (Node 18 서버, React 18 위젯)

**Primary Dependencies**: Apollo Client(위젯), Apollo Federation 서브그래프(inbox-api), erxes `api-utils` RPC(`sendTicketsMessage`·`consumeRPCQueue`), Mongoose(tickets-api)

**Storage**: MongoDB — 기존 `tickets`, `stages`, core `activity_logs`. 스키마 변경 없음

**Testing**: jest(widgets 패키지의 jest를 tickets-api·inbox-api 테스트에도 `--config`로 사용) + 실제 위젯 구동 확인

**Target Platform**: 메신저 위젯(PC·모바일 브라우저), erxes 직원 화면

**Project Type**: 모노레포 웹 앱(위젯 프론트 + erxes 플러그인 백엔드 + 직원 UI 플러그인)

**Performance Goals**: 진행 상황 화면에 조회 1개 추가(`cache-and-network`), 목록·단계 조회 정책 변경 없음

**Constraints**: 제목 변경 경로 없음, 판정은 서버에서, 직원 편집 경로(`itemsEdit`)의 알림·자동화를 타지 않음

**Scale/Scope**: GraphQL 조회 1·뮤테이션 1, RPC 2, 위젯 화면 1(재사용), 직원 활동 기록 표시 1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판단 | 근거 |
|---|---|---|
| I. 최소 범위 | ✅ | 접수 경로(`widgets.createTicket`)·목록 핸들러는 손대지 않는다. 설명 변환 규칙은 새 함수로 두고 통합은 제안만 |
| II. 스펙 비례 | ✅ | API 추가 + 다중 패키지 → spec-kit 경로 |
| III. 실동작 검증 | ✅ | [quickstart.md](./quickstart.md) 구동 시나리오 12개 |
| IV. 성능 회귀 금지 | ✅ | 진행 상황 화면 조회 1개 추가, `cache-and-network`(같은 화면 기존 조회와 동일). 단계 조회 cache-first·지연 마운트 유지. 수정 화면은 진입 시 1회 `network-only` |
| V. 커밋 규칙 | ✅ | scope: 서버 `tickets`, 위젯 `messenger` |
| Stack: widgets 스타일 | ✅ | 티켓 화면은 클래스 + `sass/components/_ticket.scss` 관행 → 그대로 따름 |
| Stack: gateway 영향 | ✅ | 기존 `widgets*` 서브그래프에 필드 추가뿐, pathRewrite 무관 |
| 시크릿 | ✅ | 해당 없음 |

**Post-design 재확인**: 위와 동일, 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/004-widget-ticket-edit/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/graphql.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/plugin-tickets-api/
├── src/widgetTicketEdit.ts          # 신규: 본인·첫 단계 판정, 변경 항목 계산, 설명 변환, 첨부 검증, state/save
├── src/messageBroker.ts             # widgets.ticketEdit.state / widgets.ticketEdit.save 등록
└── test/widgetTicketEdit.test.ts    # 신규

packages/plugin-inbox-api/
├── src/widgetTicketEdit.ts          # 신규: 입력 형식 검증(첨부·visibility·설명 길이)
├── src/graphql/widgetTypeDefs.ts    # WidgetTicketEditState, 조회·뮤테이션
├── src/graphql/resolvers/widgetQueries.ts    # widgetsTicketEditState
├── src/graphql/resolvers/widgetMutations.ts  # widgetsTicketEdit
└── test/widgetTicketEdit.test.ts    # 신규

packages/plugin-tickets-ui/src/activityLogs/
├── activityLog.tsx                  # case 'customerEdit'
└── components/CustomerEditLog.tsx   # 신규

widgets/client/messenger/
├── graphql/queries.ts               # TICKET_EDIT_STATE
├── graphql/mutations.ts             # TICKET_EDIT
├── components/Messenger.tsx         # route 'ticket-edit'
├── containers/ticket/TicketShowProgress.tsx   # 수정 상태 조회 → edit prop
├── containers/ticket/TicketEditContainer.tsx  # 신규
├── components/ticket/TicketShowPropgress.tsx  # edit prop 전달
├── components/ticket/TicketProgressHero.tsx   # "수정" 버튼
├── components/ticket/TicketSubmitForm.tsx     # 수정 모드(제목 읽기 전용·연락처 숨김·잠금 안내)
├── components/ticket/editHelpers.ts           # 신규: HTML→입력칸 글, 보낼 변경분 계산, 오류 문구
├── components/ticket/__tests__/editHelpers.test.ts  # 신규
└── sass/components/_ticket.scss (+ 빌드된 style.css / style.min.css)  # 버튼·읽기 전용·안내 스타일
```

**Structure Decision**: 판정·저장 로직은 tickets-api의 새 파일 하나에 순수 함수 + RPC 처리로 모은다(`ticketViewRpc.ts`·`ticketViewLink.ts` 분리 관행과 같은 방식). inbox-api는 형식 검증과 전달만. 위젯은 기존 접수 폼을 재사용하고 수정 전용 순수 도우미만 새로 둔다.

## Complexity Tracking

위반 없음.

## 후속 제안 (이번 범위 밖)

- 접수 경로의 설명 변환(인라인 코드)을 `widgetTicketEdit`의 함수로 통합.
- 접수 경로 첨부도 저장 키로 통일.
- `widgets.ticketList.find` 3중 등록 정리.
