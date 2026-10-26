# Research: 위젯 티켓 "새 탭에서 보기"

조사 대상 코드: `widgets/client/messenger`(티켓 화면·업로드·번역), `widgets/server/index.ts`·`widgets/webpack.config.js`(페이지·번들), `packages/plugin-inbox-api/src/graphql`(위젯 GraphQL), `packages/plugin-tickets-api/src/messageBroker.ts`(위젯 RPC).

## 현재 구조에서 확인한 사실

- 위젯의 티켓 조회·댓글은 **inbox-api의 위젯 GraphQL**(`widgetsTicketComments`, `widgetsTicketCommentAdd`, `widgetsTicketStages` 등)이 받아 **tickets-api RPC**(`tickets:widgets.comments.find`, `tickets:widgets.commentAdd` …)로 넘긴다. 처리 기록은 core의 `activityLogs.findOne`.
- 이 위젯 조회들은 로그인 없이 열려 있고 **티켓·고객 id만 알면** 부를 수 있다(예: `widgetsTicketComments(typeId)`, `widgetsTicketCommentAdd(typeId, customerId)`). 새 탭은 이 방식을 따르지 않고 링크 열쇠로만 접근하게 한다.
- 진행 상황 화면의 부품 중 `TicketProgressHero`·`TicketThread`·`TicketComposer`는 화면만 그리는 부품이라 재사용할 수 있다. `TicketShowPropgress`(화면 껍데기)와 컨테이너는 메신저 문맥(`useTicket`, `connection`)에 묶여 있어 재사용하지 않는다.
- 파일 첨부는 공개 업로드 주소(`${API_URL}/upload-file`)를 쓰고, 허용 형식은 메신저 연동 설정(`messengerData.allowedFileTypes`)에서 읽는다(`useAttachUpload`가 `connection`에 의존).
- 위젯 서버는 `GET /messenger` 등에서 `widget.ejs`에 종류(type)만 바꿔 `/build/<type>.bundle.js`를 싣는다. 번들 진입점은 `webpack.config.js`의 `entry`.

## 결정

### D1. 링크 열쇠의 형태와 보관

- **Decision**: 32바이트 무작위 값(base64url)을 열쇠로 쓰고, 서버에는 **SHA-256 지문만** 저장한다. 보관소는 tickets-api의 새 컬렉션(`ticket_view_links`). 문서마다 `expiresAt`을 두고 TTL 인덱스로 자동 삭제한다.
- **Rationale**: 추측 불가(FR-009), DB가 유출돼도 열쇠 원문은 남지 않는다. 티켓 데이터를 가진 tickets-api가 소유자 확인과 만료를 같이 판단하기 쉽다. TTL 인덱스로 정리 작업이 따로 필요 없다.
- **Alternatives**: 서명된 JWT(무상태) — 쓰는 동안 자동 연장(FR-006)을 하려면 매번 새 토큰을 발급해 주소를 바꿔야 해서 탈락. Redis — 다른 위젯 데이터와 달리 영속성이 약하고 이 저장소의 티켓 쪽 관행이 아님.

### D2. 자동 연장 방식

- **Decision**: 열쇠로 상세 조회나 댓글 등록에 성공할 때마다 `expiresAt = 지금 + 24시간`으로 늦춘다. 단, `lastUsedAt`이 5분 이내면 쓰기를 건너뛴다.
- **Rationale**: FR-006 충족. 새로 고침을 반복해도 DB 쓰기가 몰리지 않는다(헌장 IV). 5분 오차는 "하루" 기준에서 무시할 만하다.
- **Alternatives**: 매 요청마다 쓰기 — 불필요한 쓰기. 연 시점 고정 — 사용자가 "쓰는 동안 자동 연장"을 골라 탈락.

### D3. GraphQL 위치

- **Decision**: 새 연산 3개를 **inbox-api 위젯 스키마**에 둔다(기존 위젯 티켓 연산과 같은 자리·같은 공개 경로). 열쇠 발급·확인·연장과 상세 묶음은 **tickets-api RPC**로 처리한다.
  - `widgetsTicketViewLinkCreate(customerId, ticketId)` → 열쇠 발급
  - `widgetsTicketView(token)` → 티켓·단계·댓글·처리 기록·첨부 허용 형식을 한 번에
  - `widgetsTicketViewCommentAdd(token, content, attachments)` → 댓글 등록
- **Rationale**: 위젯이 이미 쓰는 게이트웨이 경로와 인증 없음 규칙을 그대로 탄다. 상세를 한 번에 받아 새 탭 첫 화면의 왕복을 줄인다.
- **Alternatives**: tickets-api 스키마에 직접 — 위젯 공개 연산이 inbox-api에 모여 있는 기존 관행과 어긋남.

### D4. 발급 권한 (FR-010)

- **Decision**: 발급 시 tickets-api가 `ticket.customerIds`에 그 고객이 있거나, 위젯 "회사 티켓"과 같은 규칙(`widgets.ticketList.find`의 회사 연결 판단)으로 그 고객이 볼 수 있는 티켓인지 확인한다. 아니면 거부한다.
- **Rationale**: "위젯에서 이미 볼 수 있는 티켓만"이라는 스펙과 일치. 위젯 연결로 확인된 고객 id를 믿는 기존 위젯 신뢰 모델은 그대로다(스펙 Assumptions).
- **Alternatives**: 확인 없이 발급 — 다른 고객 티켓 링크를 만들 수 있어 탈락.

### D5. 새 탭 페이지

- **Decision**: 위젯 서버에 `GET /ticket-view` 경로를 추가하고 `widget.ejs`(type `ticketview`)로 새 번들 `ticketview.bundle.js`를 싣는다. 열쇠는 주소의 **조각(#) 부분**에, 언어는 `?lang=` 으로 넘긴다. 링크 주소는 위젯이 자기 `ROOT_URL` 기준으로 만든다.
- **Rationale**: 조각은 서버 요청·접속 기록·Referer에 실리지 않아 유출 경로가 줄어든다. `ROOT_URL` 기준이면 리버스 프록시 경로 접두사(`/widgets` 등)가 유지된다(헌장 Stack Constraints). 기존 페이지 방식 그대로라 서버 변경이 작다.
- **Alternatives**: 고객 포털에 페이지 — 포털 로그인이 필요해 FR-011 위반. 메신저 번들 안에 경로 추가 — 메신저 부팅(연결·방문자 식별)을 거치게 돼 새 탭에서 불필요한 연결이 생김.

### D6. 화면 재사용

- **Decision**: `TicketProgressHero`·`TicketThread`·`TicketComposer`와 `progressHelpers`를 그대로 쓰고, 새 탭 전용 껍데기(`TicketViewPage`)가 데이터를 넣는다. 첨부 업로드 훅은 `allowedFileTypes`를 인자로 받을 수 있게 넓혀 `connection` 의존을 뺀다(기존 호출부는 기존 값을 그대로 넘김).
- **Rationale**: 위젯과 같은 내용·같은 모양(FR-003, FR-004). 기존 위젯 동작 불변(FR-015).

### D7. 팝업 차단 (FR-017) — 구현 중 변경

- **Decision**: 진행 상황 화면을 열 때 열쇠를 미리 받아 두고, 버튼을 처음부터 일반 링크(`<a target="_blank" rel="noopener noreferrer">`)로 그린다. 같은 티켓은 위젯이 떠 있는 동안 받아 둔 링크를 다시 쓰고, 만료가 1시간 안으로 다가오면 새로 받는다. 받기 실패 시 안내와 다시 받기 버튼(FR-012).
- **Rationale**: 처음 설계(클릭 즉시 빈 탭을 연 뒤 열쇠를 받아 옮기기, 막히면 위젯 안 대체 링크)는 사용자 환경에서 첫 클릭이 막혀 두 번 눌러야 했다. 일반 링크 클릭은 팝업 차단 대상이 아니라 어떤 환경에서도 첫 클릭에 열린다.
- **Cost**: 진행 상황 화면을 열 때마다(같은 티켓은 한 번) 열쇠 발급 요청 1회와 문서 1건이 생긴다. 쓰지 않은 열쇠도 하루 뒤 TTL로 지워진다. 열쇠 노출 범위는 같다(위젯 메모리에만 있고 서버에는 지문만).

### D8. 만료·없는 티켓 처리

- **Decision**: 서버는 만료·없는 열쇠에 `TICKET_VIEW_LINK_EXPIRED`, 삭제·보관된 티켓에 `TICKET_VIEW_NOT_FOUND` 오류 코드를 준다. 두 경우 모두 티켓·고객 정보를 응답에 담지 않는다. 화면은 코드별 안내를 보여 주고, 댓글 입력값은 지우지 않는다(FR-014).

### D9. 새 소식 반영

- **Decision**: 구독(실시간) 없이 페이지 로드 시 조회한다. 새로 고침으로 최신 내용을 본다(스펙 User Story 4).
- **Rationale**: 스펙 범위 안에서 가장 단순. 새 리스너·주기 조회를 늘리지 않는다(헌장 IV).

### D10. 배포 순서 (FR-015)

- **Decision**: 새 연산은 모두 추가만 한다. tickets-api → inbox-api → widgets 순서로 배포한다. 위젯이 먼저 배포돼 발급 연산이 없으면 버튼을 눌렀을 때 다시 시도 안내가 뜬다. 기존 위젯 연산은 바꾸지 않는다.

### D12. 리뷰 반영 (T040) — 구현 중 변경

코드 리뷰·보안 리뷰 지적을 반영하며 바꾼 결정.

- **발급 남용**: 고객당 1분 10건 제한(`TICKET_VIEW_RATE_LIMITED`), 같은 티켓·고객 링크는 최근 5개만 유효. 넘치는 링크는 지우지 않고 `revokedAt`으로 폐기하고 1분 뒤 TTL로 지운다 — 바로 지우면 같은 티켓 반복 발급 시 기록이 5개로 유지돼 1분 제한이 무력해지는 것을 실제 브라우저 검증에서 확인함.
- **절대 상한**: 쓰는 동안 연장되더라도 발급 후 7일이면 만료(D2 보완). 유출된 열쇠가 계속 쓰이며 무기한 살아 있지 않게.
- **열쇠 원문은 서버 사이에 싣지 않음**: inbox-api가 지문으로 바꿔 RPC에 넘긴다. RabbitMQ 메시지·오류 기록에 원문이 남지 않는다.
- **응답 최소화**: `ticket`을 `Ticket` 엔터티 대신 필요한 항목만 담은 JSON으로(FR-019). 엔터티로 두면 클라이언트가 게이트웨이를 통해 연결 고객·담당자 등 다른 필드를 골라 받을 수 있다.
- **댓글 입력 검증**: 길이·첨부 수·첨부 주소(업로드 저장소 키만) 검증(FR-020). 보관된 티켓에는 댓글 거부(`forComment` 확인).
- **주소창에서 열쇠 제거**: 페이지가 열리면 `sessionStorage`로 옮기고 `#…`를 지운다(FR-009). 방문 기록·주소 공유·화면 공유로 새는 경로를 줄인다.
- **새 탭 페이지 헤더**: no-referrer, noindex, 틀 안 표시 금지(FR-021).
- **첨부 허용 형식**: 메신저 연동(`integrationId`) 대신 위젯 공통 설정 `WIDGETS_UPLOAD_FILE_TYPES`에서 읽는다(`widgetsMessengerConnect`와 같은 값). 열쇠에 연동 id를 둘 필요가 없어져 필드를 뺐다.
- **위젯 버튼**: 받아 둔 링크 상태를 티켓별로 묶어 다른 티켓 링크가 잠깐 보이지 않게 하고, 발급이 거부된 티켓에는 버튼을 그리지 않는다.
- **반영하지 않음(제안만)**: 링크 사용 때마다 열람 권한 재확인, 위젯 전체의 서명된 고객 세션, Sentry 요청 본문 가리기, 티켓 설명 속 외부 링크의 `rel` 보강 — 기존 위젯 신뢰 모델·다른 화면에 걸친 변경이라 범위 밖.

### D11. 테스트

- **Decision**: 열쇠 생성·지문·만료·연장 판단과 발급 권한 판단은 순수 함수로 빼서 tickets-api 단위 테스트(widgets jest를 rootDir로 빌려 실행 — 기존 `descriptionConflict.test.ts`와 같은 방식). 위젯의 링크 주소 만들기·팝업 대체 판단도 순수 함수로 빼서 widgets jest. 전체 흐름은 로컬 Playwright로 확인(quickstart).
