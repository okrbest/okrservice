import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import ChatbotIframeView from '../ChatbotIframeView';
import { loadMenuPermissions } from '../menuPermission';
import {
  IFRAME_SESSION_POLL_MS,
  shouldReturnForMobileMainFallback,
} from '../iframeSessionGuard';

const mockSetRoute = jest.fn();
const mockSetSessionExpiredNotice = jest.fn();
jest.mock('../../../context/Router', () => ({
  useRouter: () => ({
    setRoute: mockSetRoute,
    setActiveRoute: jest.fn(),
    setSessionExpiredNotice: mockSetSessionExpiredNotice,
    isZoomed: false,
    setIsZoomed: jest.fn(),
  }),
}));

jest.mock('../../BottomNavBar', () => () => null);
jest.mock('../menuPermission', () => {
  const actual = jest.requireActual('../menuPermission');
  return {
    ...actual,
    loadMenuPermissions: jest.fn(async () => ({
      keys: new Set(['mobileleaveappl.do']),
      openPaths: new Map(),
    })),
  };
});

describe('shouldReturnForMobileMainFallback (C)', () => {
  it('다른 메뉴로 열었는데 MobileMain이면 복귀', () => {
    expect(
      shouldReturnForMobileMainFallback(
        'https://hr.example.com/MobileLeaveAppl.do',
        'https://hr.example.com/MobileMain.do',
      ),
    ).toBe(true);
  });

  it('출퇴근 체크로 연 MobileMain은 복귀하지 않음', () => {
    expect(
      shouldReturnForMobileMainFallback(
        'https://hr.example.com/MobileMain.do',
        'https://hr.example.com/MobileMain.do',
      ),
    ).toBe(false);
  });

  it('같은 메뉴에 머물면 복귀하지 않음', () => {
    expect(
      shouldReturnForMobileMainFallback(
        'https://hr.example.com/MobileLeaveAppl.do',
        'https://hr.example.com/MobileLeaveAppl.do',
      ),
    ).toBe(false);
  });
});

describe('ChatbotIframeView — 세션·iframe 재오픈', () => {
  beforeEach(() => {
    mockSetRoute.mockReset();
    mockSetSessionExpiredNotice.mockReset();
    (loadMenuPermissions as jest.Mock).mockReset();
    (loadMenuPermissions as jest.Mock).mockResolvedValue({
      keys: new Set(['mobileleaveappl.do']),
      openPaths: new Map(),
    });
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('UNAUTHORIZED를 받으면 챗봇으로 돌아가고 만료 안내를 켠다', () => {
    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do"
      />,
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'UNAUTHORIZED' },
        }),
      );
    });

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('CHATBOT_BACK을 받으면 만료 안내 없이 챗봇으로 돌아간다', () => {
    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot&backEvent=CHATBOT_BACK"
      />,
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'CHATBOT_BACK' },
        }),
      );
    });

    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
    expect(mockSetSessionExpiredNotice).not.toHaveBeenCalled();
  });

  it('url이 바뀌면 iframe을 새로 마운트한다(이전 MobileMain 잔상 방지)', () => {
    const { rerender } = render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do"
      />,
    );
    const first = document.querySelector('iframe');
    expect(first).toHaveAttribute(
      'src',
      'https://hr.example.com/MobileLeaveAppl.do',
    );

    rerender(
      <ChatbotIframeView
        title="연장근무신청"
        url="https://hr.example.com/MobileOvertimeAppl.do"
      />,
    );
    const second = document.querySelector('iframe');
    expect(second).toHaveAttribute(
      'src',
      'https://hr.example.com/MobileOvertimeAppl.do',
    );
    expect(second).not.toBe(first);
  });

  it('뒤로 가면 chatbot 라우트로 돌아간다', () => {
    const { container } = render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do"
      />,
    );
    const back = container.querySelector('.top-nav .icon');
    expect(back).toBeTruthy();
    fireEvent.click(back!);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('iframe이 열린 뒤 세션이 끊기면 만료 안내와 함께 챗봇으로 돌아간다 (#1)', async () => {
    jest.useFakeTimers();
    (loadMenuPermissions as jest.Mock).mockResolvedValue(null);

    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot"
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(IFRAME_SESSION_POLL_MS);
      await Promise.resolve();
    });

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('비밀번호변경은 세션 폴링을 하지 않는다', async () => {
    jest.useFakeTimers();
    (loadMenuPermissions as jest.Mock).mockResolvedValue(null);

    render(
      <ChatbotIframeView
        title="비밀번호변경"
        url="https://hr.example.com/MobileChgPwd.do"
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(IFRAME_SESSION_POLL_MS);
      await Promise.resolve();
    });

    expect(loadMenuPermissions).not.toHaveBeenCalled();
    expect(mockSetRoute).not.toHaveBeenCalledWith('chatbot');
  });

  it('load 후 iframe이 MobileMain이면 만료 안내 없이 챗봇으로 돌아간다 (C)', () => {
    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot"
      />,
    );
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: {
        location: { href: 'https://hr.example.com/MobileMain.do' },
      },
    });

    fireEvent.load(iframe);

    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
    expect(mockSetSessionExpiredNotice).not.toHaveBeenCalled();
  });

  it('CHATBOT_BACK이 오면 폴백·폴링보다 먼저 챗봇으로 돌아간다', () => {
    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot&backEvent=CHATBOT_BACK"
      />,
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'CHATBOT_BACK' },
        }),
      );
    });

    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
    expect(mockSetSessionExpiredNotice).not.toHaveBeenCalled();
  });
});
