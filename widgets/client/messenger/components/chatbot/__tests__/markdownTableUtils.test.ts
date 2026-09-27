import {
  cellText,
  isNumericColumn,
  isTimeColumn,
  parseAmount,
  statusKind,
  isTotalRow,
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
});
