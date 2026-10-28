# Research: 고객 포털 FAQ 화면 개편

조사일 2026-10-28. 운영 사이트(5240support.okrbiz.com)를 Playwright로 열어 화면과 GraphQL 응답을 기록했고(`scratchpad/playwright-verify/faq/gql.json`), client-portal·plugin-knowledgebase-api 코드를 읽었다.

## R1. 조회수 올리기 경로

- **Decision**: 본문 화면 컨테이너(`containers/ArticleDetail.tsx`)의 질의를 `knowledgeBaseArticleDetail` → `knowledgeBaseArticleDetailAndIncViewCount`로 바꾼다. 받는 필드는 지금과 같다.
- **Rationale**: 서버에 이미 있는 질의다(`plugin-knowledgebase-api/src/graphql/resolvers/knowledgeBaseQueries.ts:130`, `findOneAndUpdate … $inc viewCount`). `requireLogin`/`checkPermission` 래퍼가 없어 지금 쓰는 `knowledgeBaseArticleDetail`과 공개 범위가 같다. 서버 변경이 필요 없다.
- **확인된 현상**: 운영 데이터 68개 모두 `viewCount: 0`. 고객 포털이 증가 없는 `knowledgeBaseArticleDetail`만 불러 왔기 때문이다.
- **fetchPolicy**: `cache-first`(Apollo 기본값을 명시). 같은 화면 세션 안에서 같은 글을 다시 열면 캐시를 써 다시 세지 않는다. 헌장 IV(요청 줄이기)와 맞다.
- **Alternatives**: 별도 mutation 추가 → 서버 변경이라 제외. `network-only`로 매번 세기 → 요청 증가, 이득 작아 제외.
- **게이트웨이 재확인(T030)**: `packages/gateway/src/apollo-router/rhai/main.rhai`(38줄)는 헤더 전달만 하고 연산을 거르지 않는다. `middlewares/graphql-limiter.ts`는 글자 수·별칭 수 제한만 둔다. `plugin-clientportal-api`에는 지식베이스 질의를 막는 코드가 없다. 따라서 고객 포털이 `knowledgeBaseArticleDetail`을 부를 수 있으면 `knowledgeBaseArticleDetailAndIncViewCount`도 부를 수 있다. 실서버 호출은 배포 후 확인한다.

## R2. 목록 데이터 무게 (성능 회귀 금지)

- **현상**: 지금 첫 화면은 `clientPortalKnowledgeBaseArticles`를 변수만 다르게 두 번(목록용 `{searchValue:'', topicId, isPrivate}`, 오른쪽 패널용 `{topicId, isPrivate}`) 부르고, 둘 다 본문(`content`)까지 받는다. 응답 하나가 약 1.4MB(글당 본문 평균 20KB), 첫 화면에 약 2.8MB.
- **Decision**: 목록 전용 가벼운 질의 문자열 `articleListQuery`를 추가한다. 필드: `_id title summary viewCount categoryId createdDate modifiedDate publishedAt`(본문·작성자·반응 제외). 변수는 `{ topicId, isPrivate: true }` 하나로 통일하고, 첫 화면 카드·많이 본 질문·전체 묶음·분류 목록·오른쪽 패널이 모두 이 결과를 나눠 쓴다(분류 화면은 `categoryId`로 화면에서 거른다). 검색만 `searchValue`를 붙여 서버 검색을 한다.
- **Rationale**: 같은 서버 질의에서 받는 필드만 줄이는 것이라 API 변경이 아니다. 요청 수 2 → 1, 응답 크기 수십 KB로 줄어 SC-005(느려지지 않음)를 여유 있게 만족한다.
- **Alternatives**: 기존 `articlesQuery` 그대로 재사용 → 새 화면이 같은 무게를 계속 받음, 제외. 서버 페이지네이션 → 서버 변경, 제외.
- **영향**: 분류 화면에서 "글이 1개면 본문을 바로 보여 주던" 예외(`ArticleList.tsx`의 `articles.length === 1` 분기)는 새 C 목록 모양과 맞지 않아 없앤다(목록 한 줄로 보이고 누르면 본문). 이 예외 때문에 목록 질의가 본문을 받아야 했다.

## R3. 많이 본 질문·대표 질문 고르기 (무작위 채우기)

- **Decision**: 순수 함수 `pickTopArticles(articles, count, rng, exclude?)`. ① `viewCount > 0`인 글을 조회수 내림차순(같으면 원래 순서)으로 ② 모자라는 자리는 나머지 글을 `rng`로 섞은 순서에서 채운다. 중복 없음.
- **무작위 고정**: 화면(페이지) 단위로 시드를 한 번 만들고(`useState(() => 정수 시드)`), 시드 기반 PRNG(mulberry32)로 섞는다. 다시 그려져도 결과가 같다(spec Edge Case). 데이터는 브라우저에서만 불러오므로(Apollo, SSR 데이터 없음) 서버/브라우저 그리기 불일치가 없다.
- **Alternatives**: `Math.random()`을 그릴 때마다 호출 → 다시 그릴 때마다 흔들림, 제외. 날짜 기반 시드 → 하루 종일 같은 글만 보여 무작위 의미가 약함, 제외.

## R4. 제목 [태그]·분류 번호 다루기

- **Decision**: 순수 함수 `splitTitleTag(title)` → `{ tag?: string; text: string }`. 정규식 `^\s*\[([^\]]{1,20})\]\s*(.+)$`. 태그 뒤 띄어쓰기 없음도 처리("[인사]실근속…"). 나머지 글자가 비면 원문 그대로. `stripCategoryNumber(title)`은 `^\s*\d+\.\s*` 제거("1. 인사/조직" → "인사/조직"). 새 화면(카드·메뉴·묶음·모바일 버튼) 모두에 적용.
- **실데이터 확인**: 태그 없는 제목 2개("미사용신입연차휴가 촉진…", "저장할 때  자주 나오는 메시지"), 요약 없는 글 3개.

## R5. 위쪽 바 색 (흰 바탕)

- **현상**: 위쪽 바 배경은 포털 설정 `styles.headerColor`(운영 `#1a2337`)를 쓰고, 글자색은 흰색으로 고정돼 있다(`modules/styles/main.ts`). 위쪽 바는 티켓 등 모든 포털 화면이 같이 쓴다.
- **Decision**: `Layout` → `Header`에 `lightHeader` 속성을 추가해, FAQ 화면(첫 화면·전체·분류·검색·본문)에서만 흰 바탕 + 진한 글자로 그린다. 다른 화면은 지금처럼 설정 색을 쓴다(FR-018).
- **Tradeoff**: FAQ 화면에서는 관리자 설정 `headerColor`가 무시된다. 확정 시안이 흰 위쪽 바이므로 받아들인다. `headerHtml`이 설정된 포털은 지금처럼 그 HTML을 그대로 쓴다.
- **Alternatives**: 관리자 설정값을 흰색으로 바꾸게 안내 → 글자색이 흰색 고정이라 글자가 안 보임, 제외.

## R6. 매뉴얼 링크 찾기

- **Decision**: 순수 함수 `pickManualLink(externalLinks)` — 라벨에 "매뉴얼" 또는 "manual"(대소문자 무시)이 들어간 첫 http(s) 링크, 없으면 첫 http(s) 링크, 없으면 `null`(안내 배너 숨김). 위쪽 바 링크 표시는 지금 코드를 그대로 쓴다.

## R7. 아이콘·글꼴

- **Decision**: 분류 아이콘은 지금처럼 Material Icons 글꼴 + `ERXES_TO_MATERIAL` 매핑을 쓴다(새 의존성 없음). 시안의 선 아이콘과 모양은 조금 다르지만 둥근 색 칸 안에 넣어 시안의 느낌을 맞춘다. 글꼴은 지금 포털 글꼴을 유지하고 새 웹폰트를 추가하지 않는다(로딩 무게).
- **분류 색**: 순서대로 6~7가지 연한 색 묶음(파랑·초록·주황·분홍·보라·회색·빨강)을 돌려 쓴다(`categoryTone(index)`).

## R8. 테스트·검증 방법

- **현황**: client-portal에는 테스트 도구(jest)가 없다. 헌장 결합 원칙 1: TDD는 테스트 인프라가 있는 패키지 한정.
- **Decision**:
  - 순수 함수(R3·R4·R6)는 테스트를 먼저 쓰고, widgets의 jest를 `--rootDir`로 client-portal 폴더에 돌리는 방식(이번 세션에서 ui-tickets 등에 쓴 방식)으로 실행한다. client-portal에 새 패키지를 설치하지 않는다.
  - 타입 확인: `client-portal`에서 `npx tsc --noEmit`(기존 오류 수와 비교).
  - 실화면 확인: client-portal 개발 서버를 Node 16으로 띄우고, Playwright가 GraphQL 요청을 운영에서 기록한 실제 응답으로 가로채 돌려준다(운영 DB에 조회수를 쓰지 않음). 조회수 질의 호출 여부도 가로채서 확인한다.
- **Alternatives**: 로컬 knowledgebase-api·clientportal-api 띄우기 → 지금 개발 환경(pm2)에 두 서비스가 없고 실데이터도 없음, 제외. 운영 API에 붙여 확인 → 본문을 열 때마다 운영 조회수가 올라감, 제외.

## R9. 코드 리뷰 반영(2026-10-28)

- **주제 한정**: 서버(`plugin-clientportal-api/.../clientPortal.ts`)는 검색어가 없으면 `topicId`로 거르지 않아 다른 주제 글까지 돌려준다. `articleListQuery`에 `categoryIds`(이 주제의 `topic.categories` id, 정렬)를 넘겨 서버에서 거른다. 분류가 없으면 질의를 건너뛴다.
- **질문 수 기준 통일**: 서버 `numOfArticles`는 임시 저장(draft) 글도 세어 목록과 어긋난다. 카드·메뉴·칩·묶음·분류 화면 숫자를 모두 목록 결과에서 센다(`countArticlesByCategory`, 상위 분류는 하위 포함).
- **하위 분류**: 첫 화면 카드·전체 묶음은 상위 분류만, 각 상위 분류에 하위 분류 질문을 포함한다. 분류 화면도 자기+하위 질문(`categoryScopeIds`). 경로는 "전체 › 상위 › 하위". 3단계 이상 분류는 `topic.categories`에서 찾는다(`findCategoryPath`).
- **흰 위쪽 바 보완**: 로그인 버튼·메뉴 아이콘도 진한 색으로. 위쪽 바 HTML을 설정한 포털은 흰 바탕을 적용하지 않는다.
- **가로 스크롤**: Windows처럼 폭이 있는 스크롤바에서 `100vw` 히어로가 가로 스크롤을 만든다(운영 사이트에서도 9px 넘침 확인). FAQ 화면에서만 본문 영역에 `overflow-x: clip`(sticky 유지).
- **접근성·기타**: 보조 글자색 #6b7684(대비 약 4.6:1), 장식 아이콘 `aria-hidden`, 선택 메뉴 `aria-current`, 입력 글자 16px(iOS 확대 방지), 본문 화면 오른쪽 많이 본 질문에서 지금 글 제외, 지우기/Esc는 검색 결과 화면에서만 첫 화면으로 이동.
- **범위 밖(제안만)**: 비로그인에도 비공개 글이 보이는 문제(`isPrivate: true` 고정, 기존 동작), 예약(scheduled) 글 노출, 조회수 부풀리기 방지, 원래부터 안 쓰이던 `components/CategoryList.tsx`·`HomeCategoryGrid`·`HomeCategoryCard`, 800줄 넘는 기존 `styles.ts`(1181줄).
