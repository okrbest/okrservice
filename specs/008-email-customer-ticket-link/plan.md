# Implementation Plan: 자동화 메일에 고객용 티켓 바로 열기 링크

**Branch**: `008-email-customer-ticket-link` (스펙 디렉터리 기준, git 브랜치는 현재 작업 브랜치 사용) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-email-customer-ticket-link/spec.md`
**Design**: [docs/superpowers/specs/2026-11-17-email-customer-ticket-link-design.md](../../docs/superpowers/specs/2026-11-17-email-customer-ticket-link-design.md)

## Summary

자동화 메일 템플릿의 `{{ customerTicketLink }}` 자리를, 메일을 한 통씩 보낼 때 받는 고객 몫의 "티켓 열기" 링크(`<a>` 태그)로 바꾼다.
링크는 기존 위젯 "새 탭에서 보기" 열쇠에 **메일용 종류**를 더해 만든다 — 보낸 뒤 14일 고정, 열 때 5분마다 권한 재확인.
열쇠 발급·확인은 tickets-api, 받는 사람별 바꾸기는 automations-api가 맡는다. 화면은 기존 `/ticket-view`를 그대로 쓰고 만료 문구만 고친다.
위젯 링크 미사용 만료는 1일 → 2일.

## Technical Context

**Language/Version**: TypeScript (Node 18, ts-node), React(위젯)

**Primary Dependencies**: mongoose, erxes RPC(`consumeRPCQueue`/`sendCommonMessage`/`sendCoreMessage`), nodemailer/SES

**Storage**: MongoDB `ticket_view_links`(기존 컬렉션에 필드 추가: `kind`, `checkedAt`)

**Testing**: 순수 함수 단위 테스트 — widgets의 jest/ts-jest를 rootDir 지정으로 실행(tickets-api·automations-api 모두 러너 없음, 기존 관행). 메일 발송·링크 열기는 로컬 실동작 확인

**Target Platform**: 서버(automations-api, tickets-api), 고객 브라우저(위젯 `/ticket-view`)

**Project Type**: erxes 모노레포 백엔드 플러그인 2개 + 위젯 문구

**Performance Goals**: 템플릿에 칸이 없으면 추가 요청 0. 칸이 있으면 받는 사람당 RPC 최대 3회(직원 확인 1, 발급 1 — 발급 안에서 권한 판단). 링크 열 때 권한 재확인은 5분에 1번

**Constraints**: GraphQL 스키마 변경 없음(RPC만 추가). 기존 위젯 링크 동작은 미사용 만료 2일 외 그대로. 열쇠 원문은 저장·기록 금지

**Scale/Scope**: 고객 메일 수신자 티켓당 1~2명. 수정 파일 약 9개 + 신규 4개(순수 함수 2, 테스트 2)

## Constitution Check

| 원칙 | 판단 |
|---|---|
| I. 최소 범위 | 통과 — 링크 칸·메일용 열쇠·만료 문구·위젯 2일(사용자 결정)만. 만료 링크 재발급(C안), 직원용 `{{ link }}` 변경은 제외 |
| II. 스펙 비례 | 통과 — 서버 2곳 + 위젯, RPC 추가라 spec-kit 경로 |
| III. 실동작 검증 | quickstart.md 2절 — 실제 메일 발송 → 링크로 열기·댓글·직원 수신 메일 확인 |
| IV. 성능 회귀 금지 | 통과 — 칸이 없는 메일은 기존 경로 그대로(본문에 칸이 있는지 먼저 봄). 링크 열 때 core 조회는 5분 주기로 제한, 티켓 고객 목록으로 바로 확인되면 core 조회 없음 |
| V. Commits | `feat(tickets): …` 한 커밋 또는 서버/위젯으로 나눔 |
| 보안 | 열쇠 원문은 메일 본문에만. 발송 기록에는 바꾸기 전 본문 저장, 로그에 본문·열쇠 출력 금지 |

## Project Structure

### Documentation (this feature)

```text
specs/008-email-customer-ticket-link/
├── spec.md
├── plan.md              # 이 파일
├── research.md          # 결정과 근거
├── data-model.md        # ticket_view_links 변경
├── quickstart.md        # 검증 방법
├── contracts/rpc.md     # 새 RPC와 자리표시자 계약
└── checklists/requirements.md
```

### Source Code (repository root)

```text
packages/plugin-tickets-api/src/
├── ticketViewLink.ts                 # 수정: 위젯 TTL 2일, 메일용 규칙(14일·20개·재확인 주기), isLinkActive 종류 분기
├── ticketViewRpc.ts                  # 수정: 권한 판단을 함수로 분리(canCustomerViewTicket), createEmailTicketViewLink 추가, useTicketViewLink에 메일 링크 재확인
├── models/TicketViewLinks.ts         # 수정: createLink(kind), useLink 종류별 연장·재확인 시각
├── models/definitions/ticketViewLinks.ts  # 수정: kind, checkedAt 필드
├── messageBroker.ts                  # 수정: RPC 'tickets:ticketView.createEmailLink' 등록
└── fieldUtils.ts                     # 수정: 템플릿 칸 목록에 customerTicketLink
packages/plugin-tickets-api/test/ticketViewLink.test.ts   # 수정: 메일 링크·2일 규칙 테스트

packages/plugin-automations-api/src/common/
├── customerTicketLink.ts             # 신규: 본문에 칸 있는지, 링크 태그 만들기, 받는 사람별 바꾸기(순수) + 발급 호출
└── emailUtils.ts                     # 수정: customerMapByEmail에 고객 _id, sendEmails에서 받는 사람별 바꾸기, 기록엔 원본
packages/plugin-automations-api/test/customerTicketLink.test.ts  # 신규

widgets/
├── client/ticketview/TicketViewPage.tsx  # 수정: 만료 안내 문구(기본 영문)
├── locales/{ko,en,ja}.json               # 수정: 같은 문구 번역
└── client/messenger/components/ticket/openTicketView.ts  # 주석만(만료 기준 2일)
```

**Structure Decision**: 기존 위젯 "새 탭에서 보기"(001) 구조를 그대로 쓰고 열쇠에 종류만 더한다. automations-api의 큰 파일(emailUtils.ts 1,345줄)에는 연결 코드만 넣고 규칙은 새 파일로 분리한다.

## Complexity Tracking

없음 — 헌장 위반 없음.
