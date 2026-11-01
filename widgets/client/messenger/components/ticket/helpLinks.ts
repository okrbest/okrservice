// 티켓 탭 바로가기(5240 고객센터 FAQ·사용 설명서). 위젯 밖 사이트라 새 탭으로 연다.
// 5240 사용 설명서 — 티켓 탭 바로가기는 첫 화면으로 간다
export const MANUAL_URL = 'https://guide.5240.cloud/';
// 챗봇 위쪽 막대 매뉴얼 아이콘은 사용자 안내 쪽으로 바로 간다
export const CHATBOT_MANUAL_URL = 'https://guide.5240.cloud/user';

export type TicketHelpLink = {
  key: 'faq' | 'manual';
  url: string;
  // 번역 키(widgets/locales)
  title: string;
  description: string;
};

export const TICKET_HELP_LINKS: TicketHelpLink[] = [
  {
    key: 'faq',
    url: 'https://5240support.okrbiz.com/',
    title: 'FAQ',
    description: 'Find answers to frequently asked questions',
  },
  {
    key: 'manual',
    url: MANUAL_URL,
    title: 'Manual',
    description: 'See how to use each feature',
  },
];
