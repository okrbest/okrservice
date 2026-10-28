# Contract: FAQ 화면 주소와 GraphQL 질의

## 화면 주소 (바뀌지 않음, 화면만 바뀜)

| 주소 | 조건 | 화면 |
|---|---|---|
| `/` , `/knowledge-base` | `searchValue`·`view` 없음 | 첫 화면(A) |
| `/knowledge-base?view=all` | | 전체(C, 메뉴 "전체" 선택) |
| `/` 또는 `/knowledge-base` `?searchValue=…` | | 검색 결과(C, 메뉴 선택 없음) |
| `/knowledge-base/category?id=<catId>` | 분류 있음 | 분류(C, 메뉴 해당 분류 선택) |
| `/knowledge-base/category?id=<없는 id>` | 분류 없음 | C 틀 + "찾는 분류가 없어요" + 전체 링크 |
| `/knowledge-base/category?id=…&searchValue=…` | | 검색 결과(C) — 기존 동작 유지 |
| `/knowledge-base/article?id=<articleId>&catId=<catId>` | | 본문(구성 유지) |

화면 안 링크도 위 주소만 쓴다. 추천 검색어 → `/knowledge-base?searchValue=<말>`. "모두 보기"·카드 → 분류 주소. "전체 질문 보기" → `?view=all`.

## GraphQL 질의 (서버 스키마 변경 없음)

### 새 질의 문자열 `articleListQuery` (기존 루트 필드, 필드만 줄임)

```graphql
query faqArticleList($topicId: String, $searchValue: String, $isPrivate: Boolean) {
  clientPortalKnowledgeBaseArticles(topicId: $topicId, searchValue: $searchValue, isPrivate: $isPrivate) {
    _id title summary viewCount categoryId createdDate modifiedDate publishedAt
  }
}
```

- 목록용 변수: `{ topicId, isPrivate: true }` — 첫 화면·전체·분류·오른쪽 패널이 같은 변수 → 요청 1회로 합쳐짐. `fetchPolicy: 'cache-first'`.
- 검색용 변수: `{ topicId, searchValue, isPrivate: true }`.
- 자동완성: `{ topicId, searchValue: <입력 2자 이상>, isPrivate: true }`.

### 새 질의 문자열 `articleDetailAndIncViewCountQuery`

```graphql
query knowledgeBaseArticleDetailAndIncViewCount($_id: String!) {
  knowledgeBaseArticleDetailAndIncViewCount(_id: $_id) { …기존 articleDetailQuery와 같은 필드… }
}
```

- 본문 화면에서만 사용. `fetchPolicy: 'cache-first'`. 응답 필드는 기존 상세와 같아 `SingleArticle`은 바뀌지 않는다.

### 그대로 쓰는 질의

- `clientPortalKnowledgeBaseTopicDetail`(분류 구조), `clientPortalGetConfigByDomain`(포털 설정), `knowledgeBaseCategoryDetail`(본문 화면의 분류 정보), `knowledgeBaseArticleReact`(도움 여부).

### 더 이상 FAQ 화면에서 쓰지 않는 것

- 무거운 `articlesQuery`(본문 포함 목록) — 정의는 남겨 두되 FAQ 목록·패널·자동완성에서 호출하지 않는다.
