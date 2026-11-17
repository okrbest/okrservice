import * as React from 'react';
import { isMenuAllowed, loadAllowedMenuKeys } from './menuPermission';

export type MenuPermissionStatus = 'loading' | 'ready' | 'failed';

/**
 * 챗봇 화면을 열 때 직원의 5240 모바일 메뉴 권한을 받아 둔다.
 * 받기 전·실패하면 항상 허용 화면(출퇴근 체크·비밀번호변경)만 열린다.
 */
export const useMenuPermission = () => {
  const [state, setState] = React.useState<{
    status: MenuPermissionStatus;
    allowedKeys: Set<string> | null;
  }>({ status: 'loading', allowedKeys: null });

  React.useEffect(() => {
    let alive = true;

    loadAllowedMenuKeys().then((allowedKeys) => {
      if (alive) {
        setState({ status: allowedKeys ? 'ready' : 'failed', allowedKeys });
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  const canOpenMenu = React.useCallback(
    (pathOrUrl: string) => isMenuAllowed(pathOrUrl, state.allowedKeys),
    [state.allowedKeys],
  );

  return { status: state.status, canOpenMenu };
};
