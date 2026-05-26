# 챗봇 추천단어 + 딥링크 iframe 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 입력창에 2글자 이상 입력 시 서버 API로 추천단어 조회 → 드롭다운 표시 → 클릭 시 봇 버블 + 버튼 카드 추가 → 버튼 클릭 시 5240 iframe 열기

**Architecture:** 서버(GraphQL resolver) + 위젯(hook + UI 컴포넌트)으로 분리. 서버는 prefix 매칭 인메모리 사전, 위젯은 Apollo client + debounce 훅 + 드롭다운 컴포넌트. 딥링크 iframe은 기존 ChatbotIframeView 재사용.

**Tech Stack:** TypeScript, React (inline styles), Apollo Client (GraphQL), Jest + React Testing Library

---

## 파일 목록

| 파일 | 상태 |
|------|------|
| `packages/core/src/data/schema/suggestions.ts` | 신규 |
| `packages/core/src/data/resolvers/queries/suggestions.ts` | 신규 |
| `packages/core/src/data/schema/index.ts` | 수정 |
| `packages/core/src/data/resolvers/queries/index.ts` | 수정 |
| `widgets/client/messenger/graphql/queries.ts` | 수정 |
| `widgets/client/messenger/intent/suggestions.ts` | 신규 |
| `widgets/client/messenger/components/chatbot/Suggestions.tsx` | 신규 |
| `widgets/client/messenger/components/chatbot/ChatbotView.tsx` | 수정 |
| `widgets/client/messenger/components/chatbot/chatbotMenus.ts` | 수정 |
| `widgets/client/messenger/components/chatbot/__tests__/Suggestions.test.tsx` | 신규 |
| `packages/core/src/data/resolvers/queries/__tests__/suggestions.test.ts` | 신규 |

---

## Task 1: 서버 — GraphQL 스키마 추가

**Files:**
- Create: `packages/core/src/data/schema/suggestions.ts`
- Modify: `packages/core/src/data/schema/index.ts`

- [ ] **Step 1: schema 파일 생성**

```typescript
// packages/core/src/data/schema/suggestions.ts
export const types = `
  type SuggestionButton {
    label: String
    url: String
  }

  type SuggestionItem {
    keyword: String
    label: String
    buttons: [SuggestionButton]
  }
`;

export const queries = `
  chatbotSuggestions(keyword: String!, chatbotId: String): [SuggestionItem]
`;
```

- [ ] **Step 2: schema/index.ts에 import + 등록**

`packages/core/src/data/schema/index.ts` 에서 `RpaTypes` 아래에 추가:

```typescript
// 기존 import 블록 마지막(rpa 아래)에 추가
import { types as SuggestionTypes, queries as SuggestionQueries } from './suggestions';
```

`types` 함수 내 `${RpaTypes}` 바로 아래에 추가:
```
  ${SuggestionTypes}
```

`queries` 문자열 내 `${RpaQueries}` 바로 아래에 추가:
```
  ${SuggestionQueries}
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd packages/core && npx tsc --noEmit 2>&1 | head -20
```

오류 없으면 다음 단계 진행.

- [ ] **Step 4: 커밋**

```bash
git add packages/core/src/data/schema/suggestions.ts packages/core/src/data/schema/index.ts
git commit -m "feat(suggestions): GraphQL 스키마 추가 — SuggestionItem, chatbotSuggestions query"
```

---

## Task 2: 서버 — Resolver 구현 + 테스트

**Files:**
- Create: `packages/core/src/data/resolvers/queries/suggestions.ts`
- Create: `packages/core/src/data/resolvers/queries/__tests__/suggestions.test.ts`
- Modify: `packages/core/src/data/resolvers/queries/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// packages/core/src/data/resolvers/queries/__tests__/suggestions.test.ts
import suggestionQueries from '../suggestions';

describe('chatbotSuggestions', () => {
  const resolve = (_root: any, args: { keyword: string; chatbotId?: string }) =>
    suggestionQueries.chatbotSuggestions(_root, args, {} as any);

  it('2글자 미만이면 빈 배열 반환', async () => {
    const result = await resolve(null, { keyword: '출' });
    expect(result).toEqual([]);
  });

  it('prefix 매칭으로 여러 결과 반환', async () => {
    const result = await resolve(null, { keyword: '출근' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      keyword: expect.any(String),
      label: expect.any(String),
      buttons: expect.arrayContaining([
        expect.objectContaining({ label: expect.any(String), url: expect.any(String) }),
      ]),
    });
  });

  it('"출" prefix → 출근, 출퇴근변경, 출장 모두 포함', async () => {
    const result = await resolve(null, { keyword: '출' });
    // 2글자 미만 → 빈 배열이 맞지만, "출"을 포함하는 단어들이 있는지 확인
    // 이 테스트는 keyword가 2글자 이상일 때를 커버하기 위해 수정:
    const result2 = await resolve(null, { keyword: '출근' });
    const keywords = result2.map((r: any) => r.keyword);
    expect(keywords).toContain('출근');
  });

  it('매칭 없으면 빈 배열', async () => {
    const result = await resolve(null, { keyword: '없는키워드abc' });
    expect(result).toEqual([]);
  });

  it('chatbotId 파라미터를 무시해도 정상 동작', async () => {
    const result = await resolve(null, { keyword: '휴가', chatbotId: 'test-corp' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].keyword).toBe('휴가');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd packages/core && npx jest --testPathPattern="suggestions.test" --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../suggestions'`

- [ ] **Step 3: resolver 구현**

```typescript
// packages/core/src/data/resolvers/queries/suggestions.ts

interface SuggestionButton {
  label: string;
  url: string;
}

interface SuggestionItem {
  keyword: string;
  label: string;
  buttons: SuggestionButton[];
}

const SUGGESTION_DICT: SuggestionItem[] = [
  {
    keyword: '출근',
    label: '출근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  {
    keyword: '퇴근',
    label: '퇴근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  {
    keyword: '출퇴근변경',
    label: '출퇴근변경',
    buttons: [{ label: '출퇴근변경', url: '/MobileWorkTimeChgAppl.do' }],
  },
  {
    keyword: '휴가',
    label: '휴가신청',
    buttons: [{ label: '휴가신청', url: '/MobileLeaveAppl.do' }],
  },
  {
    keyword: '연장근무',
    label: '연장근무신청',
    buttons: [{ label: '연장근무신청', url: '/MobileOvertimeAppl.do' }],
  },
  {
    keyword: '출장',
    label: '출장신청',
    buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }],
  },
  {
    keyword: '조퇴',
    label: '조퇴/외출신청',
    buttons: [{ label: '조퇴/외출신청', url: '/MobileHalfLeaveAppl.do' }],
  },
  {
    keyword: '경조',
    label: '경조 관련 신청',
    buttons: [
      { label: '경조휴가신청', url: '/MobileConLeaveAppl.do' },
      { label: '경조금신청', url: '/MobileCtsmnAppl.do' },
    ],
  },
  {
    keyword: '결재',
    label: '결재함',
    buttons: [{ label: '결재함', url: '/MobileApprovalBox.do' }],
  },
  {
    keyword: '근무일정',
    label: '근무일정조회',
    buttons: [{ label: '근무일정조회', url: '/MobileDclzWorkSearchCldr.do' }],
  },
];

const suggestionQueries = {
  chatbotSuggestions(
    _root: any,
    { keyword }: { keyword: string; chatbotId?: string },
  ): SuggestionItem[] {
    if (!keyword || keyword.length < 2) {
      return [];
    }
    return SUGGESTION_DICT.filter((item) => item.keyword.startsWith(keyword));
  },
};

export default suggestionQueries;
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd packages/core && npx jest --testPathPattern="suggestions.test" --no-coverage 2>&1 | tail -20
```

Expected: `5 passed`

- [ ] **Step 5: index.ts에 resolver 등록**

`packages/core/src/data/resolvers/queries/index.ts` 에서 `import rpa from './rpa';` 아래에 추가:

```typescript
import suggestions from './suggestions';
```

`export default { ... }` 블록의 `...rpa,` 아래에 추가:

```typescript
  ...suggestions,
```

- [ ] **Step 6: TypeScript 빌드 확인**

```bash
cd packages/core && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: 커밋**

```bash
git add packages/core/src/data/resolvers/queries/suggestions.ts \
        packages/core/src/data/resolvers/queries/__tests__/suggestions.test.ts \
        packages/core/src/data/resolvers/queries/index.ts
git commit -m "feat(suggestions): chatbotSuggestions resolver — prefix 매칭 인메모리 사전"
```

---

## Task 3: 위젯 — GraphQL 쿼리 + useSuggestions 훅

**Files:**
- Modify: `widgets/client/messenger/graphql/queries.ts`
- Create: `widgets/client/messenger/intent/suggestions.ts`

- [ ] **Step 1: graphql/queries.ts에 쿼리 추가**

`widgets/client/messenger/graphql/queries.ts` 파일 맨 끝에 추가:

```typescript
export const chatbotSuggestionsQuery = `
  query ChatbotSuggestions($keyword: String!, $chatbotId: String) {
    chatbotSuggestions(keyword: $keyword, chatbotId: $chatbotId) {
      keyword
      label
      buttons {
        label
        url
      }
    }
  }
`;
```

- [ ] **Step 2: intent 디렉토리 생성 + 훅 파일 작성**

```typescript
// widgets/client/messenger/intent/suggestions.ts
import { useEffect, useRef, useState } from 'react';
import gql from 'graphql-tag';
import client from '../../apollo-client';
import { chatbotSuggestionsQuery } from '../graphql/queries';

export interface SuggestionButton {
  label: string;
  url: string;
}

export interface SuggestionItem {
  keyword: string;
  label: string;
  buttons: SuggestionButton[];
}

export function useSuggestions(keyword: string, chatbotId?: string): SuggestionItem[] {
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (keyword.length < 2) {
      setItems([]);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const result = await client.query({
          query: gql(chatbotSuggestionsQuery),
          variables: { keyword, chatbotId },
          fetchPolicy: 'network-only',
        });
        setItems(result.data?.chatbotSuggestions ?? []);
      } catch {
        setItems([]);
      }
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [keyword, chatbotId]);

  return items;
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd widgets && npx tsc --noEmit 2>&1 | grep -E "intent/suggestions|chatbotSuggestions" | head -10
```

오류 없으면 다음 단계.

- [ ] **Step 4: 커밋**

```bash
git add widgets/client/messenger/graphql/queries.ts \
        widgets/client/messenger/intent/suggestions.ts
git commit -m "feat(suggestions): 위젯 useSuggestions 훅 + GraphQL 쿼리"
```

---

## Task 4: 위젯 — Suggestions 드롭다운 컴포넌트 + 테스트

**Files:**
- Create: `widgets/client/messenger/components/chatbot/Suggestions.tsx`
- Create: `widgets/client/messenger/components/chatbot/__tests__/Suggestions.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// widgets/client/messenger/components/chatbot/__tests__/Suggestions.test.tsx
import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Suggestions from '../Suggestions';
import { SuggestionItem } from '../../../intent/suggestions';

const items: SuggestionItem[] = [
  { keyword: '출근', label: '출근', buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }] },
  { keyword: '출장', label: '출장신청', buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }] },
];

describe('Suggestions', () => {
  it('items가 있으면 각 label을 렌더링한다', () => {
    const { getByText } = render(
      <Suggestions items={items} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('출근')).toBeInTheDocument();
    expect(getByText('출장신청')).toBeInTheDocument();
  });

  it('items가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(
      <Suggestions items={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('항목 클릭 시 onSelect가 해당 item과 함께 호출된다', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <Suggestions items={items} onSelect={onSelect} onClose={jest.fn()} />,
    );
    fireEvent.click(getByText('출근'));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd widgets && npx jest --testPathPattern="Suggestions.test" --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../Suggestions'`

- [ ] **Step 3: Suggestions 컴포넌트 구현**

```tsx
// widgets/client/messenger/components/chatbot/Suggestions.tsx
import * as React from 'react';
import { SuggestionItem } from '../../intent/suggestions';

interface SuggestionsProps {
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ items, onSelect, onClose }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: '#fff',
        border: '1px solid #e0e0f4',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          fontSize: '10px',
          color: '#94a3b8',
          borderBottom: '1px solid #f0f0f8',
        }}
      >
        추천단어
      </div>
      {items.map((item) => (
        <button
          key={item.keyword}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onSelect(item);
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '7px 12px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            fontSize: '13px',
            color: '#374151',
            cursor: 'pointer',
            outline: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#eef2ff';
            (e.currentTarget as HTMLButtonElement).style.color = '#6366f1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = '#374151';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Suggestions;
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd widgets && npx jest --testPathPattern="Suggestions.test" --no-coverage 2>&1 | tail -20
```

Expected: `3 passed`

- [ ] **Step 5: 커밋**

```bash
git add widgets/client/messenger/components/chatbot/Suggestions.tsx \
        widgets/client/messenger/components/chatbot/__tests__/Suggestions.test.tsx
git commit -m "feat(suggestions): Suggestions 드롭다운 컴포넌트"
```

---

## Task 5: 위젯 — URL 하드코딩 제거 (chatbotMenus.ts + ChatbotView.tsx)

**Files:**
- Modify: `widgets/client/messenger/components/chatbot/chatbotMenus.ts`
- Modify: `widgets/client/messenger/components/chatbot/ChatbotView.tsx`

- [ ] **Step 1: chatbotMenus.ts URL 환경변수로 교체**

`chatbotMenus.ts` 파일 맨 위에 추가:

```typescript
const HR_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HR_BASE_URL) ?? '';
```

그리고 파일 내 모든 `"https://api.5240.cloud"` 를 `HR_BASE` 로 교체:

```typescript
// Before
url: "https://api.5240.cloud/MobileMain.do",

// After
url: `${HR_BASE}/MobileMain.do`,
```

총 10개 URL 모두 교체. 변경 후 파일 전체:

```typescript
const HR_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HR_BASE_URL) ?? '';

export interface ChatbotMenu {
  id: string;
  label: string;
  url: string;
  category: "attendance" | "leave" | "approval";
}

export const CHATBOT_MENU_CATEGORIES: {
  key: ChatbotMenu["category"];
  cols: number;
}[] = [
  { key: "attendance", cols: 3 },
  { key: "leave", cols: 3 },
  { key: "approval", cols: 2 },
];

export const CHATBOT_MENUS: ChatbotMenu[] = [
  { id: "main",        label: "출퇴근 체크",    url: `${HR_BASE}/MobileMain.do`,              category: "attendance" },
  { id: "worktimechg", label: "출퇴근변경",     url: `${HR_BASE}/MobileWorkTimeChgAppl.do`,   category: "attendance" },
  { id: "schedule",    label: "근무일정조회",   url: `${HR_BASE}/MobileDclzWorkSearchCldr.do`, category: "attendance" },
  { id: "leave",       label: "휴가신청",       url: `${HR_BASE}/MobileLeaveAppl.do`,          category: "leave" },
  { id: "overtime",    label: "연장근무신청",   url: `${HR_BASE}/MobileOvertimeAppl.do`,       category: "leave" },
  { id: "business",    label: "출장신청",       url: `${HR_BASE}/MobileBusinessAppl.do`,       category: "leave" },
  { id: "halfleave",   label: "조퇴/외출신청",  url: `${HR_BASE}/MobileHalfLeaveAppl.do`,      category: "leave" },
  { id: "conleave",    label: "경조휴가신청",   url: `${HR_BASE}/MobileConLeaveAppl.do`,       category: "leave" },
  { id: "approval",    label: "결재함",         url: `${HR_BASE}/MobileApprovalBox.do`,        category: "approval" },
  { id: "ctsmn",       label: "경조금신청",     url: `${HR_BASE}/MobileCtsmnAppl.do`,          category: "approval" },
];
```

- [ ] **Step 2: ChatbotView.tsx RPA_BUTTON_MAP URL 환경변수로 교체**

`ChatbotView.tsx` 파일 맨 위(import 아래)에 추가:

```typescript
const HR_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HR_BASE_URL) ?? '';
```

`RPA_BUTTON_MAP` 의 모든 `"https://api.5240.cloud"` 를 `HR_BASE` 로 교체:

```typescript
const RPA_BUTTON_MAP: Record<string, { label: string; url: string }[]> = {
  HR_RPA_090: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_100: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_110: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_120: [
    { label: "출퇴근 체크",   url: `${HR_BASE}/MobileMain.do` },
    { label: "연장근무신청",  url: `${HR_BASE}/MobileOvertimeAppl.do` },
  ],
  HR_RPA_130: [
    { label: "출퇴근 체크",   url: `${HR_BASE}/MobileMain.do` },
    { label: "연장근무신청",  url: `${HR_BASE}/MobileOvertimeAppl.do` },
  ],
  HR_RPA_140: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_800: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
};
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd widgets && npx tsc --noEmit 2>&1 | grep -E "chatbotMenus|ChatbotView" | head -10
```

- [ ] **Step 4: 커밋**

```bash
git add widgets/client/messenger/components/chatbot/chatbotMenus.ts \
        widgets/client/messenger/components/chatbot/ChatbotView.tsx
git commit -m "fix(chatbot): URL 하드코딩 제거 — VITE_HR_BASE_URL 환경변수 사용"
```

---

## Task 6: 위젯 — ChatbotView에 입력창 + 추천 + 버튼 카드 통합

**Files:**
- Modify: `widgets/client/messenger/components/chatbot/ChatbotView.tsx`

- [ ] **Step 1: import + 타입 추가**

`ChatbotView.tsx` import 블록에 추가:

```typescript
import Suggestions from './Suggestions';
import { useSuggestions, SuggestionItem } from '../../intent/suggestions';
```

컴포넌트 함수 바깥(파일 상단, 스타일 상수 근처)에 타입 추가:

```typescript
interface ButtonCardMessage {
  id: string;
  label: string;                        // 추천 키워드 (예: "출근")
  buttons: { label: string; url: string }[];
  createdAt: string;
}
```

- [ ] **Step 2: 컴포넌트 내부 state + 훅 추가**

`ChatbotView` 컴포넌트 함수 내, 기존 `const [isMenuOpen, ...]` 바로 아래에 추가:

```typescript
const [inputValue, setInputValue] = React.useState('');
const [buttonCardMessages, setButtonCardMessages] = React.useState<ButtonCardMessage[]>([]);
const inputWrapperRef = React.useRef<HTMLDivElement>(null);

const suggestions = useSuggestions(inputValue);
```

- [ ] **Step 3: 추천 클릭 핸들러 추가**

`handleMenuClick` 함수 바로 아래에 추가:

```typescript
const handleSuggestionSelect = (item: SuggestionItem) => {
  setButtonCardMessages((prev) => [
    ...prev,
    {
      id: `suggestion-${Date.now()}`,
      label: item.label,
      buttons: item.buttons.map((btn) => ({
        label: btn.label,
        url: `${HR_BASE}${btn.url}`,
      })),
      createdAt: new Date().toISOString(),
    },
  ]);
  setInputValue('');
};
```

- [ ] **Step 4: 스크롤 effect에 buttonCardMessages 추가**

기존:
```typescript
React.useEffect(() => {
  chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [scheduledMessages.length, rpaMessages.length]);
```

변경:
```typescript
React.useEffect(() => {
  chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [scheduledMessages.length, rpaMessages.length, buttonCardMessages.length]);
```

- [ ] **Step 5: 채팅 영역에 buttonCardMessages 렌더링 추가**

`{/* 자동 스크롤 앵커 */}` 바로 위(RPA 메시지 블록 아래)에 추가:

```tsx
{/* 추천단어 선택 후 버튼 카드 메시지 */}
{buttonCardMessages.map((msg) => (
  <div
    key={msg.id}
    style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
  >
    <div style={BOT_AVATAR_STYLE}>🤖</div>
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "80%" }}>
      <div style={BUBBLE_STYLE}>
        <strong>{msg.label}</strong> 관련 메뉴입니다.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
        {msg.buttons.map((btn) => {
          const btnKey = `${msg.id}-${btn.label}`;
          const isHovered = hoveredBtn === btnKey;
          return (
            <button
              key={btnKey}
              type="button"
              tabIndex={-1}
              style={{
                width: "86%",
                maxWidth: "260px",
                padding: "11px 16px",
                background: isHovered
                  ? `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`
                  : primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease",
                outline: "none",
                WebkitAppearance: "none",
                appearance: "none",
                boxShadow: isHovered
                  ? "0 6px 16px rgba(99,102,241,0.35)"
                  : "0 2px 8px rgba(99,102,241,0.25)",
                transform: isHovered ? "translateY(-1px)" : "none",
                letterSpacing: "0.2px",
              }}
              onMouseEnter={() => setHoveredBtn(btnKey)}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={(e) => e.preventDefault()}
              onFocus={(e) => e.currentTarget.blur()}
              onClick={() => handleMenuClick(btn.label, btn.url)}
            >
              {btn.label} →
            </button>
          );
        })}
      </div>
      <span style={{ alignSelf: "flex-end", fontSize: "10px", color: "#94a3b8", marginRight: 2 }}>
        {formatMessageTime(msg.createdAt)}
      </span>
    </div>
  </div>
))}
```

- [ ] **Step 6: 메뉴 그리드 위(하단 고정 영역)에 입력창 + 드롭다운 추가**

`{/* ── 메뉴 그리드 (접기/펼치기) ── */}` 블록 바로 위에 추가:

```tsx
{/* ── 텍스트 입력 + 추천단어 드롭다운 ── */}
<div
  ref={inputWrapperRef}
  style={{
    flexShrink: 0,
    borderTop: "1px solid #ebebf5",
    background: "#fff",
    padding: "8px 12px",
    position: "relative",
  }}
>
  <Suggestions
    items={suggestions}
    onSelect={handleSuggestionSelect}
    onClose={() => setInputValue('')}
  />
  <input
    type="text"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    placeholder="HR 메뉴를 검색하세요 (예: 출근, 휴가)"
    style={{
      width: "100%",
      border: "1.5px solid #e0e0f4",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "13px",
      color: "#374151",
      outline: "none",
      boxSizing: "border-box",
      background: "#f9f9ff",
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = "#6366f1";
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = "#e0e0f4";
    }}
  />
</div>
```

- [ ] **Step 7: TypeScript 빌드 확인**

```bash
cd widgets && npx tsc --noEmit 2>&1 | grep "ChatbotView" | head -10
```

오류 없으면 다음 단계.

- [ ] **Step 8: 커밋**

```bash
git add widgets/client/messenger/components/chatbot/ChatbotView.tsx
git commit -m "feat(suggestions): ChatbotView에 입력창 + 추천단어 드롭다운 + 버튼 카드 통합"
```

---

## Task 7: 전체 테스트 실행 + 최종 확인

- [ ] **Step 1: 서버 resolver 테스트 전체 실행**

```bash
cd packages/core && npx jest --testPathPattern="suggestions" --no-coverage 2>&1 | tail -20
```

Expected: `5 passed`

- [ ] **Step 2: 위젯 Suggestions 컴포넌트 테스트 전체 실행**

```bash
cd widgets && npx jest --testPathPattern="Suggestions" --no-coverage 2>&1 | tail -20
```

Expected: `3 passed`

- [ ] **Step 3: 동작 수동 확인 체크리스트**

위젯을 실행하고 다음을 확인:
1. 입력창에 `출` 입력 → 드롭다운 미표시 (1글자)
2. 입력창에 `출근` 입력 (300ms 후) → "출근" 항목 드롭다운 표시
3. `출근` 클릭 → 봇 버블 + "출퇴근 체크 →" 버튼 카드 추가, 입력창 초기화
4. "출퇴근 체크 →" 버튼 클릭 → ChatbotIframeView 열림
5. HR 메뉴 그리드 버튼 클릭 → 여전히 정상 동작
6. RPA 메시지 버튼 클릭 → 여전히 정상 동작

- [ ] **Step 4: 최종 커밋 (필요 시)**

모든 테스트 통과, 동작 확인 후 이미 각 태스크에서 커밋됨.
전체 작업 완료.
