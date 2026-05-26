# Intent Service 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rpaCode → 버튼 카드(buttons) 변환 로직을 서버에 구현하여, 위젯이 하드코딩된 매핑 테이블 대신 서버가 내려준 `buttons` 필드를 사용하도록 한다.

**Architecture:** 서버에 순수함수 `getIntentButtons(rpaCode)` + INTENT_MAP을 신규 파일로 추가하고, RPA 메시지 수신 시 buttons를 계산해 DB에 저장 및 WebSocket으로 push한다. GraphQL 스키마에 `RpaButton` 타입과 `buttons` 필드를 추가하고, 위젯의 query/subscription/context도 같이 업데이트한다. 마지막으로 위젯 ChatbotView의 하드코딩된 `RPA_BUTTON_MAP`을 제거하고 `msg.buttons`로 교체한다.

**Tech Stack:** TypeScript, Mongoose (MongoDB), GraphQL, React

---

## 파일 목록

| 파일 | 상태 | 역할 |
|------|------|------|
| `packages/core/src/data/resolvers/queries/intent.ts` | 신규 | INTENT_MAP + `getIntentButtons()` 순수함수 |
| `packages/core/src/__tests__/data/resolvers/queries/intent.test.ts` | 신규 | intent 함수 단위 테스트 |
| `packages/core/src/db/models/definitions/rpaMessages.ts` | 수정 | `buttons` 필드 추가 |
| `packages/core/src/data/schema/rpa.ts` | 수정 | `RpaButton` 타입 + `buttons: [RpaButton]` 추가 |
| `packages/core/src/index.ts` | 수정 | RPA 수신 시 `getIntentButtons` 호출, buttons 저장 및 push |
| `widgets/client/messenger/graphql/queries.ts` | 수정 | `rpaMessages` 쿼리에 `buttons { label path }` 추가 |
| `widgets/client/messenger/graphql/subscriptions.ts` | 수정 | `rpaMessageReceived` 구독에 `buttons { label path }` 추가 |
| `widgets/client/messenger/context/RpaMessage.tsx` | 수정 | `RpaMessageItem`에 `buttons` 필드 추가 |
| `widgets/client/messenger/components/chatbot/ChatbotView.tsx` | 수정 | `RPA_BUTTON_MAP` 제거 → `msg.buttons` 사용 |

---

## Task 1: 서버 — intent 함수 구현 + 테스트

**Files:**
- Create: `packages/core/src/data/resolvers/queries/intent.ts`
- Create: `packages/core/src/__tests__/data/resolvers/queries/intent.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// packages/core/src/__tests__/data/resolvers/queries/intent.test.ts
import { getIntentButtons } from '../../../../data/resolvers/queries/intent';

describe('getIntentButtons', () => {
  it('HR_RPA_100 → 출퇴근 체크 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_100');
    expect(buttons).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_090 → 출퇴근 체크 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_090');
    expect(buttons).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_120 → 출퇴근 체크 + 연장근무신청 두 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_120');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual({ label: '출퇴근 체크', path: '/MobileMain.do' });
    expect(buttons[1]).toEqual({ label: '연장근무신청', path: '/MobileOvertimeAppl.do' });
  });

  it('HR_RPA_130 → HR_RPA_120과 동일 버튼', () => {
    const buttons = getIntentButtons('HR_RPA_130');
    expect(buttons).toHaveLength(2);
  });

  it('HR_RPA_140 → 출퇴근 체크 버튼 반환', () => {
    expect(getIntentButtons('HR_RPA_140')).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_800 → 출퇴근 체크 버튼 반환', () => {
    expect(getIntentButtons('HR_RPA_800')).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_110 → 알림만이라 빈 배열', () => {
    expect(getIntentButtons('HR_RPA_110')).toEqual([]);
  });

  it('알 수 없는 rpaCode → 빈 배열', () => {
    expect(getIntentButtons('UNKNOWN_CODE')).toEqual([]);
  });

  it('빈 문자열 → 빈 배열', () => {
    expect(getIntentButtons('')).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core && npx jest --testPathPattern="intent.test" --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '../../../../data/resolvers/queries/intent'`

- [ ] **Step 3: intent.ts 구현**

```typescript
// packages/core/src/data/resolvers/queries/intent.ts

export interface IntentButton {
  label: string;
  path: string;
}

// rpaCode → 버튼 카드 매핑
// 경로(path)만 저장. 절대 URL 조합은 위젯에서 HR_BASE_URL + path 로 수행.
// HR_RPA_090, HR_RPA_110 은 알림 전용 — 버튼 없음.
const INTENT_MAP: Record<string, IntentButton[]> = {
  HR_RPA_090: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_100: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_110: [],
  HR_RPA_120: [
    { label: '출퇴근 체크',  path: '/MobileMain.do' },
    { label: '연장근무신청', path: '/MobileOvertimeAppl.do' },
  ],
  HR_RPA_130: [
    { label: '출퇴근 체크',  path: '/MobileMain.do' },
    { label: '연장근무신청', path: '/MobileOvertimeAppl.do' },
  ],
  HR_RPA_140: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_800: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
};

/**
 * rpaCode에 대응하는 버튼 목록을 반환한다.
 * 알 수 없는 코드는 빈 배열 반환.
 */
export function getIntentButtons(rpaCode: string): IntentButton[] {
  return INTENT_MAP[rpaCode] ?? [];
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core && npx jest --testPathPattern="intent.test" --no-coverage 2>&1 | tail -10
```

Expected: `9 passed`

- [ ] **Step 5: 커밋**

```bash
cd /Users/shin-yeji/okrservice
git add packages/core/src/data/resolvers/queries/intent.ts \
        packages/core/src/__tests__/data/resolvers/queries/intent.test.ts
git commit -m "feat(intent): rpaCode → 버튼 카드 변환 intent 서비스 구현"
```

---

## Task 2: 서버 — RpaMessage 모델 + GraphQL 스키마에 buttons 추가

**Files:**
- Modify: `packages/core/src/db/models/definitions/rpaMessages.ts`
- Modify: `packages/core/src/data/schema/rpa.ts`

- [ ] **Step 1: DB 모델 정의에 buttons 필드 추가**

`packages/core/src/db/models/definitions/rpaMessages.ts` 전체를 아래로 교체:

```typescript
import { Document, Schema } from 'mongoose';
import { field } from './utils';

export interface IRpaButton {
  label: string;
  path: string;
}

export interface IRpaMessage {
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: Date;
  buttons: IRpaButton[];
}

export interface IRpaMessageDocument extends IRpaMessage, Document {
  _id: string;
}

const rpaButtonSchema = new Schema(
  {
    label: field({ type: String, label: '버튼 텍스트' }),
    path: field({ type: String, label: '5240 경로 (예: /MobileMain.do)' }),
  },
  { _id: false },
);

export const rpaMessageSchema = new Schema({
  _id: field({ pkey: true }),
  loginId: field({ type: String, label: 'Receiver login ID (email)', index: true }),
  rpaCode: field({ type: String, label: 'RPA code' }),
  messageCode: field({ type: String, label: 'Message code' }),
  message: field({ type: String, label: 'Message body' }),
  overtime: field({ type: String, label: 'Overtime minutes', optional: true }),
  receivedAt: field({ type: Date, label: 'Received at' }),
  buttons: { type: [rpaButtonSchema], default: [] },
});
```

- [ ] **Step 2: GraphQL 스키마에 RpaButton 타입 + buttons 필드 추가**

`packages/core/src/data/schema/rpa.ts` 전체를 아래로 교체:

```typescript
export const types = `
  type RpaButton {
    label: String
    path: String
  }

  type RpaMessage {
    _id: String
    loginId: String
    rpaCode: String
    messageCode: String
    message: String
    overtime: String
    receivedAt: Date
    buttons: [RpaButton]
  }
`;

export const queries = `
  rpaMessages(loginId: String!, limit: Int): [RpaMessage]
`;

export const subscriptions = `
  rpaMessageReceived(loginId: String!): RpaMessage
`;
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core && npx tsc --noEmit 2>&1 | grep "rpaMessage\|intent\|IRpaButton" | head -20
```

오류 없으면 다음 단계.

- [ ] **Step 4: 커밋**

```bash
cd /Users/shin-yeji/okrservice
git add packages/core/src/db/models/definitions/rpaMessages.ts \
        packages/core/src/data/schema/rpa.ts
git commit -m "feat(intent): RpaMessage 모델 + GraphQL 스키마에 buttons 필드 추가"
```

---

## Task 3: 서버 — RPA 수신 엔드포인트에 getIntentButtons 연결

**Files:**
- Modify: `packages/core/src/index.ts` (lines ~704–758)

현재 코드에서 `createRpaMessage` 호출 시 buttons가 없고, `graphqlPubsub.publish` 시에도 없음. 둘 다 추가한다.

- [ ] **Step 1: index.ts 상단 import에 getIntentButtons 추가**

파일에서 `import` 블록 끝을 찾아 아래를 추가. 파일 상단 import 목록에서 마지막 import 다음에:

```typescript
import { getIntentButtons } from './data/resolvers/queries/intent';
```

`packages/core/src/index.ts` 에서 `from './pubsub'` 줄 바로 다음에 삽입:

```typescript
import { getIntentButtons } from './data/resolvers/queries/intent';
```

- [ ] **Step 2: createRpaMessage 호출에 buttons 추가**

현재 코드 (index.ts ~731번째줄):
```typescript
    const saved = await models.RpaMessages.createRpaMessage({
      loginId,
      rpaCode,
      messageCode,
      message: message.substring(0, 4000),
      overtime,
      receivedAt: new Date(),
    });
```

변경 후:
```typescript
    const buttons = getIntentButtons(rpaCode);

    const saved = await models.RpaMessages.createRpaMessage({
      loginId,
      rpaCode,
      messageCode,
      message: message.substring(0, 4000),
      overtime,
      receivedAt: new Date(),
      buttons,
    });
```

- [ ] **Step 3: graphqlPubsub.publish 호출에 buttons 추가**

현재 코드 (index.ts ~741번째줄):
```typescript
    await graphqlPubsub.publish('rpaMessageReceived', {
      rpaMessageReceived: {
        _id: saved._id,
        loginId,
        rpaCode,
        messageCode,
        message: saved.message,
        overtime,
        receivedAt: saved.receivedAt,
      },
    });
```

변경 후:
```typescript
    await graphqlPubsub.publish('rpaMessageReceived', {
      rpaMessageReceived: {
        _id: saved._id,
        loginId,
        rpaCode,
        messageCode,
        message: saved.message,
        overtime,
        receivedAt: saved.receivedAt,
        buttons,
      },
    });
```

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core && npx tsc --noEmit 2>&1 | grep "index.ts" | head -10
```

오류 없으면 다음 단계.

- [ ] **Step 5: 커밋**

```bash
cd /Users/shin-yeji/okrservice
git add packages/core/src/index.ts
git commit -m "feat(intent): RPA 수신 시 getIntentButtons로 buttons 계산 후 저장 및 push"
```

---

## Task 4: 위젯 — GraphQL queries/subscriptions/context에 buttons 추가

**Files:**
- Modify: `widgets/client/messenger/graphql/queries.ts`
- Modify: `widgets/client/messenger/graphql/subscriptions.ts`
- Modify: `widgets/client/messenger/context/RpaMessage.tsx`

- [ ] **Step 1: queries.ts의 rpaMessages 쿼리에 buttons 추가**

`widgets/client/messenger/graphql/queries.ts` 에서 아래 내용을 찾아:

```typescript
export const rpaMessagesQuery = `
  query RpaMessages($loginId: String!, $limit: Int) {
    rpaMessages(loginId: $loginId, limit: $limit) {
      _id
      loginId
      rpaCode
      messageCode
      message
      overtime
      receivedAt
    }
  }
`;
```

아래로 교체:

```typescript
export const rpaMessagesQuery = `
  query RpaMessages($loginId: String!, $limit: Int) {
    rpaMessages(loginId: $loginId, limit: $limit) {
      _id
      loginId
      rpaCode
      messageCode
      message
      overtime
      receivedAt
      buttons {
        label
        path
      }
    }
  }
`;
```

- [ ] **Step 2: subscriptions.ts의 rpaMessageReceived 구독에 buttons 추가**

`widgets/client/messenger/graphql/subscriptions.ts` 에서:

```typescript
const rpaMessageReceived = `
  subscription rpaMessageReceived($loginId: String!) {
    rpaMessageReceived(loginId: $loginId) {
      _id
      loginId
      rpaCode
      messageCode
      message
      overtime
      receivedAt
    }
  }
`;
```

아래로 교체:

```typescript
const rpaMessageReceived = `
  subscription rpaMessageReceived($loginId: String!) {
    rpaMessageReceived(loginId: $loginId) {
      _id
      loginId
      rpaCode
      messageCode
      message
      overtime
      receivedAt
      buttons {
        label
        path
      }
    }
  }
`;
```

- [ ] **Step 3: RpaMessage.tsx의 RpaMessageItem 타입에 buttons 추가**

`widgets/client/messenger/context/RpaMessage.tsx` 에서:

```typescript
export interface RpaMessageItem {
  _id: string;
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: string;
}
```

아래로 교체:

```typescript
export interface RpaButton {
  label: string;
  path: string;
}

export interface RpaMessageItem {
  _id: string;
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: string;
  buttons: RpaButton[];
}
```

- [ ] **Step 4: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "RpaMessage\|rpaMessage" | head -10
```

오류 없으면 다음 단계.

- [ ] **Step 5: 커밋**

```bash
cd /Users/shin-yeji/okrservice
git add widgets/client/messenger/graphql/queries.ts \
        widgets/client/messenger/graphql/subscriptions.ts \
        widgets/client/messenger/context/RpaMessage.tsx
git commit -m "feat(intent): 위젯 queries/subscriptions/context에 buttons 필드 추가"
```

---

## Task 5: 위젯 — ChatbotView에서 RPA_BUTTON_MAP 제거, msg.buttons 사용

**Files:**
- Modify: `widgets/client/messenger/components/chatbot/ChatbotView.tsx`

현재 `ChatbotView.tsx`는 `RPA_BUTTON_MAP`(하드코딩)으로 `msg.rpaCode`를 참조해 버튼을 그린다. 이를 `msg.buttons`로 교체한다.

- [ ] **Step 1: RPA_BUTTON_MAP 상수 블록 삭제**

파일에서 아래 블록 전체를 제거:

```typescript
// rpaCode 별로 노출할 5240 바로가기 버튼 매핑
const RPA_BUTTON_MAP: Record<string, { label: string; path: string }[]> = {
  HR_RPA_090: [{ label: "출퇴근 체크", path: "/MobileMain.do" }],
  HR_RPA_100: [{ label: "출퇴근 체크", path: "/MobileMain.do" }],
  HR_RPA_110: [{ label: "출퇴근 체크", path: "/MobileMain.do" }],
  HR_RPA_120: [
    { label: "출퇴근 체크",   path: "/MobileMain.do" },
    { label: "연장근무신청",  path: "/MobileOvertimeAppl.do" },
  ],
  HR_RPA_130: [
    { label: "출퇴근 체크",   path: "/MobileMain.do" },
    { label: "연장근무신청",  path: "/MobileOvertimeAppl.do" },
  ],
  HR_RPA_140: [{ label: "출퇴근 체크", path: "/MobileMain.do" }],
  HR_RPA_800: [{ label: "출퇴근 체크", path: "/MobileMain.do" }],
};
```

- [ ] **Step 2: RPA 메시지 렌더링 블록에서 RPA_BUTTON_MAP 참조를 msg.buttons로 교체**

현재 코드 (RPA 실시간 메시지 렌더 부분):

```tsx
                {/* rpaCode 에 따라 관련 5240 화면 바로가기 버튼 */}
                {RPA_BUTTON_MAP[msg.rpaCode] && (
                  <div style={ACTION_BUTTON_ROW_STYLE}>
                    {RPA_BUTTON_MAP[msg.rpaCode].map((btn) => {
```

아래로 교체:

```tsx
                {/* rpaCode 에 매핑된 5240 화면 바로가기 버튼 (서버 intent 서비스가 계산) */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div style={ACTION_BUTTON_ROW_STYLE}>
                    {msg.buttons.map((btn) => {
```

- [ ] **Step 3: 버튼 onClick 핸들러도 확인 (path → url 조합)**

같은 블록 안에서 버튼 클릭 핸들러를 확인한다. 현재:

```tsx
onClick={() => handleMenuClick(btn.label, btn.path)}
```

이 코드가 이미 `handleMenuClick(title, pathOrUrl)` 형태라면 그대로 유지. `handleMenuClick`이 `buildHrUrl(pathOrUrl)`을 내부에서 호출하는지 확인:

```bash
grep -n "handleMenuClick\|buildHrUrl" /Users/shin-yeji/okrservice/widgets/client/messenger/components/chatbot/ChatbotView.tsx | head -10
```

`buildHrUrl`이 이미 내부에서 HR_BASE를 붙인다면 변경 불필요.

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "ChatbotView" | head -10
```

- [ ] **Step 5: 위젯 테스트 전체 실행**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx jest --no-coverage 2>&1 | tail -15
```

Expected: 모든 기존 테스트 통과.

- [ ] **Step 6: 커밋**

```bash
cd /Users/shin-yeji/okrservice
git add widgets/client/messenger/components/chatbot/ChatbotView.tsx
git commit -m "refactor(intent): ChatbotView RPA_BUTTON_MAP 하드코딩 제거 → msg.buttons 사용"
```

---

## Task 6: 전체 테스트 + 최종 확인

- [ ] **Step 1: 서버 intent 테스트**

```bash
cd /Users/shin-yeji/okrservice/packages/core && npx jest --testPathPattern="intent" --no-coverage 2>&1 | tail -10
```

Expected: `9 passed`

- [ ] **Step 2: 위젯 전체 테스트**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx jest --no-coverage 2>&1 | tail -10
```

Expected: 모든 테스트 통과 (기존 28개 + 추가분)

- [ ] **Step 3: 동작 확인 체크리스트**

서버를 실행하고 5240 mock 으로 RPA POST 테스트:

```bash
# 테스트용 RPA POST (새 버튼 포함 여부 확인)
curl -X POST http://localhost:4000/api/rpa/messages \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "rpaCode=HR_RPA_100&loginId=test@example.com&message=출근%20처리&messageCode=TAA_100"
```

위젯에서 확인:
1. `HR_RPA_100` 메시지 수신 시 "출퇴근 체크" 버튼 표시
2. `HR_RPA_120` 메시지 수신 시 "출퇴근 체크" + "연장근무신청" 두 버튼 표시
3. `HR_RPA_110` 메시지 수신 시 버튼 없이 텍스트만 표시
4. 버튼 클릭 → 5240 iframe 정상 열림
