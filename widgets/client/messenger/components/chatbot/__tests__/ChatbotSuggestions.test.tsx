import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ChatbotSuggestions from '../ChatbotSuggestions';
import { ChatbotMenu } from '../chatbotMenus';

const menus: ChatbotMenu[] = [
  { id: 'leave', label: '휴가신청', path: '/MobileLeaveAppl.do', category: 'leave' },
  { id: 'halfleave', label: '조퇴/외출신청', path: '/MobileHalfLeaveAppl.do', category: 'leave' },
];
const questions = ['남은 연차가 며칠인가요?', '반차 신청은 어떻게 해요?'];

describe('ChatbotSuggestions', () => {
  it('menus와 questions가 모두 비면 null을 반환한다', () => {
    const { container } = render(
      <ChatbotSuggestions menus={[]} questions={[]} onMenuClick={jest.fn()} onQuestionClick={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('메뉴 레이블을 렌더링한다', () => {
    const { getByText } = render(
      <ChatbotSuggestions menus={menus} questions={[]} onMenuClick={jest.fn()} onQuestionClick={jest.fn()} onClose={jest.fn()} />
    );
    expect(getByText('휴가신청 →')).toBeInTheDocument();
    expect(getByText('조퇴/외출신청 →')).toBeInTheDocument();
  });

  it('추천 질문을 렌더링한다', () => {
    const { getByText } = render(
      <ChatbotSuggestions menus={[]} questions={questions} onMenuClick={jest.fn()} onQuestionClick={jest.fn()} onClose={jest.fn()} />
    );
    expect(getByText('남은 연차가 며칠인가요?')).toBeInTheDocument();
  });

  it('메뉴 클릭 시 onMenuClick이 해당 menu와 함께 호출된다', () => {
    const onMenuClick = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <ChatbotSuggestions menus={menus} questions={[]} onMenuClick={onMenuClick} onQuestionClick={jest.fn()} onClose={onClose} />
    );
    fireEvent.click(getByText('휴가신청 →'));
    expect(onMenuClick).toHaveBeenCalledWith(menus[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('질문 클릭 시 onQuestionClick이 해당 질문 문자열과 함께 호출된다', () => {
    const onQuestionClick = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <ChatbotSuggestions menus={[]} questions={questions} onMenuClick={jest.fn()} onQuestionClick={onQuestionClick} onClose={onClose} />
    );
    fireEvent.click(getByText('남은 연차가 며칠인가요?'));
    expect(onQuestionClick).toHaveBeenCalledWith('남은 연차가 며칠인가요?');
    expect(onClose).toHaveBeenCalled();
  });

  it('섹션 헤더를 렌더링한다', () => {
    const { getByText } = render(
      <ChatbotSuggestions menus={menus} questions={questions} onMenuClick={jest.fn()} onQuestionClick={jest.fn()} onClose={jest.fn()} />
    );
    expect(getByText('💡 HR 메뉴 바로가기')).toBeInTheDocument();
    expect(getByText('이런 질문 어때요?')).toBeInTheDocument();
  });

  it('메뉴와 질문이 모두 있을 때 구분선을 렌더링한다', () => {
    const { container } = render(
      <ChatbotSuggestions menus={menus} questions={questions} onMenuClick={jest.fn()} onQuestionClick={jest.fn()} onClose={jest.fn()} />
    );
    const divider = container.querySelector('div[style*="height: 1px"]');
    expect(divider).toBeInTheDocument();
  });
});
