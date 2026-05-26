import * as bcrypt from 'bcryptjs';
import { validateRpaClient } from '../../middlewares/validateRpaClient';

jest.mock('../../connectionResolver', () => ({
  generateModels: jest.fn(),
}));

jest.mock('@erxes/api-utils/src/core', () => ({
  getSubdomain: jest.fn().mockReturnValue('test'),
}));

import { generateModels } from '../../connectionResolver';

const mockGenerateModels = generateModels as jest.Mock;

function makeReq(body: Record<string, string>, ip = '1.2.3.4'): any {
  return { body, ip };
}

function makeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateRpaClient', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clientId 없으면 401 반환', async () => {
    const req = makeReq({ secret: 'abc' });
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'UNAUTHORIZED', message: 'Missing credentials' });
    expect(next).not.toHaveBeenCalled();
  });

  it('secret 없으면 401 반환', async () => {
    const req = makeReq({ clientId: 'cid' });
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'UNAUTHORIZED', message: 'Missing credentials' });
    expect(next).not.toHaveBeenCalled();
  });

  it('존재하지 않는 clientId면 401 반환', async () => {
    mockGenerateModels.mockResolvedValue({
      Clients: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) },
    } as any);
    const req = makeReq({ clientId: 'bad', secret: 'xyz' });
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    expect(next).not.toHaveBeenCalled();
  });

  it('secret 불일치 시 401 반환', async () => {
    const hashed = await bcrypt.hash('correct', 10);
    mockGenerateModels.mockResolvedValue({
      Clients: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({
        clientId: 'cid', clientSecret: hashed, whiteListedIps: [],
      }) }) },
    } as any);
    const req = makeReq({ clientId: 'cid', secret: 'wrong' });
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    expect(next).not.toHaveBeenCalled();
  });

  it('IP whitelist에 없는 IP면 403 반환', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    mockGenerateModels.mockResolvedValue({
      Clients: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({
        clientId: 'cid', clientSecret: hashed, whiteListedIps: ['9.9.9.9'],
      }) }) },
    } as any);
    const req = makeReq({ clientId: 'cid', secret: 'secret' }, '1.2.3.4');
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: 'FORBIDDEN', message: 'IP not allowed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('whiteListedIps가 빈 배열이면 IP 검사 생략하고 next() 호출', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    mockGenerateModels.mockResolvedValue({
      Clients: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({
        clientId: 'cid', clientSecret: hashed, whiteListedIps: [],
      }) }) },
    } as any);
    const req = makeReq({ clientId: 'cid', secret: 'secret' }, '1.2.3.4');
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('모든 검증 통과 시 next() 호출', async () => {
    const hashed = await bcrypt.hash('secret', 10);
    mockGenerateModels.mockResolvedValue({
      Clients: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({
        clientId: 'cid', clientSecret: hashed, whiteListedIps: ['1.2.3.4'],
      }) }) },
    } as any);
    const req = makeReq({ clientId: 'cid', secret: 'secret' }, '1.2.3.4');
    const res = makeRes();
    await validateRpaClient(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
