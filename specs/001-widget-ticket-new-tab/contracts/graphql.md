# Contracts: 위젯 티켓 "새 탭에서 보기"

모두 **추가만** 한다. 기존 위젯 연산·RPC는 바꾸지 않는다(FR-015).

## 1. GraphQL (inbox-api 위젯 스키마, 로그인 없음)

```graphql
type WidgetTicketViewLink {
  token: String!        # 열쇠 원문 — 응답으로 한 번만 내려가고 서버에는 지문만 남는다
  expiresAt: Date!
}

type WidgetTicketView {
  # 화면에 필요한 항목만 담은 JSON(FR-019) — Ticket 엔터티로 두면 게이트웨이가 다른 필드를 채워 줄 수 있어 쓰지 않는다
  # { _id, number, name, status, description, type, requestType, createdAt, stage { _id, name }, attachments [{ name, url, type, size }] }
  ticket: JSON
  stages: [JSON]             # 단계 막대용 { _id, name, order, status } — widgetsTicketStages와 같은 규칙
  comments: [TicketComment]  # widgetsTicketComments와 같은 타입(작성자 정보는 tickets 쪽이 채움)
  activityLogs: [ActivityLog] # widgetsTicketActivityLogs와 같은 타입
  allowedFileTypes: [String] # 위젯 공통 설정 WIDGETS_UPLOAD_FILE_TYPES(widgetsMessengerConnect와 같은 값)
}

extend type Mutation {
  # 위젯 티켓 상세의 "새 탭에서 보기"에서 호출. customerId는 위젯 연결로 확인된 고객.
  widgetsTicketViewLinkCreate(customerId: String!, ticketId: String!): WidgetTicketViewLink

  # 새 탭에서 댓글 등록. 작성자는 열쇠를 발급받은 고객, 대상은 열쇠의 티켓.
  widgetsTicketViewCommentAdd(
    token: String!
    content: String!
    attachments: [AttachmentInput]
  ): TicketComment
}

extend type Query {
  # 새 탭 첫 화면·새로 고침. 성공하면 만료 시각이 연장된다.
  widgetsTicketView(token: String!): WidgetTicketView
}
```

### 오류 코드 (GraphQL error `message`)

| 코드 | 언제 | 응답에 담기는 것 |
|---|---|---|
| `TICKET_VIEW_NOT_ALLOWED` | 발급: 그 고객이 볼 수 없는 티켓 | 없음 |
| `TICKET_VIEW_RATE_LIMITED` | 발급: 고객당 1분 10건 초과(FR-018) | 없음 |
| `TICKET_VIEW_LINK_EXPIRED` | 조회·댓글: 열쇠가 없거나, 만료·폐기되었거나, 발급 후 7일이 지났거나, 형식이 잘못됨 | 없음 |
| `TICKET_VIEW_NOT_FOUND` | 조회·댓글: 열쇠는 유효하나 티켓이 삭제·보관됨 | 없음 |
| `TICKET_VIEW_INVALID_INPUT` | 댓글: 1만 자 초과, 첨부 10개 초과, 업로드 파일이 아닌 첨부 주소, 내용·첨부 모두 없음(FR-020) | 없음 |

만료·없는 열쇠·변조된 열쇠는 **같은 코드**로 답한다(어느 쪽인지 알려 주지 않는다).

## 2. RPC (tickets-api `consumeRPCQueue`)

열쇠 원문은 서버 사이 메시지에 싣지 않는다. inbox-api가 SHA-256 지문(`tokenHash`)으로 바꿔 보낸다 — RPC 기록·오류 로그에 원문이 남지 않게.

| action | 입력 | 출력 |
|---|---|---|
| `tickets:widgets.ticketViewLink.create` | `{ customerId, ticketId }` | `{ token, expiresAt }` 또는 오류 `TICKET_VIEW_NOT_ALLOWED`·`TICKET_VIEW_RATE_LIMITED` |
| `tickets:widgets.ticketViewLink.use` | `{ tokenHash, forComment? }` | `{ ticketId, customerId }` (만료 연장 포함) 또는 오류 `TICKET_VIEW_LINK_EXPIRED`. `forComment`면 티켓이 없거나 보관됐을 때 `TICKET_VIEW_NOT_FOUND` |
| `tickets:widgets.ticketView.detail` | `{ ticketId }` | `{ ticket, stages, comments }` 또는 오류 `TICKET_VIEW_NOT_FOUND` |

inbox-api의 `widgetsTicketView`는 `use` 뒤 `detail`·core 처리 기록 조회·`WIDGETS_UPLOAD_FILE_TYPES` 설정을 함께(병렬로) 묶는다. `widgetsTicketViewCommentAdd`는 입력 검증 → `use`(`forComment: true`) 후 기존 `tickets:widgets.commentAdd`를 `{ typeId: ticketId, customerId, userType: 'client', type: 'ticket' }`와 정리한 첨부(`url`, `name`, `type`, `size`)로 부른다.

## 3. 새 탭 페이지 (widgets 서버)

```text
GET {ROOT_URL}/ticket-view?lang=<ko|en|…>#<token>
```

- 서버는 `widget.ejs`(type `ticketview`)만 내려 준다. 열쇠는 조각(#)이라 서버로 오지 않는다.
- 응답 헤더: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`(FR-021).
- 페이지는 열리자마자 열쇠를 `sessionStorage`(`erxes-ticket-view-token`)로 옮기고 `history.replaceState`로 주소창의 `#…`를 지운다. 새로 고침은 같은 탭의 `sessionStorage`로 이어진다(FR-009).
- 페이지 상태: `loading` → `ready` | `expired`(TICKET_VIEW_LINK_EXPIRED) | `notFound`(TICKET_VIEW_NOT_FOUND) | `error`(네트워크 등, 다시 시도 버튼).
- `expired` 문구: "링크가 만료됐어요. 위젯에서 '새 탭에서 보기'를 다시 눌러 주세요"(FR-007).

## 4. 위젯 버튼

- 위치: 티켓 진행 상황 요약 카드 머리줄(PC·휴대폰 공통, FR-001).
- 화면을 열 때 `widgetsTicketViewLinkCreate`로 링크를 받아 두고, 버튼은 그 링크를 여는 일반 링크(`target="_blank" rel="noopener noreferrer"`) — 팝업 차단에 걸리지 않음(FR-017).
- 받는 중: 버튼 비활성. 받기 실패: "잠시 후 다시 시도해 주세요" + 버튼으로 다시 받기(FR-012).
- 고객 정보가 없거나 발급이 `TICKET_VIEW_NOT_ALLOWED`로 거부되면 버튼을 그리지 않는다(FR-010).
- 받아 둔 링크는 티켓별로 위젯이 떠 있는 동안 다시 쓰고, 만료 1시간 전부터는 다시 받는다.
