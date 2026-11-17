# Data Model: 자동화 메일에 고객용 티켓 바로 열기 링크

## ticket_view_links (기존 컬렉션, 필드 추가)

| 필드 | 타입 | 설명 |
|---|---|---|
| `kind` | `'widget' \| 'email'`, 선택 | 없으면 위젯(기존 문서 호환). **신규** |
| `checkedAt` | Date, 선택 | 메일 링크 권한을 마지막으로 확인한 시각(발급 시 = 발급 시각). **신규** |
| `tokenHash`, `ticketId`, `customerId`, `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt` | 기존 | 그대로 |

인덱스: 기존 그대로(`expiresAt` TTL, `{ticketId, customerId, createdAt}`, `{customerId, createdAt}`).

### 종류별 규칙

| 규칙 | 위젯 | 메일 |
|---|---|---|
| 만료 | 마지막 사용 + **2일**(사용하면 연장, 5분 주기 기록) | 발급 + **14일** 고정(연장 없음) |
| 최대 수명 | 발급 + 7일 | 적용 안 함(14일이 최대) |
| 고객당 1분 발급 제한(10개) | 적용(위젯 링크만 셈) | 적용 안 함 |
| 같은 티켓·고객 상한 | 5개(위젯만 셈) | 20개(메일만 셈) |
| 열 때 권한 재확인 | 안 함 | `checkedAt` + 5분 지나면 다시 확인, 실패하면 만료 응답(폐기하지 않음 — 다음 요청에서 다시 판단) |

### 상태

- 활성: `revokedAt` 없음, `expiresAt` > 지금, (위젯만) `createdAt + 7일` > 지금
- 폐기: 상한 초과 → `revokedAt = 지금`, `expiresAt = 지금 + 1분`(기존 규칙)
- 삭제: `expiresAt`가 지나면 TTL 인덱스가 지움
