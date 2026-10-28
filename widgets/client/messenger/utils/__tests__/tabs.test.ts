import { resolveRoute, startRoute, visibleTabs } from '../tabs';

const none = {
  showChatbot: false,
  showCall: false,
  showTicket: false,
  showDeal: false,
};

describe('아래 탭(홈·도움말 없음)', () => {
  it('켜진 탭만 챗봇 → 통화 → 티켓 순서로 보인다', () => {
    expect(
      visibleTabs({ ...none, showChatbot: true, showTicket: true }),
    ).toEqual(['chatbot', 'ticket']);
    expect(visibleTabs({ ...none, showCall: true, showTicket: true })).toEqual([
      'call',
      'ticket',
    ]);
  });

  it('딜(문의) 모드에서는 통화·딜만 보인다(기존 규칙)', () => {
    expect(
      visibleTabs({
        showChatbot: true,
        showCall: true,
        showTicket: true,
        showDeal: true,
      }),
    ).toEqual(['call', 'deal']);
  });

  it('켜진 탭이 하나도 없으면 빈 탭 줄 대신 홈을 남긴다', () => {
    expect(visibleTabs(none)).toEqual(['home']);
  });
});

describe('위젯을 열었을 때 첫 화면', () => {
  it('남은 탭 중 첫 번째: 챗봇이 켜져 있으면 챗봇, 아니면 티켓', () => {
    expect(startRoute({ ...none, showChatbot: true, showTicket: true })).toBe(
      'chatbot',
    );
    expect(startRoute({ ...none, showTicket: true })).toBe('ticket');
  });

  it('딜 모드는 지금처럼 문의 작성 화면', () => {
    expect(startRoute({ ...none, showDeal: true })).toBe('deal-submit');
  });

  it('켜진 탭이 없으면 홈', () => {
    expect(startRoute(none)).toBe('home');
  });
});

describe('"홈으로" 가던 곳(뒤로 가기 기본값·통화 종료 등)', () => {
  it('홈 탭이 없으면 첫 화면으로 보낸다', () => {
    expect(resolveRoute('home', { ...none, showTicket: true })).toBe('ticket');
  });

  it('홈 탭만 남은 사이트에서는 그대로 홈', () => {
    expect(resolveRoute('home', none)).toBe('home');
  });

  it('홈이 아닌 화면은 그대로', () => {
    expect(resolveRoute('ticket-list', { ...none, showChatbot: true })).toBe(
      'ticket-list',
    );
  });
});
