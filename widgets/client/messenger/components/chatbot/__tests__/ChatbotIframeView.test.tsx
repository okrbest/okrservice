import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import ChatbotIframeView from '../ChatbotIframeView';

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

describe('ChatbotIframeView — 세션·iframe 재오픈', () => {
  beforeEach(() => {
    mockSetRoute.mockReset();
    mockSetSessionExpiredNotice.mockReset();
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
});
