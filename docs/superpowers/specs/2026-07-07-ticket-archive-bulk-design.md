# 티켓 일괄 아카이브 & 아카이브 전체 페이지 설계

## 목표

파이프라인에서 티켓을 한 번에 아카이브할 수 있게 하고, 아카이브된 티켓을 전체 화면에서 그룹별로 편리하게 조회한다.

## 배경

- 단일 스테이지에 800개 이상 티켓이 쌓여 있어 파이프라인 뷰가 느리고 불편함
- 기존 아카이브 기능은 티켓 하나씩만 처리 가능
- 기존 아카이브 조회는 좁은 우측 사이드 패널에 단순 목록만 제공

---

## 기능 1: 파이프라인 일괄 아카이브

### 진입점

파이프라인 우측 상단에 **"선택" 버튼** 추가. 클릭하면 선택 모드 활성화.

### 선택 모드 UI

- 각 티켓 카드 왼쪽에 체크박스 등장
- 스테이지 헤더에 "전체 선택" 체크박스 → 해당 스테이지 전체 선택/해제
- 상단 황색 액션바 고정 표시:
  - 선택된 티켓 수 (`N개 선택됨`)
  - 날짜 조건 드롭다운 (`전체 / 30일 이상 / 60일 이상 / 90일 이상`) — 조건 선택 시 해당 카드 하이라이트
  - **"선택 항목 아카이브"** 버튼 (빨간색)
  - **"취소"** 버튼 → 선택 모드 종료

### 동작

1. 날짜 조건 선택 시 조건에 맞는 카드가 파란 테두리로 하이라이트됨 (선택은 아님)
2. 스테이지 헤더 "전체 선택" 체크박스 클릭 → 해당 스테이지의 모든 카드 체크
3. 개별 카드 체크박스로 수동 추가/제외 가능
4. "선택 항목 아카이브" 클릭 → 확인 모달 (`N개 티켓을 아카이브하시겠습니까?`) → 확인 시 일괄 처리
5. 완료 후 선택 모드 종료, 파이프라인 새로고침

### 백엔드

- 기존 `archiveItems` 뮤테이션을 배열 ID를 받는 방식으로 확장
- `plugin-tickets-api`: `ticketsBulkArchive(ids: [String!]!): BulkArchiveResult` 뮤테이션 추가
- `BulkArchiveResult`: `{ count: Int!, failedIds: [String] }`

---

## 기능 2: 아카이브 전체 페이지

### 진입점

파이프라인 상단 **"📦 아카이브 보기"** 버튼 클릭 → 전체 화면 모달(오버레이)로 열림. 별도 라우트 없음.

### 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  🔍 검색...   N개 선택됨  [↩ 해제]  [🗑 삭제]   [✕] │  ← 상단 액션바
├──────────────┬──────────────────────────────────────┤
│  그룹 기준   │  그룹 목록 (접기/펼치기)               │
│  ──────────  │                                       │
│  📅 월별     │  🏢 (주)테크솔루션 (24개)  [▲ 접기]   │
│  👤 담당자별  │    ☐ 로그인 오류 문의  접수  김민지 … │
│  🏷 고객요청  │    ☐ API 연동 오류    처리중 최영수 … │
│  📂 기능분류  │    + 21개 더 보기                     │
│ ▶🏢 회사별   │  🏢 (주)글로벌미디어 (18개)  [▼ 펼치기]│
│  ──────────  │  🏢 미연결 (41개)           [▼ 펼치기]│
│  필터        │                                       │
│  기간: 3개월  │                                       │
│  담당자: 전체  │                                       │
│  스테이지: 전체│                                       │
└──────────────┴──────────────────────────────────────┘
```

### 좌측 패널 — 그룹 기준 (5가지)

| 기준 | 필드 | 비고 |
|------|------|------|
| 📅 월별 | `archivedAt` | 아카이브된 날짜 기준 |
| 👤 담당자별 | `assignedUserIds` | 복수 담당자 시 첫 번째 기준 |
| 🏷 고객요청구분 | `requestType` | 미설정 시 "미분류" 그룹 |
| 📂 기능분류 | `functionCategory` | 미설정 시 "미분류" 그룹 |
| 🏢 회사별 | `companyIds` | 복수 회사 시 첫 번째 기준, 없으면 "미연결" |

### 좌측 패널 — 필터

- 기간: 전체 / 최근 1개월 / 최근 3개월 / 최근 6개월 / 직접 입력
- 담당자: 멀티 셀렉트
- 스테이지: 멀티 셀렉트

### 우측 목록 — 그룹별 아이템

각 그룹:
- 헤더: 체크박스 (그룹 전체 선택) + 그룹명 + 아이템 수 + 펼치기/접기 토글
- 아이템 행: 체크박스 / 티켓명 / 스테이지 / 담당자 / 아카이브일 / 고객요청구분 태그
- 그룹당 기본 3개 표시 → "N개 더 보기" 클릭 시 전체 전개

### 상단 액션바

- 검색 인풋 (티켓명 실시간 검색)
- 선택된 수 표시 (0개면 숨김)
- **"↩ 아카이브 해제"** — 선택 항목을 원래 스테이지로 복구
- **"🗑 삭제"** — 영구 삭제 (확인 모달)
- **"✕ 닫기"** — 모달 닫기

### 백엔드

- 기존 `archivedItems` 쿼리에 `groupBy` 파라미터 추가:
  - `groupBy: "month" | "assignee" | "requestType" | "functionCategory" | "company"`
- 응답: `ArchivedGroup[]` — `{ groupKey: String, groupLabel: String, items: [ITicket], total: Int }`
- 그룹 내 페이지네이션: `offset` + `limit` (기본 3, "더 보기" 시 추가 로드)
- 일괄 해제: `ticketsBulkUnarchive(ids: [String!]!): BulkResult`
- 일괄 삭제: `ticketsBulkDelete(ids: [String!]!): BulkResult`

---

## 파일 구조

### 신규 생성
- `packages/ui-tickets/src/boards/components/ArchiveModal.tsx` — 전체 화면 모달 래퍼
- `packages/ui-tickets/src/boards/components/ArchiveGroupList.tsx` — 그룹 목록 + 접기/펼치기
- `packages/ui-tickets/src/boards/components/ArchiveLeftPanel.tsx` — 그룹 기준 + 필터 패널
- `packages/ui-tickets/src/boards/components/BulkSelectBar.tsx` — 파이프라인 상단 액션바
- `packages/ui-tickets/src/boards/containers/ArchiveModal.tsx` — GraphQL 연결
- `packages/plugin-tickets-api/src/graphql/resolvers/mutations/ticketsBulkArchive.ts`
- `packages/plugin-tickets-api/src/graphql/resolvers/queries/archivedGrouped.ts`

### 수정
- `packages/ui-tickets/src/boards/components/Pipeline.tsx` — "선택" 버튼, "아카이브 보기" 버튼 추가
- `packages/ui-tickets/src/boards/components/stage/Stage.tsx` — 스테이지 헤더 체크박스
- `packages/ui-tickets/src/boards/components/stage/ItemList.tsx` — 카드 체크박스
- `packages/ui-tickets/src/boards/graphql/queries.ts` — `archivedGrouped` 쿼리 추가
- `packages/ui-tickets/src/boards/graphql/mutations.ts` — bulk 뮤테이션 추가
- `packages/plugin-tickets-api/src/graphql/typeDefs/ticket.ts` — 타입 추가
- `packages/plugin-tickets-api/src/graphql/resolvers/index.ts` — 리졸버 등록

---

## 제약 사항

- 일괄 아카이브 최대 500개/1회 (백엔드 안전 제한)
- 선택 모드는 파이프라인 뷰에서만 동작 (리스트 뷰 미지원)
- `archivedAt` 필드가 없는 기존 아카이브 티켓은 월별 그룹에서 "날짜 미상" 그룹으로 분류
