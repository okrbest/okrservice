import * as React from 'react';
import { Bot, Handshake, Home, Phone, Ticket } from 'lucide-react';

import {
  IconChatbot,
  IconHome,
  IconPhone,
  IconTicket,
  IconDeal,
} from './Icons';
import {
  getCallData,
  getTicketData,
  getDealData,
  getMessengerData,
  getShowTicket,
  getShowChatbot,
} from '../../utils/util';

import Item from './Item';
import { getTabFlags, useRouter } from '../../context/Router';
import { visibleTabs } from '../../utils/tabs';
import { useTicket } from '../../context/Ticket';

const items = [
  {
    label: 'Home',
    icon: IconHome,
    outlineIcon: Home,
    route: 'home',
  },
  {
    label: 'Chatbot',
    icon: IconChatbot,
    outlineIcon: Bot,
    route: 'chatbot',
    additionalRoutes: ['chatbot-iframe'],
  },
  { label: 'Call', icon: IconPhone, outlineIcon: Phone, route: 'call' },
  { label: 'Ticket', icon: IconTicket, outlineIcon: Ticket, route: 'ticket' },
  { label: 'Deal', icon: IconDeal, outlineIcon: Handshake, route: 'deal' },
];

function BottomNavBar() {
  const { setActiveRoute, activeRoute } = useRouter();
  const { unreadTicketCount, hasTickets } = useTicket();
  const showTicket = getShowTicket();
  const showChatbot = getShowChatbot();
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

  const showDeal = dealData?.dealToggle === true && !!dealData?.dealStageId;
  // 홈 탭은 켜진 탭이 하나도 없을 때만(빈 탭 줄 방지). 도움말 탭은 두지 않는다
  const showHome = visibleTabs(getTabFlags(hasTickets)).includes('home');

  return (
    <ul className="nav-container nav-list">
      {items.map((item) => {
        const { route } = item;

        if (route === 'home' && !showHome) {
          return null;
        }

        if (route === 'call' && callData && !callData.isReceiveWebCall) {
          return null;
        }

        if (route === 'ticket' && ticketData && !ticketData.ticketStageId) {
          return null;
        }

        if (route === 'ticket' && !showTicket && !hasTickets) {
          return null;
        }

        if (route === 'chatbot' && !showChatbot) {
          return null;
        }

        // Deal: hide unless dealToggle is true AND dealStageId is set
        if (route === 'deal') {
          if (!showDeal) {
            return null;
          }
        }

        // When Deal is on: hide Home, Conversations, Ticket, Help
        if (showDeal) {
          const hideWhenDealOn = ['home', 'chatbot', 'ticket', 'faqCategories'];
          if (hideWhenDealOn.includes(route)) {
            return null;
          }
        }

        const badge = route === 'ticket' ? unreadTicketCount : undefined;

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
