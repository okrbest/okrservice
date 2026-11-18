import { requestHrBridge } from '../clientTools';
import {
  ALWAYS_ALLOWED_MENU_PATHS,
  filterChatbotMenusByPermission,
  isMenuAllowed,
  loadMenuPermissions,
  menuKey,
  menuOpenPath,
  parseMenuPermissions,
  probeHrSessionAlive,
} from '../menuPermission';
import { CHATBOT_MENUS } from '../chatbotMenus';

jest.mock('../clientTools', () => ({ requestHrBridge: jest.fn() }));

// 5240 /getMobileMenuList.do 응답(jsonView) — 로그인 직원의 권한 그룹·사용 여부로 걸러진 모바일 메뉴.
// 칸 이름·값 모양은 실제 운영 응답(2026-11-17) 그대로
type Row = {
  progFile: string;
  applCd?: string | null;
  progCd?: string | null;
  dataRwType?: string;
};
const menuListBody = (rows: Array<string | Row>) =>
  JSON.stringify({
    Message: '',
    Result: rows.map((row, index) => ({
      lvl: 4,
      menuCd: `303-${index}`,
      type: 'P',
      dataRwType: 'W',
      ...(typeof row === 'string' ? { progFile: row } : row),
    })),
  });

const RESIGN_MENU =
  '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr?searchApplCd=1590';
const RESIGN_ROW: Row = {
  progFile: '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr',
  applCd: '1590',
  progCd: 'PRC-0030',
  dataRwType: 'W',
};

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

describe('parseMenuPermissions', () => {
  it('권한 목록의 화면 경로를 모은다', () => {
    const permissions = parseMenuPermissions(
      menuListBody(['/MobileLeaveAppl.do', '/MobileSalaryDtstmnMgr.do']),
    );

    expect(permissions && Array.from(permissions.keys).sort()).toEqual([
      'mobileleaveappl.do',
      'mobilesalarydtstmnmgr.do',
    ]);
  });

  it('권한 메뉴가 하나도 없으면 빈 권한(확인은 됨)', () => {
    expect(
      parseMenuPermissions(JSON.stringify({ Result: [] }))!.keys.size,
    ).toBe(0);
  });

  it('로그인 화면(HTML)·오류 응답은 확인 실패(null)', () => {
    expect(parseMenuPermissions('<html>login</html>')).toBeNull();
    expect(
      parseMenuPermissions(JSON.stringify({ Message: 'error' })),
    ).toBeNull();
    expect(parseMenuPermissions('')).toBeNull();
  });
});

describe('isMenuAllowed', () => {
  const permissions = parseMenuPermissions(
    menuListBody(['/MobileLeaveAppl.do']),
  );

  it('권한 목록에 있는 메뉴만 연다', () => {
    expect(isMenuAllowed('/MobileLeaveAppl.do', permissions)).toBe(true);
    expect(
      isMenuAllowed('/MobileSalaryDtstmnMgr.do?searchApplCd=x', permissions),
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
    expect(
      isMenuAllowed('/MobileChgPwd.do', parseMenuPermissions(menuListBody([]))),
    ).toBe(true);
  });

  it('챗봇 메뉴의 경로가 모두 화면 이름을 가진다(비교 가능)', () => {
    CHATBOT_MENUS.forEach((menu) => {
      expect(menuKey(menu.path)).toMatch(/^[a-z0-9]+\.do$/);
    });
  });
});

describe('같은 화면을 신청 종류만 바꿔 쓰는 메뉴(자유양식 신청)', () => {
  // 5240에서 고충신고서·근무복신청서 등이 /MobileFreeDataFormReqstMgr.do 하나를 신청 종류(applCd)로 나눠 쓴다
  const permissions = parseMenuPermissions(
    menuListBody([
      { progFile: '/MobileFreeDataFormReqstMgr.do', applCd: '5470' },
    ]),
  );

  it('권한 받은 신청 종류만 연다', () => {
    expect(
      isMenuAllowed(
        '/MobileFreeDataFormReqstMgr.do?searchApplCd=5470',
        permissions,
      ),
    ).toBe(true);
  });

  it('같은 화면이라도 다른 신청 종류는 막는다', () => {
    expect(
      isMenuAllowed(
        '/MobileFreeDataFormReqstMgr.do?searchApplCd=6000-303',
        permissions,
      ),
    ).toBe(false);
    expect(isMenuAllowed('/MobileFreeDataFormReqstMgr.do', permissions)).toBe(
      false,
    );
  });

  it('신청 종류 비교는 공백을 무시한다', () => {
    const spaced = parseMenuPermissions(
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
    const keys = parseMenuPermissions(
      menuListBody([{ progFile: '/MobileWrkTypeAppl.do', applCd: '1025' }]),
    );
    expect(isMenuAllowed('/MobileWrkTypeAppl.do?searchApplCd=1025', keys)).toBe(
      true,
    );
  });
});

describe('결재 양식 메뉴(사직서 등 — 모바일 목록에 결재 화면으로 들어 있음)', () => {
  it('그 신청 종류의 메뉴 권한이 있어야 연다', () => {
    expect(
      isMenuAllowed(
        RESIGN_MENU,
        parseMenuPermissions(menuListBody([RESIGN_ROW])),
      ),
    ).toBe(true);
    expect(
      isMenuAllowed(
        RESIGN_MENU,
        parseMenuPermissions(menuListBody([{ ...RESIGN_ROW, applCd: '1062' }])),
      ),
    ).toBe(false);
    expect(
      isMenuAllowed(
        RESIGN_MENU,
        parseMenuPermissions(menuListBody(['/MobileLeaveAppl.do'])),
      ),
    ).toBe(false);
  });

  it('모바일 메뉴 정보로 만든 주소(프로그램 코드 + 쓰기 권한)로 연다 — 신청 종류는 주소에 넣지 않는다', () => {
    const permissions = parseMenuPermissions(menuListBody([RESIGN_ROW]));

    expect(menuOpenPath(RESIGN_MENU, permissions)).toBe(
      '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W',
    );
  });

  it('프로그램 코드가 없어 제대로 열 수 없는 결재 양식은 막는다', () => {
    const permissions = parseMenuPermissions(
      menuListBody([{ ...RESIGN_ROW, progCd: null }]),
    );

    expect(isMenuAllowed(RESIGN_MENU, permissions)).toBe(false);
  });

  it('결재 양식이 아닌 메뉴는 주소를 바꾸지 않는다', () => {
    const permissions = parseMenuPermissions(
      menuListBody(['/MobileLeaveAppl.do', RESIGN_ROW]),
    );

    expect(menuOpenPath('/MobileLeaveAppl.do', permissions)).toBe(
      '/MobileLeaveAppl.do',
    );
    expect(menuOpenPath('/MobileLeaveAppl.do', null)).toBe(
      '/MobileLeaveAppl.do',
    );
  });
});

describe('loadMenuPermissions', () => {
  const bridge = requestHrBridge as jest.Mock;

  afterEach(() => bridge.mockReset());

  it('브리지로 파라미터 없이 메뉴 목록을 받아 권한을 만든다', async () => {
    bridge.mockResolvedValue({
      ok: true,
      status: 200,
      body: menuListBody(['/MobileLeaveAppl.do']),
    });

    const permissions = await loadMenuPermissions();

    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/getMobileMenuList.do', form: {} }),
    );
    expect(isMenuAllowed('/MobileLeaveAppl.do', permissions)).toBe(true);
  });

  it('브리지 거부·로그인 화면 응답·브리지 없음은 모두 확인 실패(null)', async () => {
    bridge.mockResolvedValueOnce({
      ok: false,
      status: 0,
      body: 'bridge: path not allowed',
    });
    expect(await loadMenuPermissions()).toBeNull();

    bridge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: '<html>login</html>',
    });
    expect(await loadMenuPermissions()).toBeNull();

    bridge.mockRejectedValueOnce(new Error('no parent bridge available'));
    expect(await loadMenuPermissions()).toBeNull();
  });
});

describe('probeHrSessionAlive', () => {
  const bridge = requestHrBridge as jest.Mock;

  afterEach(() => bridge.mockReset());

  it('chkLoginSession JSON이면 살아 있음', async () => {
    bridge.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({ timeLimit: '1200', loginInfo: 'Login!' }),
    });
    expect(await probeHrSessionAlive()).toBe(true);
    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/chkLoginSession.do', form: {} }),
    );
  });

  it('로그아웃 후 getMobileMenuList식 Result:[]만으로는 세션 판단을 하지 않는다', async () => {
    // probe는 chkLoginSession만 본다 — Result:[]가 와도 여기선 호출되지 않음
    bridge.mockResolvedValue({
      ok: false,
      status: 0,
      body: 'bridge: path not allowed',
    });
    expect(await probeHrSessionAlive()).toBe(false);
  });

  it('HTML·브리지 실패면 죽은 세션', async () => {
    bridge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: '<html>login</html>',
    });
    expect(await probeHrSessionAlive()).toBe(false);

    bridge.mockRejectedValueOnce(new Error('no parent bridge available'));
    expect(await probeHrSessionAlive()).toBe(false);
  });
});

describe('메뉴 권한 — 모바일만 (전수)', () => {
  it('모바일 목록에 없으면 열리지 않는다', () => {
    const empty = parseMenuPermissions(menuListBody([]));
    CHATBOT_MENUS.forEach((menu) => {
      if (
        ALWAYS_ALLOWED_MENU_PATHS.some(
          (path) => menuKey(path) === menuKey(menu.path),
        )
      ) {
        expect(isMenuAllowed(menu.path, empty)).toBe(true);
        return;
      }
      expect(isMenuAllowed(menu.path, empty)).toBe(false);
    });
  });

  it('조회 실패(null)면 항상 허용 두 화면만 열린다', () => {
    CHATBOT_MENUS.forEach((menu) => {
      const always = ALWAYS_ALLOWED_MENU_PATHS.some(
        (path) => menuKey(path) === menuKey(menu.path),
      );
      expect(isMenuAllowed(menu.path, null)).toBe(always);
    });
  });
});

describe('메뉴 목록·그리드용 권한 필터 (FR-008·D10)', () => {
  it('권한 없는 메뉴는 목록에서 빠지고, 권한 있는 메뉴만 남는다', () => {
    const canOpen = (path: string) =>
      path.includes('MobileMain') || path.includes('MobileChgPwd');
    const open = filterChatbotMenusByPermission(canOpen).map((m) => m.id);
    expect(open.sort()).toEqual(['main', 'password']);
  });

  it('카테고리로 자를 때도 권한 없는 메뉴는 빠진다', () => {
    const canOpen = (path: string) => path.includes('MobileLeaveAppl.do');
    const leave = filterChatbotMenusByPermission(canOpen, 'leave').map(
      (m) => m.id,
    );
    expect(leave).toEqual(['leave']);
    expect(leave).not.toContain('halfleave');
    expect(leave).not.toContain('conleave');
  });
});

describe('메뉴 정의 불변식 (코드 리뷰 반영)', () => {
  const SCOPED = new Set([
    'mobilefreedataformreqstmgr.do',
    'eapapprovalmgr.do',
  ]);

  it('신청 종류로 나뉘지 않는 화면 이름은 버튼마다 하나뿐이다', () => {
    const keys = CHATBOT_MENUS.map((menu) => menuKey(menu.path)).filter(
      (key) => !SCOPED.has(key),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('항상 허용 버튼 경로 = 항상 허용 화면 목록', () => {
    const always = CHATBOT_MENUS.filter((menu) =>
      ALWAYS_ALLOWED_MENU_PATHS.some(
        (path) => menuKey(path) === menuKey(menu.path),
      ),
    ).map((menu) => menu.path);
    expect(always.sort()).toEqual([...ALWAYS_ALLOWED_MENU_PATHS].sort());
  });
});
