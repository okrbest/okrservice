# Research: 우리 회사 문서 본문 보기

## R1. 본문 글을 어디서 가져오나

- **Decision**: 처리 때 회사 공간에 저장해 둔 문서 JSON(`server/storage/company-documents/<company_hash>/<file>.json`)의 `pageContent`를 그대로 돌려준다. 경로는 DB 행의 `location`.
- **Rationale**: `processCompanyDocument`가 collector 결과를 이 JSON 하나로 합쳐(`moveCollectorOutput`) 저장하고, 바로 그 `pageContent`를 벡터 DB에 넣는다. 그래서 화면에 보이는 글 = 챗봇이 검색하는 글(FR-003, SC-005). 이미 올린 "사용 가능" 문서에도 모두 남아 있다(FR-006).
- **Alternatives considered**:
  - 벡터 DB 조각을 모아 다시 잇기 — 조각 순서·겹침 처리가 필요하고 느림.
  - 원본 파일 보관 후 다운로드 — 사용자가 브레인스토밍에서 제외. 기존 문서는 원본이 없다.

## R2. 회사별 독립 공간을 본문 보기에서도 지키는 방법

- **Decision**: 세 겹으로 묶는다.
  1. 행 조회는 기존 `EmbedCompanyDocument.getOwned(id, embed.id, company.hash)` — 삭제 API와 같은 소유 판정.
  2. 읽을 파일은 `location`이 `<company.hash>/`로 시작하고, 해석한 절대 경로가 `companyDocsPath()/<company.hash>/` 안일 때만 연다(`isWithin`).
  3. 소유가 아니면 행이 없는 것과 똑같이 `404 NOT_FOUND` — 다른 공간 문서의 존재를 드러내지 않는다.
- **Rationale**: 1만으로도 충분하지만, 저장 경로까지 회사 폴더로 묶어 두면 DB 값이 잘못돼도 다른 회사 파일을 읽지 못한다(FR-005, 사용자 요구 "아예 다른 워크스페이스처럼").
- **Alternatives considered**: 경로 검사 없이 `location`만 신뢰 — 방어선 하나가 빠진다.

## R3. 상태별 응답

- **Decision**:
  - 소유 아님·없음 → `404 { error: "NOT_FOUND" }`
  - `status !== "ready"` → `409 { error: "NOT_READY" }`
  - ready인데 파일이 없거나 읽기 실패 → `404 { error: "CONTENT_MISSING" }` (서버 로그 남김)
  - 성공 → `200 { document: Document, content: string }`
- **Rationale**: 위젯이 "이미 삭제됨"(NOT_FOUND) / "아직 처리 중"(NOT_READY) / "불러오지 못함"(그 외)을 구분해 안내한다(FR-008). 위젯은 처리 중 문서에 보기 버튼을 안 띄우지만, 목록이 오래된 경우를 대비한다.

## R4. 엔드포인트 위치 (업스트림 발산 최소화)

- **Decision**: TeamplGPT fork 전용 파일 `server/endpoints/embedCompanyDocuments.js`에 GET 라우트 1개, 읽기 함수는 `server/utils/companyDocs/process.js`(`companyDocsPath`·`isWithin`이 이미 있는 fork 파일)에 `readCompanyDocumentContent` 추가. 업스트림 파일 수정 없음.
- **경로**: `GET /api/embed/:embedId/company-documents/:id/content?companyName=` — 기존 미들웨어 `validEmbedConfig` → `companyDocsAllowed` 재사용(비활성 embed·origin 불일치는 기존과 같은 403/401).

## R5. 위젯 서버 중계

- **Decision**: `widgets/server/index.ts`에 `GET /ai-chat/company-documents/:id/content` 추가. id 검사·`companyNameQuery`·`relayCompanyDocs`를 삭제 라우트와 같은 방식으로 재사용.
- **Rationale**: 기존 목록·삭제와 같은 중계 규칙(TeamplGPT 주소·origin 헤더 숨김).

## R6. 위젯 화면 구조

- **Decision**: 본문 화면은 새 컴포넌트 `CompanyDocViewer.tsx`(chatbot 폴더, 패널과 같은 인라인 스타일·`chatbotTheme`). `CompanyDocsPanel`은 `viewing` 상태로 목록 ↔ 본문을 바꾼다. 조회 함수 `getCompanyDocContent`는 `companyDocs.ts`에 추가.
- **Rationale**: 패널(350줄)에 화면을 더 얹으면 400줄을 넘는다 — 파일 분리(코딩 규칙). 패널은 티켓 탭에서 이미 쓰이므로 티켓 쪽 코드는 바뀌지 않는다.
- **글 표시**: React 텍스트 노드 + `white-space: pre-wrap` — HTML로 해석되지 않는다(FR-007). `dangerouslySetInnerHTML` 금지.
- **늦게 온 응답**: 요청마다 `AbortController`, ← 목록·패널 닫힘·다른 문서 열기 시 abort → 목록을 덮지 않는다(Edge case).

## R7. 성능

- **Decision**: 한 번에 전체를 받는다. 페이지 나누기·캐시 없음.
- **Rationale**: 195조 분량 약 6만 자 ≈ 180KB JSON. 보기 누를 때 1회 요청, 목록 조회·폴링에는 영향 없음(헌장 IV). 50MB PDF처럼 아주 큰 문서는 수 MB가 될 수 있으나 드물고, 단일 텍스트 노드 렌더는 브라우저가 감당한다 — quickstart에서 큰 문서로 확인.

## R8. 테스트 전략

- TeamplGPT: 기존 `server/__tests__/endpoints/embedCompanyDocuments.test.js`에 content 라우트 테스트(소유·다른 회사·다른 embed·처리 중·파일 없음·경로 탈출), `readCompanyDocumentContent` 단위 테스트.
- 위젯: `companyDocs.test.ts`(조회 함수·오류 코드), `CompanyDocsPanel.test.tsx`(보기 버튼 노출 조건, 전환·복귀, 오류 안내, 늦은 응답 무시, HTML 미해석).
- 위젯 서버: 테스트 인프라 없음 → quickstart에서 실제 요청으로 확인.
- LLM 행태 변경이 없으므로 TeamplGPT E2E-First 시나리오 추가 대상 아님. 회사 문서 E2E는 회귀 확인용으로 재실행.
