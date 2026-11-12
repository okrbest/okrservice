# Implementation Plan: 우리 회사 문서 본문 보기

**Branch**: `005-company-doc-view` (현재 작업 브랜치: `feature/skill-modify-hrchat-merge`) | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-company-doc-view/spec.md`

## Summary

위젯 티켓 탭 "우리 회사 문서" 목록의 사용 가능 문서에 **보기**를 두고, 누르면 같은 패널에서 챗봇이 읽는 글(처리 때 회사 공간에 저장된 `pageContent`)을 보여 준다. TeamplGPT에 본문 조회 API 1개를 추가하되, 회사별 독립 공간 원칙(행 소유 판정 + 회사 폴더 경로 제한 + 다른 공간은 404)을 지킨다. 위젯 서버는 기존 중계 방식으로 경로 1개를 더하고, 위젯은 본문 화면 컴포넌트를 새로 만든다. 근거는 [research.md](./research.md).

## Technical Context

**Language/Version**: JavaScript (TeamplGPT 서버, Node 20) · TypeScript (위젯 서버 Node 18, 위젯 React 18)

**Primary Dependencies**: Express(TeamplGPT·위젯 서버), Prisma(`embed_company_documents`), React(위젯), 기존 `relayCompanyDocs`·`companyDocsAllowed`·`getOwned`

**Storage**: 기존 TeamplGPT 파일 `storage/company-documents/<company_hash>/*.json` 읽기만. 스키마 변경 없음

**Testing**: TeamplGPT jest(`server/__tests__`), 위젯 jest(`widgets/client/**/__tests__`), 위젯 서버는 실제 요청 확인, playwright로 위젯 구동 확인

**Target Platform**: 메신저 위젯(PC·모바일 브라우저), TeamplGPT 서버

**Project Type**: 두 저장소 — TeamplGPT(백엔드 API) + okrservice(위젯 서버 중계 + 위젯 UI)

**Performance Goals**: 6만 자 문서 3초 안 표시(SC-002). 보기 누를 때만 1회 요청, 목록 조회·폴링 변경 없음

**Constraints**: 회사별 독립 공간 — 다른 embed·다른 회사 문서는 존재도 드러내지 않음. 원본 다운로드 없음. 본문을 HTML로 해석 금지. TeamplGPT 업스트림 파일 무수정

**Scale/Scope**: API 1(TeamplGPT) + 중계 1(위젯 서버) + 화면 1(위젯), 문구 9개(ko/en)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

okrservice 헌장:

| 원칙 | 판단 | 근거 |
|---|---|---|
| I. 최소 범위 | ✅ | 목록·올리기·삭제·검색 동작은 그대로. 패널에 보기 버튼과 화면 전환만 추가 |
| II. 스펙 비례 | ✅ | API 추가 + 두 저장소 → spec-kit 경로 |
| III. 실동작 검증 | ✅ | [quickstart.md](./quickstart.md) — 3011 시험 서버 + 별도 위젯 서버로 실제 구동 |
| IV. 성능 회귀 금지 | ✅ | 새 요청은 보기 클릭 시 1회. 목록 폴링(5초, 처리 중일 때만) 그대로 |
| V. 커밋 규칙 | ✅ | okrservice scope `messenger`, TeamplGPT scope `widget-company-docs-rag` |
| Stack: widgets 인라인 스타일 | ✅ | 패널과 같은 `chatbotTheme` 인라인 스타일 |
| Stack: gateway 영향 | ✅ | erxes gateway 무관(위젯 서버 express 경로) |
| 시크릿 | ✅ | TeamplGPT 주소·embed id는 기존 env 그대로 |

TeamplGPT 헌장(CLAUDE.md):

| 규칙 | 판단 | 근거 |
|---|---|---|
| 라우팅 | 5번(신규 기능, API 변경) | spec → **사용자 승인** → plan → tasks → **사용자 승인** → implement |
| 업스트림 발산 최소화 | ✅ | fork 전용 파일(`embedCompanyDocuments.js`, `utils/companyDocs/process.js`)만 수정 |
| E2E-First | 해당 없음 | LLM 행태 변경 없음. 회사 문서 E2E는 회귀 확인으로 재실행 |
| i18n | ✅ | 위젯 문구 ko/en 동시 반영 |

**Post-design 재확인**: 위와 동일, 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/005-company-doc-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/company-doc-content-api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
# TeamplGPT (/Users/shin-yeji/teamplgpt)
server/endpoints/embedCompanyDocuments.js          # GET …/:id/content 라우트 추가
server/utils/companyDocs/process.js                # readCompanyDocumentContent(row) 추가
server/__tests__/endpoints/embedCompanyDocuments.test.js   # content 라우트 테스트
server/__tests__/utils/companyDocs/content.test.js         # 읽기 함수·경로 제한 테스트 (신규)
specs/021-widget-company-docs-rag/contracts/embed-company-docs-api.md  # 계약 절 추가

# okrservice (/Users/shin-yeji/okrservice)
widgets/server/index.ts                                      # GET /ai-chat/company-documents/:id/content 중계
widgets/client/messenger/components/chatbot/companyDocs.ts   # getCompanyDocContent
widgets/client/messenger/components/chatbot/CompanyDocViewer.tsx   # 본문 화면 (신규)
widgets/client/messenger/components/chatbot/CompanyDocsPanel.tsx   # 보기 버튼 + 목록↔본문 전환
widgets/client/messenger/components/chatbot/__tests__/companyDocs.test.ts
widgets/client/messenger/components/chatbot/__tests__/CompanyDocsPanel.test.tsx
widgets/client/messenger/components/chatbot/__tests__/CompanyDocViewer.test.tsx  # 신규
widgets/locales/ko.json, widgets/locales/en.json
```

**Structure Decision**: 회사 문서 위젯 코드는 이미 `components/chatbot/`에 모여 있고 티켓 탭은 패널을 가져다 쓰기만 하므로, 새 화면도 같은 폴더에 둔다. 티켓 탭(`Ticket.tsx`)은 수정하지 않는다.

## Complexity Tracking

위반 없음.
