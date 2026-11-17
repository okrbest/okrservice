// 실행: ticketViewLink.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import {
  createEmailTicketViewLink,
  useTicketViewLink,
} from '../src/ticketViewRpc';
import { TICKET_VIEW_LINK_EXPIRED } from '../src/ticketViewLink';

const NOW = new Date('2026-11-17T09:00:00Z');
const MINUTE = 60 * 1000;

const ticketOf = (overrides: any = {}) => ({
  _id: 't1',
  number: '20261117-0001',
  name: '급여 명세서 문의',
  stageId: 's1',
  status: 'active',
  customerIds: ['c1'],
  visibility: 'public',
  ...overrides,
});

// core에 묻는 것: 연결 고객·회사, 고객 정보. 기본은 아무 연결 없음
const makeSendCore = (answers: { [action: string]: any } = {}) =>
  jest.fn(async ({ action, data }: any) => {
    if (action === 'conformities.savedConformity') {
      const key = `${data.mainType}:${data.relTypes.join(',')}`;
      return answers[key] || [];
    }
    return answers[action] ?? null;
  });

const makeModels = ({
  ticket,
  link,
}: {
  ticket?: any;
  link?: any;
} = {}) => ({
  Tickets: {
    findOne: jest.fn(() => ({ lean: async () => ticket ?? null })),
  },
  Stages: {
    findOne: jest.fn(() => ({
      lean: async () => ({ _id: 's1', name: '접수', pipelineId: 'p1' }),
    })),
    // 요청 → 접수 → 완료 (3단계) — 접수는 두 번째라 위젯에서 파랑
    find: jest.fn(() => ({
      lean: async () => [
        { _id: 's0', order: 0 },
        { _id: 's1', order: 1 },
        { _id: 's2', order: 2 },
      ],
    })),
  },
  TicketViewLinks: {
    createLink: jest.fn(async () => ({ token: 'tok', expiresAt: NOW })),
    useLink: jest.fn(async () => {
      if (!link) {
        throw new Error(TICKET_VIEW_LINK_EXPIRED);
      }
      return link;
    }),
    markChecked: jest.fn(async () => undefined),
    revoke: jest.fn(async () => undefined),
  },
});

describe('createEmailTicketViewLink — 메일에 넣을 고객 링크 발급', () => {
  it('티켓 고객이면 메일용 열쇠를 만든다', async () => {
    const models = makeModels({ ticket: ticketOf() });

    await expect(
      createEmailTicketViewLink(models as any, 'os', makeSendCore(), {
        ticketId: 't1',
        customerId: 'c1',
      }),
    ).resolves.toEqual({
      token: 'tok',
      expiresAt: NOW,
      // 메일 카드에 보여 줄 티켓 요약(번호·제목·현재 단계)
      ticket: {
        number: '20261117-0001',
        name: '급여 명세서 문의',
        stageName: '접수',
        stageTone: 'blue',
      },
    });
    expect(models.TicketViewLinks.createLink).toHaveBeenCalledWith(
      { ticketId: 't1', customerId: 'c1' },
      expect.any(Date),
      'email',
    );
  });

  it('연결된 고객이어도 만든다(위젯과 같은 판단)', async () => {
    const models = makeModels({ ticket: ticketOf({ customerIds: [] }) });
    const sendCore = makeSendCore({ 'ticket:customer': ['c1'] });

    await expect(
      createEmailTicketViewLink(models as any, 'os', sendCore, {
        ticketId: 't1',
        customerId: 'c1',
      }),
    ).resolves.toMatchObject({ token: 'tok' });
  });

  it('볼 수 없는 고객이면 오류 없이 null', async () => {
    const models = makeModels({ ticket: ticketOf({ customerIds: ['c2'] }) });

    await expect(
      createEmailTicketViewLink(models as any, 'os', makeSendCore(), {
        ticketId: 't1',
        customerId: 'c1',
      }),
    ).resolves.toBeNull();
    expect(models.TicketViewLinks.createLink).not.toHaveBeenCalled();
  });

  it('티켓이 없거나 보관됐거나 값이 비면 null', async () => {
    for (const ticket of [null, ticketOf({ status: 'archived' })]) {
      const models = makeModels({ ticket });

      await expect(
        createEmailTicketViewLink(models as any, 'os', makeSendCore(), {
          ticketId: 't1',
          customerId: 'c1',
        }),
      ).resolves.toBeNull();
    }

    await expect(
      createEmailTicketViewLink(
        makeModels({ ticket: ticketOf() }) as any,
        'os',
        makeSendCore(),
        { ticketId: 't1', customerId: '' },
      ),
    ).resolves.toBeNull();
  });
});

describe('useTicketViewLink — 메일 링크는 열 때 권한을 다시 본다', () => {
  const emailLink = (checkedAt: Date | null) => ({
    _id: 'l1',
    ticketId: 't1',
    customerId: 'c1',
    kind: 'email',
    checkedAt,
  });
  const deps = (sendCore = makeSendCore()) => ({
    subdomain: 'os',
    sendCore,
    now: NOW,
  });

  it('마지막 확인 후 5분이 지났고 아직 볼 수 있으면 확인 시각을 갱신하고 연다', async () => {
    const models = makeModels({
      ticket: ticketOf(),
      link: emailLink(new Date(NOW.getTime() - 6 * MINUTE)),
    });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps()),
    ).resolves.toEqual({ ticketId: 't1', customerId: 'c1' });
    expect(models.TicketViewLinks.markChecked).toHaveBeenCalledWith('l1', NOW);
    expect(models.TicketViewLinks.revoke).not.toHaveBeenCalled();
  });

  it('티켓에서 빠졌으면 만료로 답한다(폐기하지 않아 core 일시 장애로 링크가 영영 사라지지 않음)', async () => {
    const models = makeModels({
      ticket: ticketOf({ customerIds: ['c2'] }),
      link: emailLink(new Date(NOW.getTime() - 6 * MINUTE)),
    });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps()),
    ).rejects.toThrow(TICKET_VIEW_LINK_EXPIRED);
    expect(models.TicketViewLinks.revoke).not.toHaveBeenCalled();
    expect(models.TicketViewLinks.markChecked).not.toHaveBeenCalled();
  });

  it('비공개로 바뀐 티켓은 같은 회사 고객에게 막힌다', async () => {
    const models = makeModels({
      ticket: ticketOf({ customerIds: [], visibility: 'private' }),
      link: emailLink(null),
    });
    const sendCore = makeSendCore({
      'customers.findOne': { _id: 'c1', companyIds: ['co1'] },
      'ticket:company': ['co1'],
    });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps(sendCore)),
    ).rejects.toThrow(TICKET_VIEW_LINK_EXPIRED);
  });

  it('티켓이 없어졌어도 만료로 답한다', async () => {
    const models = makeModels({ ticket: null, link: emailLink(null) });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps()),
    ).rejects.toThrow(TICKET_VIEW_LINK_EXPIRED);
  });

  it('5분 안에 이미 확인했으면 다시 보지 않는다', async () => {
    const models = makeModels({
      ticket: ticketOf({ customerIds: ['c2'] }),
      link: emailLink(new Date(NOW.getTime() - 2 * MINUTE)),
    });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps()),
    ).resolves.toEqual({ ticketId: 't1', customerId: 'c1' });
    expect(models.Tickets.findOne).not.toHaveBeenCalled();
  });

  it('위젯 링크는 다시 보지 않는다(지금 동작 그대로)', async () => {
    const models = makeModels({
      ticket: ticketOf({ customerIds: ['c2'] }),
      link: { _id: 'l2', ticketId: 't1', customerId: 'c1', kind: 'widget' },
    });

    await expect(
      useTicketViewLink(models as any, { tokenHash: 'h' }, deps()),
    ).resolves.toEqual({ ticketId: 't1', customerId: 'c1' });
    expect(models.TicketViewLinks.markChecked).not.toHaveBeenCalled();
  });
});
