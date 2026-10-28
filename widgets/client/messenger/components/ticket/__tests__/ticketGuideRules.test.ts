import {
  TICKET_GUIDE_SEEN_KEY,
  isTicketGuideSeen,
  ticketGuideRows,
} from '../ticketGuideRules';

describe('티켓 진행 상황 첫 안내', () => {
  it('"확인"을 누른 기록이 있으면 다시 보이지 않는다', () => {
    expect(TICKET_GUIDE_SEEN_KEY).toBe('ticketViewGuideSeen');
    // 위젯 저장소는 문자열로 남는다(setLocalStorageItem)
    expect(isTicketGuideSeen('true')).toBe(true);
    expect(isTicketGuideSeen(true)).toBe(true);
    expect(isTicketGuideSeen(undefined)).toBe(false);
    expect(isTicketGuideSeen('')).toBe(false);
  });

  it('"새 탭에서 보기" 버튼이 있을 때만 그 줄을 보여 준다(원본 줄은 항상)', () => {
    expect(ticketGuideRows(true)).toEqual(['newTab', 'original']);
    expect(ticketGuideRows(false)).toEqual(['original']);
  });
});
