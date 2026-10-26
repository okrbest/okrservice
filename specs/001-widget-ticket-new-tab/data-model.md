# Data Model: 위젯 티켓 "새 탭에서 보기"

## TicketViewLink (새로 추가, tickets-api `ticket_view_links`)

한 티켓을 위젯 밖 새 탭에서 볼 수 있게 하는 임시 열쇠.

| 필드 | 형 | 설명 |
|---|---|---|
| `_id` | string | 문서 id |
| `tokenHash` | string | 열쇠 원문의 SHA-256(hex). 원문은 저장하지 않는다. 고유 인덱스 |
| `ticketId` | string | 대상 티켓 |
| `customerId` | string | 발급받은 고객. 댓글 작성자로 쓴다 |
| `createdAt` | Date | 발급 시각. 7일 절대 상한과 1분 발급 수 계산 기준 |
| `lastUsedAt` | Date | 마지막으로 상세 조회·댓글 등록에 성공한 시각 |
| `expiresAt` | Date | 만료 시각 = `lastUsedAt` + 24시간(폐기 시에는 폐기 시각 + 1분). TTL 인덱스(`expireAfterSeconds: 0`) |
| `revokedAt` | Date? | 같은 티켓·고객 링크 수 상한으로 폐기된 시각. 있으면 열리지 않는다 |

인덱스: `tokenHash`(unique), `expiresAt`(TTL), `{ ticketId, customerId, createdAt: -1 }`(링크 수 상한), `{ customerId, createdAt: -1 }`(발급 수 제한).

### 규칙

- 발급: 고객이 그 티켓을 위젯에서 볼 수 있을 때만(FR-010).
- 발급 수 제한: 고객당 최근 1분 발급 기록(폐기된 것 포함)이 10건 이상이면 `TICKET_VIEW_RATE_LIMITED`(FR-018).
- 링크 수 상한: 발급 뒤 같은 티켓·고객의 폐기되지 않은 링크 중 최근 5개만 남기고 나머지는 `revokedAt`을 찍어 폐기한다. 폐기 기록은 1분 뒤 TTL로 지워진다 — 바로 지우면 같은 티켓을 반복 발급할 때 기록이 5개로 유지돼 1분 발급 수 제한에 걸리지 않는다.
- 사용: `tokenHash`로 찾고 `revokedAt`이 없고, `expiresAt > 지금`이고, `createdAt + 7일 > 지금`이어야 유효. TTL 삭제는 지연될 수 있으므로 조회 시 시각을 반드시 함께 확인한다.
- 연장: 사용에 성공하면 `lastUsedAt`과 `expiresAt`을 늦춘다. `lastUsedAt`이 5분 이내면 쓰기 생략(research D2).
- 열쇠로 접근할 수 있는 것은 `ticketId` 하나뿐(FR-008).

### 상태

```text
발급됨 ──(보기·댓글 성공)──▶ 발급됨(만료 시각 연장)
   │
   ├──(마지막 사용 후 24시간 경과 또는 발급 후 7일 경과)──▶ 만료 ──(TTL)──▶ 삭제
   │
   └──(같은 티켓·고객에 더 새 링크 5개)──▶ 폐기 ──(1분 뒤 TTL)──▶ 삭제
```

## 기존 엔터티 (변경 없음)

- **Ticket** (tickets-api): 새 탭에는 `_id`, `number`, `name`, `status`, `description`, `type`, `requestType`, `createdAt`, 현재 단계(`_id`, `name`), 첨부(`name`, `url`, `type`, `size`)만 내려 준다(FR-019). `status`가 보관(archived)이거나 문서가 없으면 "찾을 수 없음".
- **Ticket comment** (tickets-api `ticket_comments`): 새 탭 댓글도 기존 `widgets.commentAdd`로 같은 형태(`userType: 'client'`, `customerId`)로 저장한다(FR-004).
- **Stage** (tickets-api): 단계 막대용 `_id`, `name`, `order`, `status`(기존 `widgetsTicketStages`와 같은 규칙).
- **Activity log** (core): 처리 기록(기존 `widgetsTicketActivityLogs`와 같은 규칙).
