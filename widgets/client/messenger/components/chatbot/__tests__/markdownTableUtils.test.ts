import {
  cellText,
  isNumericColumn,
  isTimeColumn,
  issueTarget,
  rowIssues,
  parseAmount,
  statusKind,
  isTotalRow,
  workHoursTable,
  workHoursGeometry,
} from '../markdownTableUtils';

describe('markdownTableUtils', () => {
  it('마크다운 강조 기호를 걷어낸 칸 글자를 준다', () => {
    expect(cellText('**정상**')).toBe('정상');
    expect(cellText(' `1,000원` ')).toBe('1,000원');
  });

  it('금액·시간·일수 칸은 숫자 열로 본다 (빈칸·대시는 무시)', () => {
    expect(isNumericColumn(['3,200,000', '412,500원', '-', ''])).toBe(true);
    expect(isNumericColumn(['8.3', '10.3h', '0'])).toBe(true);
    expect(isNumericColumn(['15일', '3일'])).toBe(true);
    expect(isNumericColumn(['08:52', '09:14'])).toBe(true);
    expect(isNumericColumn(['정상', '8.3'])).toBe(false);
    expect(isNumericColumn(['9/1', '9/2'])).toBe(false);
    expect(isNumericColumn(['-', ''])).toBe(false);
  });

  it('시각 열은 따로 구분한다 (막대를 그리지 않기 위해)', () => {
    expect(isTimeColumn(['08:52', '-', '18:10'])).toBe(true);
    expect(isTimeColumn(['8.3', '10.3'])).toBe(false);
  });

  it('4자리 시각(0900)은 머리글이 시각 열일 때만 시각으로 본다', () => {
    expect(isTimeColumn(['0855', '0910', '-'], '출근')).toBe(true);
    expect(isTimeColumn(['0900', '1000'], '기준출근')).toBe(true);
    expect(isTimeColumn(['0900', '1000'], '금액')).toBe(false);
    expect(isTimeColumn(['0900', '1000'])).toBe(false);
    expect(isTimeColumn(['2500', '0900'], '출근')).toBe(false);
  });

  it('숫자 값을 읽는다', () => {
    expect(parseAmount('3,200,000')).toBe(3200000);
    expect(parseAmount('412,500원')).toBe(412500);
    expect(parseAmount('10.3h')).toBe(10.3);
    expect(parseAmount('-')).toBeNull();
    expect(parseAmount('08:52')).toBeNull();
  });

  it('알려진 상태 값만 알약 종류를 준다', () => {
    expect(statusKind('정상')).toBe('ok');
    expect(statusKind('**지각**')).toBe('warn');
    expect(statusKind('결근')).toBe('danger');
    expect(statusKind('휴무')).toBe('off');
    expect(statusKind('정상 출근했어요')).toBeNull();
  });

  it('합계·총·계로 시작하는 줄을 합계 줄로 본다', () => {
    expect(isTotalRow(['합계', '5,412,500'])).toBe(true);
    expect(isTotalRow(['**총 지급액**', '5,412,500'])).toBe(true);
    expect(isTotalRow(['계', '3'])).toBe(true);
    expect(isTotalRow(['기본급', '3,200,000'])).toBe(false);
    expect(isTotalRow(['계약직 수당', '100'])).toBe(false);
  });

  it('지각·조퇴 여부를 상태·지각 칸·분 칸에서 읽는다', () => {
    const h = ['일자', '출근', '퇴근', '상태', '지각', '조퇴(분)'];
    expect(rowIssues(h, ['7/3', '09:10', '18:05', '정상', 'Y', ''])).toEqual({
      late: true,
      early: false,
    });
    expect(rowIssues(h, ['7/4', '08:50', '17:30', '정상', '', '30'])).toEqual({
      late: false,
      early: true,
    });
    expect(rowIssues(h, ['7/5', '08:50', '18:00', '정상', '', '0'])).toEqual({
      late: false,
      early: false,
    });
    expect(rowIssues(['상태'], ['지각'])).toEqual({ late: true, early: false });
  });

  it('근무판정 칸(teamplgpt 2026-10-21)에서 지각·조퇴를 읽는다', () => {
    const h = ['일자', '요일', '출근', '퇴근', '근무판정', '근무특이사항'];
    expect(
      rowIssues(h, [
        '10-13',
        '화',
        '09:20',
        '17:00',
        '지각, 조퇴',
        '지각 / 조퇴',
      ]),
    ).toEqual({
      late: true,
      early: true,
    });
    expect(
      rowIssues(h, ['10-12', '월', '08:55', '18:05', '정상', '출근']),
    ).toEqual({
      late: false,
      early: false,
    });
    // 근무특이사항에 "지각"이 있어도 근무판정이 기준 — 특이사항 문구는 판정이 아니다
    expect(
      rowIssues(h, ['10-14', '화', '08:55', '18:05', '', '지각 처리 취소']),
    ).toEqual({
      late: false,
      early: false,
    });
  });

  it('출퇴근 누락은 경고색', () => {
    expect(statusKind('출퇴근 누락')).toBe('danger');
  });

  it('강조 대상은 출근·퇴근 칸이고 기준 칸은 제외한다', () => {
    expect(issueTarget('출근')).toBe('late');
    expect(issueTarget('퇴근')).toBe('early');
    expect(issueTarget('기준출근')).toBeNull();
    expect(issueTarget('상태')).toBeNull();
  });
});

describe('workHoursTable (teamplgpt specs/019)', () => {
  it('구분·누적 근로·월간 소정·최대 가능이 모두 있으면 칸 위치를 돌려준다', () => {
    expect(
      workHoursTable([
        '구분',
        '누적 근로',
        '월간 소정',
        '최대 가능',
        '소정까지',
      ]),
    ).toEqual({ label: 0, worked: 1, normal: 2, max: 3, toNormal: 4 });
  });

  it('소정까지 칸이 없어도 판별한다', () => {
    expect(
      workHoursTable(['구분', '누적 근로', '월간 소정', '최대 가능']),
    ).toEqual({ label: 0, worked: 1, normal: 2, max: 3, toNormal: -1 });
  });

  it.each([
    [['구분', '한도', '사용', '잔여']],
    [['구분', '누적 근로', '월간 소정']],
    [['월', '누적 근로', '월간 소정', '최대 가능']],
  ])('다른 표 %p → null', (headers) => {
    expect(workHoursTable(headers)).toBeNull();
  });
});

describe('workHoursGeometry — 막대 안 위치는 모두 최대 가능 기준 (019 코드 리뷰 M-1)', () => {
  it.each([
    // [누적, 소정, 최대] → fill, normalAt, split(채움 안에서 주황 시작 %), over
    [82.5, 171, 224, { fill: 37, normalAt: 76, split: 100, over: false }],
    [176, 168, 220, { fill: 80, normalAt: 76, split: 95, over: true }],
    // 누적 > 최대: 채움 100에서 멈추고, 주황은 소정 세로선(76%)에서 시작해야 한다
    [250, 171, 224, { fill: 100, normalAt: 76, split: 76, over: true }],
    [0, 171, 224, { fill: 0, normalAt: 76, split: 100, over: false }],
    // 소정 0: 전부 소정 초과
    [10, 0, 52, { fill: 19, normalAt: 0, split: 0, over: true }],
    // 소정 > 최대(데이터 이상): 세로선은 끝에서 멈춘다
    [100, 300, 224, { fill: 45, normalAt: 100, split: 100, over: false }],
    // 음수 누적은 0으로
    [-5, 171, 224, { fill: 0, normalAt: 76, split: 100, over: false }],
  ])('누적 %p 소정 %p 최대 %p', (worked, normal, max, expected) => {
    expect(workHoursGeometry(worked, normal, max)).toEqual(expected);
  });
});
