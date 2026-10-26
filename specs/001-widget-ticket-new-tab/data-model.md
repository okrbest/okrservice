# Data Model: 위젯 티켓 "새 탭에서 보기"

## TicketViewLink (새로 추가, tickets-api `ticket_view_links`)

한 티켓을 위젯 밖 새 탭에서 볼 수 있게 하는 임시 열쇠.

| 필드 | 형 | 설명 |
|---|---|---|
| `_id` | string | 문서 id |
| `tokenHash` | string | 열쇠 원문의 SHA-256(hex). 원문은 저장하지 않는다. 고유 인덱스 |
| `ticketId` | string | 대상 티켓 |
| `customerId` | string | 발급받은 고객. 댓글 작성자로 쓴다 |
| `createdAt` | Date | 발급 시각 |
| `lastUsedAt` | Date | 마지막으로 상세 조회·댓글 등록에 성공한 시각 |
| `expiresAt` | Date | 만료 시각 = `lastUsedAt` + 24시간. TTL 인덱스(`expireAfterSeconds: 0`) |

### 규칙

- 발급: 고객이 그 티켓을 위젯에서 볼 수 있을 때만(FR-010). 같은 고객·티켓에 여러 개 있을 수 있다.
- 사용: `tokenHash`로 찾고, `expiresAt > 지금`이어야 유효. TTL 삭제는 지연될 수 있으므로 조회 시 시각을 반드시 함께 확인한다.
- 연장: 사용에 성공하면 `lastUsedAt`과 `expiresAt`을 늦춘다. `lastUsedAt`이 5분 이내면 쓰기 생략(research D2).
- 열쇠로 접근할 수 있는 것은 `ticketId` 하나뿐(FR-008).

### 상태

```text
발급됨 ──(보기·댓글 성공)──▶ 발급됨(만료 시각 연장)
   │
   └──(마지막 사용 후 24시간 경과)──▶ 만료 ──(TTL)──▶ 삭제
```

## 기존 엔터티 (변경 없음)

- **Ticket** (tickets-api): `_id`, `number`, `name`, `description`, `stageId`, `customerIds`, `attachments`, `status`, `createdAt`, 요청 구분 등. 새 탭은 위젯 목록이 이미 주는 필드 범위만 읽는다. `status`가 보관(archived)이거나 문서가 없으면 "찾을 수 없음".
- **Ticket comment** (tickets-api `ticket_comments`): 새 탭 댓글도 기존 `widgets.commentAdd`로 같은 형태(`userType: 'client'`, `customerId`)로 저장한다(FR-004).
- **Stage** (tickets-api): 단계 막대용 이름·순서(기존 `widgetsTicketStages`와 같은 규칙).
- **Activity log** (core): 처리 기록(기존 `widgetsTicketActivityLogs`와 같은 규칙).
