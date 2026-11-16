# Data Model: 단계별 보관 목록 (클라이언트 메모리 전용)

## StageBuffer (단계당 1개, `PipelineProviderInner.stageBuffers: Map<stageId, StageBuffer>`)

| 필드 | 타입 | 의미 |
|---|---|---|
| `loaded` | `IItem[]` | 이 단계에서 서버로부터 받은 카드 전체, 서버 순서. id 중복 없음 |
| `start` | `number` | 화면에 보이는 첫 카드의 `loaded` 인덱스 (= `stageSkipOffset[stageId]`) |
| `windowLength` | `number` | 마지막 동기화 시점의 화면 카드 수 (≤ 20) |

화면 카드(`itemMap[stageId]`) = 동기화 직후 `loaded.slice(start, start + windowLength)`.

### 불변 조건
- `0 ≤ start ≤ loaded.length`, `windowLength ≤ 20`, `start + windowLength ≤ loaded.length`
- `loaded` 안 `_id` 중복 없음

### 상태 전이
| 이벤트 | 변화 |
|---|---|
| 최초 로드/재조회/필터 변경/전체 보관 (`onLoadStage`) | `loaded = items`, `start = 0`, 창 = 앞 20개 |
| 아래로 이동 (보관분 있음) | 동기화 → R5 아래 규칙 |
| 아래로 이동 (보관분 없음) | 서버 20개(skip = `loaded.length`) → 동기화 → 중복 제거 후 붙임 → R5 아래 규칙 |
| 위로 이동 | 동기화 → R5 위 규칙. 서버 요청 없음 |
| 창 밖 카드 수정 (실시간) | 같은 단계면 교체, 다른 단계면 제거 |
| 창 밖 카드 삭제/타 단계 이동 (실시간) | 제거, 제거 위치 < `start`면 `start - 1` |
| 단계 전체 삭제 (`itemsRemove`) | 빈 버퍼 |

## 순수 함수 (`boards/utils/stageWindow.ts`)
- `createBuffer(items)` → 초기 버퍼와 창
- `syncWindow(buffer, windowItems)` → 창 구간을 현재 화면 카드로 교체
- `appendItems(buffer, items)` → id 중복 제거 후 뒤에 붙임
- `slideDown(buffer)` / `slideUp(buffer)` → 새 버퍼와 창
- `hasBelow(buffer)` → 창 뒤 보관분 존재 여부
- `replaceOutsideWindow(buffer, item)` / `removeOutsideWindow(buffer, id)`

모든 함수는 입력을 바꾸지 않고 새 객체를 돌려준다.
