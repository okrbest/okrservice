import { loadRpaMessageClass } from '../../../db/models/RpaMessages';
import { rpaMessageSchema } from '../../../db/models/definitions/rpaMessages';

describe('RpaMessages.createRpaMessage', () => {
  let mockCreate: jest.Mock;

  function getCreateFn() {
    return (rpaMessageSchema.statics as any).createRpaMessage as (doc: any) => Promise<any>;
  }

  const baseDoc = {
    loginId: 'user@test.com',
    rpaCode: 'HR_RPA_100',
    message: '출근 알림',
    overtime: '0',
    receivedAt: new Date(),
  };

  beforeEach(() => {
    mockCreate = jest.fn();
    loadRpaMessageClass({ RpaMessages: { create: mockCreate } } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('첫 번째 요청 → IRpaMessageDocument 반환', async () => {
    const saved = { _id: '1', ...baseDoc, messageCode: 'MSG_001' };
    mockCreate.mockResolvedValue(saved);

    const result = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });

    expect(result).toEqual(saved);
  });

  it('중복 키 에러(code 11000) → null 반환', async () => {
    const dupError = Object.assign(new Error('duplicate key'), { code: 11000 });
    mockCreate.mockRejectedValue(dupError);

    const result = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });

    expect(result).toBeNull();
  });

  it('11000 외 DB 에러 → throw', async () => {
    const dbError = Object.assign(new Error('connection error'), { code: 50000 });
    mockCreate.mockRejectedValue(dbError);

    await expect(getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' }))
      .rejects.toThrow('connection error');
  });

  it('messageCode 빈 문자열 → create 호출 시 undefined로 변환', async () => {
    mockCreate.mockResolvedValue({ _id: '2', ...baseDoc, messageCode: undefined });

    await getCreateFn()({ ...baseDoc, messageCode: '' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ messageCode: undefined }),
    );
  });

  it('같은 loginId + 다른 messageCode → create 각각 호출', async () => {
    mockCreate
      .mockResolvedValueOnce({ _id: '1', messageCode: 'MSG_001' } as any)
      .mockResolvedValueOnce({ _id: '2', messageCode: 'MSG_002' } as any);

    const r1 = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });
    const r2 = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_002' });

    expect(r1).toEqual({ _id: '1', messageCode: 'MSG_001' });
    expect(r2).toEqual({ _id: '2', messageCode: 'MSG_002' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
