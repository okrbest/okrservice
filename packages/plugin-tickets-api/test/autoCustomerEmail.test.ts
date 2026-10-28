// tickets-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/autoCustomerEmail.test.ts"]}'
import {
  AUTO_CUSTOMER_EMAIL_DELAY_MS,
  AUTO_CUSTOMER_EMAIL_BATCH_LIMIT,
  AUTO_CUSTOMER_EMAIL_CHECK_MS,
  computeAutoEmailDueAt,
  processDueAutoCustomerEmails,
} from '../src/autoCustomerEmail';

const NOW = new Date('2026-10-28T09:00:00Z');

// findOneAndUpdate가 호출될 때마다 준비한 티켓을 하나씩 돌려주는 가짜 모델
function fakeModels(tickets: any[]) {
  const queue = [...tickets];
  const calls: any[] = [];

  return {
    calls,
    models: {
      Tickets: {
        findOneAndUpdate: jest.fn(async (selector, update, options) => {
          calls.push({ selector, update, options });
          const next = queue.shift();

          return next ? { toObject: () => ({ ...next }) } : null;
        }),
      },
    } as any,
  };
}

describe('computeAutoEmailDueAt', () => {
  it('지금으로부터 10분 뒤', () => {
    expect(AUTO_CUSTOMER_EMAIL_DELAY_MS).toBe(10 * 60 * 1000);
    expect(computeAutoEmailDueAt(NOW).toISOString()).toBe(
      '2026-10-28T09:10:00.000Z',
    );
  });
});

describe('processDueAutoCustomerEmails', () => {
  it('예정 시각이 지난 티켓을 하나씩 가져가며(지우며) 트리거를 보낸다', async () => {
    const { models, calls } = fakeModels([
      { _id: 't1', status: 'active', emailSent: false },
      { _id: 't2', status: 'active', emailSent: true },
    ]);
    const send = jest.fn(async () => undefined);

    const sent = await processDueAutoCustomerEmails(models, 'os', NOW, send);

    expect(sent).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(calls[0].selector).toEqual({ autoEmailDueAt: { $lte: NOW } });
    expect(calls[0].update).toEqual({ $unset: { autoEmailDueAt: '' } });
  });

  it('가져갈 티켓이 없으면 바로 멈춘다', async () => {
    const { models } = fakeModels([]);
    const send = jest.fn(async () => undefined);

    expect(await processDueAutoCustomerEmails(models, 'os', NOW, send)).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(models.Tickets.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('보관된 티켓은 예약만 지우고 보내지 않는다', async () => {
    const { models } = fakeModels([{ _id: 't1', status: 'archived' }]);
    const send = jest.fn(async () => undefined);

    expect(await processDueAutoCustomerEmails(models, 'os', NOW, send)).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('"Send Email" 버튼과 같은 트리거를 보내되 DB의 버튼 상태(emailSent)는 바꾸지 않는다', async () => {
    const { models, calls } = fakeModels([
      { _id: 't1', status: 'active', emailSent: true, widgetAlarm: false },
    ]);
    const send = jest.fn(async (_payload: any) => undefined);

    await processDueAutoCustomerEmails(models, 'os', NOW, send);

    const payload = send.mock.calls[0][0];
    expect(payload).toEqual({
      subdomain: 'os',
      serviceName: 'automations',
      action: 'trigger',
      data: {
        type: 'tickets:ticket',
        triggerSource: 'manualEmailRequest',
        targets: [
          expect.objectContaining({
            _id: 't1',
            manualEmailRequest: true,
            emailSent: false,
          }),
        ],
      },
    });
    // DB에는 예약 지우기($unset)만 하고 emailSent를 쓰지 않는다
    calls.forEach((c) =>
      expect(c.update).toEqual({ $unset: { autoEmailDueAt: '' } }),
    );
  });

  it('전송이 실패하면 그 예약을 다음 확인 때로 되돌리고 이번 확인을 멈춘다(예외는 밖으로 안 던짐)', async () => {
    const { models } = fakeModels([
      { _id: 't1', status: 'active' },
      { _id: 't2', status: 'active' },
    ]);
    models.Tickets.updateOne = jest.fn(async () => ({ modifiedCount: 1 }));
    const send = jest.fn().mockRejectedValueOnce(new Error('rabbit down'));

    await expect(
      processDueAutoCustomerEmails(models, 'os', NOW, send),
    ).resolves.toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
    // t2는 이번 확인에서 가져가지 않는다
    expect(models.Tickets.findOneAndUpdate).toHaveBeenCalledTimes(1);
    // 새 댓글이 남긴 더 최신 예약은 덮지 않도록 "예약 없음"일 때만 되돌린다
    expect(models.Tickets.updateOne).toHaveBeenCalledWith(
      { _id: 't1', autoEmailDueAt: { $exists: false } },
      {
        $set: {
          autoEmailDueAt: new Date(
            NOW.getTime() + AUTO_CUSTOMER_EMAIL_CHECK_MS,
          ),
        },
      },
    );
  });

  it('한 번에 처리하는 개수에 상한이 있다', async () => {
    const many = Array.from(
      { length: AUTO_CUSTOMER_EMAIL_BATCH_LIMIT + 5 },
      (_, i) => ({ _id: `t${i}`, status: 'active' }),
    );
    const { models } = fakeModels(many);
    const send = jest.fn(async () => undefined);

    expect(await processDueAutoCustomerEmails(models, 'os', NOW, send)).toBe(
      AUTO_CUSTOMER_EMAIL_BATCH_LIMIT,
    );
  });
});
