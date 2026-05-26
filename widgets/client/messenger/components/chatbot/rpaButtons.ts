export interface RpaButton {
  label: string;
  path: string;
}

const RPA_BUTTON_MAP: Record<string, RpaButton[]> = {
  HR_RPA_090: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_100: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_110: [],
  HR_RPA_120: [
    { label: '출퇴근 체크', path: '/MobileMain.do' },
    { label: '연장근무신청', path: '/MobileOvertimeAppl.do' },
  ],
  HR_RPA_130: [
    { label: '출퇴근 체크', path: '/MobileMain.do' },
    { label: '연장근무신청', path: '/MobileOvertimeAppl.do' },
  ],
  HR_RPA_140: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
  HR_RPA_800: [{ label: '출퇴근 체크', path: '/MobileMain.do' }],
};

export function getRpaButtonsForCode(rpaCode: string): RpaButton[] {
  return [...(RPA_BUTTON_MAP[rpaCode] || [])];
}

export function resolveRpaButtons(
  rpaCode: string,
  buttons?: Array<{ label: string; path: string }> | null,
): RpaButton[] {
  if (Array.isArray(buttons) && buttons.length > 0) {
    return buttons;
  }

  return getRpaButtonsForCode(rpaCode);
}
