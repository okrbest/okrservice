# Ticket Tab Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 메신저 위젯의 티켓 탭에 미읽음 알림 배지와 알림 섹션을 추가한다.

**Architecture:** `widgetAlarm === false` 티켓을 "미읽음 알림"으로 처리. TicketContext에 `unreadTicketCount`를 추가해 BottomNavBar 배지와 TicketList 알림 섹션이 공유. TicketListContainer가 fetch 후 count를 context에 저장.

**Tech Stack:** React, TypeScript, Apollo Client (GraphQL), framer-motion, CSS-in-JS (inline styles)

---

### Task 1: TicketContext에 unreadTicketCount 추가

**Files:**
- Modify: `widgets/client/messenger/context/Ticket.tsx`

- [x] **Step 1: 현재 파일 확인 후 수정**

```typescript
// widgets/client/messenger/context/Ticket.tsx
import React, { createContext, useContext, useState } from "react";

interface TicketContextProps {
  ticketData: any;
  setTicketData: (data: any) => void;
  unreadTicketCount: number;
  setUnreadTicketCount: (count: number) => void;
}

const TicketContext = createContext<TicketContextProps | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ticketData, setTicketData] = useState<any>(null);
  const [unreadTicketCount, setUnreadTicketCount] = useState<number>(0);
  return (
    <TicketContext.Provider value={{ ticketData, setTicketData, unreadTicketCount, setUnreadTicketCount }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicket = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTicket must be used within a TicketProvider");
  }
  return context;
};
```

- [x] **Step 2: 빌드 에러 없는지 확인**

```bash
cd /Users/shin-yeji/okrservice/widgets && npx tsc --noEmit 2>&1 | grep -E "Ticket|error" | head -20
```

- [x] **Step 3: 커밋**

```bash
git add widgets/client/messenger/context/Ticket.tsx
git commit -m "feat(widget): TicketContext에 unreadTicketCount 추가"
```

---

### Task 2: TicketListContainer에서 unreadTicketCount 계산 및 저장

**Files:**
- Modify: `widgets/client/messenger/containers/ticket/TicketListContainer.tsx`

- [x] **Step 1: useTicket import 확인 및 count 계산 로직 추가**

`TicketListContainer.tsx`에서 tickets fetch 후 `widgetAlarm === false`인 티켓 수를 계산해 context에 저장:

```typescript
import { useTicket } from "../../context/Ticket";

// TicketListContainer 함수 안에 추가:
const { setTicketData, setUnreadTicketCount } = useTicket();

// useEffect로 tickets 변경 시 count 업데이트
React.useEffect(() => {
  const tickets = data?.widgetsTicketList || [];
  const count = tickets.filter((t: TicketItem) => t.widgetAlarm === false).length;
  setUnreadTicketCount(count);
}, [data]);
```

- `handleTicketClick`에서 `updateWidgetAlarm` 성공 후 count 즉시 감소:

```typescript
const handleTicketClick = async (ticket: TicketItem) => {
  setTicketData(ticket);
  if (ticket.widgetAlarm === false) {
    try {
      await updateWidgetAlarm({ variables: { ticketId: ticket._id } });
      setUnreadTicketCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // 실패 시 무시, 다음 fetch에서 보정됨
    }
  }
  setRoute("ticket-progress");
};
```

- [x] **Step 2: 기존 console.log 제거**

`TicketListContainer.tsx`에서 `console.log` 라인 전부 제거.

- [x] **Step 3: 커밋**

```bash
git add widgets/client/messenger/containers/ticket/TicketListContainer.tsx
git commit -m "feat(widget): 티켓 목록 fetch 후 미읽음 count를 context에 저장"
```

---

### Task 3: BottomNavBar Item에 badge 지원 추가

**Files:**
- Modify: `widgets/client/messenger/components/BottomNavBar/Item.tsx`

- [x] **Step 1: badge prop 추가**

```typescript
// widgets/client/messenger/components/BottomNavBar/Item.tsx
import * as React from "react";
import { m } from "framer-motion";
import { IconProps } from "./Icons";
import useHover from "../../hooks/useHover";
import { __ } from "../../../utils";

type Props = {
  label?: string;
  icon: (props: IconProps) => React.ReactNode;
  isActive: boolean;
  handleClick: (route: string) => (event: React.MouseEvent) => void;
  route: string;
  badge?: number;
};

const Item: React.FC<Props> = ({ label, icon, isActive, handleClick, route, badge }) => {
  const [hoverRef, isHovered] = useHover();

  return (
    <m.li
      ref={hoverRef}
      className={`nav-item ${isActive ? "active" : ""}`}
      onClick={handleClick(route)}
    >
      <m.div className="nav-content" style={{ position: "relative" }}>
        {icon({ filled: isActive || isHovered })}
        {badge && badge > 0 ? (
          <span style={{
            position: "absolute",
            top: "-4px",
            right: "-6px",
            backgroundColor: "#ff4d4f",
            color: "#fff",
            fontSize: "10px",
            fontWeight: "700",
            borderRadius: "10px",
            minWidth: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            lineHeight: 1,
          }}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
        {label && <span className="nav-label">{__(label)}</span>}
      </m.div>
    </m.li>
  );
};

export default Item;
```

- [x] **Step 2: 커밋**

```bash
git add widgets/client/messenger/components/BottomNavBar/Item.tsx
git commit -m "feat(widget): BottomNavBar Item에 미읽음 배지 prop 추가"
```

---

### Task 4: BottomNavBar에서 티켓 탭 배지 연결

**Files:**
- Modify: `widgets/client/messenger/components/BottomNavBar/index.tsx`

- [x] **Step 1: useTicket import 및 badge 전달**

```typescript
// widgets/client/messenger/components/BottomNavBar/index.tsx
import * as React from "react";
import { IconChat, IconHome, IconPhone, IconQuestionMark, IconTicket, IconDeal } from "./Icons";
import { getCallData, getTicketData, getDealData, getMessengerData } from "../../utils/util";
import Item from "./Item";
import { useRouter } from "../../context/Router";
import { useTicket } from "../../context/Ticket";

const items = [
  { label: "Home", icon: IconHome, route: "home" },
  { label: "Conversations", icon: IconChat, route: "allConversations" },
  { label: "Call", icon: IconPhone, route: "call" },
  { label: "Ticket", icon: IconTicket, route: "ticket" },
  { label: "Deal", icon: IconDeal, route: "deal" },
  { label: "Help", icon: IconQuestionMark, route: "faqCategories", additionalRoutes: ["faqCategory", "faqArticle"] },
];

function BottomNavBar() {
  const { setActiveRoute, activeRoute } = useRouter();
  const { unreadTicketCount } = useTicket();
  const callData = getCallData();
  const ticketData = getTicketData();
  const dealData = getDealData();
  const messengerData = getMessengerData();

  const handleItemClick = (route: string) => (e: React.MouseEvent) => {
    setActiveRoute(route);
  };

  const isItemActive = (item: { route: string; additionalRoutes?: string[] }) => {
    const { route, additionalRoutes } = item;
    if (additionalRoutes) {
      return additionalRoutes.includes(activeRoute) || activeRoute === route;
    }
    return activeRoute === route;
  };

  const showDeal = dealData?.dealToggle === true && !!dealData?.dealStageId;

  return (
    <ul className="nav-container nav-list">
      {items.map((item) => {
        const { route } = item;

        if (route === "call" && callData && !callData.isReceiveWebCall) return null;
        if (route === "ticket" && ticketData && !ticketData.ticketStageId) return null;
        if (route === "deal" && !showDeal) return null;
        if (route === "allConversations" && messengerData.showChat === false) return null;
        if (showDeal) {
          const hideWhenDealOn = ["home", "allConversations", "ticket", "faqCategories"];
          if (hideWhenDealOn.includes(route)) return null;
        }

        const badge = route === "ticket" ? unreadTicketCount : undefined;

        return (
          <Item
            key={route}
            isActive={isItemActive(item)}
            handleClick={handleItemClick}
            badge={badge}
            {...item}
          />
        );
      })}
    </ul>
  );
}

export default BottomNavBar;
```

- [x] **Step 2: 커밋**

```bash
git add widgets/client/messenger/components/BottomNavBar/index.tsx
git commit -m "feat(widget): 티켓 탭에 미읽음 배지 표시"
```

---

### Task 5: TicketList 상단에 알림 섹션 추가

**Files:**
- Modify: `widgets/client/messenger/components/ticket/TicketList.tsx`

- [x] **Step 1: 알림 섹션 렌더 함수 추가**

`renderContent()` 함수 안, 티켓 목록 렌더 전에 `widgetAlarm === false` 티켓만 모아 알림 섹션으로 보여준다. (회사 티켓 보기 모드에서는 알림 섹션 미표시)

`renderContent()`의 `return` 블록(line ~412) 안에 `renderNotificationsSection()` 삽입:

```typescript
const renderNotificationsSection = (unreadTickets: TicketItem[]) => {
  if (includeCompanyTickets || unreadTickets.length === 0) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "8px",
        padding: "0 4px",
      }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
          🔔 {__("새 답변")} ({unreadTickets.length})
        </span>
      </div>
      <div style={{
        backgroundColor: "#fff8f0",
        borderRadius: "8px",
        border: "1px solid #ffe0b2",
        overflow: "hidden",
      }}>
        {unreadTickets.map((ticket) => (
          <div
            key={ticket._id}
            onClick={() => onTicketClick(ticket)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              cursor: "pointer",
              borderBottom: "1px solid #ffe0b2",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fff3e0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#e65100", marginRight: "6px" }}>
                #{ticket.number}
              </span>
              <span style={{
                fontSize: "13px",
                color: "#333",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {ticket.name}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "#ff6b35", fontWeight: "600", whiteSpace: "nowrap", marginLeft: "8px" }}>
              {__("새 답변")} →
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

그리고 `renderContent()` 안 정상 목록 렌더 직전에:

```typescript
const unreadTickets = filteredTickets.filter((t) => t.widgetAlarm === false);

return (
  <div className="ticket-list-container">
    {/* 헤더 ... */}
    {/* 검색 ... */}
    {renderNotificationsSection(unreadTickets)}
    <div className="ticket-list-content">
      {filteredTickets.map(renderTicketItem)}
    </div>
  </div>
);
```

- [x] **Step 2: 기존 `console.log` 제거 (renderTicketItem 내부)**

`renderTicketItem` 안의 `console.log('🔔 Rendering ticket:...')` 라인 제거.

- [x] **Step 3: 커밋**

```bash
git add widgets/client/messenger/components/ticket/TicketList.tsx
git commit -m "feat(widget): 티켓 목록 상단에 미읽음 알림 섹션 추가"
```
