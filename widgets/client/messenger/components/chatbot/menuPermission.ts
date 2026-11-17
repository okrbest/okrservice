// 챗봇 HR 메뉴 권한 — 직원이 5240 모바일 또는 PC에서 쓸 수 있는 메뉴만 보이고 열리게 한다.
// 기준: 5240 /getMobileMenuList.do(모바일 메뉴) + /getSubLowMenuList.do(PC 메뉴, 버튼별 대응표 menuPcMap).
// 둘 중 하나라도 권한이 있으면 연다. 어느 쪽에도 없으면 막는다(필수 — teamplgpt specs/023 D10).
// 확인하지 못한 쪽(세션 만료·5240 밖 페이지·네트워크 오류)은 권한 없음으로 본다 — 권한 누락을 만들지 않는 쪽.
import { CHATBOT_MENUS, ChatbotMenu } from './chatbotMenus';
import { requestHrBridge } from './clientTools';
import { menuPcRule } from './menuPcMap';

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
 * 결재 양식을 여는 주소 — 5240 PC 메뉴와 같은 방식(프로그램 코드 + 쓰기 권한).
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

/** 모바일·PC 권한 묶음. 받지 못한 쪽은 null */
export type MenuPermissionSources = {
  mobile: MenuPermissions | null;
  pc: PcMenuPermissions | null;
};

/** 모바일 권한만 넘기던 기존 호출도 받는다 */
export type MenuPermissionInput =
  | MenuPermissions
  | MenuPermissionSources
  | null;

const toSources = (permissions: MenuPermissionInput): MenuPermissionSources => {
  if (!permissions) {
    return { mobile: null, pc: null };
  }

  return 'keys' in permissions
    ? { mobile: permissions, pc: null }
    : permissions;
};

/** 화면 주소 → 챗봇 메뉴 버튼. 신청 종류로 나뉘는 화면은 신청 종류까지 같아야 같은 버튼 */
const findChatbotMenu = (pathOrUrl: string): ChatbotMenu | undefined => {
  const key = menuKey(pathOrUrl);

  if (!APPL_CD_SCOPED_KEYS.has(key)) {
    return CHATBOT_MENUS.find((menu) => menuKey(menu.path) === key);
  }

  const applCd = normalizeApplCd(searchApplCdOf(pathOrUrl));

  return applCd
    ? CHATBOT_MENUS.find(
        (menu) =>
          menuKey(menu.path) === key &&
          normalizeApplCd(searchApplCdOf(menu.path)) === applCd,
      )
    : undefined;
};

/** 모바일 메뉴 권한으로 열 수 있는가(현행 규칙) */
const isMobileMenuAllowed = (
  pathOrUrl: string,
  permissions: MenuPermissions | null,
): boolean => {
  const key = menuKey(pathOrUrl);

  if (!permissions) {
    return false;
  }

  if (APPL_CD_SCOPED_KEYS.has(key)) {
    const scoped = scopedKeyOf(pathOrUrl, key);
    return Boolean(scoped) && permissions.keys.has(scoped as string);
  }

  return permissions.keys.has(key);
};

/** PC 메뉴 권한으로 열 수 있는가 — 버튼별 대응표(menuPcMap)에 짝지은 PC 프로그램이 있을 때만 */
const isPcMenuAllowed = (
  pathOrUrl: string,
  pc: PcMenuPermissions | null,
): boolean => {
  if (!pc) {
    return false;
  }

  const menu = findChatbotMenu(pathOrUrl);

  if (!menu) {
    return false;
  }

  const rule = menuPcRule(menu.id);

  if (rule.kind === 'progCd') {
    return rule.codes.some((code) => pc.progCds.has(code));
  }

  if (rule.kind === 'applCd') {
    const applCd = normalizeApplCd(rule.applCd);

    // 결재 화면으로 여는 버튼(사직서 등)은 제대로 열 주소를 만들 수 있을 때만 — 모바일 쪽과 같은 규칙
    return menuKey(menu.path) === APPROVAL_KEY
      ? pc.approvalOpenPaths.has(applCd)
      : pc.applCds.has(applCd);
  }

  return false;
};

/** 열어도 되는 메뉴인가 — 모바일·PC 중 하나라도 권한이 있으면. 둘 다 확인 전·실패면 항상 허용 화면만 */
export const isMenuAllowed = (
  pathOrUrl: string,
  permissions: MenuPermissionInput,
): boolean => {
  const key = menuKey(pathOrUrl);

  if (!key) {
    return false;
  }

  if (ALWAYS_ALLOWED_KEYS.has(key)) {
    return true;
  }

  const { mobile, pc } = toSources(permissions);

  return (
    isMobileMenuAllowed(pathOrUrl, mobile) || isPcMenuAllowed(pathOrUrl, pc)
  );
};

/**
 * 실제로 열 주소 — 결재 양식은 5240 메뉴 정보로 만든 주소(모바일 메뉴 → PC 메뉴 순),
 * 나머지는 메뉴 주소 그대로
 */
export const menuOpenPath = (
  pathOrUrl: string,
  permissions: MenuPermissionInput,
): string => {
  const key = menuKey(pathOrUrl);

  if (key !== APPROVAL_KEY) {
    return pathOrUrl;
  }

  const { mobile, pc } = toSources(permissions);
  const scoped = scopedKeyOf(pathOrUrl, key);
  const applCd = normalizeApplCd(searchApplCdOf(pathOrUrl));

  return (
    (mobile && scoped && mobile.openPaths.get(scoped)) ||
    (pc && applCd && pc.approvalOpenPaths.get(applCd)) ||
    pathOrUrl
  );
};

// ─── PC 메뉴 권한 (teamplgpt specs/023) ─────────────────────────────────
// 5240은 PC·모바일 메뉴 권한을 따로 관리한다. PC 권한만 있는 직원도 같은 기능의 모바일 화면은 열리므로,
// 위젯은 둘 중 하나라도 있으면 버튼을 보인다(어느 쪽에도 없으면 숨김 — 필수).
// 기준: 5240 /getSubLowMenuList.do(로그인 직원의 PC 메뉴 트리). 직원용(menu01)·담당자용(menu02)을 합친다.

export const PC_MENU_LIST_PATH = '/getSubLowMenuList.do';
export type PcMenuKind = 'menu01' | 'menu02';
export const PC_MENU_KINDS: PcMenuKind[] = ['menu01', 'menu02'];

export type PcMenuPermissions = {
  /** PC에서 쓸 수 있는 프로그램 코드 */
  progCds: Set<string>;
  /** PC 결재 양식 메뉴의 신청 종류(공백 제거) */
  applCds: Set<string>;
  /** 신청 종류 → 결재 양식을 여는 주소(PC 메뉴 정보로 만든 것) */
  approvalOpenPaths: Map<string, string>;
};

const emptyPcPermissions = (): PcMenuPermissions => ({
  progCds: new Set(),
  applCds: new Set(),
  approvalOpenPaths: new Map(),
});

/** PC 메뉴 목록 응답 → 권한. 목록이 아니면(로그인 화면·오류) null */
export const parsePcMenuPermissions = (
  body: string,
): PcMenuPermissions | null => {
  let data: any;

  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  // PC 응답은 소문자 result(모바일은 Result) — 실계정 응답 2026-11-17
  const rows = data && data.result;

  if (!Array.isArray(rows)) {
    return null;
  }

  // 누적값은 이 함수 안에서 새로 만든 Set/Map이라 밖으로 새지 않는다(모바일 파서와 같은 방식)
  return rows.reduce<PcMenuPermissions>((acc, row: any) => {
    const progCd = row && row.progCd ? String(row.progCd).trim() : '';

    // 권한 그룹·대분류 행(1~3레벨)은 프로그램이 없다
    if (!progCd) {
      return acc;
    }

    acc.progCds.add(progCd);

    // 신청 종류는 결재 화면(신청서) 행에서만 — 관리·조회 화면 행에 붙은 신청 종류로 버튼이 열리지 않게
    const applCd =
      menuKey(row.progFile || '') === APPROVAL_KEY
        ? normalizeApplCd(row.applCd)
        : '';

    if (applCd) {
      acc.applCds.add(applCd);
      const openPath = approvalOpenPath(row);

      if (openPath && !acc.approvalOpenPaths.has(applCd)) {
        acc.approvalOpenPaths.set(applCd, openPath);
      }
    }

    return acc;
  }, emptyPcPermissions());
};

/** 직원용·담당자용 PC 권한을 합친다. 받은 것이 없으면 null */
export const mergePcMenuPermissions = (
  list: Array<PcMenuPermissions | null>,
): PcMenuPermissions | null => {
  const received = list.filter(
    (item): item is PcMenuPermissions => item !== null,
  );

  if (received.length === 0) {
    return null;
  }

  return received.reduce<PcMenuPermissions>((acc, item) => {
    item.progCds.forEach((code) => acc.progCds.add(code));
    item.applCds.forEach((code) => acc.applCds.add(code));
    item.approvalOpenPaths.forEach((path, code) => {
      if (!acc.approvalOpenPaths.has(code)) {
        acc.approvalOpenPaths.set(code, path);
      }
    });
    return acc;
  }, emptyPcPermissions());
};

/** 브리지로 PC 메뉴 목록(직원용 또는 담당자용)을 받아 권한을 만든다. 실패하면 null */
export const loadPcMenuPermissions = async (
  menuKind: PcMenuKind,
): Promise<PcMenuPermissions | null> => {
  try {
    const result = await requestHrBridge({
      transport: 'kiwibox-bridge',
      path: PC_MENU_LIST_PATH,
      method: 'POST',
      form: { menuKind },
    });

    return result.ok ? parsePcMenuPermissions(result.body) : null;
  } catch {
    return null;
  }
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
