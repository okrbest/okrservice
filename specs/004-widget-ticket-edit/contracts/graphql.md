# Contracts: 위젯 티켓 수정

## GraphQL (plugin-inbox-api `widgetTypeDefs.ts`, `tickets` 플러그인이 켜져 있을 때만)

```graphql
type WidgetTicketEditState {
  canEdit: Boolean!
  canEditContent: Boolean!
  ticket: JSON          # { _id, name, type, description, attachments, visibility } — canEdit일 때만
}

extend type Query {
  widgetsTicketEditState(customerId: String!, ticketId: String!): WidgetTicketEditState
}

extend type Mutation {
  widgetsTicketEdit(
    customerId: String!
    ticketId: String!
    type: String
    description: String
    attachments: [AttachmentInput]
    visibility: String
  ): WidgetTicketEditState
}
```

- `name`(제목) 인자는 없다.
- `widgetsTicketEditState`는 본인이 아니거나 티켓이 없어도 오류 대신 `{ canEdit: false, canEditContent: false, ticket: null }`을 돌려준다(버튼만 숨김).
- `widgetsTicketEdit`는 저장 뒤의 수정 상태(갱신된 `ticket` 포함)를 돌려준다.
- 실패 시 GraphQL 오류 메시지가 `TICKET_EDIT_NOT_ALLOWED` / `TICKET_EDIT_STAGE_LOCKED` / `TICKET_EDIT_INVALID_INPUT` 중 하나.

## RPC (plugin-tickets-api `messageBroker.ts`)

| action | data | 반환 |
|---|---|---|
| `widgets.ticketEdit.state` | `{ customerId, ticketId }` | `WidgetTicketEditState` |
| `widgets.ticketEdit.save` | `{ customerId, ticketId, type?, description?, attachments?, visibility? }` | `WidgetTicketEditState` (오류는 위 코드로 throw) |

inbox-api 리졸버는 입력 형식 검증(첨부 형태·개수, `visibility` 값, 설명 길이)만 하고 판정·저장은 tickets-api가 한다.

## Activity log (core `putActivityLog`)

`action: 'customerEdit'`, `content.changedFields` — [data-model.md](../data-model.md#activity-log-기존-core-activitylogs) 참조.
직원 화면 `plugin-tickets-ui` `ActivityItem`에 `customerEdit` 분기를 추가해 표시한다.
