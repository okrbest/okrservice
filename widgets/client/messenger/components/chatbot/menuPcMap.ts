// 챗봇 HR 메뉴 버튼 ↔ 5240 PC 프로그램 대응표.
// 5240은 PC 메뉴와 모바일 메뉴 권한을 따로 관리하고 둘을 잇는 정보가 없다. 버튼(모바일 화면)마다
// 같은 기능의 PC 직원용 프로그램을 적어 두고, 그 PC 메뉴 권한이 있으면 모바일 권한이 없어도 버튼을 보인다.
// 짝짓기 원칙: 직원용 PC 메뉴(menuKind=menu01)에 같은 기능으로 걸린 프로그램만. 애매하면 'none'
// (모바일 권한만으로 판단 — 잘못 열리는 것보다 잘못 닫히는 쪽). 회사 전용 코드(-303 등)는 넣지 않는다.
// 정본: teamplgpt specs/023-widget-menu-pc-permission/contracts/menu-pc-map.md
export type MenuPcRule =
  /** 권한과 상관없이 늘 보이는 화면 */
  | { kind: 'always' }
  /** PC 메뉴에 이 프로그램 코드 중 하나가 있으면 PC 권한 있음 */
  | { kind: 'progCd'; codes: string[] }
  /** PC 메뉴에 이 신청 종류(결재 양식)가 있으면 PC 권한 있음 */
  | { kind: 'applCd'; applCd: string }
  /** PC 권한은 보지 않는다(모바일 권한만) */
  | { kind: 'none' };

const progCd = (...codes: string[]): MenuPcRule => ({ kind: 'progCd', codes });
const applCd = (code: string): MenuPcRule => ({ kind: 'applCd', applCd: code });
const ALWAYS: MenuPcRule = { kind: 'always' };
const NONE: MenuPcRule = { kind: 'none' };

export const MENU_PC_MAP: Readonly<Record<string, MenuPcRule>> = Object.freeze({
  main: ALWAYS,
  password: ALWAYS,
  worktimechg: progCd('TAA-0990', 'TAA-0980'),
  schedule: progCd('TAA-0950'),
  leave: progCd('TAA-0070', 'EAP-5490'),
  overtime: progCd('TAA-0430'),
  business: progCd('BTR-0040', 'BTR-0042'),
  halfleave: progCd('TAA-0075'),
  conleave: progCd('TAA-0076'),
  approval: progCd('EAP-0070', 'EAP-0400'),
  ctsmn: progCd('CAC-0010'),
  worktype: progCd('TAA-0140'),
  flex2w: progCd('TAA-0860'),
  flex3w: progCd('TAA-0870'),
  replcholiday: progCd('TAA-0470', 'TAA-0471'),
  education: progCd('EDU-0200', 'EDU-0070'),
  tuition: progCd('SCE-0020'),
  certificate: progCd('CTI-0010'),
  salary: progCd('SAL-0527', 'SAL-0220', 'SAL-0230'),
  // 결재 양식 — 같은 화면을 여러 신청서가 같이 써서 신청 종류까지 맞아야 한다
  grievance: applCd('5470'),
  resign: applCd('1590'),
  resignhitachi: applCd('6000-303'),
  uniform: applCd('5200-303'),
  flexmonth: progCd('TAA-0880'),
  replcholidaypers: NONE,
  cancelappl: progCd('EAP-0110'),
  empcard: progCd('PRC-0090'),
  orgmembers: progCd('PRC-6000'),
  leavestatus: progCd('TAA-0490'),
  otschedule: NONE,
  attendstatus: NONE,
  leavecalendar: progCd('TAA-0370'),
  otlist: NONE,
  notice: NONE,
});

/** 버튼 id의 PC 기준. 표에 없는 버튼은 'none'(모바일 권한만) */
export const menuPcRule = (menuId: string): MenuPcRule =>
  Object.prototype.hasOwnProperty.call(MENU_PC_MAP, menuId)
    ? MENU_PC_MAP[menuId]
    : NONE;
