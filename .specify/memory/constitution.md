# okrservice Constitution

erxes 기반 모노레포(widgets · client-portal · packages 플러그인)의 개발 헌장.
spec-kit(무엇을/왜) + superpowers(어떻게)를 결합한 워크플로우의 최상위 규칙이다.

## Core Principles

### I. 최소 범위 수정 (Minimal-Scope Change)
요청된 변경만 수행한다. 인접한 "개선"(라벨 정리, 리네이밍, 스타일 통일)은
적용하지 않고 제안만 한다. 하나의 커밋은 하나의 의도만 담는다.

### II. 스펙 우선 — 단, 규모에 비례 (Spec-Proportional Rigor)
모든 작업에 스펙을 요구하지 않는다. 작업 규모가 스펙 비용을 정당화할 때만
spec-kit 파이프라인을 태운다 (라우팅 규칙은 Development Workflow 참조).
근거: 과거 대형 기능(`feat(kb): 기능/UI 전면 개선`)이 스펙 없이 진행되어
후속 fix/style 커밋 10개 이상을 유발했다. 대형 작업의 후속 수정 비용이
스펙 작성 비용보다 크다.

### III. 실동작 검증 (Verify in Real App)
이 저장소의 작업 대부분은 UI다. 타입체크/빌드 통과는 검증이 아니다.
변경된 화면·플로우를 실제로 구동해 확인한 후에만 완료로 보고한다.
(superpowers verification-before-completion 준수)

### IV. 성능 회귀 금지 (No Performance Regression)
중복 쿼리 제거, cache-first, 지연 마운트 등 누적된 perf 개선을 되돌리는
변경 금지. 새 쿼리/구독/리스너 추가 시 기존 perf 커밋 의도와 충돌하는지
확인한다. 데이터 fetch 추가는 fetchPolicy를 명시적으로 선택한다.

### V. Conventional Commits — 한국어 본문
commitlint 규칙 준수. `type(scope): 한국어 요약` 형식.
scope는 실제 모듈명(messenger, kb, tickets, client-portal, chatbot 등).
subject ≤50자, why가 자명하지 않을 때만 본문 작성.

## Stack Constraints

- widgets: React (CRA 계열), 인라인 스타일 관행 — 기존 파일 스타일 방식 유지
- client-portal: Next.js — 라우팅/링크는 해당 버전 API 준수
- 백엔드 변경은 gateway pathRewrite·플러그인 구조 영향 확인 필수
- 시크릿/API 키 하드코딩 금지 — 발견 시 즉시 보고 (기존 코드 포함)

## Development Workflow

작업 유형별 라우팅 — 아래 규칙이 spec-kit과 superpowers의 결합 원칙이다:

| 작업 유형 | 워크플로우 |
|---|---|
| 버그/회귀 (`fix`) | superpowers:systematic-debugging → 수정 → 실동작 검증 → 커밋. 스펙 생략 |
| 소규모 수정 (≤3파일, `style`/`chore`/단순 `feat`) | 직접 수정 → 실동작 검증 → 커밋. 스펙 생략 |
| 성능 개선 (`perf`) | 측정 먼저(재현·계측) → 수정 → 개선 수치 확인 → 커밋 |
| 신규 기능 (다중 파일 / 신규 화면 / API·스키마 변경) | superpowers:brainstorming(요구 탐색) → /speckit-specify → /speckit-plan → /speckit-tasks → /speckit-implement |
| 대형/불명확 기능 ("전면 개선"급) | 위 + /speckit-clarify (plan 전) + /speckit-analyze (implement 전) 필수 |

결합 원칙:
1. **spec-kit은 "무엇을/왜", superpowers는 "어떻게"**: specify/plan/tasks가
   산출물 구조를 만들고, implement 단계 내부에서 superpowers 스킬
   (TDD—테스트 인프라 있는 패키지 한정, systematic-debugging, verification)이
   실행 품질을 담당한다.
2. **brainstorming이 specify의 입력**: 요구가 불명확하면 specify 전에
   brainstorming으로 의도를 좁힌다. 명확하면 바로 specify.
3. **스펙 산출물은 `specs/` 아래 기능 브랜치 단위로 관리**하고 코드와 함께 커밋한다.
4. **에스컬레이션**: 스펙 생략 경로에서 작업 중 범위가 3파일을 넘거나
   API 변경이 필요해지면 중단하고 spec-kit 경로로 전환한다.

## Governance

- 이 헌장은 다른 관행·습관보다 우선한다.
- 개정은 이 파일 수정 + 커밋으로 하며, 개정 이유를 커밋 본문에 남긴다.
- 라우팅 경계(3파일 기준 등)가 실제와 안 맞으면 조정 제안을 환영한다 —
  단, 조정도 커밋으로 기록한다.

**Version**: 1.0.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-15
