# Data Model: 위젯 티켓 접수 후 수정

새 컬렉션·스키마 필드는 없다. 기존 `tickets`·`stages`·core `activity_logs`를 쓴다.

## Ticket (기존, tickets-api `models.Tickets`)

| 필드 | 고객 수정 | 비고 |
|---|---|---|
| `name` | ✗ | 입력 인자 자체가 없음(FR-008) |
| `type` | 첫 단계만 | 요청 구분 7가지 값(`inquiry`, `error`, `improvement`, `usage_guide`, `config`, `data_work`, `additional_development`) 중 하나 |
| `requestType` | (자동) | `type`이 바뀌면 같은 값으로 |
| `description` | 첫 단계만 | 입력칸 글 → 접수와 같은 규칙으로 `<p>` HTML. 공백만이면 거절 |
| `attachments` | 첫 단계만 | `{ url, name, type, size? }[]`. 기존 첨부(같은 url) 또는 저장 키만 허용, 개수 상한 = 댓글 상한 |
| `visibility` | 항상(보관 제외) | `'public' \| 'private'` 외 값 거절 |
| `modifiedAt` | (자동) | 저장 시 갱신 |
| `stageId`, `status`, `customerIds` | ✗ | 판정에만 사용 |

## 수정 상태 (계산 값, 저장 안 함)

```
WidgetTicketEditState {
  canEdit: boolean          // 본인 && 보관 아님
  canEditContent: boolean   // canEdit && 첫 단계
  ticket: { _id, name, type, description, attachments, visibility } | null   // canEdit일 때만
}
```

판정 규칙:

- **본인**: `customerIds ∋ customerId`, 또는 conformity(ticket→customer) ∋ `customerId`
- **첫 단계**: 같은 파이프라인 단계 중 `status !== 'archived'`를 `order` 오름차순 정렬한 첫 번째 `_id === ticket.stageId`
- **보관**: `ticket.status === 'archived'`

## 수정 요청 (입력)

```
{ customerId, ticketId, type?, description?, attachments?, visibility? }
```

- 보내지 않은 필드는 바꾸지 않는다.
- `changedFields` = 보낸 필드 중 현재 값과 다른 것(`attachments`는 url 목록 비교, `description`은 저장될 HTML 비교).
- `changedFields`에 `visibility` 외 항목이 있고 첫 단계가 아니면 → `TICKET_EDIT_STAGE_LOCKED`, 아무것도 저장하지 않음.
- `changedFields`가 비면 저장·기록 없이 현재 티켓을 돌려준다.

## Activity Log (기존 core `ActivityLogs`)

```
{
  contentType: 'tickets:ticket',
  contentId: ticketId,
  action: 'customerEdit',
  createdBy: customerId,
  content: { changedFields: ('type' | 'description' | 'attachments' | 'visibility')[] }
}
```
