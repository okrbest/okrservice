import { getIntentButtons, applyButtonName } from '../../../../data/resolvers/queries/intent';

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

describe('applyButtonName', () => {
  it('buttonName 전달 시 모든 버튼 label 오버라이드', () => {
    const buttons = getIntentButtons('HR_RPA_100');
    expect(applyButtonName(buttons, '출근하기')).toEqual([
      { label: '출근하기', path: '/MobileMain.do' },
    ]);
  });

  it('buttonName 전달 시 버튼 여러 개 전체 오버라이드', () => {
    const buttons = getIntentButtons('HR_RPA_120');
    const result = applyButtonName(buttons, '확인하기');
    expect(result).toEqual([
      { label: '확인하기', path: '/MobileMain.do' },
      { label: '확인하기', path: '/MobileOvertimeAppl.do' },
    ]);
  });

  it('빈 buttonName → 원본 반환', () => {
    const buttons = getIntentButtons('HR_RPA_100');
    expect(applyButtonName(buttons, '')).toEqual(buttons);
  });

  it('빈 버튼 배열 + buttonName → 빈 배열', () => {
    expect(applyButtonName([], '무언가')).toEqual([]);
  });

  it('원본 buttons 객체를 변경하지 않음 (불변성)', () => {
    const buttons = getIntentButtons('HR_RPA_100');
    applyButtonName(buttons, '변경');
    expect(buttons[0].label).toBe('출퇴근 체크');
  });
});
