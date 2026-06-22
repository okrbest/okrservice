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
});
