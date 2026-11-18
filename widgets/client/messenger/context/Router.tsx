import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { getLocalStorageItem } from '../../common';
import { connection } from '../connection';
import { IFaqArticle, IFaqCategory } from '../types';
import { useConfig } from './Config';
import {
  getCallData,
  getDealData,
  getShowChatbot,
  getShowTicket,
  getTicketData,
} from '../utils/util';
import { TabFlags, resolveRoute, startRoute } from '../utils/tabs';

const RouterContext = createContext<any>(null);

// 아래 탭이 보이는 조건(BottomNavBar와 같음). hasTickets는 티켓 탭을 켜지 않은 사이트에서 고객 티켓이 있을 때만 쓴다
export const getTabFlags = (hasTickets = false): TabFlags => {
  if (!connection.data) {
    return {
      showChatbot: false,
      showCall: false,
      showTicket: false,
      showDeal: false,
    };
  }

  const dealData = getDealData();

  return {
    showChatbot: getShowChatbot(),
    showCall: !!getCallData().isReceiveWebCall,
    showTicket:
      !!getTicketData().ticketStageId && (getShowTicket() || hasTickets),
    showDeal: dealData?.dealToggle === true && !!dealData?.dealStageId,
  };
};

export const RouterProvider = ({ children }: { children: React.ReactNode }) => {
  // 첫 화면: 남은 탭 중 첫 번째(홈 탭 없음). 연결 정보가 아직 없으면 아래 effect에서 정한다
  const [activeRoute, setRawActiveRoute] = useState(() =>
    connection.data ? startRoute(getTabFlags()) : 'home',
  );
  // "홈으로" 가던 곳(뒤로 가기 기본값·통화 종료 등)은 홈 탭이 없으면 첫 화면으로
  const setActiveRoute = (route: string) =>
    setRawActiveRoute(resolveRoute(route, getTabFlags()));
  const [isSmallContainer, setIsSmallContainer] = useState(false);
  const [activeFaqArticle, setActiveFaqArticle] = useState<IFaqArticle | null>(
    null,
  );
  const [activeFaqCategory, setActiveFaqCategory] =
    useState<IFaqCategory | null>(null);
  const [currentWebsiteApp, setCurrentWebsiteApp] = useState('');
  // Deal mode: always expanded, no zoom button
  const isDealMode =
    getDealData()?.dealToggle === true && !!getDealData()?.dealStageId;
  const [isZoomed, setIsZoomed] = useState(isDealMode);
  const [initialRouteSet, setInitialRouteSet] = useState(false);
  const [chatbotMenu, setChatbotMenu] = useState<{
    title: string;
    url: string;
    /** iframe 강제 재마운트용 — 같은 주소 재오픈·MobileMain 잔상 방지 */
    openedAt?: number;
  } | null>(null);
  /** HR 바로가기 중 세션 끊김 — 챗봇 화면에 만료 안내 (iframe/모바일 화면 유지하지 않음) */
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  const { setIsInputDisabled, setSelectedSkill, isLoggedIn } = useConfig();

  // Extract integrationId to avoid object reference in dependency array
  const integrationId = connection.data?.integrationId;

  // Set initial route based on deal configuration when connection.data is available
  // Deal mode: show the form (문의&데모신청) directly instead of the button screen
  useEffect(() => {
    if (!initialRouteSet && connection.data && integrationId) {
      // 딜 모드는 문의 작성, 그 밖에는 아직 다른 화면이 정해지지 않았을 때 남은 탭 중 첫 번째
      const flags = getTabFlags();

      setRawActiveRoute((current) =>
        flags.showDeal || current === 'home' ? startRoute(flags) : current,
      );
      setInitialRouteSet(true);
    }
  }, [integrationId, initialRouteSet]);

  useEffect(() => {
    const { messengerData } = connection.data;
    const { requireAuth, showChat } = messengerData;

    handleAuthentication(requireAuth);
    handleChatVisibility(requireAuth, showChat);
  }, []);

  useEffect(() => {
    if (activeRoute === 'accquireInformation') {
      setIsSmallContainer(true);
    } else {
      setIsSmallContainer(false);
    }
  }, [activeRoute]);

  const handleAuthentication = (requireAuth: boolean) => {
    if (!isLoggedIn() && requireAuth) {
      // setActiveRoute('acquireInformation');
      setActiveRoute(startRoute(getTabFlags()));
    }
  };

  const handleChatVisibility = (requireAuth: boolean, showChat: boolean) => {
    if ((!requireAuth && !getLocalStorageItem('hasNotified')) || !showChat) {
      setActiveRoute(startRoute(getTabFlags()));
    }
  };

  const setRoute = (routePath: string) => {
    if (routePath) {
      if (shouldAcquireInformation(routePath)) {
        setActiveRoute('acquireInformation');
        setSelectedSkill('');
        return;
      }

      // iframe 밖으로 나가면 메뉴 상태 제거(하단 탭이 setActiveRoute만 쓰던 때 잔상 방지)
      if (routePath !== 'chatbot-iframe') {
        setChatbotMenu(null);
      }

      handleRouteChange(routePath);
    }
  };

  const shouldAcquireInformation = (routePath: string) => {
    return (
      activeRoute === 'conversationDetail' &&
      !isLoggedIn() &&
      connection.data.messengerData.requireAuth
    );
  };

  const handleRouteChange = (routePath: string) => {
    const { skillData = {} } = connection.data.messengerData;
    const { options = [] } = skillData;

    setActiveRoute(routePath);
    setSelectedSkill('');
    setIsInputDisabled(options.length > 0);
  };

  const goToFaqArticle = (article: IFaqArticle) => {
    setRoute('faqArticle');
    setActiveFaqArticle(article);
  };

  const goToFaqCategory = (category?: IFaqCategory) => {
    if (category) {
      setActiveFaqCategory(category);
    }
    setRoute(activeFaqCategory || category ? 'faqCategory' : 'home');
  };

  const goToHome = () => {
    setActiveRoute('home');
  };

  const goToWebsiteApp = (id: string) => {
    setCurrentWebsiteApp(id);
    setRoute('websiteApp');
  };

  return (
    <RouterContext.Provider
      value={{
        activeRoute,
        activeFaqArticle,
        activeFaqCategory,
        setActiveRoute,
        setRoute,
        isSmallContainer,
        currentWebsiteApp,
        goToFaqArticle,
        goToHome,
        goToFaqCategory,
        goToWebsiteApp,
        isZoomed,
        setIsZoomed,
        chatbotMenu,
        setChatbotMenu,
        sessionExpiredNotice,
        setSessionExpiredNotice,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
