# Implementation Plan: 티켓 보드 단계 컬럼 연속 스크롤

**Branch**: `007-stage-scroll-window` (스펙 디렉터리 기준, git 브랜치는 현재 작업 브랜치 사용) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-stage-scroll-window/spec.md`

## Summary

단계 컬럼의 20개 슬라이딩 윈도우를 "통째 교체 + 이전 보기 버튼"에서 "10개씩 이동 + 위아래 스크롤"로 바꾼다.
서버에서는 지금처럼 20개씩 받고, 받은 카드는 PipelineContext 인스턴스 필드(리렌더 없음)에 단계별로 보관한다.
위로 갈 때는 보관분을 꺼내 쓰므로 서버 요청이 없다. 창 이동 계산은 순수 함수로 분리해 테스트한다.

## Technical Context

**Language/Version**: TypeScript, React 18 (class components)

**Primary Dependencies**: Apollo Client 3, react-beautiful-dnd, styled-components

**Storage**: 없음 (클라이언트 메모리, 화면을 떠나면 버림)

**Testing**: 순수 함수 단위 테스트 — widgets의 jest/ts-jest를 rootDir 지정으로 실행 (ui-tickets에 러너 없음). 화면은 실제 보드 수동 검증

**Target Platform**: 데스크톱 브라우저 (운영자 보드). 모바일 레이아웃도 같은 컴포넌트 사용

**Project Type**: 모노레포 프론트엔드 패키지 (`packages/ui-tickets`)

**Performance Goals**: 렌더 카드 단계당 ≤ 20, 서버 요청 수 현행 이하, 위로 이동 시 요청 0

**Constraints**: 서버 코드·GraphQL 스키마 변경 없음. 기존 itemMap 변경 경로(드래그/추가/삭제/업데이트) 수정 최소화

**Scale/Scope**: 단계당 카드 수백 개 가정. 수정 파일 5개 + 신규 2개(유틸, 테스트)

## Constitution Check

| 원칙 | 판단 |
|---|---|
| I. 최소 범위 | 통과 — 스크롤/창 이동 관련만. 위치 표시·로딩 표시 등 인접 개선 제외. R8(이벤트성 loadMore)은 새 동작이 FR-005를 깨지 않게 하는 데 필요한 최소 수정 |
| II. 스펙 비례 | 통과 — 다중 파일 동작 변경이라 spec-kit 경로 |
| III. 실동작 검증 | quickstart.md 2절 수동 검증 필수 |
| IV. 성능 회귀 금지 | 통과 — 렌더 상한 20 유지(ff6ce88f49 의도 유지), 서버 요청 수 동일, 보관 목록은 state 밖, 신규 쿼리 없음(기존 loadMore 쿼리 그대로 `network-only`) |
| V. 커밋 규칙 | `feat(tickets): ...` 형식, 사용자 요청 시에만 커밋 |

설계 후 재확인: 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/007-stage-scroll-window/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/pipeline-context.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
packages/ui-tickets/src/boards/
├── utils/
│   ├── stageWindow.ts          # 신규: 창 계산 순수 함수
│   └── stageWindow.test.ts     # 신규: 단위 테스트
├── containers/
│   ├── PipelineContext.tsx     # stageBuffers, onSlideStage, getStageBufferInfo, 구독 핸들러 반영, onLoadPreviousStage 제거
│   ├── Pipeline.tsx            # 컨텍스트 → Stage prop 연결 변경
│   └── Stage.tsx               # loadMore/loadPrevious/fillMore 재작성
└── components/stage/
    └── Stage.tsx               # 위로 스크롤 트리거, 스크롤 위치 보정, "이전 보기" 버튼 제거
```

**Structure Decision**: 기존 boards 구조 안에서 수정. 계산 로직만 `utils/`로 분리(기존 `utils/mobile.ts`와 같은 위치).

## Complexity Tracking

해당 없음.
