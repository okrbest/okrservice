# Tasks: 티켓 보드 단계 컬럼 연속 스크롤

**Input**: `specs/007-stage-scroll-window/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 창 계산 순수 함수만 TDD(테스트 먼저). 화면은 quickstart.md 수동 검증.

경로 기준: `B = packages/ui-tickets/src/boards`

## Phase 1: Setup

- [X] T001 테스트 실행 명령 확인: quickstart.md 1절 명령으로 빈 테스트 파일 `B/utils/__tests__/stageWindow.test.ts`가 jest에 잡히는지 확인

## Phase 2: Foundational (창 계산 순수 함수)

- [X] T002 [P] `B/utils/__tests__/stageWindow.test.ts`에 실패하는 테스트 작성: createBuffer(10개/30개), syncWindow(창 안 추가·삭제 반영), appendItems(id 중복 제거), slideDown(채우기 10→20, 밀기 start+10, 끝에서 변화 없음), slideUp(start-10, 0에서 변화 없음), hasBelow, replaceOutsideWindow, removeOutsideWindow(창 앞 제거 시 start-1, 창 안 id는 무시), 입력 불변 확인
- [X] T003 `B/utils/stageWindow.ts` 구현 (data-model.md 함수 목록, research R5 규칙, 상수 WINDOW_SIZE=20 / SLIDE_STEP=10) → T002 통과

## Phase 3: User Story 1 + 2 — 위아래 연속 스크롤 (P1) 🎯 MVP

US1과 US2는 같은 창 이동 경로를 공유해 한 단계로 묶는다.

**Independent Test**: quickstart.md 2절 #1~#6, #9~#11

- [X] T004 [US1] `B/containers/PipelineContext.tsx`: `private stageBuffers = new Map()` 추가, `onLoadStage`를 createBuffer 기반 리셋으로 변경(창=앞 20개, stageSkipOffset=0), `onSlideStage(stageId, direction, fetched?)`와 `getStageBufferInfo(stageId)` 추가(이동 전 syncWindow로 `itemMap[stageId]` 반영 → itemIds·itemMap·stageSkipOffset 갱신), 컨텍스트 값에 노출, `onLoadPreviousStage` 및 IStore 항목 제거
- [X] T005 [US1] `B/containers/Pipeline.tsx`: PipelineConsumer에서 `onLoadPreviousStage` 대신 `onSlideStage`, `getStageBufferInfo`를 받아 Stage에 전달
- [X] T006 [US1] `B/containers/Stage.tsx`: StageProps 갱신(onLoadPrevious 제거, onSlideStage·getStageBufferInfo 추가). `loadMore` = hasBelow면 `onSlideStage('down')`, 아니면 `loadedCount < itemsTotalCount`일 때 skip=loadedCount, limit=20 요청 후 `onSlideStage('down', newItems)`. `loadPrevious` = `onSlideStage('up')`(서버 요청 없음). `fillMore` = `items.length < maxItemsPerStage`일 때만 loadMore. 표시 컴포넌트에 `hasPrevious = stageSkipOffset > 0`, `fillMore` 전달, `showLoadPrevious` 제거
- [X] T007 [US2] `B/components/stage/Stage.tsx`: Props에서 `showLoadPrevious` 제거·`hasPrevious`·`fillMore` 추가, "Load previous" 버튼 렌더 제거, `onScroll`에 `scrollTop <= 0 && hasPrevious`면 `loadPrevious()` 추가
- [X] T008 [US1] `B/components/stage/Stage.tsx`: `getSnapshotBeforeUpdate`로 기준 카드(이전·다음 목록 모두에 있는 첫 보이는 카드, `[data-rbd-draggable-id]`) 위치 기록 → `componentDidUpdate`에서 scrollTop 보정. 기존 "allIdsChanged면 scrollTop=0" 블록 제거
- [X] T009 [US1] `B/components/stage/Stage.tsx`: `handleTicketUpdate`, `handleGlobalUpdate`의 `loadMore()` 호출을 `fillMore()`로 변경 (research R8)
- [X] T010 [US1] ui-tickets 타입 체크 통과 확인(변경 파일 대상 tsc 또는 IDE 진단)

**Checkpoint**: 위아래 스크롤 동작, 요청 수, 카드 수 ≤ 20 확인

## Phase 4: User Story 3 — 화면 밖 카드 실시간 반영 (P2)

**Independent Test**: quickstart.md 2절 #7, #8

- [X] T011 [US3] `B/containers/PipelineContext.tsx` 구독 핸들러: `itemUpdate`가 현재 창에 없을 때 반환 전에 각 버퍼에 replaceOutsideWindow(같은 단계) 또는 removeOutsideWindow(다른 단계) 적용
- [X] T012 [US3] `B/containers/PipelineContext.tsx`: `itemRemove` → oldStageId 버퍼 removeOutsideWindow, `orderUpdated`에서 단계가 바뀌면 oldStageId 버퍼 removeOutsideWindow, `itemsRemove` → 해당 단계 버퍼를 빈 버퍼로

## Phase 5: Polish

- [X] T013 코드 리뷰(code-reviewer 에이전트) 후 CRITICAL/HIGH 수정
- [X] T014 quickstart.md 2절 전 항목 실제 보드에서 검증하고 결과 기록

## Dependencies

- T001 → T002 → T003 → T004 → (T005, T006) → T007 → T008 → T009 → T010
- T011, T012는 T004 이후 (같은 파일이라 순차)
- T013, T014는 전부 완료 후

## Parallel

- T002(테스트)와 T004 앞부분 읽기 정도만 병행 가능. 대부분 같은 파일을 순차 수정하므로 병렬 이득 작음.

## Implementation Strategy

1. MVP = Phase 1~3 (위아래 스크롤). 여기서 실제 보드 확인
2. Phase 4로 화면 밖 카드 정확도 보강
3. Phase 5 리뷰·검증 후 사용자에게 보고 (커밋은 요청 시)
