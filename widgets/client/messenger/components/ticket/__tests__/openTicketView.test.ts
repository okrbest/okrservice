import { buildTicketViewUrl, isLinkFresh } from '../openTicketView';

describe('buildTicketViewUrl', () => {
  it('열쇠는 주소 조각(#)에만, 언어는 lang으로', () => {
    expect(
      buildTicketViewUrl({
        rootUrl: 'https://w.example.com/widgets',
        token: 'abc_-1',
        lang: 'ko',
      }),
    ).toBe('https://w.example.com/widgets/ticket-view?lang=ko#abc_-1');
  });

  it('ROOT_URL 끝의 / 는 하나 뺀다', () => {
    expect(
      buildTicketViewUrl({
        rootUrl: 'http://localhost:3200/',
        token: 't',
        lang: 'en',
      }),
    ).toBe('http://localhost:3200/ticket-view?lang=en#t');
  });

  it('언어가 없으면 lang을 붙이지 않는다', () => {
    expect(
      buildTicketViewUrl({ rootUrl: 'http://localhost:3200', token: 't' }),
    ).toBe('http://localhost:3200/ticket-view#t');
  });

  it('주소의 # 앞부분에는 열쇠가 없다', () => {
    const url = buildTicketViewUrl({
      rootUrl: 'http://x',
      token: 'SECRET',
      lang: 'ko',
    });

    expect(url.split('#')[0]).not.toContain('SECRET');
  });
});

describe('isLinkFresh', () => {
  const NOW = new Date('2026-10-26T09:00:00Z').getTime();
  const HOUR = 60 * 60 * 1000;

  it('만료까지 1시간 넘게 남았으면 받아 둔 링크를 그대로 쓴다', () => {
    expect(isLinkFresh({ url: 'u', expiresAt: NOW + 2 * HOUR }, NOW)).toBe(
      true,
    );
  });

  it('만료가 1시간 안으로 다가왔거나 지났으면 새로 받는다', () => {
    expect(isLinkFresh({ url: 'u', expiresAt: NOW + HOUR }, NOW)).toBe(false);
    expect(isLinkFresh({ url: 'u', expiresAt: NOW - 1 }, NOW)).toBe(false);
  });

  it('받아 둔 링크가 없으면 새로 받는다', () => {
    expect(isLinkFresh(undefined, NOW)).toBe(false);
  });
});
