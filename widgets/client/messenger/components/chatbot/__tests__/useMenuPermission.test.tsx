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

const pcBody = (progCds: string[]) =>
  JSON.stringify({
    result: progCds.map((progCd, index) => ({
      lvl: 4,
      menuCd: `100-${index}`,
      progCd,
      progFile: '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr',
      applCd: null,
      dataRwType: 'W',
    })),
  });

// 경로·menuKind별로 응답을 손으로 풀어 주는 지연 브리지
const deferredBridge = () => {
  const pending: Record<string, (value: any) => void> = {};
  bridge.mockImplementation(
    (spec: any) =>
      new Promise((resolve) => {
        const key =
          spec.path === '/getSubLowMenuList.do'
            ? `pc:${spec.form.menuKind}`
            : 'mobile';
        pending[key] = resolve;
      }),
  );
  return pending;
};

const ok = (body: string) => ({ ok: true, status: 200, body });
const fail = { ok: false, status: 0, body: 'bridge: path not allowed' };

describe('useMenuPermission', () => {
  afterEach(() => bridge.mockReset());

  it('모바일·PC(직원용·담당자용) 조회 세 건을 한꺼번에 시작한다', () => {
    deferredBridge();
    renderHook(() => useMenuPermission());

    expect(bridge).toHaveBeenCalledTimes(3);
    expect(bridge.mock.calls.map(([spec]) => spec.path).sort()).toEqual([
      '/getMobileMenuList.do',
      '/getSubLowMenuList.do',
      '/getSubLowMenuList.do',
    ]);
    expect(
      bridge.mock.calls
        .filter(([spec]) => spec.path === '/getSubLowMenuList.do')
        .map(([spec]) => spec.form.menuKind)
        .sort(),
    ).toEqual(['menu01', 'menu02']);
  });

  it('확인 전에는 항상 허용 화면만 열린다', () => {
    deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    expect(result.current.status).toBe('loading');
    expect(result.current.canOpenMenu('/MobileMain.do')).toBe(true);
    expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(false);
  });

  it('PC 응답이 먼저 와도 PC 권한 메뉴가 바로 열린다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending['pc:menu01'](ok(pcBody(['TAA-0070'])));
    });

    await waitFor(() =>
      expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(true),
    );
    expect(result.current.status).toBe('ready');
  });

  it('PC 조회가 실패해도 모바일 권한 메뉴는 그대로 열리고, PC로만 열리던 메뉴는 닫힌다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending.mobile(ok(mobileBody(['/MobileHalfLeaveAppl.do'])));
      pending['pc:menu01'](fail);
      pending['pc:menu02'](fail);
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.canOpenMenu('/MobileHalfLeaveAppl.do')).toBe(true);
    expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(false);
  });

  it('직원용·담당자용 PC 권한을 합쳐 본다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending.mobile(ok(mobileBody([])));
      pending['pc:menu01'](ok(pcBody(['TAA-0070'])));
      pending['pc:menu02'](ok(pcBody(['TAA-0490'])));
    });

    await waitFor(() =>
      expect(result.current.canOpenMenu('/MobileLeavDetailStaff.do')).toBe(
        true,
      ),
    );
    expect(result.current.canOpenMenu('/MobileLeaveAppl.do')).toBe(true);
  });

  it('세 조회가 모두 실패하면 failed — 항상 허용 화면만 열린다', async () => {
    const pending = deferredBridge();
    const { result } = renderHook(() => useMenuPermission());

    await act(async () => {
      pending.mobile(fail);
      pending['pc:menu01'](fail);
      pending['pc:menu02'](fail);
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
      pending.mobile(ok(mobileBody(['/MobileLeaveAppl.do'])));
      pending['pc:menu01'](ok(pcBody(['TAA-0070'])));
      pending['pc:menu02'](fail);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
