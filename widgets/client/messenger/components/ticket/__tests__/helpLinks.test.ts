import {
  CHATBOT_MANUAL_URL,
  MANUAL_URL,
  TICKET_HELP_LINKS,
} from '../helpLinks';

describe('티켓 탭 바로가기(FAQ·매뉴얼)', () => {
  it('티켓 제출·목록 아래에 FAQ, 매뉴얼 순서로 보인다', () => {
    expect(TICKET_HELP_LINKS.map((link) => link.key)).toEqual([
      'faq',
      'manual',
    ]);
  });

  it('5240 고객센터 FAQ와 사용 설명서 주소로 간다', () => {
    expect(TICKET_HELP_LINKS.map((link) => link.url)).toEqual([
      'https://5240support.okrbiz.com/',
      'https://guide.5240.cloud/',
    ]);
  });

  it('티켓 탭 매뉴얼은 사용 설명서 첫 화면으로 간다', () => {
    expect(MANUAL_URL).toBe('https://guide.5240.cloud/');
  });

  it('챗봇 위쪽 막대 매뉴얼은 사용자 안내 쪽으로 바로 간다', () => {
    expect(CHATBOT_MANUAL_URL).toBe('https://guide.5240.cloud/user');
  });
});
