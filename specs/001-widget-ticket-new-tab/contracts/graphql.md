# Contracts: 위젯 티켓 "새 탭에서 보기"

모두 **추가만** 한다. 기존 위젯 연산·RPC는 바꾸지 않는다(FR-015).

## 1. GraphQL (inbox-api 위젯 스키마, 로그인 없음)

```graphql
type WidgetTicketViewLink {
  token: String!        # 열쇠 원문 — 응답으로 한 번만 내려가고 서버에는 지문만 남는다
  expiresAt: Date!
}

type WidgetTicketView {
  ticket: JSON!          # _id, number, name, description, stage{_id,name}, attachments, createdAt, 요청 구분 — 위젯 목록과 같은 범위
  stages: [JSON]         # 단계 막대용 { _id, name, order } — widgetsTicketStages와 같은 규칙
  comments: [JSON]       # widgetsTicketComments와 같은 모양
  activityLogs: [JSON]   # widgetsTicketActivityLogs와 같은 모양
  allowedFileTypes: [String]
}

extend type Mutation {
  # 위젯 티켓 상세의 "새 탭에서 보기"에서 호출. customerId는 위젯 연결로 확인된 고객.
  widgetsTicketViewLinkCreate(customerId: String!, ticketId: String!): WidgetTicketViewLink

  # 새 탭에서 댓글 등록. 작성자는 열쇠를 발급받은 고객, 대상은 열쇠의 티켓.
  widgetsTicketViewCommentAdd(
    token: String!
    content: String!
    attachments: [AttachmentInput]
  ): JSON
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
| `TICKET_VIEW_LINK_EXPIRED` | 조회·댓글: 열쇠가 없거나, 만료되었거나, 형식이 잘못됨 | 없음 |
| `TICKET_VIEW_NOT_FOUND` | 조회·댓글: 열쇠는 유효하나 티켓이 삭제·보관됨 | 없음 |

만료·없는 열쇠·변조된 열쇠는 **같은 코드**로 답한다(어느 쪽인지 알려 주지 않는다).

## 2. RPC (tickets-api `consumeRPCQueue`)

| action | 입력 | 출력 |
|---|---|---|
| `tickets:widgets.ticketViewLink.create` | `{ customerId, ticketId }` | `{ token, expiresAt }` 또는 오류 `TICKET_VIEW_NOT_ALLOWED` |
| `tickets:widgets.ticketViewLink.use` | `{ token }` | `{ ticketId, customerId }` (만료 연장 포함) 또는 오류 `TICKET_VIEW_LINK_EXPIRED` |
| `tickets:widgets.ticketView.detail` | `{ ticketId }` | `{ ticket, stages, comments }` 또는 오류 `TICKET_VIEW_NOT_FOUND` |

inbox-api의 `widgetsTicketView`는 `use` → `detail` → core 처리 기록 조회 → 메신저 연동의 `allowedFileTypes` 순으로 묶는다. `widgetsTicketViewCommentAdd`는 `use` 후 기존 `tickets:widgets.commentAdd`를 `{ typeId: ticketId, customerId, userType: 'client', type: 'ticket' }`로 부른다.

## 3. 새 탭 페이지 (widgets 서버)

```text
GET {ROOT_URL}/ticket-view?lang=<ko|en|…>#<token>
```

- 서버는 `widget.ejs`(type `ticketview`)만 내려 준다. 열쇠는 조각(#)이라 서버로 오지 않는다.
- 페이지 상태: `loading` → `ready` | `expired`(TICKET_VIEW_LINK_EXPIRED) | `notFound`(TICKET_VIEW_NOT_FOUND) | `error`(네트워크 등, 다시 시도 버튼).
- `expired` 문구: "링크가 만료됐어요. 위젯에서 '새 탭에서 보기'를 다시 눌러 주세요"(FR-007).

## 4. 위젯 버튼

- 위치: 티켓 진행 상황 화면 위쪽 막대(PC·휴대폰 공통, FR-001).
- 누르면: 빈 탭 즉시 열기 → `widgetsTicketViewLinkCreate` → 성공 시 그 탭을 링크로 이동.
- 빈 탭이 막혔으면: 위젯 안에 "새 탭에서 열기" 링크 표시(FR-017).
- 발급 실패: 빈 탭 닫고 "잠시 후 다시 시도해 주세요"(FR-012).
