import * as React from 'react';
import {
  MenuPermissions,
  isMenuAllowed,
  loadMenuPermissions,
  menuOpenPath,
} from './menuPermission';

export type MenuPermissionStatus = 'loading' | 'ready' | 'failed';

/**
 * 챗봇 화면을 열 때 직원의 5240 모바일 메뉴 권한을 받아 둔다.
 * 받기 전·실패하면 항상 허용 화면(출퇴근 체크·비밀번호변경)만 열린다.
 */
export const useMenuPermission = () => {
  const [state, setState] = React.useState<{
    status: MenuPermissionStatus;
    permissions: MenuPermissions | null;
  }>({ status: 'loading', permissions: null });

  React.useEffect(() => {
    let alive = true;

    loadMenuPermissions().then((permissions) => {
      if (alive) {
        setState({ status: permissions ? 'ready' : 'failed', permissions });
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  const canOpenMenu = React.useCallback(
    (pathOrUrl: string) => isMenuAllowed(pathOrUrl, state.permissions),
    [state.permissions],
  );

  // 결재 양식 메뉴는 5240 메뉴 정보로 만든 주소로 연다
  const resolveMenuPath = React.useCallback(
    (pathOrUrl: string) => menuOpenPath(pathOrUrl, state.permissions),
    [state.permissions],
  );

  return { status: state.status, canOpenMenu, resolveMenuPath };
};
