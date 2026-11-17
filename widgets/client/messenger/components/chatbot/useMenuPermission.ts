import * as React from 'react';
import {
  MenuPermissions,
  PC_MENU_KINDS,
  PcMenuKind,
  PcMenuPermissions,
  isMenuAllowed,
  loadMenuPermissions,
  loadPcMenuPermissions,
  menuOpenPath,
  mergePcMenuPermissions,
} from './menuPermission';

export type MenuPermissionStatus = 'loading' | 'ready' | 'failed';

type SourceKey = 'mobile' | PcMenuKind;

type HookState = {
  mobile: MenuPermissions | null;
  pcParts: Partial<Record<PcMenuKind, PcMenuPermissions | null>>;
  /** 응답이 온 조회(성공·실패 모두) */
  settled: Partial<Record<SourceKey, boolean>>;
};

const INITIAL_STATE: HookState = { mobile: null, pcParts: {}, settled: {} };
const SOURCE_COUNT = 1 + PC_MENU_KINDS.length;

/**
 * 챗봇 화면을 열 때 직원의 5240 모바일·PC 메뉴 권한을 받아 둔다.
 * 세 조회(모바일, PC 직원용, PC 담당자용)를 한꺼번에 시작하고 오는 대로 반영한다 — 화면 표시는 기다리지 않는다.
 * 받기 전·실패한 쪽은 권한 없음으로 보고, 모두 받기 전·실패하면 항상 허용 화면(출퇴근 체크·비밀번호변경)만 열린다.
 */
export const useMenuPermission = () => {
  const [state, setState] = React.useState<HookState>(INITIAL_STATE);

  React.useEffect(() => {
    let alive = true;

    const settle = (key: SourceKey, update: (prev: HookState) => HookState) => {
      if (alive) {
        setState((prev) => {
          const next = update(prev);
          return { ...next, settled: { ...next.settled, [key]: true } };
        });
      }
    };

    loadMenuPermissions().then((mobile) =>
      settle('mobile', (prev) => ({ ...prev, mobile })),
    );

    PC_MENU_KINDS.forEach((kind) => {
      loadPcMenuPermissions(kind).then((pc) =>
        settle(kind, (prev) => ({
          ...prev,
          pcParts: { ...prev.pcParts, [kind]: pc },
        })),
      );
    });

    return () => {
      alive = false;
    };
  }, []);

  const sources = React.useMemo(
    () => ({
      mobile: state.mobile,
      pc: mergePcMenuPermissions(
        PC_MENU_KINDS.map((kind) => state.pcParts[kind] ?? null),
      ),
    }),
    [state.mobile, state.pcParts],
  );

  const received = Boolean(sources.mobile || sources.pc);
  const allSettled = Object.keys(state.settled).length === SOURCE_COUNT;
  const status: MenuPermissionStatus = received
    ? 'ready'
    : allSettled
      ? 'failed'
      : 'loading';

  const canOpenMenu = React.useCallback(
    (pathOrUrl: string) => isMenuAllowed(pathOrUrl, sources),
    [sources],
  );

  // 결재 양식 메뉴는 5240 메뉴 정보로 만든 주소로 연다
  const resolveMenuPath = React.useCallback(
    (pathOrUrl: string) => menuOpenPath(pathOrUrl, sources),
    [sources],
  );

  return { status, canOpenMenu, resolveMenuPath };
};
