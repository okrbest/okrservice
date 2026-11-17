import { requestHrBridge } from '../clientTools';
import {
  ALWAYS_ALLOWED_MENU_PATHS,
  loadAllowedMenuKeys,
  isMenuAllowed,
  menuKey,
  parseAllowedMenuKeys,
} from '../menuPermission';
import { CHATBOT_MENUS } from '../chatbotMenus';

jest.mock('../clientTools', () => ({ requestHrBridge: jest.fn() }));

// 5240 /getMobileMenuList.do 응답(jsonView) — 로그인 직원의 권한 그룹·사용 여부로 걸러진 모바일 메뉴
const menuListBody = (
  rows: Array<string | { progFile: string; applCd?: string }>,
) =>
  JSON.stringify({
    Result: rows.map((row, index) => ({
      lvl: '4',
      menuCd: `M${index}`,
      menuNm: `메뉴${index}`,
      ...(typeof row === 'string' ? { progFile: row } : row),
    })),
  });

describe('menuKey', () => {
  it('경로의 마지막 화면 이름만, 쿼리·대소문자 무시', () => {
    expect(menuKey('/MobileLeaveAppl.do')).toBe('mobileleaveappl.do');
    expect(menuKey('/kiwibox/MobileLeaveAppl.do?x=1')).toBe(
      'mobileleaveappl.do',
    );
    expect(menuKey('https://hr.example.com/MobileSalaryDtstmnMgr.do?a=b')).toBe(
      'mobilesalarydtstmnmgr.do',
    );
    expect(menuKey('')).toBe('');
  });
});

describe('parseAllowedMenuKeys', () => {
  it('권한 목록의 화면 경로를 모은다', () => {
    const keys = parseAllowedMenuKeys(
      menuListBody(['/MobileLeaveAppl.do', '/MobileSalaryDtstmnMgr.do']),
    );

    expect(keys && Array.from(keys).sort()).toEqual([
      'mobileleaveappl.do',
      'mobilesalarydtstmnmgr.do',
    ]);
  });

  it('대문자 칸 이름(PROG_FILE)도 읽는다', () => {
    const keys = parseAllowedMenuKeys(
      JSON.stringify({ Result: [{ PROG_FILE: '/MobileLeaveAppl.do' }] }),
    );

    expect(keys && Array.from(keys)).toEqual(['mobileleaveappl.do']);
  });

  it('권한 메뉴가 하나도 없으면 빈 집합(확인은 됨)', () => {
    expect(parseAllowedMenuKeys(JSON.stringify({ Result: [] }))).toEqual(
      new Set(),
    );
  });

  it('로그인 화면(HTML)·오류 응답은 확인 실패(null)', () => {
    expect(parseAllowedMenuKeys('<html>login</html>')).toBeNull();
    expect(
      parseAllowedMenuKeys(JSON.stringify({ Message: 'error' })),
    ).toBeNull();
    expect(parseAllowedMenuKeys('')).toBeNull();
  });
});

describe('isMenuAllowed', () => {
  const allowed = new Set(['mobileleaveappl.do']);

  it('권한 목록에 있는 메뉴만 연다', () => {
    expect(isMenuAllowed('/MobileLeaveAppl.do', allowed)).toBe(true);
    expect(
      isMenuAllowed('/MobileSalaryDtstmnMgr.do?searchApplCd=x', allowed),
    ).toBe(false);
  });

  it('권한을 확인하지 못했으면(null) 막는다', () => {
    expect(isMenuAllowed('/MobileLeaveAppl.do', null)).toBe(false);
  });

  it('출퇴근 체크(모바일 메인)·비밀번호변경은 권한 목록과 상관없이 연다', () => {
    expect(ALWAYS_ALLOWED_MENU_PATHS).toEqual([
      '/MobileMain.do',
      '/MobileChgPwd.do',
    ]);
    expect(isMenuAllowed('/MobileMain.do', null)).toBe(true);
    expect(isMenuAllowed('/MobileChgPwd.do', new Set())).toBe(true);
  });

  it('챗봇 메뉴의 경로가 모두 화면 이름을 가진다(비교 가능)', () => {
    CHATBOT_MENUS.forEach((menu) => {
      expect(menuKey(menu.path)).toMatch(/^[a-z0-9]+\.do$/);
    });
  });
});

describe('같은 화면을 신청 종류만 바꿔 쓰는 메뉴(자유양식 신청)', () => {
  // 5240에서 도서구매·채용발령기안·출장확인서 등이 /MobileFreeDataFormReqstMgr.do 하나를 신청 종류(applCd)로 나눠 쓴다
  const allowed = parseAllowedMenuKeys(
    menuListBody([
      { progFile: '/MobileFreeDataFormReqstMgr.do', applCd: '5470' },
    ]),
  );

  it('권한 받은 신청 종류만 연다', () => {
    expect(
      isMenuAllowed(
        '/MobileFreeDataFormReqstMgr.do?searchApplCd=5470',
        allowed,
      ),
    ).toBe(true);
  });

  it('같은 화면이라도 다른 신청 종류는 막는다', () => {
    expect(
      isMenuAllowed(
        '/MobileFreeDataFormReqstMgr.do?searchApplCd=6000-303',
        allowed,
      ),
    ).toBe(false);
    expect(isMenuAllowed('/MobileFreeDataFormReqstMgr.do', allowed)).toBe(
      false,
    );
  });

  it('신청 종류 비교는 공백을 무시한다', () => {
    const spaced = parseAllowedMenuKeys(
      menuListBody([
        { progFile: '/MobileFreeDataFormReqstMgr.do', applCd: ' 6000-303 ' },
      ]),
    );
    expect(
      isMenuAllowed(
        '/MobileFreeDataFormReqstMgr.do?searchApplCd=6000-303',
        spaced,
      ),
    ).toBe(true);
  });

  it('다른 화면은 신청 종류 없이 화면 이름으로 판단한다', () => {
    const keys = parseAllowedMenuKeys(
      menuListBody([{ progFile: '/MobileWrkTypeAppl.do', applCd: '1025' }]),
    );
    expect(isMenuAllowed('/MobileWrkTypeAppl.do?searchApplCd=1025', keys)).toBe(
      true,
    );
  });

  it('PC 결재 화면(사직서 등)은 모바일 권한 목록에 없으니 막는다', () => {
    expect(
      isMenuAllowed(
        '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr?searchApplCd=1590',
        parseAllowedMenuKeys(menuListBody(['/MobileLeaveAppl.do'])),
      ),
    ).toBe(false);
  });
});

describe('loadAllowedMenuKeys', () => {
  const bridge = requestHrBridge as jest.Mock;

  afterEach(() => bridge.mockReset());

  it('브리지로 파라미터 없이 메뉴 목록을 받아 권한 집합을 만든다', async () => {
    bridge.mockResolvedValue({
      ok: true,
      status: 200,
      body: menuListBody(['/MobileLeaveAppl.do']),
    });

    const keys = await loadAllowedMenuKeys();

    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/getMobileMenuList.do', form: {} }),
    );
    expect(keys && Array.from(keys)).toEqual(['mobileleaveappl.do']);
  });

  it('브리지 거부·HTTP 오류·로그인 화면 응답·브리지 없음은 모두 확인 실패(null)', async () => {
    bridge.mockResolvedValueOnce({
      ok: false,
      status: 0,
      body: 'bridge: path not allowed',
    });
    expect(await loadAllowedMenuKeys()).toBeNull();

    bridge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: '<html>login</html>',
    });
    expect(await loadAllowedMenuKeys()).toBeNull();

    bridge.mockRejectedValueOnce(new Error('no parent bridge available'));
    expect(await loadAllowedMenuKeys()).toBeNull();
  });
});
