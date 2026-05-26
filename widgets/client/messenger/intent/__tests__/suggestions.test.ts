import { renderHook, act } from '@testing-library/react';
import { useSuggestions } from '../suggestions';

jest.mock('../../../apollo-client', () => ({
  query: jest.fn(),
}));

// graphql-tag returns identity in tests
jest.mock('graphql-tag', () => (strings: TemplateStringsArray) => strings);

import client from '../../../apollo-client';

const mockClient = client as jest.Mocked<typeof client>;

const sampleItems = [
  { keyword: '출근', label: '출근', buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }] },
  { keyword: '출장', label: '출장신청', buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }] },
];

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSuggestions', () => {
  it('keyword가 2자 미만이면 빈 배열을 반환하고 API를 호출하지 않는다', () => {
    const { result } = renderHook(() => useSuggestions('a'));

    expect(result.current).toEqual([]);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('keyword가 빈 문자열이면 빈 배열을 반환하고 API를 호출하지 않는다', () => {
    const { result } = renderHook(() => useSuggestions(''));

    expect(result.current).toEqual([]);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('keyword가 2자 이상이면 300ms 디바운스 후 API를 호출한다', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { chatbotSuggestions: sampleItems },
    });

    const { result } = renderHook(() => useSuggestions('출근'));

    expect(mockClient.query).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { keyword: '출근', chatbotId: undefined },
        fetchPolicy: 'network-only',
      }),
    );
  });

  it('API가 데이터를 반환하면 해당 items를 반환한다', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { chatbotSuggestions: sampleItems },
    });

    const { result } = renderHook(() => useSuggestions('출근'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toEqual(sampleItems);
  });

  it('chatbotId가 전달되면 API 호출 시 함께 전달한다', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { chatbotSuggestions: sampleItems },
    });

    renderHook(() => useSuggestions('출근', 'bot-123'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { keyword: '출근', chatbotId: 'bot-123' },
      }),
    );
  });

  it('API가 에러를 던지면 빈 배열을 반환한다 (silent failure)', async () => {
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSuggestions('출근'));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toEqual([]);
  });

  it('keyword가 디바운스 시간 전에 변경되면 마지막 값으로만 API를 호출한다', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { chatbotSuggestions: sampleItems },
    });

    const { rerender } = renderHook(({ kw }) => useSuggestions(kw), {
      initialProps: { kw: '출근' },
    });

    // 100ms 후 keyword 변경 (debounce 300ms 아직 안 지남)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ kw: '출장' });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // 첫 번째 키워드로 호출 없이, 마지막 키워드로만 1회 호출
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { keyword: '출장', chatbotId: undefined },
      }),
    );
  });
});
