import * as React from "react";

import {
  IconChat,
  IconHome,
  IconPhone,
  IconQuestionMark,
  IconTicket,
} from "./Icons";
import { getCallData, getTicketData, getMessengerData } from "../../utils/util";

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

        if (route === "allConversations" && messengerData.showChat === false) {
          return null;
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
