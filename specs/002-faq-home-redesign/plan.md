# Implementation Plan: 고객 포털 FAQ 화면 개편

**Branch**: `feature/skill-modify-hrchat-merge` (spec 폴더 `002-faq-home-redesign`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-faq-home-redesign/spec.md`

## Summary

client-portal 지식베이스(FAQ) 화면을 확정 시안대로 바꾼다. 첫 화면(`/`, `/knowledge-base`)은 주제 카드형(A), 전체(`?view=all`)·분류(`/knowledge-base/category?id=`)·검색(`?searchValue=`) 화면은 왼쪽 메뉴 + 분류별 묶음(C). 본문 화면은 구성 유지 + 색·글씨 맞춤 + 조회수 올리기. 서버는 바꾸지 않는다. 목록 데이터는 본문을 뺀 가벼운 질의 한 번으로 통일해 첫 화면 다운로드를 약 2.8MB → 수십 KB로 줄인다. 많이 본 질문은 조회수 순 + 모자라면 무작위(화면 단위 고정).

## Technical Context

**Language/Version**: TypeScript 4.1, React 17

**Primary Dependencies**: Next.js 10.0.5(pages 라우터, `next/link`의 자식 `<a>` 방식), @apollo/client 3.7, styled-components 5 + styled-components-ts, Material Icons 글꼴(이미 로드됨)

**Storage**: 없음(브라우저 localStorage의 "최근 본 질문"은 기존 그대로)

**Testing**: 순수 함수는 widgets의 jest를 `--rootDir client-portal`로 실행(R8). 화면은 Playwright + 기록한 GraphQL 응답 가로채기

**Target Platform**: 고객 포털 웹(PC·태블릿·휴대폰 브라우저)

**Project Type**: 웹 프론트엔드(모노레포 안 client-portal 앱)

**Performance Goals**: 첫 화면 목록 데이터 요청 1회, 응답 100KB 미만(현재 2회·약 2.8MB). 첫 화면 표시가 지금보다 느려지지 않음(SC-005)

**Constraints**: 서버·스키마 변경 없음. 기존 주소 유지. FAQ 외 포털 화면 불변. 파일당 800줄 이하(기존 `styles.ts` 1516줄은 더 키우지 않고 새 스타일은 새 파일로)

**Scale/Scope**: 분류 7개, 질문 68개(운영). 화면 5종(첫 화면·전체·분류·검색·본문)

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 뒤 재확인.*

| 원칙 | 판단 | 근거 |
|---|---|---|
| I. 최소 범위 | 통과 | 요청 화면(FAQ 5종)만 바꾼다. 위쪽 바는 FAQ 화면에서만 흰색(R5). 가벼운 질의는 원칙 IV를 지키려고 필요한 범위. 단일 글 예외 분기 제거는 새 목록 모양의 일부(R2) |
| II. 스펙 비례 | 통과 | "전면 개선"급이라 brainstorming → specify → clarify → plan 진행, implement 전 analyze 예정 |
| III. 실동작 검증 | 통과(계획) | Playwright로 5개 화면 × PC/휴대폰 실제 구동, 조회수 질의 호출 확인(quickstart) |
| IV. 성능 회귀 금지 | 통과 | 목록 요청 2→1, 본문 제외. 새 질의 fetchPolicy 명시(`cache-first`). 기존 cache-first·지연 마운트 되돌리지 않음 |
| V. 커밋 규칙 | 통과(계획) | `feat(kb): …`, `perf(kb): …` 한국어 요약, 사용자 요청 시에만 커밋 |

**Post-design 재확인**: 통과. Phase 1 설계에서 서버·주소 변경 없음 확인.

## Project Structure

### Documentation (this feature)

```text
specs/002-faq-home-redesign/
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-routes-and-queries.md   # 화면 주소·GraphQL 질의 계약
└── tasks.md             # /speckit-tasks에서 생성
```

### Source Code (repository root)

```text
client-portal/
├── modules/knowledgeBase/
│   ├── graphql/queries.ts                 # + articleListQuery, articleDetailAndIncViewCountQuery
│   ├── utils/
│   │   ├── faqDisplay.ts                  # 새: splitTitleTag, stripCategoryNumber, categoryTone, pickManualLink, FAQ_SUGGESTED_KEYWORDS
│   │   ├── faqRanking.ts                  # 새: createSeededRandom, pickTopArticles
│   │   └── __tests__/                     # 새: faqDisplay.test.ts, faqRanking.test.ts
│   ├── containers/
│   │   ├── useFaqArticles.ts              # 새: 가벼운 목록 질의 1회 + 화면 단위 시드
│   │   ├── CategoryList.tsx               # 첫 화면 / 전체 / 검색 분기
│   │   ├── CategoryDetail.tsx             # 분류 화면 → FaqBrowse
│   │   ├── ArticleList.tsx                # 검색용(가벼운 질의)
│   │   └── ArticleDetail.tsx              # 조회수 올리는 질의로 교체
│   └── components/
│       ├── faqStyles.ts                   # 새: 새 화면 styled-components
│       ├── home/FaqHome.tsx               # 새: 첫 화면(A) 조립
│       ├── home/FaqCategoryCards.tsx      # 새: 주제 카드 + 전체 카드
│       ├── home/FaqPopularList.tsx        # 새: 많이 본 질문(2열)
│       ├── home/FaqHelpBanner.tsx         # 새: 매뉴얼 안내
│       ├── browse/FaqBrowse.tsx           # 새: C 3단 틀(왼쪽 메뉴·가운데·오른쪽, 모바일 칩)
│       ├── browse/FaqGroupList.tsx        # 새: 전체 화면 분류별 묶음
│       ├── browse/FaqQuestionRow.tsx      # 새: 태그+제목+요약 한 줄
│       ├── HeroSearch.tsx                 # variant(hero|compact) + 추천 검색어 + 가벼운 자동완성
│       ├── SideBar.tsx                    # 새 메뉴 모양(번호 제거, 전체 항목 선택 상태)
│       ├── KbRightPanel.tsx               # 가벼운 질의 + pickTopArticles
│       ├── ArticleList.tsx                # 검색 결과를 FaqQuestionRow로, 단일 글 예외 제거
│       ├── CategoryDetail.tsx / ArticleDetail.tsx  # FaqBrowse 틀 사용 / 색 맞춤
│       └── styles.ts                      # 기존 본문·피드백 색·모서리만 조정(줄 수 늘리지 않음)
├── modules/main/
│   ├── containers/Layout.tsx · components/Layout.tsx · components/Header.tsx  # lightHeader 전달
│   └── (styles) modules/styles/main.ts    # Header·HeaderTitle·HeaderNavLinks 밝은 변형
└── pages/knowledge-base/category/index.tsx # 분류·분류 내 검색 → FaqBrowse(큰 히어로 제거)
```

**Structure Decision**: 기존 `modules/knowledgeBase` 안에 기능별(home/browse) 하위 폴더로 새 부품을 둔다. 1516줄 `styles.ts`는 키우지 않고 새 스타일은 `faqStyles.ts`에 둔다. 페이지 주소 파일(`pages/`)은 그대로 두고 안의 조립만 바꾼다.

## Implementation Notes

- **화면 분기**(contracts 참고): `searchValue` 있음 → 검색(C), `view=all` → 전체(C), 그 밖의 `/`·`/knowledge-base` → 첫 화면(A). 분류 페이지는 `id`로 분류 찾기, 못 찾으면 "찾는 분류가 없어요".
- **데이터 흐름**: `useFaqArticles(topicId)`가 가벼운 목록을 한 번 받아 `articles`, `byCategory`, `seed`를 돌려준다. 첫 화면·전체·분류·오른쪽 패널이 같은 변수로 부르므로 Apollo 캐시에서 한 요청으로 합쳐진다.
- **분류 목록**: `topic.parentCategories`(+`childrens`)를 순서대로 평탄화. 하위 분류가 있으면 메뉴에서 들여쓰기(기존 동작 유지), 묶음은 하위 분류도 각각 하나씩.
- **휴대폰(≤768px)**: 카드 2열, 왼쪽·오른쪽 칸 숨김, 위쪽 가로 스크롤 칩(현재 분류 진하게). 1280px 미만에서 오른쪽 칸 숨김은 기존 규칙 유지.
- **본문 화면**: 구성 그대로. 왼쪽 메뉴는 새 SideBar 모양, 가운데 카드·피드백 버튼 색과 모서리만 새 팔레트로.
- **문구**: 새 문구는 한국어 고정(기존 화면도 한국어 고정 문구 사용 중).

## Complexity Tracking

없음(헌장 위반 없음).
