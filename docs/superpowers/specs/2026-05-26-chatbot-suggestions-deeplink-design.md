# 챗봇 추천단어(자동완성) + 딥링크 iframe 설계

**날짜:** 2026-05-26
**범위:** 개발 가이드 8장 체크리스트 5번 — 위젯: 추천단어 자동완성 + 버튼 클릭 → 딥링크 iframe

---

## 1. 목표

- 채팅 입력창에 2글자 이상 입력 시 서버 API로 추천단어 조회 → 드롭다운 표시
- 추천단어 클릭 → 채팅창에 봇 버블 + 버튼 카드 추가
- 버튼 클릭 → 기존 `ChatbotIframeView`로 5240 화면 iframe 표시

딥링크 iframe(`ChatbotIframeView`)은 이미 구현되어 있어 재사용.

---

## 2. 전체 흐름

```
사용자 입력 (2글자 이상)
  → debounce 300ms
  → GraphQL query: chatbotSuggestions(keyword, chatbotId)
  → 드롭다운 추천 목록 표시 (입력창 바로 위)
  → 추천 클릭
  → 채팅창에 봇 버블 + 버튼 카드 추가 (buttonCardMessages state)
  → 버튼 클릭
  → handleMenuClick(label, url) → setChatbotMenu + setRoute("chatbot-iframe")
  → ChatbotIframeView에서 5240 화면 iframe 표시 (기존 코드 재사용)
```

---

## 3. 서버 측 설계

### 3.1 GraphQL 스키마

```graphql
type SuggestionItem {
  keyword: String   # 매칭된 키워드 (예: "출근")
  label: String     # 드롭다운 표시 텍스트
  buttons: [SuggestionButton]
}

type SuggestionButton {
  label: String     # 버튼 텍스트 (예: "출퇴근 체크")
  url: String       # 5240 딥링크 경로 (예: "/MobileMain.do")
}

extend type Query {
  chatbotSuggestions(keyword: String!, chatbotId: String): [SuggestionItem]
}
```

### 3.2 사전 데이터 (서버 메모리, DB 없음)

```typescript
// packages/core/src/data/resolvers/queries/suggestions.ts
const SUGGESTION_DICT: Record<string, SuggestionItem> = {
  '출근': {
    keyword: '출근',
    label: '출근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  '퇴근': {
    keyword: '퇴근',
    label: '퇴근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  '출퇴근변경': {
    keyword: '출퇴근변경',
    label: '출퇴근변경',
    buttons: [{ label: '출퇴근변경', url: '/MobileWorkTimeChgAppl.do' }],
  },
  '휴가': {
    keyword: '휴가',
    label: '휴가신청',
    buttons: [{ label: '휴가신청', url: '/MobileLeaveAppl.do' }],
  },
  '연장근무': {
    keyword: '연장근무',
    label: '연장근무신청',
    buttons: [{ label: '연장근무신청', url: '/MobileOvertimeAppl.do' }],
  },
  '출장': {
    keyword: '출장',
    label: '출장신청',
    buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }],
  },
  '조퇴': {
    keyword: '조퇴',
    label: '조퇴/외출신청',
    buttons: [{ label: '조퇴/외출신청', url: '/MobileHalfLeaveAppl.do' }],
  },
  '경조': {
    keyword: '경조',
    label: '경조휴가신청',
    buttons: [
      { label: '경조휴가신청', url: '/MobileConLeaveAppl.do' },
      { label: '경조금신청', url: '/MobileCtsmnAppl.do' },
    ],
  },
  '결재': {
    keyword: '결재',
    label: '결재함',
    buttons: [{ label: '결재함', url: '/MobileApprovalBox.do' }],
  },
  '근무일정': {
    keyword: '근무일정',
    label: '근무일정조회',
    buttons: [{ label: '근무일정조회', url: '/MobileDclzWorkSearchCldr.do' }],
  },
};
```

- keyword는 prefix 매칭: `"출"` → `출근`, `출퇴근변경`, `출장`
- chatbotId는 현재 미사용 (멀티테넌트 사전 분기를 위해 파라미터만 받아둠)
- URL은 path만 반환. 위젯에서 `VITE_HR_BASE_URL` + path 조합

### 3.3 신규 파일

| 파일 | 역할 |
|------|------|
| `packages/core/src/data/schema/suggestions.ts` | GraphQL 타입 + query 정의 |
| `packages/core/src/data/resolvers/queries/suggestions.ts` | prefix 매칭 + 결과 반환 |

### 3.4 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/core/src/data/schema/index.ts` | suggestions 타입/쿼리 import |
| `packages/core/src/data/resolvers/queries/index.ts` | chatbotSuggestions resolver 등록 |

---

## 4. 위젯 측 설계

### 4.1 신규 파일

#### `components/chatbot/Suggestions.tsx`

드롭다운 UI 컴포넌트.

```typescript
interface SuggestionsProps {
  items: SuggestionItem[]        // 서버에서 받은 추천 목록
  onSelect: (item: SuggestionItem) => void
  onClose: () => void
}
```

- `items`가 빈 배열이면 렌더링하지 않음
- 항목 클릭 → `onSelect` 콜백 → 부모(ChatbotView)가 버튼 카드 추가 + 입력창 초기화
- 입력창 외부 클릭 시 `onClose`

#### `intent/suggestions.ts`

API 호출 훅.

```typescript
// GraphQL 쿼리 문자열
export const chatbotSuggestionsQuery = `
  query ChatbotSuggestions($keyword: String!, $chatbotId: String) {
    chatbotSuggestions(keyword: $keyword, chatbotId: $chatbotId) {
      keyword
      label
      buttons { label url }
    }
  }
`

// 훅
export function useSuggestions(keyword: string, chatbotId?: string): SuggestionItem[]
```

- `keyword.length < 2`이면 빈 배열 반환
- debounce 300ms
- Apollo client 직접 사용 (기존 RpaMessage context 패턴과 동일)

### 4.2 수정 파일

#### `ChatbotView.tsx`

추가할 상태:
```typescript
const [inputValue, setInputValue] = useState('')
const [buttonCardMessages, setButtonCardMessages] = useState<ButtonCardMessage[]>([])
```

추가할 타입:
```typescript
interface ButtonCardMessage {
  id: string
  text: string              // "출근 관련 메뉴입니다."
  buttons: { label: string; url: string }[]
  createdAt: string
}
```

UI 변경:
- 메시지 영역 아래에 `buttonCardMessages` 렌더링 (봇 버블 + 버튼 리스트 스타일)
- `inputValue` 2글자 이상일 때 `Suggestions` 컴포넌트 표시
- 추천 클릭 시 → `buttonCardMessages`에 추가 + `inputValue` 초기화
- 버튼 클릭 시 → 기존 `handleMenuClick(label, VITE_HR_BASE_URL + url)` 호출

### 4.3 URL 하드코딩 제거

현재 `RPA_BUTTON_MAP`의 `https://api.5240.cloud/...`를 `VITE_HR_BASE_URL` 환경변수로 교체.
스펙에서 명시적으로 금지한 항목.

```typescript
const HR_BASE = import.meta.env.VITE_HR_BASE_URL ?? ''
// url: `${HR_BASE}/MobileMain.do`
```

---

## 5. 에러 처리

| 상황 | 처리 |
|------|------|
| API 호출 실패 | 드롭다운 미표시 (조용히 실패) |
| 빈 결과 | 드롭다운 미표시 |
| VITE_HR_BASE_URL 미설정 | 빈 문자열로 fallback, 버튼 클릭 시 경고 없이 상대경로로 열림 |

---

## 6. 신규/수정 파일 목록

| 파일 | 상태 |
|------|------|
| `packages/core/src/data/schema/suggestions.ts` | 신규 |
| `packages/core/src/data/resolvers/queries/suggestions.ts` | 신규 |
| `packages/core/src/data/schema/index.ts` | 수정 |
| `packages/core/src/data/resolvers/queries/index.ts` | 수정 |
| `widgets/client/messenger/components/chatbot/Suggestions.tsx` | 신규 |
| `widgets/client/messenger/intent/suggestions.ts` | 신규 |
| `widgets/client/messenger/components/chatbot/ChatbotView.tsx` | 수정 |
| `widgets/client/messenger/graphql/queries.ts` | 수정 (쿼리 추가) |

---

## 7. 범위 밖 (이번 작업에서 제외)

- chatbotId 기반 멀티테넌트 사전 분기
- 서버 DB 기반 사전 관리 (CRUD)
- 추천 결과 캐싱
- `widget_session` 테이블 (별도 작업)
- RPA API 인증 (별도 작업)
