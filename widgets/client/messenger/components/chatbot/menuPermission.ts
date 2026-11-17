// 챗봇 HR 메뉴 권한 — 직원이 5240 모바일에서 쓸 수 있는 메뉴만 보이고 열리게 한다.
// 기준: 5240 /getMobileMenuList.do(로그인 직원의 권한 그룹 + 메뉴 사용 여부로 걸러진 모바일 메뉴).
// 확인하지 못하면(세션 만료·5240 밖 페이지·네트워크 오류) 막는다 — 권한 누락을 만들지 않는 쪽.
import { requestHrBridge } from './clientTools';

export const MENU_LIST_PATH = '/getMobileMenuList.do';

// 5240 모바일도 권한 목록과 상관없이 늘 보여 주는 화면(모바일 메인 = 출퇴근 체크, 비밀번호 변경)
export const ALWAYS_ALLOWED_MENU_PATHS = ['/MobileMain.do', '/MobileChgPwd.do'];

/** 비교용 화면 이름 — 주소의 마지막 경로 조각(쿼리 제외), 소문자 */
export const menuKey = (pathOrUrl: string): string => {
  const path = String(pathOrUrl || '')
    .split(/[?#]/)[0]
    .trim();
  const last = path.split('/').pop() || '';
  return last.toLowerCase();
};

const ALWAYS_ALLOWED_KEYS = new Set(ALWAYS_ALLOWED_MENU_PATHS.map(menuKey));

// 한 화면을 신청 종류(applCd)만 바꿔 여러 메뉴가 쓰는 화면 — 화면 이름만 보면 한 종류의 권한으로
// 다른 종류까지 열리므로 신청 종류까지 맞아야 연다(5240 도서구매·채용발령기안·출장확인서 등)
const APPL_CD_SCOPED_KEYS = new Set([
  menuKey('/MobileFreeDataFormReqstMgr.do'),
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

/** 메뉴 목록 응답 → 쓸 수 있는 화면 이름 집합. 목록이 아니면(로그인 화면·오류) null */
export const parseAllowedMenuKeys = (body: string): Set<string> | null => {
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

  rows.forEach((row: any) => {
    const key = menuKey((row && (row.progFile || row.PROG_FILE)) || '');

    if (!key) {
      return;
    }

    if (APPL_CD_SCOPED_KEYS.has(key)) {
      keys.add(scopedKey(key, row.applCd ?? row.APPL_CD));
      return;
    }

    keys.add(key);
  });

  return keys;
};

/** 열어도 되는 메뉴인가 — 권한 확인 전·실패(null)면 항상 허용 화면만 */
export const isMenuAllowed = (
  pathOrUrl: string,
  allowedKeys: Set<string> | null,
): boolean => {
  const key = menuKey(pathOrUrl);

  if (!key) {
    return false;
  }

  if (ALWAYS_ALLOWED_KEYS.has(key)) {
    return true;
  }

  if (!allowedKeys) {
    return false;
  }

  if (APPL_CD_SCOPED_KEYS.has(key)) {
    const applCd = searchApplCdOf(pathOrUrl);
    return Boolean(applCd) && allowedKeys.has(scopedKey(key, applCd));
  }

  return allowedKeys.has(key);
};

/** 브리지로 메뉴 목록을 받아 권한 집합을 만든다. 실패하면 null */
export const loadAllowedMenuKeys = async (): Promise<Set<string> | null> => {
  try {
    const result = await requestHrBridge({
      transport: 'kiwibox-bridge',
      path: MENU_LIST_PATH,
      method: 'POST',
      form: {},
    });

    return result.ok ? parseAllowedMenuKeys(result.body) : null;
  } catch {
    return null;
  }
};
