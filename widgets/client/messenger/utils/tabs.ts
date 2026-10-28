// 위젯 아래 탭과 첫 화면 규칙. 홈·도움말 탭은 두지 않는다(켜진 탭이 하나도 없을 때만 홈을 남김).
// 탭이 보이는 조건은 BottomNavBar와 같다(읽는 곳은 Router의 getTabFlags).

export type TabFlags = {
  showChatbot: boolean;
  showCall: boolean;
  showTicket: boolean;
  // 딜(문의) 모드: 통화·딜만 보이고 첫 화면은 문의 작성
  showDeal: boolean;
};

// 아래 탭 순서(BottomNavBar items와 같음)
const TAB_ORDER = ['chatbot', 'call', 'ticket', 'deal'] as const;

const isTabOn = (route: (typeof TAB_ORDER)[number], flags: TabFlags) => {
  if (route === 'deal') return flags.showDeal;
  if (route === 'call') return flags.showCall;
  // 딜 모드에서는 챗봇·티켓을 숨긴다(기존 규칙)
  if (flags.showDeal) return false;

  return route === 'chatbot' ? flags.showChatbot : flags.showTicket;
};

export const visibleTabs = (flags: TabFlags): string[] => {
  const tabs: string[] = TAB_ORDER.filter((route) => isTabOn(route, flags));

  return tabs.length > 0 ? tabs : ['home'];
};

/** 위젯을 열었을 때 첫 화면: 딜 모드는 문의 작성, 그 밖에는 남은 탭 중 첫 번째 */
export const startRoute = (flags: TabFlags): string =>
  flags.showDeal ? 'deal-submit' : visibleTabs(flags)[0];

/** "홈으로" 가던 곳은 홈 탭이 없으면 첫 화면으로 */
export const resolveRoute = (route: string, flags: TabFlags): string =>
  route === 'home' && !visibleTabs(flags).includes('home')
    ? startRoute(flags)
    : route;
