// 챗봇 HR 메뉴 권한 — 5240 모바일 메뉴 목록에 있는 것만 보이고 연다.
// 기준: /getMobileMenuList.do (SQL이 USE_YN='Y'만 줌). PC 목록은 쓰지 않는다.
// 모바일 조회 실패·확인 전이면 항상 허용 화면만.
import { CHATBOT_MENUS, ChatbotMenu } from './chatbotMenus';
import { requestHrBridge } from './clientTools';

export const MENU_LIST_PATH = '/getMobileMenuList.do';

// 5240 모바일도 권한 목록과 상관없이 늘 보여 주는 화면(모바일 메인 = 출퇴근 체크, 비밀번호 변경)
export const ALWAYS_ALLOWED_MENU_PATHS = ['/MobileMain.do', '/MobileChgPwd.do'];

export type MenuPermissions = {
  /** 쓸 수 있는 화면 이름(신청 종류로 나뉘는 화면은 "화면|신청종류") */
  keys: Set<string>;
  /** 결재 양식 메뉴를 실제로 여는 주소(신청 종류별) */
  openPaths: Map<string, string>;
};

/** 비교용 화면 이름 — 주소의 마지막 경로 조각(쿼리 제외), 소문자 */
export const menuKey = (pathOrUrl: string): string => {
  const path = String(pathOrUrl || '')
    .split(/[?#]/)[0]
    .trim();
  const last = path.split('/').pop() || '';
  return last.toLowerCase();
};

const ALWAYS_ALLOWED_KEYS = new Set(ALWAYS_ALLOWED_MENU_PATHS.map(menuKey));

// 결재 화면 — 사직서 등 모든 결재 양식이 함께 쓴다
const APPROVAL_KEY = menuKey('/EAPApprovalMgr.do');

// 한 화면을 신청 종류(applCd)만 바꿔 여러 메뉴가 쓰는 화면 — 화면 이름만 보면 한 종류의 권한으로
// 다른 종류까지 열리므로 신청 종류까지 맞아야 연다(5240 고충신고서·근무복신청서, 결재 양식 등)
const APPL_CD_SCOPED_KEYS = new Set([
  menuKey('/MobileFreeDataFormReqstMgr.do'),
  APPROVAL_KEY,
]);

const normalizeApplCd = (value: unknown) =>
  String(value == null ? '' : value).replace(/\s+/g, '');

const scopedKey = (key: string, applCd: unknown) =>
  `${key}|${normalizeApplCd(applCd)}`;

// 메뉴 주소의 신청 종류(searchApplCd) — 주소가 "?a=1?searchApplCd=" 처럼 깨져 있어도 찾는다
const searchApplCdOf = (pathOrUrl: string): string => {
  const match = /[?&]searchApplCd=([^&#]*)/.exec(String(pathOrUrl || ''));

  if (!match) {
    return '';
  }

  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
};

/**
 * 결재 양식을 여는 주소 — 5240 모바일 메뉴와 같은 방식(프로그램 코드 + 쓰기 권한).
 * 신청 종류(searchApplCd)를 주소에 넣으면 5240이 새 신청서의 양식 번호를 비워 버리고,
 * dataRwType이 없으면 서버 오류가 난다(5240 EAPApprovalMgrController.viewEAPApprovalMgr).
 */
const approvalOpenPath = (row: any): string | null => {
  const progFile = String(row.progFile || '');
  const progCd = row.progCd ? String(row.progCd) : '';

  if (!progFile || !progCd) {
    return null;
  }

  const separator = progFile.includes('?') ? '&' : '?';

  return `${progFile}${separator}progCd=${encodeURIComponent(
    progCd,
  )}&dataRwType=${encodeURIComponent(String(row.dataRwType || 'R'))}`;
};

/** 메뉴 목록 응답 → 권한. 목록이 아니면(로그인 화면·오류) null */
export const parseMenuPermissions = (body: string): MenuPermissions | null => {
  let data: any;

  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  const rows = data && data.Result;

  if (!Array.isArray(rows)) {
    return null;
  }

  const keys = new Set<string>();
  const openPaths = new Map<string, string>();

  rows.forEach((row: any) => {
    const key = menuKey((row && row.progFile) || '');

    if (!key) {
      return;
    }

    if (!APPL_CD_SCOPED_KEYS.has(key)) {
      keys.add(key);
      return;
    }

    const scoped = scopedKey(key, row.applCd);

    if (key !== APPROVAL_KEY) {
      keys.add(scoped);
      return;
    }

    // 결재 양식은 제대로 열 주소를 만들 수 있을 때만 허용한다
    const openPath = approvalOpenPath(row);

    if (openPath) {
      keys.add(scoped);
      openPaths.set(scoped, openPath);
    }
  });

  return { keys, openPaths };
};

const scopedKeyOf = (pathOrUrl: string, key: string): string | null => {
  const applCd = searchApplCdOf(pathOrUrl);
  return applCd ? scopedKey(key, applCd) : null;
};

/** 열어도 되는 메뉴인가 — 모바일 목록에 있을 때만 */
export const isMenuAllowed = (
  pathOrUrl: string,
  permissions: MenuPermissions | null,
): boolean => {
  const key = menuKey(pathOrUrl);

  if (!key) {
    return false;
  }

  if (ALWAYS_ALLOWED_KEYS.has(key)) {
    return true;
  }

  if (!permissions) {
    return false;
  }

  if (APPL_CD_SCOPED_KEYS.has(key)) {
    const scoped = scopedKeyOf(pathOrUrl, key);
    return Boolean(scoped) && permissions.keys.has(scoped as string);
  }

  return permissions.keys.has(key);
};

/**
 * 목록·그리드에 그릴 메뉴 — 권한 있는 것만 (specs/023 FR-008·D10).
 * category를 주면 그 칸만, 없으면 전체.
 */
export const filterChatbotMenusByPermission = (
  canOpenMenu: (path: string) => boolean,
  category?: ChatbotMenu['category'],
): ChatbotMenu[] =>
  CHATBOT_MENUS.filter(
    (menu) =>
      (!category || menu.category === category) && canOpenMenu(menu.path),
  );

/**
 * 실제로 열 주소 — 결재 양식은 모바일 메뉴 정보로 만든 주소, 나머지는 메뉴 주소 그대로
 */
export const menuOpenPath = (
  pathOrUrl: string,
  permissions: MenuPermissions | null,
): string => {
  const key = menuKey(pathOrUrl);

  if (key !== APPROVAL_KEY || !permissions) {
    return pathOrUrl;
  }

  const scoped = scopedKeyOf(pathOrUrl, key);

  return (scoped && permissions.openPaths.get(scoped)) || pathOrUrl;
};

/** 브리지로 메뉴 목록을 받아 권한을 만든다. 실패하면 null */
export const loadMenuPermissions =
  async (): Promise<MenuPermissions | null> => {
    try {
      const result = await requestHrBridge({
        transport: 'kiwibox-bridge',
        path: MENU_LIST_PATH,
        method: 'POST',
        form: {},
      });

      return result.ok ? parseMenuPermissions(result.body) : null;
    } catch {
      return null;
    }
  };
