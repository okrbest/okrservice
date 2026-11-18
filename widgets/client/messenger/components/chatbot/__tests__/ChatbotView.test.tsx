import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, act, within } from '@testing-library/react';
import ChatbotView from '../ChatbotView';
import { chatbotFeatureFlags } from '../chatbotFeatureFlags';
import { streamChat } from '../teamplgpt';
import { connection } from '../../../connection';
import {
  getActiveSessionId,
  startNewSession,
  saveMessages,
  loadIndex,
} from '../chatHistory';
import { probeHrSessionAlive } from '../menuPermission';

const mockSetChatbotMenu = jest.fn();
const mockSetRoute = jest.fn();
const mockSetSessionExpiredNotice = jest.fn();
jest.mock('../../../context/Router', () => ({
  useRouter: () => ({
    setRoute: mockSetRoute,
    setChatbotMenu: mockSetChatbotMenu,
    setActiveRoute: jest.fn(),
    sessionExpiredNotice: false,
    setSessionExpiredNotice: mockSetSessionExpiredNotice,
    isZoomed: false,
    setIsZoomed: jest.fn(),
  }),
}));

jest.mock('../menuPermission', () => {
  const actual = jest.requireActual('../menuPermission');
  return {
    ...actual,
    probeHrSessionAlive: jest.fn(async () => true),
  };
});

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

// 직원의 5240 메뉴 권한 — 기본은 모두 허용, 권한 테스트에서만 바꾼다
const mockCanOpenMenu = jest.fn((_path: string) => true);
const mockResolveMenuPath = jest.fn((path: string) => path);
jest.mock('../useMenuPermission', () => ({
  useMenuPermission: () => ({
    status: 'ready',
    canOpenMenu: (path: string) => mockCanOpenMenu(path),
    resolveMenuPath: (path: string) => mockResolveMenuPath(path),
  }),
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

describe('ChatbotView - 위쪽 막대 매뉴얼 아이콘', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
  });

  it('채팅 이력 옆의 매뉴얼 아이콘은 사용 설명서(사용자 안내 쪽)를 새 탭으로 연다', () => {
    render(<ChatbotView />);

    const manual = screen.getByRole('link', { name: '매뉴얼' });
    expect(manual).toHaveAttribute('href', 'https://guide.5240.cloud/user');
    expect(manual).toHaveAttribute('target', '_blank');
    expect(manual).toHaveAttribute('rel', expect.stringContaining('noopener'));
    // 채팅 이력 버튼 다음 자리
    const history = screen.getByRole('button', { name: '채팅 이력' });
    expect(
      history.compareDocumentPosition(manual) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('ChatbotView - 위쪽 막대 아이콘 이름', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
  });

  const icon = (name: string) =>
    name === '매뉴얼'
      ? screen.getByRole('link', { name })
      : screen.getByRole('button', { name });

  it('아이콘에 마우스를 올리면 이름이 바로 뜨고, 떼면 사라진다(대화가 없어 꺼진 새 채팅도)', () => {
    render(<ChatbotView />);

    ['새 채팅', '채팅 이력', '매뉴얼'].forEach((name) => {
      fireEvent.mouseEnter(icon(name));
      expect(screen.getByRole('tooltip')).toHaveTextContent(name);
      fireEvent.mouseLeave(icon(name));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('키보드로 아이콘에 가도 이름이 뜬다', () => {
    render(<ChatbotView />);

    fireEvent.focus(icon('채팅 이력'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('채팅 이력');
    fireEvent.blur(icon('채팅 이력'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('ChatbotView - 첫 화면', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
  });

  it('인사말로 할 수 있는 일을 알려 주고, 주제별 질문 버튼 6개를 보여준다', () => {
    render(<ChatbotView />);

    expect(screen.getByText(/HR 도우미/)).toBeInTheDocument();
    expect(screen.getByText(/신청 방법/)).toBeInTheDocument();
    const starters = screen.getByRole('group', {
      name: '이런 걸 물어볼 수 있어요',
    });
    expect(within(starters).getAllByRole('button')).toHaveLength(6);
  });

  it('질문 버튼을 누르면 그 질문을 바로 보내고, 대화가 시작되면 버튼은 사라진다', async () => {
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '8일 남았어요.', close: true, error: false };
    });
    render(<ChatbotView />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: '남은 연차가 며칠인가요?' }),
      );
    });

    expect((streamChat as jest.Mock).mock.calls[0][0]).toBe(
      '남은 연차가 며칠인가요?',
    );
    expect(screen.getByText('8일 남았어요.')).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '이런 걸 물어볼 수 있어요' }),
    ).not.toBeInTheDocument();
  });
});

describe('ChatbotView - 답변 아래 HR 메뉴 바로가기', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
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

describe('ChatbotView - 메뉴 권한', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    (streamChat as jest.Mock).mockReset();
    mockSetChatbotMenu.mockReset();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    mockCanOpenMenu.mockImplementation(() => true);
    mockSuggestions.mockReturnValue({ keyword: '', menus: [], questions: [] });
    chatbotFeatureFlags.showHrMenuGrid = false;
  });

  it('권한 없는 메뉴는 답변 아래 바로가기에 나오지 않는다', async () => {
    mockCanOpenMenu.mockImplementation(
      (path: string) => !path.includes('MobileSalaryDtstmnMgr'),
    );
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '안내해 드릴게요.', close: true, error: false };
    });
    render(<ChatbotView />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '급여명세서 보고 싶어요' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });

    expect(screen.getByText('안내해 드릴게요.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /급여명세서/ }),
    ).not.toBeInTheDocument();
  });

  it('권한 없는 메뉴는 입력 중 추천에서 빠지고 Enter로도 열리지 않는다', () => {
    mockCanOpenMenu.mockImplementation(() => false);
    mockSuggestions.mockReturnValue({
      keyword: '휴가',
      menus: [
        {
          id: 'leave',
          label: '휴가신청',
          description: '연차·반차 등 휴가 신청',
          path: '/MobileLeaveAppl.do',
          category: 'leave',
        },
      ] as any,
      questions: ['올해 남은 휴가가 며칠인가요?'],
    });
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가 쓰고 싶은데' } });

    expect(screen.queryByText('휴가신청')).not.toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(mockSetChatbotMenu).not.toHaveBeenCalled();
    expect(box).toHaveValue('올해 남은 휴가가 며칠인가요?');
  });

  it('모바일 메뉴 목록에 없는 휴가신청은 바로가기에 안 나온다', async () => {
    const { isMenuAllowed, parseMenuPermissions } =
      jest.requireActual('../menuPermission');
    const permissions = parseMenuPermissions(JSON.stringify({ Result: [] }));
    mockCanOpenMenu.mockImplementation((path: string) =>
      isMenuAllowed(path, permissions),
    );
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '안내해 드릴게요.', close: true, error: false };
    });
    render(<ChatbotView />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '휴가 신청하고 싶어' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
    });

    expect(screen.getByText('안내해 드릴게요.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /휴가신청/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'HR 메뉴 바로가기' }),
    ).not.toBeInTheDocument();
  });

  it('권한 있는 메뉴는 그대로 열린다', async () => {
    mockSetChatbotMenu.mockClear();
    mockSuggestions.mockReturnValue({
      keyword: '휴가',
      menus: [
        {
          id: 'leave',
          label: '휴가신청',
          description: '연차·반차 등 휴가 신청',
          path: '/MobileLeaveAppl.do',
          category: 'leave',
        },
      ] as any,
      questions: [],
    });
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가' } });
    fireEvent.click(screen.getByRole('option', { name: /휴가신청/ }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetChatbotMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '휴가신청',
        openedAt: expect.any(Number),
      }),
    );
  });

  it('5240 세션이 끊긴 뒤 메뉴를 누르면 모바일 iframe이 아니라 챗봇에 만료 안내를 켠다', async () => {
    mockSetChatbotMenu.mockClear();
    mockSetRoute.mockClear();
    mockSetSessionExpiredNotice.mockClear();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);
    mockSuggestions.mockReturnValue({
      keyword: '휴가',
      menus: [
        {
          id: 'leave',
          label: '휴가신청',
          description: '연차·반차 등 휴가 신청',
          path: '/MobileLeaveAppl.do',
          category: 'leave',
        },
      ] as any,
      questions: [],
    });
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '휴가' } });
    fireEvent.click(screen.getByRole('option', { name: /휴가신청/ }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
    expect(mockSetChatbotMenu).not.toHaveBeenCalled();
  });

  it('세션이 끊긴 뒤 출퇴근 체크도 iframe을 열지 않고 만료 안내를 켠다', async () => {
    mockSetChatbotMenu.mockClear();
    mockSetRoute.mockClear();
    mockSetSessionExpiredNotice.mockClear();
    mockCanOpenMenu.mockReturnValue(true);
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);
    mockSuggestions.mockReturnValue({
      keyword: '출근',
      menus: [
        {
          id: 'commute',
          label: '출퇴근 체크',
          description: '출퇴근 체크',
          path: '/MobileMain.do',
          category: 'attendance',
        },
      ] as any,
      questions: [],
    });
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '출근' } });
    fireEvent.click(screen.getByRole('option', { name: /출퇴근 체크/ }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
    expect(mockSetChatbotMenu).not.toHaveBeenCalled();
  });

  it('세션이 죽은 채 질문하면 스트림을 보내지 않고 만료 안내만 켠다', async () => {
    mockSetSessionExpiredNotice.mockClear();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);
    (streamChat as jest.Mock).mockReset();
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '나오면 안 됨', close: true, error: false };
    });

    render(<ChatbotView />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '남은 연차 알려줘' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '전송' }));
      await Promise.resolve();
    });

    expect(streamChat).not.toHaveBeenCalled();
    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(screen.queryByText('나오면 안 됨')).not.toBeInTheDocument();
    expect(
      screen.queryByText('오류가 발생했습니다. 다시 시도해주세요.'),
    ).not.toBeInTheDocument();
  });

  it('세션 검사 중에 전송을 두 번 눌러도 스트림은 한 번만 나간다', async () => {
    let releaseProbe!: (ok: boolean) => void;
    const probeGate = new Promise<boolean>((resolve) => {
      releaseProbe = resolve;
    });
    (probeHrSessionAlive as jest.Mock).mockImplementation(() => probeGate);
    (streamChat as jest.Mock).mockReset();
    (streamChat as jest.Mock).mockImplementation(async function* () {
      yield { textResponse: '한 번만', close: true, error: false };
    });

    render(<ChatbotView />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '대화내용 요약해줘' },
    });
    const sendBtn = screen.getByRole('button', { name: '전송' });
    await act(async () => {
      fireEvent.click(sendBtn);
      fireEvent.click(sendBtn);
      fireEvent.keyDown(screen.getByRole('textbox'), {
        key: 'Enter',
        code: 'Enter',
      });
    });

    await act(async () => {
      releaseProbe(true);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(streamChat).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('대화내용 요약해줘')).toHaveLength(1);
  });

  it('HR 메뉴 목록에서도 권한 없는 메뉴는 보이지 않는다(D10)', () => {
    chatbotFeatureFlags.showHrMenuGrid = true;
    mockCanOpenMenu.mockImplementation(
      (path: string) =>
        path.includes('MobileMain') || path.includes('MobileChgPwd'),
    );
    render(<ChatbotView />);

    fireEvent.click(screen.getByRole('button', { name: /HR 메뉴/ }));

    expect(
      screen.getByRole('button', { name: '출퇴근 체크' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '비밀번호변경' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '급여명세서' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '휴가신청' }),
    ).not.toBeInTheDocument();

    chatbotFeatureFlags.showHrMenuGrid = false;
  });
});

describe('ChatbotView - 결재 양식 메뉴 열기', () => {
  afterEach(() => {
    mockResolveMenuPath.mockImplementation((path: string) => path);
    mockSuggestions.mockReturnValue({ keyword: '', menus: [], questions: [] });
  });

  it('5240 메뉴 정보로 만든 주소로 연다', async () => {
    mockSetChatbotMenu.mockClear();
    mockResolveMenuPath.mockImplementation(
      () =>
        '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W',
    );
    mockSuggestions.mockReturnValue({
      keyword: '사직',
      menus: [
        {
          id: 'resign',
          label: '사직서(직원)',
          description: '사직서 작성·제출',
          path: '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr?searchApplCd=1590',
          category: 'hr',
        },
      ] as any,
      questions: [],
    });
    render(<ChatbotView />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: '사직서' } });
    fireEvent.click(screen.getByRole('option', { name: /사직서\(직원\)/ }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetChatbotMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '사직서(직원)',
        url: expect.stringMatching(
          /\/EAPApprovalMgr\.do\?cmd=viewEAPApprovalMgr&progCd=PRC-0030&dataRwType=W&from=chatbot&backEvent=CHATBOT_BACK$/,
        ),
        openedAt: expect.any(Number),
      }),
    );
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
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
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

// 회사 문서 올리기·관리는 티켓 탭으로 옮겼다(Ticket.test.tsx)
describe('ChatbotView - 회사 문서 기능은 챗봇에 없다', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    connection.setting = { companyData: { name: '오이사공' } };
  });

  afterEach(() => {
    connection.setting = {};
  });

  it('companyData.name이 있어도 위쪽 막대에 회사 문서 버튼과 안내 말풍선이 없다', () => {
    render(<ChatbotView />);
    expect(
      screen.queryByRole('button', { name: 'Company documents' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('company-docs-intro')).not.toBeInTheDocument();
  });
});
