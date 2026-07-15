# okrservice — Claude Code 작업 지침

erxes 기반 모노레포. 상세 원칙은 `.specify/memory/constitution.md` (헌장) 참조 — 이 파일은 요약 + 라우팅 진입점.

## 작업 라우팅 (spec-kit × superpowers)

작업 시작 전 유형 판정:

1. **버그/회귀** → `superpowers:systematic-debugging` 스킬 먼저. 스펙 생략.
2. **소규모 수정 (≤3파일)** → 직접 수정. 스펙 생략.
3. **성능 개선** → 측정 → 수정 → 수치 확인.
4. **신규 기능 (다중 파일 / 신규 화면 / API 변경)** →
   `superpowers:brainstorming` → `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`
5. **대형/불명확 기능** → 4번 + `/speckit-clarify`(plan 전) + `/speckit-analyze`(implement 전)

스펙 생략 경로에서 범위가 3파일 초과 또는 API 변경으로 커지면 → 중단, 4번으로 전환.

## 필수 규칙

- **최소 범위**: 요청된 변경만. 인접 개선은 제안만 하고 적용 금지.
- **실동작 검증**: 빌드 통과 ≠ 완료. 변경 화면/플로우 실제 구동 확인 후 완료 보고.
- **커밋**: Conventional Commits, 한국어 요약, scope는 모듈명(messenger, kb, tickets, client-portal, chatbot). 사용자가 요청할 때만 커밋.
- **perf 회귀 금지**: 새 쿼리/리스너 추가 시 기존 perf 커밋(cache-first, 지연 마운트, 중복 제거) 의도 확인.
- **시크릿 하드코딩 금지**.

## 구조 메모

- `widgets/` — 메신저 위젯 (React, 인라인 스타일 관행)
- `client-portal/` — 고객 포털 (Next.js)
- `packages/` — erxes 플러그인들 (gateway pathRewrite 영향 주의)
- 스펙 산출물 — `specs/<기능-브랜치명>/` (spec-kit 생성)

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
