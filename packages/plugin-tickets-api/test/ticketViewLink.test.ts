// tickets-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/ticketViewLink.test.ts"]}'
import {
  TICKET_VIEW_EXTEND_THROTTLE_MS,
  TICKET_VIEW_ISSUE_LIMIT_PER_MINUTE,
  TICKET_VIEW_ISSUE_WINDOW_MS,
  TICKET_VIEW_LINK_MAX_AGE_MS,
  TICKET_VIEW_LINK_TTL_MS,
  TICKET_VIEW_MAX_LINKS_PER_TICKET,
  linksToPrune,
  canIssueLink,
  generateToken,
  hashToken,
  isLinkActive,
  nextExpiry,
  revokedExpiry,
  shouldExtend,
} from '../src/ticketViewLink';

const NOW = new Date('2026-10-26T09:00:00Z');
const MINUTE = 60 * 1000;

describe('generateToken', () => {
  it('주소에 그대로 넣을 수 있는 43자 무작위 값', () => {
    const token = generateToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('부를 때마다 다르다', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe('hashToken', () => {
  it('같은 열쇠는 같은 64자 지문, 다른 열쇠는 다른 지문', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('유효 기간', () => {
  it('하루짜리이고 연장 간격은 5분', () => {
    expect(TICKET_VIEW_LINK_TTL_MS).toBe(24 * 60 * MINUTE);
    expect(TICKET_VIEW_EXTEND_THROTTLE_MS).toBe(5 * MINUTE);
  });

  it('만료 시각이 지금보다 뒤일 때만 유효', () => {
    expect(isLinkActive({ expiresAt: new Date(NOW.getTime() + 1) }, NOW)).toBe(
      true,
    );
    expect(isLinkActive({ expiresAt: NOW }, NOW)).toBe(false);
    expect(isLinkActive({ expiresAt: new Date(NOW.getTime() - 1) }, NOW)).toBe(
      false,
    );
    expect(isLinkActive(null, NOW)).toBe(false);
  });

  it('쓰는 동안 연장돼도 발급 후 7일이 지나면 만료(절대 상한)', () => {
    expect(TICKET_VIEW_LINK_MAX_AGE_MS).toBe(7 * 24 * 60 * MINUTE);
    const later = new Date(NOW.getTime() + 1);
    expect(
      isLinkActive(
        {
          expiresAt: later,
          createdAt: new Date(
            NOW.getTime() - TICKET_VIEW_LINK_MAX_AGE_MS + MINUTE,
          ),
        },
        NOW,
      ),
    ).toBe(true);
    expect(
      isLinkActive(
        {
          expiresAt: later,
          createdAt: new Date(NOW.getTime() - TICKET_VIEW_LINK_MAX_AGE_MS),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('다음 만료 시각은 지금부터 하루 뒤', () => {
    expect(nextExpiry(NOW).getTime()).toBe(
      NOW.getTime() + TICKET_VIEW_LINK_TTL_MS,
    );
  });

  it('마지막 사용 후 5분이 지났을 때만 연장을 기록한다', () => {
    expect(
      shouldExtend({ lastUsedAt: new Date(NOW.getTime() - 5 * MINUTE) }, NOW),
    ).toBe(true);
    expect(
      shouldExtend({ lastUsedAt: new Date(NOW.getTime() - 4 * MINUTE) }, NOW),
    ).toBe(false);
    expect(shouldExtend({}, NOW)).toBe(true);
  });
});

describe('canIssueLink', () => {
  const base = {
    customerId: 'c1',
    ticketCustomerIds: [] as string[],
    conformityCustomerIds: [] as string[],
    customerCompanyIds: [] as string[],
    ticketCompanyIds: [] as string[],
    ticketIsPublic: true,
  };

  it('티켓 고객 목록에 있으면 발급', () => {
    expect(canIssueLink({ ...base, ticketCustomerIds: ['c1'] })).toBe(true);
  });

  it('티켓–고객 연결에 있으면 발급', () => {
    expect(canIssueLink({ ...base, conformityCustomerIds: ['c1'] })).toBe(true);
  });

  it('고객 회사와 티켓 회사가 겹치면 발급(위젯 "회사 티켓")', () => {
    expect(
      canIssueLink({
        ...base,
        customerCompanyIds: ['co1', 'co2'],
        ticketCompanyIds: ['co2'],
      }),
    ).toBe(true);
  });

  it('회사 티켓은 공개 티켓만(위젯 목록과 같은 규칙)', () => {
    expect(
      canIssueLink({
        ...base,
        customerCompanyIds: ['co1'],
        ticketCompanyIds: ['co1'],
        ticketIsPublic: false,
      }),
    ).toBe(false);
    // 본인 티켓은 비공개여도 발급
    expect(
      canIssueLink({
        ...base,
        ticketCustomerIds: ['c1'],
        ticketIsPublic: false,
      }),
    ).toBe(true);
  });

  it('그 밖에는 거부', () => {
    expect(
      canIssueLink({
        ...base,
        ticketCustomerIds: ['c2'],
        conformityCustomerIds: ['c3'],
        customerCompanyIds: ['co1'],
        ticketCompanyIds: ['co9'],
      }),
    ).toBe(false);
  });

  it('고객 id가 없으면 거부', () => {
    expect(
      canIssueLink({ ...base, customerId: '', ticketCustomerIds: [''] }),
    ).toBe(false);
  });
});

describe('발급 남용 막기', () => {
  it('고객당 1분에 10건까지 발급', () => {
    expect(TICKET_VIEW_ISSUE_LIMIT_PER_MINUTE).toBe(10);
    expect(TICKET_VIEW_ISSUE_WINDOW_MS).toBe(MINUTE);
  });

  it('폐기된 링크는 만료 전이어도 열리지 않는다', () => {
    const later = new Date(NOW.getTime() + MINUTE);
    expect(isLinkActive({ expiresAt: later, revokedAt: NOW }, NOW)).toBe(false);
    expect(isLinkActive({ expiresAt: later, revokedAt: null }, NOW)).toBe(true);
  });

  it('폐기된 링크 기록은 발급 수를 세는 1분 동안 남긴다(바로 지우면 같은 티켓 반복 발급이 제한에 안 걸림)', () => {
    expect(revokedExpiry(NOW).getTime()).toBe(
      NOW.getTime() + TICKET_VIEW_ISSUE_WINDOW_MS,
    );
  });

  it('같은 티켓·고객의 링크는 최근 5개만 남기고 오래된 것부터 폐기한다', () => {
    expect(TICKET_VIEW_MAX_LINKS_PER_TICKET).toBe(5);
    const links = Array.from({ length: 7 }, (_, i) => ({
      _id: `l${i}`,
      createdAt: new Date(NOW.getTime() - i * MINUTE),
    }));
    expect(linksToPrune(links)).toEqual(['l5', 'l6']);
    expect(linksToPrune(links.slice(0, 5))).toEqual([]);
  });
});
