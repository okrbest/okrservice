# Data Model: 고객 포털 FAQ 화면 개편

서버 데이터 구조는 바꾸지 않는다. 아래는 화면이 읽는 값과, 화면에서 만들어 쓰는 값이다.

## 서버에서 읽는 값

### Topic (기존 `clientPortalKnowledgeBaseTopicDetail`)

| 필드 | 쓰임 |
|---|---|
| `_id` | 목록 질의 변수 |
| `parentCategories[]` | 분류 순서·카드·메뉴의 원천 |
| `parentCategories[].childrens[]` | 하위 분류(있으면 메뉴 들여쓰기, 묶음 추가) |

### Category

| 필드 | 쓰임 | 비고 |
|---|---|---|
| `_id` | 분류 주소 `?id=` | |
| `title` | 표시 이름 | 앞 번호("1. ")는 `stripCategoryNumber`로 떼고 표시 |
| `icon` | 아이콘 | `ERXES_TO_MATERIAL`로 Material Icon 이름, 없으면 `folder` |
| `numOfArticles` | 질문 수 | 서버 값 그대로 표시 |

### Article (새 `articleListQuery` 필드)

| 필드 | 쓰임 |
|---|---|
| `_id` | 본문 주소 `?id=` |
| `title` | `splitTitleTag`로 `{tag, text}` |
| `summary` | 한 줄 요약(없으면 생략) |
| `viewCount` | 많이 본 질문·대표 질문 순서 |
| `categoryId` | 분류별 묶기, 본문 주소 `&catId=` |
| `createdDate`, `modifiedDate`, `publishedAt` | 표시하지 않음(기존 정렬 호환용으로만 유지) |

본문 화면만 `content`, `reactionChoices`, `attachments` 등 기존 상세 필드를 받는다(조회수 올리는 질의, 필드 동일).

### Portal Config (기존 `clientPortalGetConfigByDomain`)

| 필드 | 쓰임 |
|---|---|
| `name`, `logo` | 위쪽 바 |
| `externalLinks` | 위쪽 바 링크 + `pickManualLink`로 매뉴얼 안내 버튼 |
| `headerHtml` | 비어 있지 않으면 지금처럼 그 HTML을 위쪽 바로 사용 |

## 화면에서 만드는 값

### TitleParts — `splitTitleTag(title)`

- `tag?: string` — 제목 맨 앞 `[…]` 안 글자(1~20자). 없으면 `undefined`
- `text: string` — 태그를 뺀 제목. 빈 문자열이 되면 원래 제목

### RankedPick — `pickTopArticles(articles, count, rng, excludeIds?)`

- 결과: `Article[]`, 길이 `min(count, 후보 수)`, 중복 없음
- 순서: ① `viewCount > 0` 내림차순(동률은 입력 순서) ② 남은 자리는 나머지를 `rng`로 섞은 순서
- `rng`: `createSeededRandom(seed)` — 같은 시드면 같은 결과

### PageSeed

- 화면이 처음 그려질 때 한 번 만든 정수. 그 화면에 있는 카드·묶음·많이 본 질문이 같은 시드를 쓴다(다시 그려도 고정, 새로 들어오면 바뀜).

### CategoryTone — `categoryTone(index)`

- `{ bg, fg }` 연한 바탕색·아이콘색. 분류 순서대로 7색을 돌려 씀.

### ManualLink — `pickManualLink(externalLinks)`

- `{ label, url } | null`. 규칙은 research R6.
