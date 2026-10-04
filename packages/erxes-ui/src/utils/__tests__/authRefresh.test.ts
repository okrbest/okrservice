// 실행: descriptionDraft.test.ts 머리 주석과 같은 방식(testMatch만 이 파일로)
jest.mock('../core', () => ({
  getEnv: () => ({ REACT_APP_API_URL: 'http://api.test' }),
}));

type Loaded = typeof import('../authRefresh');

// 화면 묶음 안에 이 모듈이 두 벌 들어갈 수 있다(호스트 앱 + 공유 모듈) — 각각 따로 불러온 것처럼 만든다
const loadCopy = (): Loaded => {
  let copy: Loaded | undefined;

  jest.isolateModules(() => {
    copy = require('../authRefresh');
  });

  return copy as Loaded;
};

describe('refreshAuthToken', () => {
  let resolveFetch: (value: unknown) => void;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    (global as any).window = global;
    fetchMock = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    (global as any).fetch = fetchMock;
  });

  const respond = (body: unknown) =>
    resolveFetch({ json: () => Promise.resolve(body) });

  it('동시에 여러 번 불러도 갱신 요청은 한 번만 보낸다', async () => {
    const { refreshAuthToken } = loadCopy();
    const first = refreshAuthToken();
    const second = refreshAuthToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    respond({ data: { refreshToken: 'refreshed' } });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('모듈이 두 벌이어도 진행 중인 갱신 요청을 같이 쓴다', async () => {
    const copyA = loadCopy();
    const copyB = loadCopy();
    const first = copyA.refreshAuthToken();
    const second = copyB.refreshAuthToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    respond({ data: { refreshToken: 'refreshed' } });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('끝난 뒤에 다시 부르면 새로 요청한다', async () => {
    const { refreshAuthToken } = loadCopy();
    const first = refreshAuthToken();
    respond({ errors: [{ message: 'Login required' }] });

    expect(await first).toBe(false);

    const second = refreshAuthToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    respond({ data: { refreshToken: 'refreshed' } });

    expect(await second).toBe(true);
  });
});
