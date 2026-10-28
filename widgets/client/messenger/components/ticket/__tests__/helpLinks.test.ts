import { MANUAL_URL, TICKET_HELP_LINKS } from '../helpLinks';

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
      'https://docs.5240.cloud/userhelp',
    ]);
  });

  it('매뉴얼 주소는 챗봇 위쪽 막대와 같은 곳에서 가져다 쓴다', () => {
    expect(MANUAL_URL).toBe('https://docs.5240.cloud/userhelp');
  });
});
