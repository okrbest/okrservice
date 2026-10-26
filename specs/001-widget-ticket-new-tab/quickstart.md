# Quickstart: 위젯 티켓 "새 탭에서 보기" 확인 방법

## 준비

- 로컬 스택 실행(`cli-okrservice/ecosystem.config.js`, Node 20.18.0): core, tickets-api, inbox-api, gateway, widgets(3200).
- 위젯 확인 페이지: `erxesSettings.messenger = { brand_id: '<메신저 브랜드 코드>', email: '<테스트용 가짜 주소>@example.invalid', showTicket: true }`로 위젯 번들을 싣는 페이지.
- 테스트 티켓은 자동화 메일 대상이 아닌 단계(예: 접수)에 만든다. 끝나면 테스트 고객·티켓·댓글·열쇠를 지운다.

## 시나리오 (스펙 수용 기준과 대응)

| # | 하는 일 | 기대 결과 | 스펙 |
|---|---|---|---|
| 1 | 위젯 → 티켓 목록 → 티켓 열기 → "새 탭에서 보기" | 새 탭에 진행 단계·설명·첨부·처리 기록·댓글 | US1-1, FR-003 |
| 2 | 위젯을 닫은 뒤 새 탭 새로 고침 | 그대로 보임 | US1-2 |
| 3 | 휴대폰 크기(390×844)에서 1번 | 버튼이 보이고 동작 | US1-3, FR-001 |
| 4 | 새 탭에서 댓글+첨부 보내기 | 새 탭·위젯·직원 화면에 같은 고객 댓글 | US2, FR-004 |
| 5 | DB에서 열쇠의 `expiresAt`을 과거로 바꾸고 새로 고침 | 만료 안내만, 티켓 내용 없음 | US3-1, FR-007 |
| 6 | 5 상태에서 댓글 보내기 | 등록 안 됨, 만료 안내, 입력한 글 유지 | Edge, FR-014 |
| 7 | `lastUsedAt`을 23시간 전으로 바꾸고 새로 고침 | 정상 표시, `expiresAt`이 지금+24시간으로 연장 | US3-2, FR-006 |
| 8 | 5 이후 위젯에서 버튼 다시 누르기 | 새 링크로 정상 열림 | US3-3 |
| 9 | A 티켓 열쇠로 B 티켓 id를 넣어 댓글 연산 직접 호출 | 거부(연산이 티켓 id를 받지 않음을 확인) | US3-4, FR-008 |
| 10 | 주소의 # 뒤를 임의 값으로 바꿔 열기 | 만료 안내만 | US3-5 |
| 11 | 다른 고객 id로 발급 연산 직접 호출 | `TICKET_VIEW_NOT_ALLOWED` | FR-010 |
| 12 | 티켓을 보관한 뒤 새 탭 새로 고침 | "티켓을 찾을 수 없어요" | FR-013 |
| 13 | 브라우저 팝업 차단(또는 `window.open` 막힌 환경)에서 1번 | 첫 클릭에 바로 새 탭이 열림 | FR-017 |
| 14 | 기존 위젯 티켓 목록·상세·댓글·접수 | 이전과 같음 | FR-015, SC-005 |
| 15 | 주소 확인 | 고객 id·이메일·티켓 번호가 주소에 없음, 열린 뒤 주소창에 `#…` 없음, 새로 고침해도 그대로 보임 | FR-009 |
| 16 | 같은 고객으로 발급 연산을 1분 안에 11번 호출 | 10번 성공, 11번째 `TICKET_VIEW_RATE_LIMITED` | FR-018 |
| 17 | 16 이후 같은 티켓·고객 링크 확인 | 쓸 수 있는 링크 5개, 첫 링크는 `TICKET_VIEW_LINK_EXPIRED` | FR-018 |
| 18 | DB에서 열쇠의 `createdAt`을 8일 전으로(`expiresAt`은 미래) 바꾸고 조회 | `TICKET_VIEW_LINK_EXPIRED` | FR-006 |
| 19 | 새 탭 조회 응답의 `ticket` 항목 확인 | 화면용 항목만(`customerIds`·`assignedUserIds`·`customFieldsData` 등 없음) | FR-019 |
| 20 | 1만 1자 댓글, `javascript:` 첨부 주소 댓글 | `TICKET_VIEW_INVALID_INPUT` | FR-020 |
| 21 | 티켓 보관 후 새 탭에서 댓글 | `TICKET_VIEW_NOT_FOUND`, 등록 안 됨 | FR-013 |
| 22 | 발급 응답을 `TICKET_VIEW_NOT_ALLOWED`로 바꿔 진행 상황 열기 | 버튼 없음, 화면은 그대로 | FR-010 |
| 23 | 발급 요청을 실패시킨 뒤 버튼 누르기(다시 받기) | 안내 → 링크로 바뀌고 첫 클릭에 열림 | FR-012 |
| 24 | `GET /ticket-view` 응답 헤더 | `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` | FR-021 |

## 자동 테스트

- tickets-api 순수 함수(열쇠 생성·지문·만료·연장·발급 권한): widgets jest를 rootDir로 빌려 실행
  (`specs/001-widget-ticket-new-tab/plan.md`의 Testing 참고).
- widgets 순수 함수(링크 주소 만들기·받아 둔 링크 재사용 판단·화면 상태): `cd widgets && npx jest client/ticketview client/messenger/components/ticket`.
- inbox-api 순수 함수(열쇠 지문·댓글 입력 검증·첨부 허용 형식): tickets-api와 같은 방식으로 `packages/plugin-inbox-api/test/ticketViewWidget.test.ts`.
