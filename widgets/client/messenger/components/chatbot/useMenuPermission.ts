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
 * 받기 전·실패면 항상 허용 화면(출퇴근 체크·비밀번호변경)만 열린다.
 */
export const useMenuPermission = () => {
  const [mobile, setMobile] = React.useState<MenuPermissions | null>(null);
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    loadMenuPermissions().then((next) => {
      if (!alive) {
        return;
      }
      setMobile(next);
      setSettled(true);
    });

    return () => {
      alive = false;
    };
  }, []);

  const status: MenuPermissionStatus = mobile
    ? 'ready'
    : settled
      ? 'failed'
      : 'loading';

  const canOpenMenu = React.useCallback(
    (pathOrUrl: string) => isMenuAllowed(pathOrUrl, mobile),
    [mobile],
  );

  const resolveMenuPath = React.useCallback(
    (pathOrUrl: string) => menuOpenPath(pathOrUrl, mobile),
    [mobile],
  );

  return { status, canOpenMenu, resolveMenuPath };
};
