# Quickstart: FAQ 화면 개편 확인 방법

## 준비

- Node 16(`~/.nvm/versions/node/v16.20.2`) — Next 10 + webpack 4 개발 서버용
- Node 20(`~/.nvm/versions/node/v20.20.2`) — Playwright용
- 기록한 운영 GraphQL 응답: `scratchpad/playwright-verify/faq/gql.json`(R8)

## 1. 순수 함수 테스트

```bash
cd widgets
npx jest --rootDir ../client-portal modules/knowledgeBase/utils/__tests__
```

기대: `splitTitleTag`, `stripCategoryNumber`, `categoryTone`, `pickManualLink`, `createSeededRandom`, `pickTopArticles` 테스트 모두 통과.

## 2. 타입 확인

```bash
cd client-portal && npx tsc --noEmit -p tsconfig.json
```

기대: 바꾼 파일에서 새 오류 0개(기존 오류 수와 비교).

## 3. 개발 서버

```bash
cd client-portal
REACT_APP_DOMAIN=http://localhost:4999 PORT=4200 ~/.nvm/versions/node/v16.20.2/bin/node server.js
```

`localhost:4999`는 실제 서버가 아니다. Playwright가 `**/graphql` 요청을 가로채 기록한 응답을 돌려준다(조회수 질의는 기록한 글 데이터로 만들어 돌려주고 호출 횟수를 센다).

## 4. 화면 시나리오 (Playwright, PC 1440px · 휴대폰 390px)

| # | 열 주소 | 확인할 것 | spec |
|---|---|---|---|
| 1 | `/` | 제목·검색창·추천어 5개·카드(분류 수+1)·많이 본 질문 6개·매뉴얼 안내. 68개 나열 없음. 카드마다 대표 질문 2개, "1. " 번호 없음 | US1, FR-001~006 |
| 2 | `/` 에서 "근태관리" 카드 클릭 | 분류 화면, 메뉴 근태관리 선택, 26개, 오른쪽 "이 분류에서 많이 본 질문" | US1-3, US2-2 |
| 3 | `/knowledge-base?view=all` | 메뉴 "전체" 선택, 분류별 묶음 7개, 묶음마다 3개 + "모두 보기"(2개짜리 분류는 "모두 보기" 없음) | US2-1, FR-008 |
| 4 | 목록 한 줄 | "[휴가]"가 태그로, 제목과 분리. 태그 없는 제목도 줄 맞음 | US2-3, FR-011 |
| 5 | 추천어 "급여명세서" 클릭 | `?searchValue=급여명세서` 결과 화면(C) | US3-2 |
| 6 | 없는 말 검색 | "검색 결과가 없어요" 안내 | US3-3 |
| 7 | 질문 클릭 → 본문 | 구성 유지, 새 색. 조회수 질의 1회 호출 | US5, FR-016 |
| 8 | `/knowledge-base/category?id=없는값` | "찾는 분류가 없어요" + 전체 링크 | Edge |
| 9 | 휴대폰 390px로 1·2·3·7 | 카드 2열, 위쪽 칩, 가로 스크롤 없음(`scrollWidth <= innerWidth`) | US4, SC-004 |
| 10 | 첫 화면 네트워크 | 목록 질의 1회, 응답에 `content` 없음 | SC-005, R2 |
| 11 | 첫 화면에서 다시 그리기(검색창에 두 글자 입력해 자동완성을 열었다가 바깥을 눌러 닫기) | 많이 본 질문·카드 대표 질문 순서 그대로 | FR-012 |
| 13 | 본문을 연 뒤 첫 화면 새로 열기 | 방금 연 질문이 많이 본 질문 1위 | SC-006 |
| 12 | 티켓 등 다른 화면 | 위쪽 바가 기존 설정 색 그대로 | FR-018 |
