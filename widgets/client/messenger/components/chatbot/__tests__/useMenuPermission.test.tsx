import { act, renderHook, waitFor } from '@testing-library/react';
import { requestHrBridge } from '../clientTools';
import { useMenuPermission } from '../useMenuPermission';

jest.mock('../clientTools', () => ({ requestHrBridge: jest.fn() }));

const bridge = requestHrBridge as jest.Mock;

const mobileBody = (progFiles: string[]) =>
  JSON.stringify({
    Message: '',
    Result: progFiles.map((progFile, index) => ({
      lvl: 4,
      menuCd: `303-${index}`,
      progFile,
      dataRwType: 'W',
    })),
  });

const deferredBridge = () => {
  let resolvePending: (value: any) => void = () => undefined;
  bridge.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
  );
  return {
    resolve: (value: any) => resolvePending(value),
  };
};

const ok = (body: string) => ({ ok: true, status: 200, body });
const fail = { ok: false, status: 0, body: 'bridge: path not allowed' };

describe('useMenuPermission', () => {
  afterEach(() => bridge.mockReset());

  it('모바일 메뉴 목록만 조회한다', () => {
    deferredBridge();
    renderHook(() => useMenuPermission());

    expect(bridge).toHaveBeenCalledTimes(1);
    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/getMobileMenuList.do', form: {} }),
    );
  });

  it('확인 전에는 항상 허용 화면만 열린다', () => {
    deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    expect(result.current.status).toBe('loading');
    expect(result.current.canOpenMenu('/MobileMain.do')).toBe(true);
    expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(false);
  });

  it('모바일 권한이 오면 해당 메뉴가 열린다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending.resolve(ok(mobileBody(['/MobileLeaveAppl.do'])));
    });

    await waitFor(() =>
      expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(true),
    );
    expect(result.current.status).toBe('ready');
  });

  it('모바일 조회가 실패하면 failed — 항상 허용 화면만 열린다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending.resolve(fail);
    });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.canOpenMenu('/MobileChgPwd.do')).toBe(true);
    expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(false);
  });
});

describe('useMenuPermission — 화면이 닫힌 뒤', () => {
  afterEach(() => bridge.mockReset());

  it('닫힌 뒤 도착한 응답은 반영하지 않는다(경고 없음)', async () => {
    const pending = deferredBridge();
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { unmount } = renderHook(() => useMenuPermission());

    unmount();
    await act(async () => {
      pending.resolve(ok(mobileBody(['/MobileLeaveAppl.do'])));
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
