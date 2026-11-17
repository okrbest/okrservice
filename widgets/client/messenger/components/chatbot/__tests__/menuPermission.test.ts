import { requestHrBridge } from '../clientTools';
import {
  ALWAYS_ALLOWED_MENU_PATHS,
  isMenuAllowed,
  loadMenuPermissions,
  loadPcMenuPermissions,
  menuKey,
  menuOpenPath,
  mergePcMenuPermissions,
  parseMenuPermissions,
  parsePcMenuPermissions,
} from '../menuPermission';
import { CHATBOT_MENUS } from '../chatbotMenus';
import { MENU_PC_MAP } from '../menuPcMap';

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

  it('5240 PC 메뉴와 같은 주소(프로그램 코드 + 쓰기 권한)로 연다 — 신청 종류는 주소에 넣지 않는다', () => {
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

// 5240 /getSubLowMenuList.do 응답(jsonView) — 로그인 직원의 PC 메뉴(권한 그룹별 트리).
// 칸 이름·값 모양은 실계정 응답(2026-11-17, 5240corp) 그대로: 래퍼는 소문자 result, 1~3레벨은 progCd 없음
type PcRow = {
  progCd: string | null;
  progFile?: string | null;
  applCd?: string | null;
  dataRwType?: string | null;
  lvl?: number;
};
const pcMenuRow = (row: PcRow, index: number) => ({
  lvl: 4,
  menuCd: `100-${index}`,
  grpCd: 'G01',
  type: 'P',
  progFile: '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr',
  applCd: null,
  dataRwType: 'W',
  ...row,
});
const pcMenuBody = (rows: PcRow[]) =>
  JSON.stringify({
    result: [
      {
        lvl: 1,
        menuNm: '직원 Self Service',
        progCd: null,
        progFile: null,
        applCd: null,
        dataRwType: 'R',
        type: 'M',
      },
      {
        lvl: 3,
        menuNm: '전자결재',
        progCd: null,
        progFile: 'NO_USE',
        applCd: null,
        dataRwType: null,
        type: 'M',
      },
      ...rows.map(pcMenuRow),
    ],
  });

describe('parsePcMenuPermissions', () => {
  it('프로그램 코드가 있는 행만 모은다(권한 그룹·대분류 행은 버림)', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([
        { progCd: 'TAA-0070', applCd: '1022' },
        {
          progCd: 'TAA-0950',
          progFile: '/TAAMnbyWorkPlanMgr.do?cmd=viewTAAMnbyWorkPlanMgr',
          dataRwType: 'R',
        },
      ]),
    );

    expect(pc && Array.from(pc.progCds).sort()).toEqual([
      'TAA-0070',
      'TAA-0950',
    ]);
    expect(pc && Array.from(pc.applCds)).toEqual(['1022']);
  });

  it('신청 종류는 공백을 지우고 모은다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([{ progCd: 'EAP-6000-303', applCd: ' 6000-303 ' }]),
    );
    expect(pc && Array.from(pc.applCds)).toEqual(['6000-303']);
  });

  it('결재 양식 행은 5240 PC 메뉴와 같은 주소(프로그램 코드 + 쓰기 권한)를 신청 종류별로 만든다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([{ progCd: 'PRC-0030', applCd: '1590', dataRwType: 'W' }]),
    );
    expect(pc && pc.approvalOpenPaths.get('1590')).toBe(
      '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W',
    );
  });

  it('PC 메뉴가 하나도 없으면 빈 권한(확인은 됨)', () => {
    const pc = parsePcMenuPermissions(JSON.stringify({ result: [] }));
    expect(pc && pc.progCds.size).toBe(0);
  });

  it('로그인 화면(HTML)·오류 응답·모바일 응답 모양(Result)은 확인 실패(null)', () => {
    expect(parsePcMenuPermissions('<html>login</html>')).toBeNull();
    expect(
      parsePcMenuPermissions(JSON.stringify({ Message: 'error' })),
    ).toBeNull();
    expect(parsePcMenuPermissions(JSON.stringify({ Result: [] }))).toBeNull();
    expect(parsePcMenuPermissions('')).toBeNull();
  });
});

describe('mergePcMenuPermissions', () => {
  it('직원용·담당자용 권한을 합친다', () => {
    const merged = mergePcMenuPermissions([
      parsePcMenuPermissions(
        pcMenuBody([{ progCd: 'TAA-0070', applCd: '1022' }]),
      ),
      parsePcMenuPermissions(
        pcMenuBody([
          {
            progCd: 'TAA-0490',
            progFile: '/TAADclzVcatnList.do',
            dataRwType: 'R',
          },
        ]),
      ),
    ]);
    expect(merged && Array.from(merged.progCds).sort()).toEqual([
      'TAA-0070',
      'TAA-0490',
    ]);
  });

  it('한쪽만 받았으면 받은 쪽만으로, 둘 다 못 받았으면 null', () => {
    const one = parsePcMenuPermissions(pcMenuBody([{ progCd: 'TAA-0070' }]));
    expect(mergePcMenuPermissions([one, null])!.progCds.has('TAA-0070')).toBe(
      true,
    );
    expect(mergePcMenuPermissions([null, null])).toBeNull();
  });
});

describe('loadPcMenuPermissions', () => {
  const bridge = requestHrBridge as jest.Mock;

  afterEach(() => bridge.mockReset());

  it('브리지로 menuKind 하나만 보내 PC 메뉴 권한을 받는다', async () => {
    bridge.mockResolvedValue({
      ok: true,
      status: 200,
      body: pcMenuBody([{ progCd: 'TAA-0070' }]),
    });

    const pc = await loadPcMenuPermissions('menu01');

    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/getSubLowMenuList.do',
        form: { menuKind: 'menu01' },
      }),
    );
    expect(pc && pc.progCds.has('TAA-0070')).toBe(true);
  });

  it('브리지 거부·로그인 화면 응답·브리지 없음은 모두 확인 실패(null)', async () => {
    bridge.mockResolvedValueOnce({
      ok: false,
      status: 0,
      body: 'bridge: path not allowed',
    });
    expect(await loadPcMenuPermissions('menu02')).toBeNull();

    bridge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: '<html>login</html>',
    });
    expect(await loadPcMenuPermissions('menu02')).toBeNull();

    bridge.mockRejectedValueOnce(new Error('no parent bridge available'));
    expect(await loadPcMenuPermissions('menu02')).toBeNull();
  });
});

// ─── 필수: PC·모바일 어느 쪽에도 권한이 없으면 숨김 (teamplgpt specs/023 D10) ─────────────
// 위젯 버튼 34개 × 권한 {없음·모바일만·PC만·둘 다} × 조회 {둘 다 성공·모바일 실패·PC 실패·둘 다 실패} 전수
describe('메뉴 권한 합집합 — 전수 조합', () => {
  const baseOf = (path: string) => path.replace(/[?&]searchApplCd=.*$/, '');
  const applCdOf = (path: string) => {
    const match = /[?&]searchApplCd=([^&#]*)/.exec(path);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // 그 버튼의 모바일 메뉴 행(5240 모바일 목록에 그 화면이 있다는 뜻)
  const mobileRowFor = (path: string): Row => ({
    progFile: baseOf(path),
    applCd: applCdOf(path),
    progCd: 'PRC-0030',
    dataRwType: 'W',
  });

  // 그 버튼의 PC 기준에 맞는 PC 메뉴 행. PC로 열 수 없는 버튼(none·always)은 null
  const pcRowFor = (menuId: string): PcRow | null => {
    const rule = MENU_PC_MAP[menuId];
    if (rule.kind === 'progCd') return { progCd: rule.codes[0] };
    if (rule.kind === 'applCd')
      return { progCd: 'EAP-TEST', applCd: rule.applCd };
    return null;
  };

  // 어떤 버튼과도 상관없는 행 — "목록은 받았지만 그 메뉴는 없음"
  const UNRELATED_MOBILE: Row = { progFile: '/MobileUnrelated.do' };
  const UNRELATED_PC: PcRow = { progCd: 'ZZZ-9999' };

  const grants = [
    { name: '권한 없음', mobile: false, pc: false },
    { name: '모바일만', mobile: true, pc: false },
    { name: 'PC만', mobile: false, pc: true },
    { name: '둘 다', mobile: true, pc: true },
  ];
  const fetches = [
    { name: '둘 다 조회 성공', mobileOk: true, pcOk: true },
    { name: '모바일 조회 실패', mobileOk: false, pcOk: true },
    { name: 'PC 조회 실패', mobileOk: true, pcOk: false },
    { name: '둘 다 조회 실패', mobileOk: false, pcOk: false },
  ];

  const cases = CHATBOT_MENUS.flatMap((menu) =>
    grants.flatMap((grant) =>
      fetches.map((fetchState) => ({ menu, grant, fetchState })),
    ),
  );

  it('조합 수가 버튼 34 × 권한 4 × 조회 4', () => {
    expect(cases).toHaveLength(34 * 4 * 4);
  });

  it.each(
    cases.map(({ menu, grant, fetchState }) => [
      menu.id,
      grant.name,
      fetchState.name,
      menu,
      grant,
      fetchState,
    ]),
  )('%s · %s · %s', (_id, _g, _f, menu: any, grant: any, fetchState: any) => {
    const rule = MENU_PC_MAP[menu.id];
    const pcRow = pcRowFor(menu.id);

    const mobile = fetchState.mobileOk
      ? parseMenuPermissions(
          menuListBody([
            grant.mobile ? mobileRowFor(menu.path) : UNRELATED_MOBILE,
          ]),
        )
      : null;
    const pc = fetchState.pcOk
      ? parsePcMenuPermissions(
          pcMenuBody([grant.pc && pcRow ? pcRow : UNRELATED_PC]),
        )
      : null;

    const expected =
      rule.kind === 'always' ||
      (grant.mobile && fetchState.mobileOk) ||
      (grant.pc && fetchState.pcOk && pcRow !== null);

    expect(isMenuAllowed(menu.path, { mobile, pc })).toBe(expected);
  });

  it('PC·모바일 둘 다 조회 실패면 항상 허용 두 화면만 열린다', () => {
    const open = CHATBOT_MENUS.filter((menu) =>
      isMenuAllowed(menu.path, { mobile: null, pc: null }),
    ).map((menu) => menu.id);
    expect(open.sort()).toEqual(['main', 'password']);
  });

  it('대응표에 없는 PC 코드(관리자·부서장 화면)만 있으면 버튼을 열지 않는다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([
        { progCd: 'PRC-0450' },
        { progCd: 'ORG-0070' },
        { progCd: 'TAA-0730' },
        { progCd: 'SAL-0527-303' },
      ]),
    );
    const mobile = parseMenuPermissions(menuListBody([]));
    const open = CHATBOT_MENUS.filter((menu) =>
      isMenuAllowed(menu.path, { mobile, pc }),
    ).map((menu) => menu.id);
    expect(open.sort()).toEqual(['main', 'password']);
  });

  it('PC만 있는 휴가신청·경조휴가신청·근무일정조회가 열린다(오이사공 테스트 계정)', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([
        { progCd: 'TAA-0070', applCd: '1022' },
        { progCd: 'TAA-0076', applCd: '1123' },
        { progCd: 'TAA-0950', applCd: null, dataRwType: 'R' },
      ]),
    );
    const mobile = parseMenuPermissions(
      menuListBody(['/MobileHalfLeaveAppl.do']),
    );
    [
      '/MobileLeaveAppl.do',
      '/MobileConLeaveAppl.do',
      '/MobileDclzWorkSearchCldr.do',
    ].forEach((path) => expect(isMenuAllowed(path, { mobile, pc })).toBe(true));
  });
});

describe('결재 양식 — PC 권한도 신청 종류 단위로만 (teamplgpt specs/023 US3)', () => {
  const noMobile = parseMenuPermissions(menuListBody([]));
  const pcWith = (rows: PcRow[]) => parsePcMenuPermissions(pcMenuBody(rows));
  const GRIEVANCE = '/MobileFreeDataFormReqstMgr.do?searchApplCd=5470';
  const UNIFORM = '/MobileFreeDataFormReqstMgr.do?searchApplCd=5200-303';
  const HITACHI = '/MobileFreeDataFormReqstMgr.do?searchApplCd=6000-303';

  it('PC에 고충신고서(5470)만 있으면 고충신고서만 열린다', () => {
    const sources = {
      mobile: noMobile,
      pc: pcWith([{ progCd: 'EAP-5470', applCd: '5470' }]),
    };
    expect(isMenuAllowed(GRIEVANCE, sources)).toBe(true);
    expect(isMenuAllowed(UNIFORM, sources)).toBe(false);
    expect(isMenuAllowed(HITACHI, sources)).toBe(false);
  });

  it('PC에 사직서(직원, 1590)만 있으면 사직서(히타치)는 열리지 않는다', () => {
    const sources = {
      mobile: noMobile,
      pc: pcWith([{ progCd: 'PRC-0030', applCd: '1590' }]),
    };
    expect(isMenuAllowed(RESIGN_MENU, sources)).toBe(true);
    expect(isMenuAllowed(HITACHI, sources)).toBe(false);
  });

  it('PC에 사직서테스트(히타치, 6000-303)가 있으면 사직서(히타치)만 열린다', () => {
    const sources = {
      mobile: noMobile,
      pc: pcWith([{ progCd: 'EAP-6000-303', applCd: '6000-303' }]),
    };
    expect(isMenuAllowed(HITACHI, sources)).toBe(true);
    expect(isMenuAllowed(RESIGN_MENU, sources)).toBe(false);
    expect(isMenuAllowed(GRIEVANCE, sources)).toBe(false);
  });

  it('모바일 메뉴 정보 없이 PC 사직서 행만 있으면 PC 메뉴 정보로 만든 주소로 연다', () => {
    const sources = {
      mobile: noMobile,
      pc: pcWith([{ progCd: 'PRC-0030', applCd: '1590', dataRwType: 'W' }]),
    };
    expect(menuOpenPath(RESIGN_MENU, sources)).toBe(
      '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W',
    );
  });

  it('모바일 메뉴 정보가 있으면 그것을 먼저 쓴다', () => {
    const sources = {
      mobile: parseMenuPermissions(
        menuListBody([{ ...RESIGN_ROW, progCd: 'MOB-1590' }]),
      ),
      pc: pcWith([{ progCd: 'PRC-0030', applCd: '1590', dataRwType: 'W' }]),
    };
    expect(menuOpenPath(RESIGN_MENU, sources)).toBe(
      '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=MOB-1590&dataRwType=W',
    );
  });

  it('PC·모바일 어디에도 사직서 정보가 없으면 버튼 주소 그대로', () => {
    expect(
      menuOpenPath(RESIGN_MENU, { mobile: noMobile, pc: pcWith([]) }),
    ).toBe(RESIGN_MENU);
  });
});

describe('PC 결재 양식 행만 신청 종류로 인정 (코드 리뷰 반영)', () => {
  const noMobile = parseMenuPermissions(menuListBody([]));

  it('결재 화면이 아닌 행(관리·조회 화면)에 붙은 신청 종류는 권한으로 보지 않는다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([
        {
          progCd: 'EAP-9999',
          applCd: '5470',
          progFile: '/EAPGrievanceAdminMgr.do?cmd=viewEAPGrievanceAdminMgr',
          dataRwType: 'W',
        },
      ]),
    );
    expect(pc && pc.applCds.has('5470')).toBe(false);
    expect(
      isMenuAllowed('/MobileFreeDataFormReqstMgr.do?searchApplCd=5470', {
        mobile: noMobile,
        pc,
      }),
    ).toBe(false);
  });

  it('사직서 여는 주소는 결재 화면 행으로만 만든다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([
        {
          progCd: 'PRC-9000',
          applCd: '1590',
          progFile: '/PRCResignListMgr.do?cmd=viewPRCResignListMgr',
          dataRwType: 'R',
        },
        { progCd: 'PRC-0030', applCd: '1590', dataRwType: 'W' },
      ]),
    );
    expect(menuOpenPath(RESIGN_MENU, { mobile: noMobile, pc })).toBe(
      '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W',
    );
  });

  it('PC 정보로 사직서를 열 주소를 만들 수 없으면(프로그램 코드 없음) 열지 않는다', () => {
    const pc = parsePcMenuPermissions(
      pcMenuBody([{ progCd: 'PRC-0030', applCd: '1590', progFile: null }]),
    );
    expect(isMenuAllowed(RESIGN_MENU, { mobile: noMobile, pc })).toBe(false);
  });
});

describe('메뉴 정의 불변식 (코드 리뷰 반영)', () => {
  const SCOPED = new Set([
    'mobilefreedataformreqstmgr.do',
    'eapapprovalmgr.do',
  ]);

  it('신청 종류로 나뉘지 않는 화면 이름은 버튼마다 하나뿐이다(PC 대응표가 다른 버튼에 걸리지 않게)', () => {
    const keys = CHATBOT_MENUS.map((menu) => menuKey(menu.path)).filter(
      (key) => !SCOPED.has(key),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('대응표의 항상 허용 버튼 = 항상 허용 화면 목록', () => {
    const always = CHATBOT_MENUS.filter(
      (menu) => MENU_PC_MAP[menu.id].kind === 'always',
    ).map((menu) => menu.path);
    expect(always.sort()).toEqual([...ALWAYS_ALLOWED_MENU_PATHS].sort());
  });
});
