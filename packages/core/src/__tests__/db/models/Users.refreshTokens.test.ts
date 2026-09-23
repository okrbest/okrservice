jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

jest.mock('../../../data/utils', () => ({
  saveValidatedToken: jest.fn(),
}));

import * as jwt from 'jsonwebtoken';
import { userSchema } from '../../../db/models/definitions/users';
import { loadUserClass } from '../../../db/models/Users';
import { saveValidatedToken } from '../../../data/utils';

const mockVerify = jwt.verify as jest.Mock;
const mockSign = jwt.sign as jest.Mock;
const mockSaveValidatedToken = saveValidatedToken as jest.Mock;

function getRefreshTokensFn() {
  return (userSchema.statics as any).refreshTokens as (
    refreshToken: string,
  ) => Promise<any>;
}

describe('Users.refreshTokens', () => {
  const dbUser = { _id: 'user1', isOwner: false };
  let mockFindOne: jest.Mock;

  beforeEach(() => {
    mockFindOne = jest.fn().mockResolvedValue(dbUser);
    loadUserClass({ Users: { findOne: mockFindOne } } as any);

    mockSign.mockReset();
    mockSign.mockReturnValueOnce('new-access-token');
    mockSign.mockReturnValueOnce('new-refresh-token');
    mockSaveValidatedToken.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('유효하지 않은/만료된 refresh token → 빈 객체 반환, 새 토큰 발급 없음', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const result = await getRefreshTokensFn()('expired-refresh-token');

    expect(result).toEqual({});
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSaveValidatedToken).not.toHaveBeenCalled();
  });

  it('유효한 refresh token → 새 토큰 쌍 발급 + redis에 새 access token 검증 등록', async () => {
    mockVerify.mockReturnValue({ user: { _id: 'user1' } });

    const result = await getRefreshTokensFn()('valid-refresh-token');

    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'user1' });
    // 새로 발급한 access token이 redis 검증 없이는 userMiddleware를 통과하지 못하므로 필수
    expect(mockSaveValidatedToken).toHaveBeenCalledWith(
      'new-access-token',
      dbUser,
    );
    expect(result).toEqual({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: dbUser,
    });
  });
});
