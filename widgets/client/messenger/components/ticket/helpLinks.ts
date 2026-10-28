// 티켓 탭 바로가기(5240 고객센터 FAQ·사용 설명서). 위젯 밖 사이트라 새 탭으로 연다.
// 5240 사용 설명서 — 티켓 탭 바로가기와 챗봇 위쪽 막대 매뉴얼 아이콘이 함께 쓴다
export const MANUAL_URL = 'https://docs.5240.cloud/userhelp';

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
