# okrservice 개발 워크플로우 가이드 (spec-kit × superpowers)

이 저장소는 **spec-kit**(구조화된 스펙 파이프라인)과 **superpowers**(작업 방법론 스킬)를 결합해 쓴다.
이 문서는 "언제 무엇을 쓰는가"에 대한 실전 사용 가이드다.

- 최상위 규칙(헌장): [.specify/memory/constitution.md](.specify/memory/constitution.md)
- 에이전트 진입점(요약 + 라우팅): [CLAUDE.md](CLAUDE.md)
- 이 문서: 두 시스템의 결합 사용법 · 명령 레퍼런스 · 함정

> 우선순위: **헌장 > CLAUDE.md > 이 가이드 > 각 스킬 기본 동작**.
> 셋이 충돌하면 헌장이 이긴다. 충돌을 발견하면 헌장을 고치고 커밋한다.

---

## 1. 역할 분담 한 줄 요약

| 시스템 | 담당 | 산출물 |
|---|---|---|
| **spec-kit** | 무엇을 / 왜 (What & Why) | `specs/<NNN>-<slug>/` 아래 spec.md · plan.md · tasks.md 등 파일 산출물 |
| **superpowers** | 어떻게 (How) | 파일 산출물 없음(일부 제외). 작업 진행 방식·검증 절차를 강제하는 스킬 |

핵심 결합 원칙 4가지 (헌장 Development Workflow):

1. spec-kit이 산출물 구조를 만들고, `implement` **내부에서** superpowers 스킬이 실행 품질을 담당한다.
2. 요구가 불명확하면 `specify` **전에** `superpowers:brainstorming`으로 의도를 좁힌다. 명확하면 바로 specify.
3. 스펙 산출물은 `specs/` 아래 기능 단위 디렉터리로 관리하고 **코드와 함께 커밋**한다.
4. 스펙 생략 경로에서 범위가 3파일 초과 또는 API 변경으로 커지면 **중단하고 spec-kit 경로로 전환**한다.

---

## 2. 설치 현황 (이 저장소에 실제로 있는 것)

```
.specify/
├── memory/constitution.md          # 헌장 (v1.0.0, 2026-07-15 제정)
├── templates/                      # spec / plan / tasks / checklist / constitution 템플릿
├── scripts/bash/                   # create-new-feature.sh, setup-plan.sh, setup-tasks.sh, check-prerequisites.sh
├── integration.json                # 설치된 통합: claude, cursor-agent
└── workflows/speckit/workflow.yml  # 번들 워크플로우 "Full SDD Cycle"

.claude/skills/speckit-*/SKILL.md   # Claude Code에서 /speckit-* 로 호출되는 슬래시 커맨드 10종
.cursor/rules/ + .cursor/skills/    # Cursor용 동일 워크플로우 미러 (specify-rules.mdc, workflow-routing.mdc)

docs/superpowers/plans/ + specs/    # spec-kit 도입 이전 superpowers writing-plans 산출물 (레거시, 참고용)
```

superpowers 스킬은 플러그인으로 제공되며 저장소에 파일로 들어있지 않다. `Skill` 툴 또는 `/`로 호출한다.

> `specs/` 디렉터리는 **아직 저장소에 없다.** 첫 `/speckit-specify` 실행 시 생성된다.
> `.gitignore`에 제외 규칙이 없으므로 생성되면 그대로 커밋 대상이다 (헌장 결합 원칙 3).

---

## 3. 라우팅 — 작업 시작 전 판정

작업 유형을 먼저 판정한다. 위에서부터 순서대로 확인해 **처음 걸리는 행**을 따른다.

| # | 작업 유형 | 워크플로우 | 스펙 |
|---|---|---|---|
| 1 | 버그 / 회귀 (`fix`) | `superpowers:systematic-debugging` → 수정 → 실동작 검증 → 커밋 | 생략 |
| 2 | 소규모 수정 ≤3파일 (`style`/`chore`/단순 `feat`) | 직접 수정 → 실동작 검증 → 커밋 | 생략 |
| 3 | 성능 개선 (`perf`) | 측정(재현·계측) → 수정 → 개선 수치 확인 → 커밋 | 생략 |
| 4 | 신규 기능 (다중 파일 / 신규 화면 / API·스키마 변경) | brainstorming → specify → plan → tasks → implement | 필수 |
| 5 | 대형/불명확 기능 ("전면 개선"급) | 4번 + `clarify`(plan 전) + `analyze`(implement 전) | 필수 |

**판정 기준선**

- "3파일"은 **최종 변경 파일 수 추정치**다. 시작 시 2파일로 보였는데 5파일이 되면 1·2·3번이 아니라 4번이었던 것이다.
- API·GraphQL 스키마·DB 필드 변경이 하나라도 있으면 파일 수와 무관하게 4번.
- 신규 화면/신규 라우트는 파일 수와 무관하게 4번.
- 버그 수정이 설계 변경으로 번지면 1번에서 4번으로 전환한다.

**에스컬레이션 규칙 (헌장 결합 원칙 4)**

```
스펙 생략 경로 진행 중
  → 4번째 파일을 열게 됨  OR  API 변경이 필요해짐
    → 즉시 중단
    → 지금까지 작업 내용을 요약해 /speckit-specify 입력으로 사용
    → 4번 경로로 재진입
```

되돌리는 방향(4번 → 2번 다운그레이드)은 하지 않는다. 이미 만든 스펙은 남긴다.

---

## 4. 경로별 실전 절차

### 4-1. 버그 / 회귀 (1번)

```
1) superpowers:systematic-debugging 호출
2) 재현 → 근본 원인 확인 → 가설 검증 (원인 확인 전 수정 금지)
3) 최소 범위 수정
4) 실동작 검증 — 빌드/타입체크 통과는 검증이 아니다 (헌장 III)
5) fix(scope): 한국어 요약  커밋
```

수정 제안 전에 반드시 디버깅 스킬을 먼저 태운다. "명백해 보이는 원인"이 헌장이 막으려는 대상이다.

### 4-2. 소규모 수정 (2번)

브레인스토밍·스펙 없이 바로 수정. 단 완료 보고 전 `superpowers:verification-before-completion` 기준으로 실제 화면/플로우를 구동한다.

### 4-3. 성능 개선 (3번)

측정 없는 perf 커밋은 금지. 커밋 본문에 개선 전/후 수치를 남긴다.
새 쿼리·구독·리스너를 추가할 땐 기존 perf 커밋(cache-first, 지연 마운트, 중복 제거) 의도와 충돌하는지 먼저 확인한다 (헌장 IV). 데이터 fetch 추가 시 `fetchPolicy`를 명시적으로 고른다.

### 4-4. 신규 기능 (4번) — 기본 파이프라인

```
superpowers:brainstorming        # 요구가 불명확할 때만. 명확하면 건너뜀
  ↓
/speckit-specify <기능 설명>      # specs/<NNN>-<slug>/spec.md 생성
  ↓
/speckit-plan [가이드]            # plan.md (+ research.md, data-model.md, contracts/, quickstart.md)
  ↓
/speckit-tasks [제약]             # tasks.md — Phase별 · User Story별 · 의존성 순서
  ↓
/speckit-implement [필터]         # tasks.md 실행. 내부에서 superpowers 스킬 사용
  ↓
실동작 검증 → 커밋 (코드 + specs/ 산출물 함께)
```

### 4-5. 대형/불명확 기능 (5번) — 게이트 추가

```
brainstorming → /speckit-specify → /speckit-clarify → /speckit-plan
  → /speckit-tasks → /speckit-analyze → /speckit-implement
```

- `clarify`는 **plan 전에** 돈다. plan을 만든 뒤 스펙을 흔들면 plan/tasks를 다시 만들어야 한다.
- `analyze`는 **implement 전에** 돈다. spec/plan/tasks 3자 정합성만 검사하고 파일을 고치지 않는다(비파괴).
- 선택적으로 `/speckit-checklist <도메인>`으로 도메인별 체크리스트를 추가한다.

---

## 5. spec-kit 명령 레퍼런스

| 명령 | 입력 | 산출/효과 | 언제 |
|---|---|---|---|
| `/speckit-constitution` | 원칙 텍스트 | `.specify/memory/constitution.md` 갱신 + 템플릿 동기화 | 헌장 개정 시에만 |
| `/speckit-specify` | 자연어 기능 설명 | `specs/<NNN>-<slug>/spec.md` 생성, `.specify/feature.json` 기록 | 4·5번 시작점 |
| `/speckit-clarify` | (선택) 확인할 영역 | spec.md에 최대 5개 질의응답 반영 | 5번, plan 전 |
| `/speckit-plan` | (선택) 계획 가이드 | plan.md · research.md · data-model.md · contracts/ · quickstart.md | spec 확정 후 |
| `/speckit-tasks` | (선택) 태스크 제약 | tasks.md (Setup → Foundational → User Story별 → Polish, `[P]` 병렬 표시) | plan 후 |
| `/speckit-analyze` | (선택) 초점 | spec/plan/tasks 교차 정합성 리포트 (비파괴) | 5번, implement 전 |
| `/speckit-implement` | (선택) 태스크 필터 | tasks.md 실행 = 실제 코드 변경 | tasks 확정 후 |
| `/speckit-checklist` | 도메인 | `checklists/` 아래 체크리스트 | 필요 시 |
| `/speckit-taskstoissues` | (선택) 라벨 | tasks.md → GitHub 이슈 | 팀 분배 시 |
| `/speckit-agent-context-update` | — | CLAUDE.md의 `<!-- SPECKIT START/END -->` 블록 갱신 | 스택 변경 후 |

### 산출물 배치

```
specs/
└── 011-hr-bridge-allowlist/       # <3자리 번호>-<슬러그>
    ├── spec.md                    # /speckit-specify
    ├── plan.md                    # /speckit-plan
    ├── research.md                #   "  (Phase 0)
    ├── data-model.md              #   "  (Phase 1)
    ├── quickstart.md              #   "  (Phase 1)
    ├── contracts/                 #   "  (Phase 1)
    ├── tasks.md                   # /speckit-tasks
    └── checklists/                # /speckit-checklist
```

번호는 `specs/` 안의 기존 `NNN-` 디렉터리 중 최대값 + 1로 자동 결정된다.

---

## 6. superpowers 스킬 레퍼런스

### 프로세스 스킬 (다른 스킬보다 먼저 탄다)

| 스킬 | 언제 | 결합 지점 |
|---|---|---|
| `superpowers:brainstorming` | 기능·컴포넌트 신규 제작, 동작 변경 전 | **specify의 입력**. 요구 불명확 시 필수 |
| `superpowers:systematic-debugging` | 버그·테스트 실패·예상 밖 동작 | 라우팅 1번의 시작점. 수정 제안 전에 호출 |
| `superpowers:verification-before-completion` | 모든 완료 보고 직전 | 헌장 III 실동작 검증의 실행 절차 |

### 구현 보조 스킬

| 스킬 | 언제 |
|---|---|
| `superpowers:test-driven-development` | 테스트 인프라가 있는 패키지에 한정 (예: widgets는 jest 29 설치됨). 인프라 없는 곳에 TDD를 강제하지 않는다 |
| `superpowers:writing-plans` | spec-kit을 안 쓰는 독립 작업의 계획 문서. 산출물은 `docs/superpowers/plans/` |
| `superpowers:executing-plans` | 위 계획 문서 실행 |
| `superpowers:using-git-worktrees` | 현재 작업공간과 격리가 필요한 기능 작업 |
| `superpowers:requesting-code-review` / `receiving-code-review` | 변경 리뷰 요청·수용 |
| `superpowers:subagent-driven-development`, `dispatching-parallel-agents` | 독립 태스크 병렬화 (tasks.md의 `[P]` 항목과 궁합) |
| `superpowers:finishing-a-development-branch` | 브랜치 마무리 |

### writing-plans vs spec-kit — 어느 쪽을 쓰나

이 저장소에는 두 계보의 산출물이 공존한다.

- `docs/superpowers/plans/`, `docs/superpowers/specs/` — spec-kit 도입(2026-07-15) **이전** 산출물. 참고용으로 유지, 신규 작성 금지.
- `specs/<NNN>-<slug>/` — **현재 표준**. 신규 기능은 여기로 간다.

새 기능 계획을 `docs/superpowers/plans/`에 쓰지 않는다. 헌장 결합 원칙 3에 따라 `specs/`가 단일 위치다.

---

## 7. 실전 함정

### 7-1. 스크립트는 git 브랜치를 만들지 않는다

`create-new-feature.sh`는 `specs/<NNN>-<slug>/` 디렉터리와 `.specify/feature.json`만 만든다. **git 브랜치 생성·체크아웃은 하지 않는다.** 브랜치는 직접 만든다.

```bash
git switch -c feat/hr-bridge-allowlist
```

디렉터리 이름(`011-hr-bridge-allowlist`)과 브랜치 이름(`feat/chatbot`)이 달라도 무방하다. 연결은 `.specify/feature.json`이 담당한다.

### 7-2. 현재 기능(feature) 해석 순서

후속 명령(`plan`/`tasks`/`implement`)이 "어느 기능인지" 찾는 순서:

1. `SPECIFY_FEATURE_DIRECTORY` 환경변수 (명시적 오버라이드)
2. `.specify/feature.json`의 `feature_directory` 키 (specify가 기록)
3. 없으면 에러

`ERROR: Feature directory not found.` 가 나오면 `/speckit-specify`를 아직 안 돌렸거나 `.specify/feature.json`이 지워진 것이다. 기존 스펙을 이어서 작업할 땐:

```bash
export SPECIFY_FEATURE_DIRECTORY=/home/sdh/okrservice/specs/011-hr-bridge-allowlist
```

여러 기능을 오가며 작업하면 `feature.json`이 마지막 것을 가리킨다. 전환 시 위 환경변수로 명시하는 편이 안전하다.

### 7-3. 스펙과 코드를 따로 커밋하지 않기

`specs/` 산출물은 해당 기능 코드와 같은 브랜치·같은 흐름에서 커밋한다. 코드만 머지되고 스펙이 남으면 다음 사람이 스펙을 신뢰하지 못한다.

### 7-4. tasks.md의 `[P]`

`[P]`는 파일 충돌 없이 병렬 실행 가능한 태스크다. 같은 파일을 만지는 태스크에는 붙이지 않는다. 병렬로 돌릴 땐 `superpowers:dispatching-parallel-agents`와 함께 쓴다.

### 7-5. Cursor와 병행

`.cursor/rules/workflow-routing.mdc`, `.cursor/skills/`에 같은 워크플로우가 미러링되어 있다. 라우팅 규칙을 바꾸면 헌장 · CLAUDE.md · `.cursor/rules/` 세 곳을 함께 갱신한다.

---

## 8. 커밋 규칙 (헌장 V)

```
type(scope): 한국어 요약
```

- type: commitlint 규칙 준수 (`feat` `fix` `perf` `refactor` `style` `test` `chore` `docs` 등)
- scope: 실제 모듈명 — `messenger` `kb` `tickets` `client-portal` `chatbot` `widgets` `deploy` 등
- subject ≤ 50자, why가 자명하지 않을 때만 본문 작성
- 하나의 커밋은 하나의 의도만 (헌장 I)
- **커밋은 사용자가 요청할 때만 수행한다**

스펙 산출물 커밋 예: `docs(chatbot): HR 브리지 재정렬 스펙 추가 (specs/011)`

---

## 9. 전체 예시 — 신규 기능 한 사이클

```bash
# 0) 브랜치
git switch -c feat/chatbot-file-upload

# 1) 요구 탐색 (불명확할 때만)
/superpowers:brainstorming    # 또는 Skill 툴로 superpowers:brainstorming

# 2) 스펙
/speckit-specify 챗봇 대화창에서 파일을 첨부해 업로드하고 업로드 결과를 말풍선으로 표시

# 3) 애매한 지점 정리 (대형/불명확 기능이면)
/speckit-clarify

# 4) 계획
/speckit-plan widgets 인라인 스타일 관행 유지, 업로드는 기존 업로드 API 재사용

# 5) 태스크
/speckit-tasks

# 6) 정합성 검사 (대형/불명확 기능이면)
/speckit-analyze

# 7) 구현
/speckit-implement

# 8) 실동작 검증 — 빌드 통과로 끝내지 않는다
#    위젯 실제 띄우고 첨부 → 업로드 → 말풍선 표시까지 확인

# 9) 커밋 (사용자 요청 시)
git add widgets/ specs/012-chatbot-file-upload/
git commit -m "feat(chatbot): 대화창 파일 첨부 업로드 지원"
```

---

## 10. 체크리스트 (완료 보고 전)

- [ ] 요청된 범위만 변경했는가 (인접 개선은 제안만) — 헌장 I
- [ ] 작업 유형에 맞는 라우팅을 탔는가. 도중 커졌다면 4번으로 전환했는가 — 헌장 II
- [ ] 변경된 화면·플로우를 **실제로 구동**해 확인했는가 (빌드 통과 ≠ 검증) — 헌장 III
- [ ] 새 쿼리/구독/리스너가 기존 perf 개선과 충돌하지 않는가 — 헌장 IV
- [ ] 시크릿·API 키 하드코딩이 없는가
- [ ] spec-kit 경로였다면 `specs/` 산출물을 코드와 함께 커밋했는가
- [ ] 커밋 메시지가 `type(scope): 한국어 요약` 형식인가 — 헌장 V

---

**참조**
- 헌장: [.specify/memory/constitution.md](.specify/memory/constitution.md) (v1.0.0, 2026-07-15)
- 에이전트 지침: [CLAUDE.md](CLAUDE.md)
- 템플릿: [.specify/templates/](.specify/templates/)
- 레거시 계획 산출물: [docs/superpowers/](docs/superpowers/)
</content>
</invoke>
