import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, act, within } from '@testing-library/react';
import ChatbotView from '../ChatbotView';
import { streamChat } from '../teamplgpt';
import { connection } from '../../../connection';
import {
  getActiveSessionId,
  startNewSession,
  saveMessages,
  loadIndex,
} from '../chatHistory';

jest.mock('../../../context/Router', () => ({
  useRouter: () => ({
    setRoute: jest.fn(),
    setChatbotMenu: jest.fn(),
    setActiveRoute: jest.fn(),
    isZoomed: false,
    setIsZoomed: jest.fn(),
  }),
}));

jest.mock('../../../context/RpaMessage', () => ({
  useRpaMessages: () => ({ rpaMessages: [] }),
}));

jest.mock('../../../context/ChatbotButtonMessages', () => ({
  useChatbotButtonMessages: () => ({ buttonCardMessages: [] }),
}));

const mockSuggestions = jest.fn(() => ({
  keyword: '',
  menus: [],
  questions: [] as string[],
}));
jest.mock('../useChatbotKeywordSuggestions', () => ({
  useChatbotKeywordSuggestions: () => mockSuggestions(),
}));

jest.mock('../useChatbotMessages', () => ({
  useChatbotMessages: () => [],
}));

jest.mock('../teamplgpt', () => ({
  streamChat: jest.fn(),
}));

jest.mock('../../BottomNavBar', () => ({
  __esModule: true,
  default: () => null,
}));

// jsdom은 scrollIntoView를 구현하지 않음 (ChatbotView.tsx의 자동 스크롤 useEffect용 stub)
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe('ChatbotView - 새 채팅 버튼', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
  });

  it('대화가 비어 있으면 새 채팅 버튼을 눌러도 세션이 바뀌지 않는다', () => {
    render(<ChatbotView />);
    const before = getActiveSessionId();

    fireEvent.click(screen.getByRole('button', { name: '새 채팅' }));

    expect(getActiveSessionId()).toBe(before);
  });

  it('대화가 있으면 새 채팅 버튼을 눌러 세션을 교체하고 화면을 초기화한다', () => {
    const existingId = startNewSession();
    saveMessages(existingId, [
      { id: 'u-1', role: 'user', text: '안녕하세요', createdAt: 1 },
      { id: 'b-1', role: 'bot', text: '네 반갑습니다', createdAt: 2 },
    ]);

    render(<ChatbotView />);
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새 채팅' }));

    expect(getActiveSessionId()).not.toBe(existingId);
    expect(screen.queryByText('안녕하세요')).not.toBeInTheDocument();
    expect(loadIndex().some((e) => e.id === existingId)).toBe(true);
    // 새 세션은 아직 메시지가 없으므로 이력에 중복 항목이 남으면 안 된다
    // (sessionId만 바꾸고 aiMessages를 그대로 두면, 이전 메시지가 새 sessionId와
    // 함께 저장되며 중복 항목이 생기는 회귀가 있었다)
    expect(loadIndex()).toHaveLength(1);
  });
});

describe('ChatbotView - 답변 아래 HR 메뉴 바로가기', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
  });

  const sendMessage = async (text: string) => {
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '안내해 드릴게요.', close: true, error: false };
    });
    render(<ChatbotView />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });
  };

  it('메뉴가 연결된 키워드를 보내면 답변이 끝난 뒤 바로가기 버튼을 보여준다', async () => {
    await sendMessage('급여명세서 보고 싶어요');

    expect(screen.getByText('안내해 드릴게요.')).toBeInTheDocument();
    const panel = screen.getByRole('group', { name: 'HR 메뉴 바로가기' });
    expect(
      within(panel).getByRole('button', { name: /급여명세서/ }),
    ).toHaveTextContent('월별 급여·상여 내역');
  });

  it('키워드가 없는 질문에는 바로가기 버튼이 없다', async () => {
    await sendMessage('안녕하세요');

    expect(screen.getByText('안내해 드릴게요.')).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'HR 메뉴 바로가기' }),
    ).not.toBeInTheDocument();
  });

  it('버튼은 최대 3개까지만 보여준다', async () => {
    await sendMessage('탄력근무 신청할래요');

    const panel = screen.getByRole('group', { name: 'HR 메뉴 바로가기' });
    expect(within(panel).getAllByRole('button')).toHaveLength(3);
  });
});

describe('ChatbotView - 추천 팝업 키보드 선택', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
    mockSuggestions.mockReturnValue({
      keyword: '휴가',
      menus: [],
      questions: ['올해 남은 휴가가 며칠인가요?', '반차 신청은 어떻게 해요?'],
    });
  });

  afterEach(() => {
    mockSuggestions.mockReturnValue({ keyword: '', menus: [], questions: [] });
  });

  it('↓로 항목을 고르고 Enter로 질문을 입력창에 채운다 (전송하지 않음)', () => {
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가 쓰고 싶은데' } });

    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(box).toHaveValue('반차 신청은 어떻게 해요?');
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('↑는 맨 위에서 맨 아래로 돈다', () => {
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가 쓰고 싶은데' } });

    fireEvent.keyDown(box, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Esc로 추천을 닫는다', () => {
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가 쓰고 싶은데' } });

    fireEvent.keyDown(box, { key: 'Escape' });
    expect(
      screen.queryByRole('listbox', { name: '추천' }),
    ).not.toBeInTheDocument();
  });
});

describe('ChatbotView - 답변 복사', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
  });

  it('끝난 답변 아래 복사 버튼으로 답변을 평문으로 복사한다', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield {
        textResponse: '**남은 연차**는 5일이에요.',
        close: true,
        error: false,
      };
    });
    render(<ChatbotView />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '연차 며칠 남았어?' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '답변 복사' }));
    });
    expect(writeText).toHaveBeenCalledWith('남은 연차는 5일이에요.');
    expect(screen.getByText('복사됨')).toBeInTheDocument();
  });
});
