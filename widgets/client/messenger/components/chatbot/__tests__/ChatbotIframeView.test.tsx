import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import ChatbotIframeView from '../ChatbotIframeView';
import { probeHrSessionAlive } from '../menuPermission';
import {
  IFRAME_SESSION_POLL_MS,
  isSessionExpiredIframeLocation,
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
    probeHrSessionAlive: jest.fn(async () => true),
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

describe('isSessionExpiredIframeLocation', () => {
  it('Login·세션 오류 화면이면 만료', () => {
    expect(
      isSessionExpiredIframeLocation('https://hr.example.com/Login.do'),
    ).toBe(true);
    expect(
      isSessionExpiredIframeLocation(
        'https://hr.example.com/Error.do?code=905',
      ),
    ).toBe(true);
  });

  it('일반 메뉴 화면은 만료 아님', () => {
    expect(
      isSessionExpiredIframeLocation(
        'https://hr.example.com/MobileLeaveAppl.do',
      ),
    ).toBe(false);
  });
});

describe('ChatbotIframeView — 세션·iframe 재오픈', () => {
  beforeEach(() => {
    mockSetRoute.mockReset();
    mockSetSessionExpiredNotice.mockReset();
    (probeHrSessionAlive as jest.Mock).mockReset();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
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

  it('iframe 마운트 직후 세션이 끊겨 있으면 만료 안내와 함께 챗봇으로 돌아간다', async () => {
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);

    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(probeHrSessionAlive).toHaveBeenCalled();
    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('주기 폴링에서도 세션 끊김을 감지한다', async () => {
    jest.useFakeTimers();
    (probeHrSessionAlive as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    render(
      <ChatbotIframeView
        title="휴가신청"
        url="https://hr.example.com/MobileLeaveAppl.do?from=chatbot"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSetSessionExpiredNotice).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(IFRAME_SESSION_POLL_MS);
      await Promise.resolve();
    });

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('비밀번호변경은 세션 폴링을 하지 않는다', async () => {
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);

    render(
      <ChatbotIframeView
        title="비밀번호변경"
        url="https://hr.example.com/MobileChgPwd.do"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(probeHrSessionAlive).not.toHaveBeenCalled();
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

  it('load 후 Login.do면 만료 안내와 함께 챗봇으로 돌아간다', () => {
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
        location: { href: 'https://hr.example.com/Login.do' },
      },
    });

    fireEvent.load(iframe);

    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
  });

  it('cross-origin load여도 세션이 죽었으면 만료 안내로 챗봇에 돌아온다(공유 쿠키 로그아웃)', async () => {
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(true);
    render(
      <ChatbotIframeView
        title="증명서신청"
        url="https://hr.example.com/MobileMcrtfReqstRefromMgr.do?from=chatbot"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    // 마운트 프로브는 통과 — 로그아웃 후 iframe load만 죽은 세션
    (probeHrSessionAlive as jest.Mock).mockClear();
    (probeHrSessionAlive as jest.Mock).mockResolvedValue(false);
    mockSetRoute.mockClear();
    mockSetSessionExpiredNotice.mockClear();

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });

    await act(async () => {
      fireEvent.load(iframe);
      await Promise.resolve();
    });

    expect(probeHrSessionAlive).toHaveBeenCalled();
    expect(mockSetSessionExpiredNotice).toHaveBeenCalledWith(true);
    expect(mockSetRoute).toHaveBeenCalledWith('chatbot');
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
