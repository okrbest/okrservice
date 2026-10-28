---
description: "고객 포털 FAQ 화면 개편 작업 목록"
---

# Tasks: 고객 포털 FAQ 화면 개편

**Input**: `specs/002-faq-home-redesign/` — [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-routes-and-queries.md](./contracts/ui-routes-and-queries.md), [quickstart.md](./quickstart.md)

**Tests**: 순수 함수(`faqDisplay`, `faqRanking`)는 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다(사용자 요청). 화면은 quickstart 시나리오를 Playwright로 확인한다.

**Organization**: 스펙 사용자 시나리오별. US1·US2 = P1, US3·US4 = P2, US5 = P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일이라 동시에 해도 되는 작업
- **[Story]**: US1(첫 화면), US2(전체·분류), US3(검색), US4(휴대폰), US5(본문)

## 공통 참고 (모든 작업에 적용)

- 모든 경로는 `client-portal/` 기준. 확정 시안: `.superpowers/brainstorm/13365-1793173575/content/faq-home.html`(A), `faq-flow.html`(C·휴대폰).
- Next 10 규칙: `<Link href>` 안에 자식 `<a>`를 두고 `onClick`·`className`은 `<a>`에 단다.
- 스타일: 새 styled-components는 `modules/knowledgeBase/components/faqStyles.ts`에 둔다. 1516줄 `styles.ts`는 기존 블록 색·모서리 값만 고치고 줄 수를 늘리지 않는다. 파일당 800줄, 함수 50줄 이하.
- 색(시안 기준): 글자 `#191f28`, 보조 `#4e5968`·`#8b95a1`, 바탕 `#f6f7f9`, 카드 `#fff`, 선 `#f2f4f6`·`#e5e8eb`, 강조 `#3182f6`·진한 강조 `#1b64da`·연한 강조 `#e8f3ff`, 어두운 카드 `#191f28`. 모서리 카드 16px, 줄 12~14px, 칩 999px.
- 아이콘: Material Icons 글꼴 + `ERXES_TO_MATERIAL`(`components/SideBar.tsx`). 새 아이콘 패키지 추가 금지.
- 목록 데이터는 반드시 `articleListQuery` + 변수 `{ topicId, isPrivate: true }`(+검색 시 `searchValue`) + `fetchPolicy: 'cache-first'`. 무거운 `articlesQuery`를 FAQ 목록·패널·자동완성에서 부르지 않는다.
- 순수 함수 테스트 실행(widgets jest 빌려 씀):
  `cd widgets && npx jest --config '{"rootDir":"../client-portal","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/modules/knowledgeBase/utils/__tests__/*.test.ts"]}'`
- 화면 확인: quickstart 3·4절(Node 16 개발 서버 + Playwright가 기록한 운영 GraphQL 응답으로 가로채기). 확인 스크립트는 scratchpad `playwright-verify/faq/`에 둔다(저장소에 넣지 않음).

---

## Phase 1: Setup

**Purpose**: 확인 환경과 기준값을 먼저 만든다.

- [X] T001 client-portal 개발 서버를 `REACT_APP_DOMAIN=http://localhost:4999 PORT=4200 ~/.nvm/versions/node/v16.20.2/bin/node server.js`로 띄우고, scratchpad `playwright-verify/faq/mock.js`에 `**/graphql` 가로채기 도우미를 만든다(운영 기록 `gql.json`에서 operationName별 응답 반환, `faqArticleList`는 기록된 글 목록에서 목록 필드만 골라 반환하고 `searchValue`가 있으면 제목·요약에 포함된 글만, `knowledgeBaseArticleDetailAndIncViewCount`는 글 목록에서 찾아 반환하며 호출 수를 세고, 그 글의 조회수를 도우미 안에서 1 올려 이후 `faqArticleList` 응답에 반영한다). 지금 화면으로 `/`가 그려지는지 확인하고, PC 1440px에서 지금 첫 화면 전체 높이(`document.documentElement.scrollHeight`)를 기록한다(SC-001 기준값).
- [X] T002 [P] `cd client-portal && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`로 기존 타입 오류 수를 기록한다(Polish에서 비교).

---

## Phase 2: Foundational (모든 화면이 쓰는 기반)

**⚠️ 이 단계가 끝나야 사용자 시나리오 작업을 시작한다.**

- [X] T003 [P] `modules/knowledgeBase/utils/__tests__/faqDisplay.test.ts`를 쓴다: `splitTitleTag`("[휴가] 휴가종류를…" → tag "휴가", "[인사]실근속…" 띄어쓰기 없음, 태그 없는 제목, "[]" 빈 태그, 태그만 있는 제목은 원문 유지), `stripCategoryNumber`("1. 인사/조직"→"인사/조직", "이런 메시지는?" 그대로), `categoryTone`(0~6 서로 다름, 7은 0과 같음), `pickManualLink`(라벨 "5240 매뉴얼" 우선, "Manual" 대소문자 무시, http 아닌 값 무시, 매뉴얼 없으면 첫 http 링크, 빈 객체·undefined → null), `FAQ_SUGGESTED_KEYWORDS`가 5개 고정 값. 실행해 **실패**를 확인한다.
- [X] T004 [P] `modules/knowledgeBase/utils/__tests__/faqRanking.test.ts`를 쓴다: `createSeededRandom` 같은 시드 같은 수열·0 이상 1 미만, `pickTopArticles` ① 조회수 있는 글이 내림차순으로 앞 ② 동률은 입력 순서 ③ 모자라면 나머지에서 채움·중복 없음 ④ 같은 시드 같은 결과, 다른 시드는 (68개 중 6개에서) 다른 결과 ⑤ `count`가 후보보다 크면 후보 수만큼 ⑥ `excludeIds` 제외 ⑦ 빈 배열 → 빈 배열 ⑧ 입력 배열을 바꾸지 않음. 실행해 **실패**를 확인한다.
- [X] T005 `modules/knowledgeBase/utils/faqDisplay.ts`를 구현해 T003을 통과시킨다(research R4·R6, data-model).
- [X] T006 `modules/knowledgeBase/utils/faqRanking.ts`를 구현해 T004를 통과시킨다(mulberry32, Fisher–Yates를 복사본에, research R3).
- [X] T007 [P] `modules/knowledgeBase/graphql/queries.ts`에 `articleListQuery`(operation 이름 `faqArticleList`)와 `articleDetailAndIncViewCountQuery`(필드는 `articleDetailQuery`와 동일)를 contracts대로 추가한다. 기존 질의는 지우지 않는다.
- [X] T008 `modules/knowledgeBase/containers/useFaqArticles.ts`를 만든다: `useFaqArticles(topicId, searchValue?)` → `{ articles, loading, error, seed, byCategory(catId) }`. `articleListQuery`, 변수 `{ topicId, isPrivate: true, ...(searchValue ? { searchValue } : {}) }`, `skip: !topicId`, `fetchPolicy: 'cache-first'`. `seed`는 `useState(() => Math.floor(Math.random() * 2147483647))`로 화면당 한 번.
- [X] T009 [P] `modules/knowledgeBase/components/faqStyles.ts`에 공통 styled-components를 만든다: `FaqTag`(작은 회색 태그), `FaqRow`(태그+제목+요약 한 줄, hover), `FaqCard`(흰 카드 16px), `FaqSectionTitle`(제목 + 오른쪽 작은 보조 글), `FaqEmpty`(빈/없음 안내).
- [X] T010 `modules/knowledgeBase/components/browse/FaqQuestionRow.tsx`를 만든다: props `article`, `searchValue?`. `splitTitleTag`로 태그·제목 분리, 요약 한 줄(줄임표), 검색어 강조(기존 `ArticleListItem.tsx`의 `highlight` 로직을 이 파일로 옮겨 쓰기), 링크 `/knowledge-base/article?id=…&catId=…`.
- [X] T011 FAQ 화면 전용 흰 위쪽 바: `modules/styles/main.ts`의 `Header`·`HeaderTitle`·`HeaderNavLinks`에 `light?: boolean` 변형(흰 바탕, 아래 1px `#eef0f3` 선, 그림자 없음, 제목 `#191f28` 왼쪽 선 `#d1d6db`, 링크 `#4e5968`)을 추가하고, `modules/main/components/Header.tsx`에 `lightHeader?: boolean`을 받아 전달, `modules/main/components/Layout.tsx`·`modules/main/containers/Layout.tsx`에 같은 속성을 통과시킨다. 속성이 없으면 지금과 똑같이 그린다(FR-018).

**Checkpoint**: 테스트 통과, 새 질의·훅·공통 부품 준비, 다른 화면 위쪽 바 그대로.

---

## Phase 3: User Story 1 - 첫 화면에서 주제를 골라 답 찾기 (Priority: P1) 🎯 MVP

**Goal**: `/`·`/knowledge-base`가 시안 A로 보인다.

**Independent Test**: quickstart 시나리오 1·10, 카드 클릭으로 분류 주소 이동.

- [X] T012 [US1] `modules/knowledgeBase/components/HeroSearch.tsx`에 `variant: 'hero' | 'compact'`(기본 `'hero'`)를 추가한다. hero: 연한 그라데이션 전체 폭 영역, 제목 "무엇을 도와드릴까요?", 설명 "궁금한 내용을 검색하거나 주제를 골라 보세요"(시안의 "5240 HR을…"은 포털 이름을 박아 넣게 되므로 브랜드 없는 문구로), 돋보기 아이콘이 든 둥근 검색창(검색 버튼은 입력창 안 오른쪽 작은 버튼), 아래 `FAQ_SUGGESTED_KEYWORDS` 칩(누르면 `/knowledge-base?searchValue=<말>`). compact: 흰 테두리 검색창만(제목·칩 없음). 자동완성은 `articleListQuery` + `fetchPolicy: 'cache-first'`로 바꾸고, 나머지 동작(`/` 단축키, Esc, 지우기, 디바운스 400ms)은 그대로. 스타일은 `HeroSearchWrapper`를 고치지 말고 `faqStyles.ts`에 `FaqHeroWrapper`·`FaqCompactSearch`를 새로 만들어 쓴다.
- [X] T013 [P] [US1] `modules/knowledgeBase/components/home/FaqCategoryCards.tsx`: props `categories`(평탄화된 분류), `articles`, `seed`, `totalCount`. 4열 그리드(≤1024px 3열, ≤768px 2열), 카드 = `categoryTone(i)` 색 칸 안 Material 아이콘 + `stripCategoryNumber(title)` + "질문 N개" + `pickTopArticles(분류 글, 2, rng)` 제목(태그 뺀 글, 한 줄 줄임표, 각각 본문 링크). 질문 0개면 "아직 질문이 없어요". 마지막 어두운 카드 "전체 질문 보기 / N개 한 번에" → `/knowledge-base?view=all`. 카드 전체가 분류 링크.
- [X] T014 [P] [US1] `modules/knowledgeBase/components/home/FaqPopularList.tsx`: props `articles`, `categories`, `seed`, `count=6`. 흰 카드 안 2열(≤768px 1열), 줄마다 순위 번호(강조색) + 분류 태그(`stripCategoryNumber`한 분류 이름을 짧게: "/" 앞부분, 예 "인사/조직"→"인사") + 제목(태그 뺀 글). `pickTopArticles(articles, count, createSeededRandom(seed))`.
- [X] T015 [P] [US1] `modules/knowledgeBase/components/home/FaqHelpBanner.tsx`: props `externalLinks`. `pickManualLink`가 null이면 아무것도 그리지 않음. "원하는 답을 못 찾으셨나요?" + "화면별 사용 방법은 매뉴얼에 자세히 나와 있어요." + 오른쪽 "매뉴얼 보러 가기 ↗"(새 탭, `rel="noopener noreferrer"`).
- [X] T016 [US1] `modules/knowledgeBase/components/home/FaqHome.tsx`: `HeroSearch(variant hero)` → "주제별로 찾기 / 질문 N개" + `FaqCategoryCards` → "많이 본 질문" + `FaqPopularList` → `FaqHelpBanner`. `useFaqArticles(topic._id)` 한 번 호출해 아래로 나눠 줌. 불러오는 중엔 카드 자리에 회색 상자(깜빡임 없음), 실패 시 "질문을 불러오지 못했어요. 새로고침해 주세요".
- [X] T017 [US1] `modules/knowledgeBase/containers/CategoryList.tsx`를 contracts 주소 표대로 나눈다: `searchValue` 있음 → 검색(US3에서 채움, 그 전엔 기존 검색 화면 유지), `view === 'all'` → 전체(US2에서 채움, 그 전엔 기존 화면 유지), 그 밖 → `FaqHome`. `<Layout lightHeader>`로 감싼다. `pages/index.tsx`·`pages/knowledge-base/index.tsx`는 그대로 이 컨테이너를 쓴다.
- [X] T018 [US1] quickstart 시나리오 1·10을 PC 1440px로 확인하고 스크린샷을 남긴다. 첫 화면 전체 높이가 T001 기준값의 절반 이하인지, 스크롤 전 화면(900px 높이)에 모든 분류 카드가 보이는지 확인한다(SC-001). 카드 클릭 → 분류 주소 이동, 많이 본 질문 클릭 → 본문 주소 이동, 매뉴얼 버튼 → 새 탭 주소 확인.

**Checkpoint**: 첫 화면이 시안 A와 같다. 목록 질의 1회, 응답에 `content` 없음.

---

## Phase 4: User Story 2 - 전체 질문과 분류별 질문 (Priority: P1)

**Goal**: 전체(`?view=all`)·분류(`/knowledge-base/category?id=`) 화면이 시안 C로 보인다.

**Independent Test**: quickstart 시나리오 2·3·4·8·11.

- [X] T019 [US2] `modules/knowledgeBase/components/SideBar.tsx`를 새 메뉴 모양으로: 제목 "분류", 첫 항목 "전체"(아이콘 `apps`, 전체 질문 수) — `allActive?: boolean`이면 선택 상태, 분류 이름은 `stripCategoryNumber`, 질문 수는 0이어도 표시. 하위 분류 들여쓰기 유지. `SidebarNav` 스타일(`styles.ts`)의 색·모서리만 시안 값으로 바꾼다(선택: 바탕 `#e8f3ff`, 글자·아이콘 `#1b64da`, 굵게). 본문 화면도 이 SideBar를 쓰므로 `category` 없는 경우(`{}`) 안전하게.
- [X] T020 [US2] `modules/knowledgeBase/components/browse/FaqBrowse.tsx`: C 틀. props `topic`, `config`, `activeCategoryId?`, `allActive?`, `rightPanel`(ReactNode), `children`(가운데), `topSlot?`(가운데 위: compact 검색창·경로). 왼쪽 `SideBar`(sticky), 가운데, 오른쪽(1280px 미만 숨김). ≤768px: 왼쪽·오른쪽 숨기고 위쪽 가로 스크롤 칩(전체 + 분류, 선택 진하게 `#191f28`/흰 글자, 개수 표시) — 기존 `MobileCategoryNav`·`MobileCategoryTab` 대신 `faqStyles.ts`에 새 칩 스타일. 기존 `KbCenterCol`의 흰 박스 테두리는 쓰지 않고 가운데는 투명(묶음 카드들이 각자 흰 카드). props `loading?`·`error?`를 받아 가운데에 공통 로딩 표시(회색 줄 상자, 깜빡임 없음)와 실패 안내("질문을 불러오지 못했어요. 새로고침해 주세요")를 그린다 — 전체·분류·검색 화면이 같이 쓴다.
- [X] T021 [US2] `modules/knowledgeBase/components/browse/FaqGroupList.tsx`: props `categories`, `articles`, `seed`. 질문 1개 이상인 분류마다 흰 카드: 제목 `stripCategoryNumber` + 오른쪽 "N개", `pickTopArticles(분류 글, 3, rng)`를 `FaqQuestionRow`로, 분류 질문 수 > 3이면 "OO 질문 N개 모두 보기 →"(분류 주소).
- [X] T022 [US2] `modules/knowledgeBase/components/KbRightPanel.tsx`: 목록을 `useFaqArticles(topicId)`(가벼운 질의, 같은 변수라 캐시 공유)로 바꾸고 많이 본 질문을 `pickTopArticles(분류로 거른 글, 5, rng(seed))`로. 제목: 분류 있으면 "이 분류에서 많이 본 질문", 없으면 "많이 본 질문". 줄마다 순위 번호(강조색) + 태그 뺀 제목. 목차·최근 본 질문 영역은 그대로. `seed` prop을 받으면 그걸 쓰고 없으면 훅의 시드.
- [X] T023 [US2] `CategoryList.tsx`의 `view === 'all'` 분기를 `FaqBrowse(allActive, topSlot=compact 검색창, rightPanel=KbRightPanel)` + `FaqGroupList`로 채운다(같은 `useFaqArticles` 결과·시드 공유).
- [X] T024 [US2] 분류 화면: `pages/knowledge-base/category/index.tsx`에서 큰 `HeroSearch`를 없애고 `<Layout lightHeader>`로 감싸며, 검색어가 있으면 US3 검색 화면, 없으면 `CategoryDetail`. `modules/knowledgeBase/components/CategoryDetail.tsx`를 `FaqBrowse(activeCategoryId, topSlot=compact 검색창 + 경로 "전체 › 분류이름", rightPanel=KbRightPanel categoryId)`로 바꾸고, 가운데는 분류 아이콘·이름·"N개" 머리 + 그 분류 글 전부를 `FaqQuestionRow`로(등록 순서). 글은 `useFaqArticles`의 `byCategory(id)`로(서버 `categoryIds` 질의 안 씀). `topic.parentCategories`(+`childrens`)에서 id를 못 찾으면 "찾는 분류가 없어요" + "전체 질문 보기" 링크. `containers/CategoryDetail.tsx`의 `knowledgeBaseCategoryDetail` 질의는 분류 정보가 topic에 있으므로 쓰지 않게 정리한다(요청 1개 줄어듦).
- [X] T025 [US2] quickstart 시나리오 2·3·4·8·11을 PC로 확인하고 스크린샷을 남긴다.

**Checkpoint**: 첫 화면 → 카드/전체 → 분류 → 본문 흐름이 시안대로 이어진다.

---

## Phase 5: User Story 3 - 검색으로 바로 찾기 (Priority: P2)

**Goal**: 검색 결과가 C 모양으로, 결과 없음 안내가 보인다.

**Independent Test**: quickstart 시나리오 5·6, 자동완성.

- [X] T026 [US3] `modules/knowledgeBase/containers/ArticleList.tsx`를 `useFaqArticles(topicId, searchValue)`로 바꾸고, `components/ArticleList.tsx`를 고친다: 머리 "‘검색어’ 검색 결과 N개", 줄은 `FaqQuestionRow`(검색어 강조), 정확도순/최신순 버튼 유지, `articles.length === 1`이면 본문을 바로 보여 주던 분기 삭제(research R2), 결과 없음 안내 "‘검색어’에 대한 검색 결과가 없어요" + "다른 말로 검색하거나 매뉴얼을 확인해 보세요"(기존 "서비스데스크에서 티켓 발급받기" 문구는 티켓 기능이 꺼진 포털에서 잘못된 안내라 뺀다 — `config.ticketToggle`이 켜진 경우에만 남김).
- [X] T027 [US3] 검색 분기 연결: `containers/CategoryList.tsx`(`/`·`/knowledge-base?searchValue=`)와 `pages/knowledge-base/category/index.tsx`(`?searchValue=`)에서 `FaqBrowse(메뉴 선택 없음, topSlot=compact 검색창(초기값 검색어), rightPanel=KbRightPanel)` + `ArticleListContainer(searchValue)`. 기존 `pages/knowledge-base/article/index.tsx`의 검색 분기도 같은 화면을 쓰게 한다.
- [X] T028 [US3] quickstart 시나리오 5·6과 자동완성(두 글자 입력 → 목록 → 클릭 → 본문)을 확인한다.

---

## Phase 6: User Story 4 - 휴대폰에서 보기 (Priority: P2)

**Goal**: 390px에서 카드 2열, 위쪽 칩, 가로 밀림 없음.

**Independent Test**: quickstart 시나리오 9.

- [X] T029 [US4] `faqStyles.ts`·각 부품의 반응형 규칙을 점검·보완한다: ≤768px 카드 2열·카드 안 대표 질문 숨김(시안 휴대폰 첫 화면), 히어로 제목 21px, 많이 본 질문 1열, `FaqBrowse` 칩 줄 가로 스크롤(스크롤바 숨김), 긴 제목 줄바꿈. 390px로 `/`, `?view=all`, 분류, 검색, 본문을 열어 `document.documentElement.scrollWidth <= window.innerWidth`와 겹침 없음을 확인하고 스크린샷을 남긴다.

---

## Phase 7: User Story 5 - 본문 화면도 같은 느낌으로 (Priority: P3)

**Goal**: 본문 화면 구성 유지 + 새 색, 조회수 증가.

**Independent Test**: quickstart 시나리오 7.

- [X] T030 [US5] 먼저 `packages/gateway/src`와 `packages/plugin-clientportal-api`에서 고객 포털 요청이 부를 수 있는 질의를 제한하는 코드(허용 목록·권한 래퍼)가 있는지 다시 확인하고 결과를 research R1에 한 줄 덧붙인다. 그다음 `modules/knowledgeBase/containers/ArticleDetail.tsx`의 본문 질의를 `articleDetailAndIncViewCountQuery`(`fetchPolicy: 'cache-first'`)로 바꾸고 결과 키를 `knowledgeBaseArticleDetailAndIncViewCount`로 읽는다. 최근 본 질문 기록은 그대로.
- [X] T031 [US5] `modules/knowledgeBase/components/ArticleDetail.tsx`를 `FaqBrowse(activeCategoryId=article.categoryId, topSlot=경로 "전체 › 분류 이름", rightPanel=KbRightPanel(categoryId, toc))`로 감싸고, 가운데는 지금처럼 `SingleArticle`을 흰 카드 안에. `pages/knowledge-base/article/index.tsx`를 `<Layout lightHeader>`로. `styles.ts`의 `ArticleWrapper`·`ArticleFeedback` 색·모서리를 시안 팔레트로(제목 `#191f28` 굵게, 링크색 `#1b64da`, 카드 16px, 도움 버튼 둥글게) — 줄 수 늘리지 않음.
- [X] T032 [US5] quickstart 시나리오 7: 본문 열기 → 가로채기 카운터로 조회수 질의 1회 확인, 같은 세션에서 다시 열면 추가 호출 없음(cache-first), 화면 구성·도움 버튼 동작 확인. 그다음 첫 화면을 새로 열어 방금 연 질문이 "많이 본 질문" 1위로 올라오는지 확인한다(SC-006). 최종 보고에 "배포 후 운영에서 본문 한 번 열어 조회수가 오르는지 확인" 안내를 넣는다.

---

## Phase 8: Polish & Cross-Cutting

- [X] T033 [P] 타입 확인: `npx tsc --noEmit` 오류 수가 T002 기록보다 늘지 않았는지, 바꾼 파일에 새 오류가 없는지 확인.
- [X] T034 [P] quickstart 시나리오 12: 티켓 등 FAQ 밖 화면 위쪽 바가 기존 설정 색인지 확인(로그인 필요 없는 화면 기준, 없으면 `Layout`에 `lightHeader` 없이 그려지는 경로를 코드로 확인).
- [X] T035 이번 작업으로 안 쓰이게 된 것만 지운다: `components/ArticleListItem.tsx`, `modules/common/SectionHeader.tsx`(분류·본문 화면이 새 경로 표시로 바뀌며 사용처 0), `styles.ts`의 `HeroSearchWrapper`·`ArticleListItemWrapper`·`CategoryBadge`·`ArticleListWrapper`·`EmptyState`·`SkeletonLine`·`SkeletonItem`·`skeletonAnimation`·`KbPageContainer`·`KbThreeCol`·`KbLeftCol`·`KbCenterCol`·`KbRightCol`·`MobileCategoryNav`·`MobileCategoryTab`(모두 개편 전에는 쓰였고 지금 사용처 0, `grep` 확인). 개편 전부터 안 쓰이던 `components/CategoryList.tsx`·`HomeCategoryGrid`·`HomeCategoryCard`는 지우지 않고 최종 보고에 정리 제안으로만 남긴다(헌장 I).
- [X] T036 code-reviewer 에이전트로 바뀐 파일을 검토하고 CRITICAL·HIGH를 고친다. 파일 800줄·함수 50줄 기준 확인.
- [X] T037 순수 함수 테스트 재실행 + quickstart 1~12 최종 PC·휴대폰 스크린샷을 사용자에게 보고. 이 파일의 완료 항목을 `[X]`로 표시.

---

## Dependencies & Execution Order

- Setup(T001~T002) → Foundational(T003~T011) → US1(T012~T018) → US2(T019~T025) → US3(T026~T028) → US4(T029) → US5(T030~T032) → Polish(T033~T037).
- US2는 US1의 `HeroSearch` compact 변형(T012)과 `CategoryList` 분기(T017)에 기대고, US3은 US2의 `FaqBrowse`(T020)에 기댄다. US5의 T030은 Foundational 뒤 언제든 가능.
- 같은 파일(`CategoryList.tsx`, `pages/knowledge-base/category/index.tsx`, `faqStyles.ts`)을 여러 작업이 고치므로 해당 작업들은 순서대로.

## Parallel Opportunities

- T003 ∥ T004 ∥ T007 ∥ T009 (서로 다른 파일)
- T013 ∥ T014 ∥ T015 (홈 부품 셋)
- T033 ∥ T034

## Implementation Strategy

- **MVP**: Phase 1~3(US1) — 첫 화면만 바뀌어도 고객이 답을 찾는 길이 짧아진다. 단, 카드가 가리키는 분류 화면(US2)이 옛 모양이면 어색하므로 실제 배포는 US2까지 묶는다.
- 이후 US3 → US4 → US5 순으로 더하고, 각 단계 끝에서 Playwright 확인.
