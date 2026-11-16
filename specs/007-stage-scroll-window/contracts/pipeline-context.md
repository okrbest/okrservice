# Contract: PipelineContext ↔ Stage (ui-tickets 보드 내부)

외부 API·서버 스키마 변경 없음. 바뀌는 것은 보드 내부 컨텍스트 계약뿐.

## 제거
- `onLoadPreviousStage(stageId, items, skipUsed)` / Stage prop `onLoadPrevious`
- Stage 표시 컴포넌트 prop `showLoadPrevious` 및 "Load previous" 버튼

## 추가
```ts
/** 창 이동. fetched가 있으면 보관 목록에 붙인 뒤 이동. 이동했으면 true */
onSlideStage(stageId: string, direction: 'down' | 'up', fetched?: IItem[]): boolean;

/** 아래로 이동할 때 서버 요청 필요 여부 판단용 */
getStageBufferInfo(stageId: string): { loadedCount: number; hasBelow: boolean };
```

## 유지 (의미 동일)
- `onLoadStage(stageId, items)` — 최초 로드/재조회 전용 (보관 목록 리셋). `loadMore`는 더 이상 이것을 쓰지 않는다.
- `stageSkipOffset[stageId]` — 창 앞 카드 수. `hasMore = stageSkipOffset + items.length < itemsTotalCount`.
- `maxItemsPerStage` = 20.

## Stage 표시 컴포넌트 prop
- `loadPrevious: () => void` — 위로 이동 (스크롤 맨 위에서 호출)
- `loadMore: () => void` — 사용자 스크롤/버튼: 아래로 이동
- `windowStart: number` — 창 앞 카드 수(변하면 스크롤 위치 보정, >0이면 위로 스크롤 가능)
- `fillMore: () => void` — 이벤트 경로 전용: 창이 20개 미만일 때만 채움
