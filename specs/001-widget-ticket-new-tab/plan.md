# Implementation Plan: 위젯 티켓 "새 탭에서 보기"

**Branch**: `001-widget-ticket-new-tab` (작업은 현재 `feature/skill-modify-hrchat-merge`에서 진행) | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-widget-ticket-new-tab/spec.md`

## Summary

위젯 티켓 진행 상황 화면에 "새 탭에서 보기" 버튼을 둔다. 버튼을 누르면 그 티켓에만 통하는 임시 열쇠를 발급받아 위젯 서버의 새 페이지(`/ticket-view#<열쇠>`)를 새 탭으로 연다. 열쇠는 무작위 값이고 서버에는 지문만 저장하며, 마지막 사용 후 24시간이 지나면 만료된다(쓰는 동안 자동 연장). 새 페이지는 위젯의 진행 상황 부품(요약 카드·대화·입력창)을 그대로 써서 넓게 보여 주고, 같은 고객 이름으로 댓글을 단다. 서버는 inbox-api 위젯 GraphQL에 연산 3개를 추가하고, 열쇠 보관·확인·연장은 tickets-api가 맡는다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript. 서버 Node 20.18(ts-node·nodemon), 위젯 React 18(webpack 5, ts-loader)

**Primary Dependencies**: Apollo Server(GraphQL, inbox-api 위젯 스키마), RabbitMQ RPC(`sendTicketsMessage`/`consumeRPCQueue`), Mongoose(tickets-api 모델), Express+EJS(위젯 서버), Apollo Client(위젯), Node `crypto`(열쇠·지문)

**Storage**: MongoDB — tickets-api 새 컬렉션 `ticket_view_links`(TTL 인덱스 `expiresAt`). 기존 티켓·댓글·단계·처리 기록 컬렉션은 읽기·기존 경로로 쓰기만

**Testing**: jest — tickets-api는 자체 실행 환경이 없어 widgets의 jest를 rootDir로 빌려 실행(기존 `packages/plugin-tickets-api/test/descriptionConflict.test.ts` 방식), widgets는 자체 jest(jsdom). 화면은 로컬 Playwright로 실동작 확인

**Target Platform**: 고객 브라우저(PC·휴대폰, 위젯이 끼워진 외부 사이트에서 새 탭), 서버는 기존 erxes 마이크로서비스

**Project Type**: 웹(모노레포: 백엔드 플러그인 2개 + 위젯 앱)

**Performance Goals**: 버튼 → 새 탭 내용 표시 3초 이내(SC-001). 새 탭 첫 화면은 GraphQL 1회 왕복

**Constraints**: 기존 위젯 연산·화면 불변(FR-015). 열쇠·고객 식별 정보는 주소·서버 기록에 남기지 않음(FR-009). 만료 연장 쓰기는 5분에 한 번 이하

**Scale/Scope**: 고객이 버튼을 누를 때만 문서 1건 생성, 하루 지나면 자동 삭제. 화면 1개 추가, 버튼 1개 추가

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 설계 후 재확인 완료.*

| 원칙 | 판단 | 근거 |
|---|---|---|
| I. 최소 범위 | 통과 | 진행 상황 화면 버튼·새 페이지·연산 3개만. 기존 위젯 연산은 손대지 않음. 업로드 훅에 인자 하나 추가(기존 호출부 동작 동일) |
| II. 스펙 비례 | 통과 | 신규 화면 + API 추가 → spec-kit 경로 진행 중 |
| III. 실동작 검증 | 통과 | [quickstart.md](./quickstart.md) 15개 시나리오를 로컬에서 실제 위젯으로 확인 |
| IV. 성능 회귀 금지 | 통과 | 기존 위젯 쿼리 변경 없음. 새 조회는 새 탭에서만, 1회 왕복. 구독·주기 조회 없음. 연장 쓰기 5분 제한. 새 쿼리는 `fetchPolicy: 'network-only'` 명시 |
| V. Conventional Commits | 통과 | scope: `tickets`(서버), `messenger`(위젯) |
| Stack: widgets 스타일 관행 | 통과 | 새 티켓 부품이 쓰는 sass(`_ticket-progress.scss`)를 따르고, 새 페이지 배치만 같은 폴더에 추가 |
| Stack: gateway pathRewrite | 통과 | 새 GraphQL은 기존 위젯 연산과 같은 경로. 새 페이지 링크는 `ROOT_URL` 기준으로 만들어 프록시 접두사 유지 |
| 시크릿 | 통과 | 새 비밀값 없음. 열쇠 원문은 저장하지 않음 |

## Project Structure

### Documentation (this feature)

```text
specs/001-widget-ticket-new-tab/
├── spec.md
├── plan.md              # 이 문서
├── research.md          # 결정 D1~D11
├── data-model.md        # TicketViewLink
├── quickstart.md        # 확인 시나리오 15개
├── contracts/
│   └── graphql.md       # GraphQL·RPC·페이지·버튼 계약
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks에서 생성
```

### Source Code (repository root)

```text
packages/plugin-tickets-api/
├── src/models/definitions/ticketViewLinks.ts   # 새 스키마(+TTL 인덱스)
├── src/models/TicketViewLinks.ts               # 새 모델(생성·사용·연장)
├── src/connectionResolver.ts                   # 모델 등록
├── src/ticketViewLink.ts                       # 순수 함수: 열쇠 생성·지문·만료/연장 판단·발급 권한 판단
├── src/messageBroker.ts                        # RPC 3개 추가
└── test/ticketViewLink.test.ts

packages/plugin-inbox-api/src/graphql/
├── widgetTypeDefs.ts                           # 타입·연산 3개 추가
├── resolvers/widgetQueries.ts                  # widgetsTicketView
└── resolvers/widgetMutations.ts                # widgetsTicketViewLinkCreate, widgetsTicketViewCommentAdd

widgets/
├── webpack.config.js / webpack.prod.config.js  # entry: ticketview
├── server/index.ts                             # GET /ticket-view
├── client/ticketview/
│   ├── index.tsx                               # 부팅: 언어 설정·Apollo·열쇠 읽기
│   ├── TicketViewPage.tsx                      # 상태별 화면(로딩·정상·만료·없음·오류), 부품 조합
│   ├── graphql.ts                              # widgetsTicketView, widgetsTicketViewCommentAdd
│   └── __tests__/
├── client/messenger/components/ticket/
│   ├── openTicketView.ts                       # 순수 함수: 링크 주소 만들기, 팝업 대체 판단
│   ├── useAttachUpload.ts                      # allowedFileTypes 인자 허용(기존 호출 동일)
│   └── __tests__/openTicketView.test.ts
├── client/messenger/containers/ticket/TicketShowProgress.tsx   # 버튼 동작(발급·새 탭)
├── client/messenger/components/ticket/TicketShowPropgress.tsx  # 위쪽 막대에 버튼
├── client/messenger/graphql/mutations.ts       # widgetsTicketViewLinkCreate
├── client/messenger/sass/components/_ticket-view.scss + style.css/style.min.css 재생성
└── locales/ko.json (+ en 등 기존 언어 파일)    # 새 문구
```

**Structure Decision**: 기존 모노레포 구조를 그대로 쓴다. 서버 로직은 티켓 데이터 소유자인 tickets-api에, 공개 GraphQL은 기존 위젯 연산이 모인 inbox-api에, 화면은 위젯 서버의 새 진입점으로 둔다.

## 배포 순서

tickets-api → inbox-api → widgets. 반대로 배포돼도 기존 기능은 그대로이고, 새 버튼만 "잠시 후 다시 시도" 안내를 띄운다(research D10).

## Complexity Tracking

헌장 위반 없음.
