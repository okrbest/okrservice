import * as React from "react";

import {
  IconChatbot,
  IconHome,
  IconPhone,
  IconQuestionMark,
  IconTicket,
  IconDeal,
} from "./Icons";
import { getCallData, getTicketData, getDealData, getMessengerData, getShowTicket } from "../../utils/util";

import Item from "./Item";
import { useRouter } from "../../context/Router";
import { useTicket } from "../../context/Ticket";

const items = [
  {
    label: "Home",
    icon: IconHome,
    route: "home",
  },
  {
    label: (
      <>
        Chatbot
        <br />
        (준비중)
      </>
    ),
    icon: IconChatbot,
    route: "chatbot",
    additionalRoutes: ["chatbot-iframe"],
  },
  { label: "Call", icon: IconPhone, route: "call" },
  { label: "Ticket", icon: IconTicket, route: "ticket" },
  { label: "Deal", icon: IconDeal, route: "deal" },
  {
    label: "Help",
    icon: IconQuestionMark,
    route: "faqCategories",
    additionalRoutes: ["faqCategory", "faqArticle"],
  },
];

function BottomNavBar() {
  const { setActiveRoute, activeRoute } = useRouter();
  const { unreadTicketCount, hasTickets } = useTicket();
  const showTicket = getShowTicket();
  const callData = getCallData();
  const ticketData = getTicketData();
  const dealData = getDealData();
  const messengerData = getMessengerData();

  const handleItemClick = (route: string) => (e: React.MouseEvent) => {
    setActiveRoute(route);
  };

  const isItemActive = (item: {
    route: string;
    additionalRoutes?: string[];
  }) => {
    const { route, additionalRoutes } = item;
    if (additionalRoutes) {
      return additionalRoutes.includes(activeRoute) || activeRoute === route;
    }
    return activeRoute === route;
  };

  const showDeal =
    dealData?.dealToggle === true && !!dealData?.dealStageId;

  return (
    <ul className="nav-container nav-list">
      {items.map((item) => {
        const { route } = item;

        if (route === "call" && callData && !callData.isReceiveWebCall) {
          return null;
        }

        if (route === "ticket" && ticketData && !ticketData.ticketStageId) {
          return null;
        }

        if (route === "ticket" && !showTicket && !hasTickets) {
          return null;
        }

        // Deal: hide unless dealToggle is true AND dealStageId is set
        if (route === "chatbot") {
          return null;
        }

        if (route === "deal") {
          if (!showDeal) {
            return null;
          }
        }

        // When Deal is on: hide Home, Conversations, Ticket, Help
        if (showDeal) {
          const hideWhenDealOn = ["home", "chatbot", "ticket", "faqCategories"];
          if (hideWhenDealOn.includes(route)) {
            return null;
          }
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
// 2026-06-12 20:30:00
export default BottomNavBar;
