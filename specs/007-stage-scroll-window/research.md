# Research: 티켓 보드 단계 컬럼 연속 스크롤

## R1. 서버 요청 단위 — 20개 유지
- **Decision**: 서버에서 받을 때는 20개씩(`LOAD_MORE_LIMIT`), 화면 이동은 10개씩.
- **Rationale**: `getItemList`는 요청마다 필터 생성(`generateTicketCommonFilters`, DB 조회 다수) + RPC 3회
  (conformities, companies, customers)의 고정 비용이 있다. 10개씩 받으면 같은 카드 수에 요청이 2배.
  20개를 받아 두 번에 나눠 보여주면 요청 수는 지금과 같다.
- **Alternatives**: 10개씩 요청(서버 부하 2배, 기각), 상한 100(렌더 비용, 사용자 기각).

## R2. 보관 목록 위치 — PipelineContext 인스턴스 필드
- **Decision**: `PipelineProviderInner`의 `private stageBuffers = new Map<stageId, StageBuffer>()`. React state 아님.
- **Rationale**: 화면 밖 카드 변경이 리렌더를 일으키면 안 된다(성능 헌장 IV). 파이프라인 전환 시 Provider가
  다시 만들어지므로 자동으로 비워진다.
- **Alternatives**: state에 보관(변경마다 리렌더, 기각), Apollo 캐시 재사용(필터별 키 관리 복잡, 기각).

## R3. 기존 itemMap 변경 경로와의 동기화 — 이동 직전 덮어쓰기
- **Decision**: 창을 이동하기 직전에 현재 `itemMap[stageId]`로 `loaded`의 창 구간
  `[start, start + windowLength)`를 교체한다. 드래그·추가·삭제·업데이트 코드(8곳)는 그대로.
- **Rationale**: 보이는 카드는 itemMap이 진실. 이동 시점에만 맞추면 연결 지점이 하나로 줄어 회귀 위험이 낮다.
- **Alternatives**: 모든 변경 경로에 버퍼 갱신 추가(누락 시 중복/유실 버그, 기각).

## R4. 화면 밖 카드의 실시간 변경
- **Decision**: 구독 핸들러에서 창 **밖** 구간에만 반영:
  - `itemUpdate`: 현재 창에 없으면 지금은 무시 → 버퍼에서 같은 단계면 교체, 다른 단계로 옮겨졌으면 제거.
  - `itemRemove`, `orderUpdated`(다른 단계로 이동): 원래 단계 버퍼에서 제거.
  - `itemsRemove`: 해당 단계 버퍼 비우기.
  창 밖에서 제거될 때 그 위치가 창 앞이면 `start`를 1 줄인다.
- **Rationale**: 창 안 변경은 기존 itemMap 경로가 처리하므로 중복 적용 방지.
- 한계: 서버 skip 위치는 삭제로 1칸 밀릴 수 있다 — 지금 코드와 같은 한계(오프셋 기반 페이지).
  중복 표시는 id 기준 중복 제거로 막는다.

## R5. 창 이동 규칙 (fill → slide)
- **Decision**: 아래로: `end = min(loaded.length, start + windowLength + 10)`, `start = max(start, end - 20)`.
  위로: `start = max(0, start - 10)`, `end = min(loaded.length, start + 20)`.
- **Rationale**: 첫 로드는 서버 기본 limit(10개)이라 창이 20개 미만일 수 있다. 같은 식으로 "채우기"와 "밀기"를 모두 처리.

## R6. 스크롤 위치 유지
- **Decision**: 표시 컴포넌트 `getSnapshotBeforeUpdate`에서 이전·다음 목록 모두에 있는 첫 "보이는" 카드를 기준으로
  정하고(`[data-rbd-draggable-id]`로 DOM 조회), 업데이트 후 그 카드의 위치 차이만큼 `scrollTop` 보정.
  기존 "id가 전부 바뀌면 scrollTop=0" 동작은 이 보정으로 대체.
- **Rationale**: 보정 후 스크롤이 끝에서 떨어지므로 연속 트리거 루프도 함께 막힌다.

## R7. 위로 스크롤 트리거
- **Decision**: 기존 `onScroll`에 `scrollTop <= 0 && stageSkipOffset > 0`이면 위로 이동 추가. "이전 보기" 버튼 제거.
  `stageSkipOffset`은 의미 그대로(창 앞에 있는 카드 수 = `start`) 유지 → 전체 선택·hasMore 계산 호환.

## R8. 기존 이벤트성 loadMore 호출
- **발견**: `handleTicketUpdate`, `handleGlobalUpdate`(티켓 수정/마감일 변경 이벤트)가 `loadMore()`를 호출한다.
  지금은 이 때문에 사용자가 스크롤하지 않아도 창이 20개 밀릴 수 있다.
- **Decision**: 이벤트 경로는 창이 20개 미만일 때만 채우기로 호출(창을 밀지 않음). 사용자 스크롤·버튼만 창을 민다.
- **Rationale**: 새 동작에서 이벤트마다 10개씩 밀리면 FR-005(제자리 유지) 위반. 원래 의도(빈 자리 채우기)는 유지.

## R9. 테스트 방법
- **Decision**: 창 계산은 순수 함수 파일(`boards/utils/stageWindow.ts`)로 분리해 단위 테스트.
  ui-tickets에 테스트 러너가 없어 기존 관행대로 widgets의 jest + `--config` rootDir 지정으로 실행.
  화면 동작은 실제 보드에서 확인(quickstart.md).

## R10. 코드 리뷰 반영 (2026-11-16)
- **반복 이동 방지**: 끝 판정 여유 4px, 창 이동·위치 보정 직후 300ms 동안 끝 이동 무시.
- **스크롤이 안 생기는 칸**: 휠 방향(deltaY)으로 위/아래 이동 — 이미 끝에 있을 때도 동작. 터치는 끝에서 40px 이상 당기면 이동(브라우저 당겨서 새로고침보다 짧은 거리).
- **이벤트 경로 채우기**: `fillWindow`(시작 위치 고정, 뒤만 채움) 분리 — `slideDown`은 창이 덜 찼을 때 시작 위치를 밀 수 있음.
- **늦은 서버 응답**: 요청 당시 `loadedCount`와 다르면(단계 재조회) 버림, `start`가 바뀌었으면(사용자가 위로 이동) 붙이기만(`stay`).
- **반영 전 state 읽기**: 창 이동 후 setState 반영 전에는 `syncWindow` 건너뜀(`pendingWindowStages`).
- **창 앞 카드 실시간 제거**: 버퍼 시작 위치가 바뀌면 `stageSkipOffset`도 갱신.
- 미반영(기존 동작과 동일): 맨 위 추가 시 창 21개, 실시간 추가 카드의 보관 목록 내 위치, "Load more (n / 전체)"의 n이 창 카드 수, 빈 응답 반복 요청, catch의 console.log.
