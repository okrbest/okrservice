// 실행(widgets의 jest 사용):
// cd widgets && npx jest --config '{"rootDir":"../packages/core-ui","testEnvironment":"<rootDir>/../../widgets/node_modules/jest-environment-jsdom","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/src/__tests__/dynamicScript.test.ts"]}'
import {
  __resetDynamicScriptsForTest,
  ensurePluginScript,
} from '../dynamicScript';

const scripts = () =>
  Array.from(document.querySelectorAll('script[id^="dynamic-script-"]'));

const fireLoad = (id: string) => {
  const el = document.getElementById(id) as HTMLScriptElement;
  el.dispatchEvent(new Event('load'));
};

describe('ensurePluginScript', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as any).tickets;
    __resetDynamicScriptsForTest();
  });

  it('플러그인 진입 파일을 한 번만 붙인다 — 여러 화면이 동시에 요청해도', async () => {
    const a = ensurePluginScript('tickets', 'http://x/remoteEntry.js');
    const b = ensurePluginScript('tickets', 'http://x/remoteEntry.js');

    expect(scripts()).toHaveLength(1);

    fireLoad('dynamic-script-tickets');
    await expect(Promise.all([a, b])).resolves.toBeDefined();
    expect(scripts()).toHaveLength(1);
  });

  it('이미 실행된 플러그인(window[scope] 있음)은 다시 붙이지 않는다', async () => {
    (window as any).tickets = { get: jest.fn(), init: jest.fn() };

    await ensurePluginScript('tickets', 'http://x/remoteEntry.js');

    expect(scripts()).toHaveLength(0);
  });

  it('불러오기에 실패하면 실패를 알리고, 다음 요청 때 다시 시도한다', async () => {
    const first = ensurePluginScript('tickets', 'http://x/remoteEntry.js');
    const el = document.getElementById('dynamic-script-tickets')!;
    el.dispatchEvent(new Event('error'));

    await expect(first).rejects.toThrow();
    expect(scripts()).toHaveLength(0);

    ensurePluginScript('tickets', 'http://x/remoteEntry.js');
    expect(scripts()).toHaveLength(1);
  });
});
