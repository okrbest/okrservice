// 실행: widgetTicketEdit.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import {
  createWithUniqueNumber,
  isNumberAhead,
  MAX_NUMBER_RETRIES,
} from '../src/models/createWithUniqueNumber';

const duplicateNumberError = () =>
  Object.assign(
    new Error('E11000 duplicate key error collection: tickets index: number_1'),
    { code: 11000, keyPattern: { number: 1 } },
  );

const makeSteps = (failures: Error[]) => {
  const calls = { generate: 0, create: 0, onDuplicate: 0 };
  const queue = [...failures];

  return {
    calls,
    steps: {
      generate: async () => {
        calls.generate++;
      },
      create: async () => {
        calls.create++;
        const failure = queue.shift();
        if (failure) {
          throw failure;
        }
        return { _id: 'new-ticket' };
      },
      onDuplicate: async () => {
        calls.onDuplicate++;
      },
      retryDelayMs: () => 0,
    },
  };
};

describe('createWithUniqueNumber', () => {
  it('충돌이 없으면 한 번에 만들고 결과를 돌려준다', async () => {
    const { calls, steps } = makeSteps([]);

    await expect(createWithUniqueNumber(steps)).resolves.toEqual({
      _id: 'new-ticket',
    });
    expect(calls).toEqual({ generate: 1, create: 1, onDuplicate: 0 });
  });

  it('번호가 겹치면 번호를 다시 매겨 만들고, 만든 결과를 돌려준다', async () => {
    const { calls, steps } = makeSteps([
      duplicateNumberError(),
      duplicateNumberError(),
    ]);

    await expect(createWithUniqueNumber(steps)).resolves.toEqual({
      _id: 'new-ticket',
    });
    expect(calls).toEqual({ generate: 3, create: 3, onDuplicate: 2 });
  });

  it('번호 충돌이 아닌 오류는 다시 시도하지 않는다', async () => {
    const { calls, steps } = makeSteps([new Error('validation failed')]);

    await expect(createWithUniqueNumber(steps)).rejects.toThrow(
      'validation failed',
    );
    expect(calls.create).toBe(1);
    expect(calls.onDuplicate).toBe(0);
  });

  it('번호가 아닌 다른 값(_id)이 겹친 것은 번호 문제로 보지 않는다', async () => {
    const idDuplicate = Object.assign(
      new Error('E11000 duplicate key error collection: tickets index: _id_'),
      { code: 11000, keyPattern: { _id: 1 } },
    );
    const { calls, steps } = makeSteps([idDuplicate]);

    await expect(createWithUniqueNumber(steps)).rejects.toThrow('_id_');
    expect(calls.onDuplicate).toBe(0);
  });

  it('계속 겹쳐도 끝없이 돌지 않고 정해진 횟수 뒤 멈춘다', async () => {
    const failures = Array.from({ length: MAX_NUMBER_RETRIES + 5 }, () =>
      duplicateNumberError(),
    );
    const { calls, steps } = makeSteps(failures);

    await expect(createWithUniqueNumber(steps)).rejects.toThrow(/티켓 번호/);
    expect(calls.create).toBe(MAX_NUMBER_RETRIES);
  });
});

describe('isNumberAhead — 마지막 번호는 앞으로만 움직인다', () => {
  it('같은 접두어면 숫자로 비교한다 (자릿수가 늘어도)', () => {
    expect(isNumberAhead('20261117-0012', '20261117-0011')).toBe(true);
    expect(isNumberAhead('20261117-0011', '20261117-0012')).toBe(false);
    expect(isNumberAhead('TK-1000', 'TK-999')).toBe(true);
    expect(isNumberAhead('TK-999', 'TK-1000')).toBe(false);
  });

  it('같은 번호는 앞선 것이 아니다', () => {
    expect(isNumberAhead('TK-0005', 'TK-0005')).toBe(false);
  });

  it('접두어가 바뀌면(날짜가 넘어가면) 새 번호로 본다', () => {
    expect(isNumberAhead('20261118-0001', '20261117-0553')).toBe(true);
  });

  it('기존 번호가 없으면 새 번호로 본다', () => {
    expect(isNumberAhead('TK-0001', undefined)).toBe(true);
  });
});
