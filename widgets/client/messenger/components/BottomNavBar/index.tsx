import * as React from "react";

import {
  IconChat,
  IconHome,
  IconPhone,
  IconQuestionMark,
  IconTicket,
  IconDeal,
} from "./Icons";
import { getCallData, getTicketData, getDealData, getMessengerData } from "../../utils/util";

import Item from "./Item";
import { useRouter } from "../../context/Router";

const items = [
  {
    label: "Home",
    icon: IconHome,
    route: "home",
  },
  { label: "Conversations", icon: IconChat, route: "allConversations" },
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

        // Deal: hide unless dealToggle is true AND dealStageId is set
        if (route === "deal") {
          if (!showDeal) {
            return null;
          }
        }

        if (route === "allConversations" && messengerData.showChat === false) {
          return null;
        }

        // When Deal is on: hide Home, Conversations, Ticket, Help
        if (showDeal) {
          const hideWhenDealOn = ["home", "allConversations", "ticket", "faqCategories"];
          if (hideWhenDealOn.includes(route)) {
            return null;
          }
        }

        return (
          <Item
            key={route}
            isActive={isItemActive(item)}
            handleClick={handleItemClick}
            {...item}
          />
        );
      })}
    </ul>
  );
}

export default BottomNavBar;
