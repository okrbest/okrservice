// 실행: executionActionTime.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import {
  buildCustomerTicketCardHtml,
  fillCustomerTicketLink,
  hasCustomerTicketLink,
  resolveCustomerTicketLinkHtml,
} from '../src/common/customerTicketLink';

describe('hasCustomerTicketLink — 본문에 고객 링크 칸이 있나', () => {
  it('공백이 있든 없든 찾는다', () => {
    expect(hasCustomerTicketLink('<p>{{ customerTicketLink }}</p>')).toBe(true);
    expect(hasCustomerTicketLink('<p>{{customerTicketLink}}</p>')).toBe(true);
  });

  it('주소 칸에 넣어 편집기가 바꿔 저장한 형태도 찾는다', () => {
    expect(
      hasCustomerTicketLink(
        '<a href="%7B%7B%20customerTicketLink%20%7D%7D">열기</a>',
      ),
    ).toBe(true);
  });

  it('없거나 비면 false — 이때는 아무 조회도 하지 않는다', () => {
    expect(hasCustomerTicketLink('<p>{{ link }}</p>')).toBe(false);
    expect(hasCustomerTicketLink('')).toBe(false);
    expect(hasCustomerTicketLink(undefined)).toBe(false);
  });

  it('여러 번 불러도 결과가 같다', () => {
    const html = '{{ customerTicketLink }}';
    expect(hasCustomerTicketLink(html)).toBe(true);
    expect(hasCustomerTicketLink(html)).toBe(true);
  });
});

describe('buildCustomerTicketCardHtml — 메일에 들어갈 티켓 카드', () => {
  const card = (overrides: any = {}) =>
    buildCustomerTicketCardHtml({
      url: 'https://w.example.com/ticket-view#abc_-1',
      expiresAt: new Date('2026-12-01T05:00:00Z'),
      ticket: {
        number: '20261117-0001',
        name: '급여 명세서 문의',
        stageName: '접수',
        stageTone: 'blue',
      },
      ...overrides,
    });

  it('티켓 번호·제목·현재 단계·버튼·사용 기한을 보여 준다', () => {
    const html = card();

    expect(html).toContain('#20261117-0001');
    expect(html).toContain('급여 명세서 문의');
    expect(html).toContain('현재 단계 · 접수');
    expect(html).toMatch(
      /<a ses:no-track href="https:\/\/w\.example\.com\/ticket-view#abc_-1" target="_blank" rel="noopener noreferrer"[^>]*>티켓 열고 답변 보기<\/a>/,
    );
    expect(html).toContain(
      '로그인 없이 바로 열려요. 이 버튼은 12월 1일까지 쓸 수 있어요.',
    );
  });

  it('현재 단계 배지는 위젯과 같은 단계 색을 쓴다', () => {
    expect(card()).toContain('color:#2f6fd6;background:#e8f1fd');
    expect(
      card({ ticket: { name: 't', stageName: '완료', stageTone: 'green' } }),
    ).toContain('color:#1f9d55;background:#e7f6ee');
    // 색 정보가 없으면 위젯 기본 색
    expect(card({ ticket: { name: 't', stageName: '접수' } })).toContain(
      'color:#4b4fc4;background:#eef0fd',
    );
  });

  it('메일 앱에서 깨지지 않게 표와 인라인 스타일로 만든다', () => {
    const html = card();

    expect(html.startsWith('<table role="presentation"')).toBe(true);
    expect(html).not.toMatch(/<style|class=/);
  });

  it('번호·단계가 없으면 그 줄만 뺀다', () => {
    const html = card({ ticket: { name: '제목만' } });

    expect(html).toContain('제목만');
    expect(html).not.toContain('letter-spacing'); // 번호 줄
    expect(html).not.toContain('현재 단계');
  });

  it('제목·주소의 특수 문자는 이스케이프한다', () => {
    const html = card({
      url: 'x"><script>',
      ticket: { name: '<b>제목</b> & "따옴표"' },
    });

    expect(html).toContain('href="x&quot;&gt;&lt;script&gt;"');
    expect(html).toContain('&lt;b&gt;제목&lt;/b&gt; &amp; &quot;따옴표&quot;');
    expect(html).not.toContain('<b>제목');
  });
});

describe('fillCustomerTicketLink — 받는 사람 몫으로 바꾸기', () => {
  const link = '<a href="u">티켓 열기</a>';

  it('칸을 모두 링크로 바꾼다', () => {
    expect(
      fillCustomerTicketLink(
        '<p>{{ customerTicketLink }}</p><p>{{customerTicketLink}}</p>',
        link,
      ),
    ).toBe(`<p>${link}</p><p>${link}</p>`);
  });

  it('링크가 없으면 칸을 통째로 뺀다', () => {
    expect(
      fillCustomerTicketLink(
        '<p>답변이 달렸어요 {{ customerTicketLink }}</p>',
        '',
      ),
    ).toBe('<p>답변이 달렸어요 </p>');
  });

  it('다른 링크의 주소 칸에 넣은 것은 지원하지 않아 비운다(링크 태그가 깨지지 않게)', () => {
    expect(
      fillCustomerTicketLink(
        '<a href="{{ customerTicketLink }}">열기</a><a href="%7B%7B%20customerTicketLink%20%7D%7D">열기</a>',
        link,
      ),
    ).toBe('<a href="">열기</a><a href="">열기</a>');
  });

  it('다른 속성 값 안에 넣은 것도 비운다', () => {
    expect(
      fillCustomerTicketLink('<img alt="{{ customerTicketLink }} 보기">', link),
    ).toBe('<img alt=" 보기">');
  });

  it('다른 칸은 건드리지 않는다', () => {
    expect(fillCustomerTicketLink('{{ link }} {{ name }}', link)).toBe(
      '{{ link }} {{ name }}',
    );
  });
});

describe('resolveCustomerTicketLinkHtml — 받는 사람이 받을 링크', () => {
  const makeDeps = (overrides: any = {}) => ({
    widgetsDomain: 'https://w.example.com/',
    findUserByEmail: jest.fn(async () => null),
    createEmailLink: jest.fn(async () => ({
      token: 'tok',
      expiresAt: new Date('2026-12-01T05:00:00Z'),
      ticket: { number: '20261117-0001', name: '문의', stageName: '접수' },
    })),
    ...overrides,
  });
  const input = {
    toEmail: 'c@x.com',
    customer: { customerId: 'c1', primaryEmail: 'c@x.com' },
    ticketId: 't1',
  };

  it('티켓 고객이면 그 고객 열쇠로 티켓 카드를 만든다', async () => {
    const deps = makeDeps();

    const html = await resolveCustomerTicketLinkHtml(input, deps);

    expect(html).toContain('href="https://w.example.com/ticket-view#tok"');
    expect(html).toContain('#20261117-0001');
    expect(html).toContain('12월 1일까지');
    expect(deps.createEmailLink).toHaveBeenCalledWith({
      ticketId: 't1',
      customerId: 'c1',
    });
  });

  it('받는 주소가 그 고객의 대표 메일과 같을 때만 그 고객 몫으로 만든다(대소문자 무시)', async () => {
    const deps = makeDeps();

    await expect(
      resolveCustomerTicketLinkHtml({ ...input, toEmail: 'C@X.com ' }, deps),
    ).resolves.toContain('ticket-view#tok');
    // 공용 주소가 고객의 다른 메일 목록에만 있는 경우 — 그 고객 몫의 링크를 주지 않는다
    await expect(
      resolveCustomerTicketLinkHtml({ ...input, toEmail: 'cs@x.com' }, deps),
    ).resolves.toBe('');
  });

  it('직원 판정은 소문자 주소로 묻는다', async () => {
    const deps = makeDeps({
      findUserByEmail: jest.fn(async (email: string) =>
        email === 'c@x.com' ? { _id: 'u1' } : null,
      ),
    });

    await expect(
      resolveCustomerTicketLinkHtml(
        { ...input, toEmail: 'C@X.COM' },
        {
          ...deps,
        },
      ),
    ).resolves.toBe('');
    expect(deps.findUserByEmail).toHaveBeenCalledWith('c@x.com');
  });

  it('직원 계정 주소면 고객 기록이 있어도 넣지 않는다', async () => {
    const deps = makeDeps({
      findUserByEmail: jest.fn(async () => ({ _id: 'u1' })),
    });

    await expect(resolveCustomerTicketLinkHtml(input, deps)).resolves.toBe('');
    expect(deps.createEmailLink).not.toHaveBeenCalled();
  });

  it('고객이 아니거나, 티켓 자동화가 아니거나, 위젯 주소 설정이 없으면 빈 값', async () => {
    for (const [i, d] of [
      [{ ...input, customer: undefined }, makeDeps()],
      [
        { ...input, customer: { customerId: '', primaryEmail: 'c@x.com' } },
        makeDeps(),
      ],
      [{ ...input, ticketId: '' }, makeDeps()],
      [input, makeDeps({ widgetsDomain: '' })],
    ] as const) {
      await expect(resolveCustomerTicketLinkHtml(i, d)).resolves.toBe('');
      expect(d.createEmailLink).not.toHaveBeenCalled();
    }
  });

  it('권한이 없어 열쇠가 안 나오거나 호출이 실패해도 빈 값(메일은 그대로 간다)', async () => {
    await expect(
      resolveCustomerTicketLinkHtml(
        input,
        makeDeps({ createEmailLink: jest.fn(async () => null) }),
      ),
    ).resolves.toBe('');
    await expect(
      resolveCustomerTicketLinkHtml(
        input,
        makeDeps({
          createEmailLink: jest.fn(async () => {
            throw new Error('rpc down');
          }),
        }),
      ),
    ).resolves.toBe('');
  });
});
