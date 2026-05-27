# Chatbot Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 메신저 위젯의 대화(Conversations) 탭을 정적 챗봇 탭으로 교체한다. 탭 클릭 시 봇 인사 메시지와 5240 시스템 10개 기능 버튼이 보이고, 버튼 클릭 시 위젯 내 iframe으로 해당 화면을 연다.

**Architecture:** 백엔드 연동 없는 순수 프론트엔드 정적 봇. `ChatbotView`가 대화 UI(인사 메시지 + 메뉴 버튼)를 렌더하고, 버튼 클릭 시 Router를 통해 `chatbot-iframe` 라우트로 전환, `ChatbotIframeView`가 해당 URL을 iframe으로 표시한다. `allConversations` 탭을 `chatbot` 탭으로 교체하고 기존 대화 기능은 건드리지 않는다.

**Tech Stack:** React, TypeScript, CSS-in-JS (inline styles), 기존 Container/Router/BottomNavBar 패턴

---

## File Structure

| 파일 | 역할 |
|---|---|
| Create: `widgets/client/messenger/components/chatbot/chatbotMenus.ts` | 5240 메뉴 10개 상수 정의 |
| Create: `widgets/client/messenger/components/chatbot/ChatbotView.tsx` | 봇 대화 UI (인사 + 메뉴 버튼) |
| Create: `widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx` | 5240 URL iframe 뷰 |
| Modify: `widgets/client/messenger/context/Router.tsx` | `chatbotMenu` state 추가 |
| Modify: `widgets/client/messenger/components/Messenger.tsx` | chatbot / chatbot-iframe 라우트 추가 |
| Modify: `widgets/client/messenger/components/BottomNavBar/index.tsx` | allConversations → chatbot 탭 교체 |

---

### Task 1: 5240 메뉴 상수 파일 생성

**Files:**
- Create: `widgets/client/messenger/components/chatbot/chatbotMenus.ts`

- [x] **Step 1: 파일 생성**

```typescript
// widgets/client/messenger/components/chatbot/chatbotMenus.ts

export interface ChatbotMenu {
  id: string;
  label: string;
  url: string;
}

export const CHATBOT_MENUS: ChatbotMenu[] = [
  { id: "main",        label: "출퇴근 체크",   url: "https://api.5240.cloud/MobileMain.do" },
  { id: "leave",       label: "휴가신청",       url: "https://api.5240.cloud/MobileLeaveAppl.do" },
  { id: "overtime",    label: "연장근무신청",   url: "https://api.5240.cloud/MobileOvertimeAppl.do" },
  { id: "business",    label: "출장신청",       url: "https://api.5240.cloud/MobileBusinessAppl.do" },
  { id: "halfleave",   label: "조퇴/외출신청", url: "https://api.5240.cloud/MobileHalfLeaveAppl.do" },
  { id: "worktimechg", label: "출퇴근변경",     url: "https://api.5240.cloud/MobileWorkTimeChgAppl.do" },
  { id: "conleave",    label: "경조휴가신청",   url: "https://api.5240.cloud/MobileConLeaveAppl.do" },
  { id: "approval",    label: "결재함",         url: "https://api.5240.cloud/MobileApprovalBox.do" },
  { id: "schedule",    label: "근무일정조회",   url: "https://api.5240.cloud/MobileDclzWorkSearchCldr.do" },
  { id: "ctsmn",       label: "경조금신청",     url: "https://api.5240.cloud/MobileCtsmnAppl.do" },
];
```

- [x] **Step 2: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/components/chatbot/chatbotMenus.ts && git commit -m "feat(chatbot): 5240 메뉴 상수 정의"
```

---

### Task 2: ChatbotIframeView 컴포넌트 생성

**Files:**
- Create: `widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx`

기존 `WebsiteAppDetail.tsx`와 동일한 iframe 패턴 사용. `Container` 컴포넌트로 뒤로가기 버튼 포함.

- [x] **Step 1: 파일 생성**

```typescript
// widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx
import * as React from "react";
import Container from "../common/Container";

type Props = {
  title: string;
  url: string;
};

const ChatbotIframeView: React.FC<Props> = ({ title, url }) => {
  return (
    <Container title={title} withBottomNavBar={true}>
      <div className="erxes-content">
        <iframe
          title={title}
          src={url}
          className="websiteApp"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </Container>
  );
};

export default ChatbotIframeView;
```

- [x] **Step 2: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "chatbot" | head -10
```

Expected: 출력 없음 (에러 없음)

- [x] **Step 3: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/components/chatbot/ChatbotIframeView.tsx && git commit -m "feat(chatbot): iframe 뷰 컴포넌트 생성"
```

---

### Task 3: Router에 chatbotMenu state 추가

**Files:**
- Modify: `widgets/client/messenger/context/Router.tsx`

`chatbotMenu`는 현재 선택된 메뉴 `{ title, url }` 또는 `null`. `chatbot-iframe` 라우트 진입 전에 세팅, 뒤로가기 시 `chatbot`으로 복귀.

- [x] **Step 1: Router.tsx 읽기 후 수정**

현재 파일 상단 import 뒤에 타입 추가 및 state 추가:

```typescript
// Router.tsx — import 목록 다음에 추가할 타입
interface ChatbotMenuState {
  title: string;
  url: string;
}
```

`RouterProvider` 함수 안 state 목록에 추가:
```typescript
const [chatbotMenu, setChatbotMenu] = useState<ChatbotMenuState | null>(null);
```

`RouterContext.Provider` value에 추가:
```typescript
chatbotMenu,
setChatbotMenu,
```

- [x] **Step 2: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "Router" | head -10
```

Expected: 출력 없음

- [x] **Step 3: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/context/Router.tsx && git commit -m "feat(chatbot): Router에 chatbotMenu state 추가"
```

---

### Task 4: ChatbotView 컴포넌트 생성

**Files:**
- Create: `widgets/client/messenger/components/chatbot/ChatbotView.tsx`

봇 아바타 + 인사 말풍선 + 10개 메뉴 버튼 그리드. 버튼 클릭 시 `setChatbotMenu` 후 `setRoute("chatbot-iframe")`.

- [x] **Step 1: 파일 생성**

```typescript
// widgets/client/messenger/components/chatbot/ChatbotView.tsx
import * as React from "react";
import Container from "../common/Container";
import { defaultAvatar, readFile } from "../../../utils";
import { CHATBOT_MENUS } from "./chatbotMenus";
import { useRouter } from "../../context/Router";
import { getUiOptions } from "../../utils/util";
import { __ } from "../../../utils";

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const { color = "#6f80ff" } = getUiOptions() || {};

  const handleMenuClick = (title: string, url: string) => {
    setChatbotMenu({ title, url });
    setRoute("chatbot-iframe");
  };

  return (
    <Container withBottomNavBar={true} title={__("챗봇")} showBackButton={false}>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* 봇 인사 말풍선 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <img
            src={readFile(defaultAvatar)}
            alt="bot"
            style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0 }}
          />
          <div style={{
            backgroundColor: "#f0f0f0",
            borderRadius: "0 12px 12px 12px",
            padding: "10px 14px",
            fontSize: "14px",
            color: "#333",
            maxWidth: "80%",
            lineHeight: 1.5,
          }}>
            {__("안녕하세요! 무엇을 도와드릴까요?")}
            <br />
            {__("아래 메뉴를 선택해 주세요.")}
          </div>
        </div>

        {/* 메뉴 버튼 그리드 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}>
          {CHATBOT_MENUS.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleMenuClick(menu.label, menu.url)}
              style={{
                padding: "12px 8px",
                backgroundColor: "#fff",
                border: `1.5px solid ${color}`,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: color,
                cursor: "pointer",
                textAlign: "center",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f5f5ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
            >
              {__(menu.label)}
            </button>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default ChatbotView;
```

- [x] **Step 2: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "chatbot\|ChatbotView" | head -10
```

Expected: 출력 없음

- [x] **Step 3: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/components/chatbot/ChatbotView.tsx && git commit -m "feat(chatbot): 봇 인사 + 메뉴 버튼 뷰 생성"
```

---

### Task 5: Messenger.tsx에 chatbot 라우트 추가

**Files:**
- Modify: `widgets/client/messenger/components/Messenger.tsx`

- [x] **Step 1: import 추가 및 라우트 추가**

파일 상단 import에 추가:
```typescript
import ChatbotView from "./chatbot/ChatbotView";
import ChatbotIframeView from "./chatbot/ChatbotIframeView";
```

`renderSwitch()` 안 `case "allConversations":` 위에 추가:
```typescript
case "chatbot":
  return <ChatbotView />;
case "chatbot-iframe": {
  const { chatbotMenu } = useRouter(); // 이미 함수 밖에서 호출 필요
  return chatbotMenu
    ? <ChatbotIframeView title={chatbotMenu.title} url={chatbotMenu.url} />
    : <ChatbotView />;
}
```

**주의:** `useRouter()`는 훅이므로 switch 안에서 호출 불가. 기존 `Messenger.tsx` 구조를 보면 `renderSwitch`가 컴포넌트 함수 안에 있어 훅을 컴포넌트 최상위에서 호출해야 함.

실제 구현:
```typescript
// Messenger 함수 상단 (기존 const messengerData = getMessengerData(); 바로 뒤)에 추가:
const { chatbotMenu } = useRouter();
```

그리고 `renderSwitch` 안:
```typescript
case "chatbot":
  return <ChatbotView />;
case "chatbot-iframe":
  return chatbotMenu
    ? <ChatbotIframeView title={chatbotMenu.title} url={chatbotMenu.url} />
    : <ChatbotView />;
```

- [x] **Step 2: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "Messenger\|chatbot" | head -10
```

Expected: 출력 없음

- [x] **Step 3: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/components/Messenger.tsx && git commit -m "feat(chatbot): Messenger에 chatbot / chatbot-iframe 라우트 추가"
```

---

### Task 6: BottomNavBar에서 대화 탭을 챗봇 탭으로 교체

**Files:**
- Modify: `widgets/client/messenger/components/BottomNavBar/index.tsx`
- Modify: `widgets/client/messenger/components/BottomNavBar/Icons.tsx` (챗봇 아이콘 추가)

- [x] **Step 1: Icons.tsx에 챗봇 아이콘 추가**

기존 `Icons.tsx` 파일을 읽어 아이콘 패턴 파악 후, `IconChatbot` 추가:

```typescript
export const IconChatbot = ({ filled }: IconProps) => (
  <svg className="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="13" rx="2" />
    <path d="M8 21l4-4 4 4" />
    <line x1="8" y1="9" x2="9" y2="9" />
    <line x1="12" y1="9" x2="13" y2="9" />
    <line x1="16" y1="9" x2="17" y2="9" />
  </svg>
);
```

- [x] **Step 2: index.tsx에서 Conversations → Chatbot 교체**

```typescript
// 기존
{ label: "Conversations", icon: IconChat, route: "allConversations" },

// 교체
{ label: "Chatbot", icon: IconChatbot, route: "chatbot" },
```

import에서 `IconChat` 대신 `IconChatbot` 추가 (IconChat은 다른 곳에서 안 쓰면 제거, 쓰면 유지).

`showChat === false` 조건을 챗봇에도 적용할지 확인:
- `showChat`은 기존 채팅 기능 on/off이므로 챗봇 탭은 별도로 항상 표시. 기존 조건 제거.

```typescript
// 제거할 조건:
if (route === "allConversations" && messengerData.showChat === false) {
  return null;
}
```

- [x] **Step 3: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "BottomNavBar\|Icons" | head -10
```

Expected: 출력 없음

- [x] **Step 4: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/components/BottomNavBar/Icons.tsx widgets/client/messenger/components/BottomNavBar/index.tsx && git commit -m "feat(chatbot): 대화 탭을 챗봇 탭으로 교체"
```

---

### Task 7: 챗봇에서 뒤로가기 시 chatbotMenu 초기화

**Files:**
- Modify: `widgets/client/messenger/context/Router.tsx`

`chatbot-iframe`에서 뒤로가기 버튼 클릭 시 `setRoute("chatbot")`이 호출되는데, 이때 `chatbotMenu`를 초기화해야 다음 진입 시 정상 동작.

`setRoute` 함수 안에서 `chatbot` 라우트로 변경 시 `chatbotMenu`를 `null`로 초기화:

```typescript
const setRoute = (routePath: string) => {
  if (routePath) {
    if (shouldAcquireInformation(routePath)) {
      setActiveRoute("acquireInformation");
      setSelectedSkill("");
      return;
    }
    // chatbot 라우트로 돌아올 때 iframe 메뉴 초기화
    if (routePath === "chatbot") {
      setChatbotMenu(null);
    }
    handleRouteChange(routePath);
  }
};
```

- [x] **Step 1: 수정 적용**

위 로직을 Router.tsx의 `setRoute` 함수에 추가.

- [x] **Step 2: TypeScript 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep "Router" | head -10
```

Expected: 출력 없음

- [x] **Step 3: 커밋**

```bash
cd /Users/shin-yeji/okrservice && git add widgets/client/messenger/context/Router.tsx && git commit -m "feat(chatbot): chatbot 라우트 복귀 시 iframe 메뉴 초기화"
```

---

### 동작 확인 체크리스트

- [x] 위젯 하단 탭에 "Chatbot" 탭이 보인다
- [x] Chatbot 탭 클릭 시 봇 인사 말풍선과 10개 메뉴 버튼이 보인다
- [x] 메뉴 버튼 클릭 시 해당 5240 URL이 iframe으로 열린다
- [x] iframe 뷰에서 뒤로가기(Container 백버튼) 클릭 시 챗봇 메뉴로 돌아온다
- [x] 기존 Ticket, Home, Help 탭은 정상 동작한다
