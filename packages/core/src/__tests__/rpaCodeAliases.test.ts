/**
 * RPA 코드 별칭 매핑 검증
 * 5240 developer_guide §2.2 기준
 */

const RPA_CODE_ALIASES: Record<string, string> = {
  HR_GO_TO_WORK: 'HR_RPA_100',
  HR_PC_ON: 'HR_RPA_100',
  HR_GET_OFF_WORK: 'HR_RPA_120',
  HR_PC_OFF: 'HR_RPA_800',
};

const normalize = (code: string) => RPA_CODE_ALIASES[code] ?? code;

describe('RPA 코드 별칭 정규화', () => {
  it('HR_PC_ON → HR_RPA_100 (출근체크 + PC-ON)', () => {
    expect(normalize('HR_PC_ON')).toBe('HR_RPA_100');
  });

  it('HR_PC_OFF → HR_RPA_800 (PC 종료)', () => {
    expect(normalize('HR_PC_OFF')).toBe('HR_RPA_800');
  });

  it('HR_GET_OFF_WORK → HR_RPA_120 (퇴근체크/연장 공통 별칭)', () => {
    expect(normalize('HR_GET_OFF_WORK')).toBe('HR_RPA_120');
  });

  it('HR_GO_TO_WORK → HR_RPA_100 (PRD 호환 별칭)', () => {
    expect(normalize('HR_GO_TO_WORK')).toBe('HR_RPA_100');
  });

  it('정규 코드는 그대로 통과', () => {
    expect(normalize('HR_RPA_090')).toBe('HR_RPA_090');
    expect(normalize('HR_RPA_100')).toBe('HR_RPA_100');
    expect(normalize('HR_RPA_110')).toBe('HR_RPA_110');
    expect(normalize('HR_RPA_120')).toBe('HR_RPA_120');
    expect(normalize('HR_RPA_130')).toBe('HR_RPA_130');
    expect(normalize('HR_RPA_140')).toBe('HR_RPA_140');
    expect(normalize('HR_RPA_800')).toBe('HR_RPA_800');
  });

  it('결재 코드는 그대로 통과', () => {
    expect(normalize('HR_APPROVAL_REQUEST')).toBe('HR_APPROVAL_REQUEST');
    expect(normalize('HR_APPROVAL_COMPLETED')).toBe('HR_APPROVAL_COMPLETED');
    expect(normalize('HR_APPROVAL_WITHDRAW')).toBe('HR_APPROVAL_WITHDRAW');
    expect(normalize('HR_APPROVAL_RETURN')).toBe('HR_APPROVAL_RETURN');
  });

  it('알 수 없는 코드는 그대로 통과 (VALID_RPA_CODES에서 4001 처리)', () => {
    expect(normalize('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
  });
});
