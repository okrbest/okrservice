import { CHATBOT_MENUS } from '../chatbotMenus';
import { MENU_PC_MAP } from '../menuPcMap';

// teamplgpt specs/023-widget-menu-pc-permission/contracts/menu-pc-map.md 확정안 그대로.
// 표를 바꿀 때는 계약 문서와 이 기대값을 같이 바꾼다.
const EXPECTED: Record<string, string> = {
  main: 'always',
  password: 'always',
  worktimechg: 'progCd:TAA-0990,TAA-0980',
  schedule: 'progCd:TAA-0950',
  leave: 'progCd:TAA-0070,EAP-5490',
  overtime: 'progCd:TAA-0430',
  business: 'progCd:BTR-0040,BTR-0042',
  halfleave: 'progCd:TAA-0075',
  conleave: 'progCd:TAA-0076',
  approval: 'progCd:EAP-0070,EAP-0400',
  ctsmn: 'progCd:CAC-0010',
  worktype: 'progCd:TAA-0140',
  flex2w: 'progCd:TAA-0860',
  flex3w: 'progCd:TAA-0870',
  replcholiday: 'progCd:TAA-0470,TAA-0471',
  education: 'progCd:EDU-0200,EDU-0070',
  tuition: 'progCd:SCE-0020',
  certificate: 'progCd:CTI-0010',
  salary: 'progCd:SAL-0527,SAL-0220,SAL-0230',
  grievance: 'applCd:5470',
  resign: 'applCd:1590',
  resignhitachi: 'applCd:6000-303',
  uniform: 'applCd:5200-303',
  flexmonth: 'progCd:TAA-0880',
  replcholidaypers: 'none',
  cancelappl: 'progCd:EAP-0110',
  empcard: 'progCd:PRC-0090',
  orgmembers: 'progCd:PRC-6000',
  leavestatus: 'progCd:TAA-0490',
  otschedule: 'none',
  attendstatus: 'none',
  leavecalendar: 'progCd:TAA-0370',
  otlist: 'none',
  notice: 'none',
};

const describeRule = (id: string) => {
  const rule = MENU_PC_MAP[id];
  if (!rule) return 'missing';
  if (rule.kind === 'progCd') return `progCd:${rule.codes.join(',')}`;
  if (rule.kind === 'applCd') return `applCd:${rule.applCd}`;
  return rule.kind;
};

describe('MENU_PC_MAP (위젯 버튼 ↔ 5240 PC 프로그램 대응표)', () => {
  it('챗봇 메뉴 버튼 전부에 행이 있고, 없는 버튼의 행은 없다', () => {
    expect(Object.keys(MENU_PC_MAP).sort()).toEqual(
      CHATBOT_MENUS.map((menu) => menu.id).sort(),
    );
    expect(CHATBOT_MENUS).toHaveLength(34);
  });

  it('종류별 개수가 계약과 같다(progCd 23 · applCd 4 · 없음 5 · 항상 허용 2)', () => {
    const counts = Object.values(MENU_PC_MAP).reduce<Record<string, number>>(
      (acc, rule) => ({ ...acc, [rule.kind]: (acc[rule.kind] || 0) + 1 }),
      {},
    );
    expect(counts).toEqual({ progCd: 23, applCd: 4, none: 5, always: 2 });
  });

  it.each(Object.keys(EXPECTED))('%s 행이 계약 값과 같다', (id) => {
    expect(describeRule(id)).toBe(EXPECTED[id]);
  });

  it('PC 기준에 모바일 프로그램 코드(MOS-)를 담지 않는다', () => {
    const codes = Object.values(MENU_PC_MAP).flatMap((rule) =>
      rule.kind === 'progCd' ? rule.codes : [],
    );
    expect(codes.filter((code) => code.startsWith('MOS-'))).toEqual([]);
  });

  it('항상 허용은 출퇴근 체크·비밀번호변경 두 화면뿐이다', () => {
    const always = CHATBOT_MENUS.filter(
      (menu) => MENU_PC_MAP[menu.id]?.kind === 'always',
    ).map((menu) => menu.path);
    expect(always.sort()).toEqual(['/MobileChgPwd.do', '/MobileMain.do']);
  });
});
