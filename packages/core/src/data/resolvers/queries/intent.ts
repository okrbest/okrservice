export interface IntentButton {
  label: string;
  path: string;
}

// rpaCode → 버튼 카드 매핑
// 경로(path)만 저장. 절대 URL 조합은 위젯에서 HR_BASE_URL + path 로 수행.
const INTENT_MAP: Record<string, IntentButton[]> = {
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
  HR_APPROVAL_REQUEST: [{ label: '결재함', path: '/MobileApprovalBox.do' }],
  HR_APPROVAL_COMPLETED: [{ label: '결재함', path: '/MobileApprovalBox.do' }],
  HR_APPROVAL_WITHDRAW: [{ label: '결재함', path: '/MobileApprovalBox.do' }],
  HR_APPROVAL_RETURN: [{ label: '결재함', path: '/MobileApprovalBox.do' }],
};

/**
 * rpaCode에 대응하는 버튼 목록을 반환한다.
 * 알 수 없는 코드는 빈 배열 반환.
 */
export function getIntentButtons(rpaCode: string): IntentButton[] {
  return [...(INTENT_MAP[rpaCode] || [])];
}

/**
 * buttonName이 주어지면 버튼 전체의 label을 덮어쓴다.
 * 빈 문자열이면 원본 그대로 반환.
 */
export function applyButtonName(buttons: IntentButton[], buttonName: string): IntentButton[] {
  if (!buttonName) return buttons;
  return buttons.map(b => ({ ...b, label: buttonName }));
}
