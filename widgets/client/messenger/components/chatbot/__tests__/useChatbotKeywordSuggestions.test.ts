import { renderHook, act } from '@testing-library/react';
import { useChatbotKeywordSuggestions } from '../useChatbotKeywordSuggestions';

jest.useFakeTimers();

describe('useChatbotKeywordSuggestions', () => {
  afterEach(() => jest.clearAllTimers());

  it('입력이 1자 이하면 빈 결과를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('가'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus).toEqual([]);
    expect(result.current.questions).toEqual([]);
  });

  it('키워드 없는 문장은 빈 결과를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('안녕하세요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus).toEqual([]);
    expect(result.current.questions).toEqual([]);
  });

  it('500ms 이전에는 결과가 갱신되지 않는다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('휴가 내고 싶어요'));
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current.menus).toEqual([]);
  });

  it('"휴가" 포함 문장은 500ms 후 휴가 관련 메뉴와 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('오늘 휴가 내고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('leave');
    expect(result.current.questions).toContain('남은 연차가 며칠인가요?');
  });

  it('"출퇴근" 포함 문장은 출퇴근 관련 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('출퇴근 변경하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('main');
  });

  it('"출근" 단독 키워드도 출퇴근 관련 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('오늘 출근 처리 됐나요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('main');
  });

  it('"퇴근" 단독 키워드도 출퇴근 관련 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('퇴근 시간 바꾸고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('worktimechg');
  });

  it('"연차" 포함 문장은 휴가 관련 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('연차 며칠 남았어요?'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('leave');
  });

  it('"야근" 포함 문장은 연장근무 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('야근 신청하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('overtime');
  });

  it('"조퇴" 포함 문장은 조퇴/외출 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('조퇴 신청하려고요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('halfleave');
  });

  it('"승인" 포함 문장은 결재함 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('승인 대기 건 확인하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('approval');
  });

  it('"경조금" 포함 문장은 경조 관련 메뉴를 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('경조금 신청하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.menus.map(m => m.id)).toContain('ctsmn');
  });

  // ─── 조회 전용 키워드 ───────────────────────────────────────────────

  it('"근무시간" 포함 문장은 근무시간 조회 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('이번 달 근무시간 확인하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('근무시간'))).toBe(true);
  });

  it('"추가근무" 포함 문장은 추가근무 현황 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('추가근무 시간 얼마나 됐어요?'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('추가근무'))).toBe(true);
  });

  it('"대출금" 포함 문장은 대출금 현황 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('대출금 현황 알고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('대출금'))).toBe(true);
  });

  it('"건강검진" 포함 문장은 건강검진 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('건강검진 언제 받을 수 있나요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('건강검진'))).toBe(true);
  });

  it('"증명서" 포함 문장은 증명서 발급 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('재직증명서 발급하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('증명서'))).toBe(true);
  });

  it('"사회보험" 포함 문장은 사회보험 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('사회보험 가입 현황 알고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('사회보험'))).toBe(true);
  });

  it('"자격증" 포함 문장은 자격사항 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('자격증 조회하고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('자격'))).toBe(true);
  });

  it('"교육" 포함 문장은 교육이수 질문을 반환한다', () => {
    const { result } = renderHook(() => useChatbotKeywordSuggestions('교육 이수 현황 알고 싶어요'));
    act(() => { jest.runAllTimers(); });
    expect(result.current.questions.some(q => q.includes('교육'))).toBe(true);
  });
});
