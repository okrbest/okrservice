import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ChatbotSuggestions from '../ChatbotSuggestions';
import { ChatbotMenu } from '../chatbotMenus';

const menus: ChatbotMenu[] = [
  {
    id: 'leave',
    label: '휴가신청',
    description: '연차·반차 등 휴가 신청',
    path: '/MobileLeaveAppl.do',
    category: 'leave',
  },
  {
    id: 'halfleave',
    label: '조퇴/외출신청',
    description: '근무 중 조퇴·외출 신청',
    path: '/MobileHalfLeaveAppl.do',
    category: 'leave',
  },
];
const questions = ['올해 남은 휴가가 며칠인가요?', '반차 신청은 어떻게 해요?'];

const renderPopup = (
  props: Partial<React.ComponentProps<typeof ChatbotSuggestions>> = {},
) =>
  render(
    <ChatbotSuggestions
      keyword="휴가"
      menus={menus}
      questions={questions}
      onMenuClick={jest.fn()}
      onQuestionClick={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );

describe('ChatbotSuggestions', () => {
  it('menus와 questions가 모두 비면 아무것도 그리지 않는다', () => {
    const { container } = renderPopup({ menus: [], questions: [] });
    expect(container.firstChild).toBeNull();
  });

  it('반응한 키워드를 머리말에 보여준다', () => {
    renderPopup();
    expect(screen.getByText('관련 추천').previousSibling).toHaveTextContent(
      '휴가',
    );
  });

  it('메뉴는 이름과 한 줄 설명을 함께 보여준다', () => {
    renderPopup();
    const option = screen.getByRole('option', { name: /휴가신청/ });
    expect(option).toHaveTextContent('연차·반차 등 휴가 신청');
  });

  it('섹션 제목을 보여준다', () => {
    renderPopup();
    expect(screen.getByText('HR 메뉴 바로가기')).toBeInTheDocument();
    expect(screen.getByText('이렇게 물어보세요')).toBeInTheDocument();
  });

  it('추천 질문 속 키워드를 강조한다', () => {
    const { container } = renderPopup();
    const marks = Array.from(container.querySelectorAll('mark')).map(
      (m) => m.textContent,
    );
    expect(marks).toEqual(['휴가']);
  });

  it('메뉴 클릭 시 onMenuClick과 onClose를 부른다', () => {
    const onMenuClick = jest.fn();
    const onClose = jest.fn();
    renderPopup({ onMenuClick, onClose });
    fireEvent.click(screen.getByRole('option', { name: /휴가신청/ }));
    expect(onMenuClick).toHaveBeenCalledWith(menus[0]);
    expect(onClose).toHaveBeenCalled();
  });

  // 질문을 채운 뒤 닫기는 부모(onQuestionClick)가 그 질문 기준으로 처리한다.
  // 여기서 onClose를 또 부르면 이전 입력 기준으로 덮어써, 질문 속 키워드로 팝업이 다시 뜬다.
  it('질문 클릭 시 onQuestionClick만 부른다', () => {
    const onQuestionClick = jest.fn();
    const onClose = jest.fn();
    renderPopup({ onQuestionClick, onClose });
    fireEvent.click(
      screen.getByRole('option', { name: '반차 신청은 어떻게 해요?' }),
    );
    expect(onQuestionClick).toHaveBeenCalledWith('반차 신청은 어떻게 해요?');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('닫기 버튼은 onClose를 부른다', () => {
    const onClose = jest.fn();
    renderPopup({ onClose });
    fireEvent.click(screen.getByRole('button', { name: '추천 닫기' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('activeIndex에 해당하는 항목만 선택 상태다 (메뉴 다음에 질문 순서)', () => {
    renderPopup({ activeIndex: 2 });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
  });
});
