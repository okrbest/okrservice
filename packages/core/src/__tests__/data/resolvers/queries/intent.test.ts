import { getIntentButtons } from '../../../../data/resolvers/queries/intent';

describe('getIntentButtons', () => {
  it('HR_RPA_100 → 출퇴근 체크 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_100');
    expect(buttons).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_090 → 출퇴근 체크 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_090');
    expect(buttons).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_120 → 출퇴근 체크 + 연장근무신청 두 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_120');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual({ label: '출퇴근 체크', path: '/MobileMain.do' });
    expect(buttons[1]).toEqual({ label: '연장근무신청', path: '/MobileOvertimeAppl.do' });
  });

  it('HR_RPA_130 → 출퇴근 체크 + 연장근무신청 두 버튼 반환', () => {
    const buttons = getIntentButtons('HR_RPA_130');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqual({ label: '출퇴근 체크', path: '/MobileMain.do' });
    expect(buttons[1]).toEqual({ label: '연장근무신청', path: '/MobileOvertimeAppl.do' });
  });

  it('HR_RPA_140 → 출퇴근 체크 버튼 반환', () => {
    expect(getIntentButtons('HR_RPA_140')).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_800 → 출퇴근 체크 버튼 반환', () => {
    expect(getIntentButtons('HR_RPA_800')).toEqual([{ label: '출퇴근 체크', path: '/MobileMain.do' }]);
  });

  it('HR_RPA_110 → 알림 전용이라 빈 배열', () => {
    expect(getIntentButtons('HR_RPA_110')).toEqual([]);
  });

  it('HR_APPROVAL_REQUEST → 결재함 버튼 반환', () => {
    expect(getIntentButtons('HR_APPROVAL_REQUEST')).toEqual([{ label: '결재함', path: '/MobileApprovalBox.do' }]);
  });

  it('HR_APPROVAL_COMPLETED → 결재함 버튼 반환', () => {
    expect(getIntentButtons('HR_APPROVAL_COMPLETED')).toEqual([{ label: '결재함', path: '/MobileApprovalBox.do' }]);
  });

  it('HR_APPROVAL_WITHDRAW → 결재함 버튼 반환', () => {
    expect(getIntentButtons('HR_APPROVAL_WITHDRAW')).toEqual([{ label: '결재함', path: '/MobileApprovalBox.do' }]);
  });

  it('HR_APPROVAL_RETURN → 결재함 버튼 반환', () => {
    expect(getIntentButtons('HR_APPROVAL_RETURN')).toEqual([{ label: '결재함', path: '/MobileApprovalBox.do' }]);
  });

  it('알 수 없는 rpaCode → 빈 배열', () => {
    expect(getIntentButtons('UNKNOWN_CODE')).toEqual([]);
  });

  it('빈 문자열 → 빈 배열', () => {
    expect(getIntentButtons('')).toEqual([]);
  });
});
