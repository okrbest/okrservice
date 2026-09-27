import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import AnswerMenuPanel from '../AnswerMenuPanel';
import { CHATBOT_MENUS } from '../chatbotMenus';

describe('AnswerMenuPanel', () => {
  const menus = CHATBOT_MENUS.filter((m) =>
    ['salary', 'leavestatus'].includes(m.id),
  );

  it('메뉴 이름과 한 줄 설명을 줄마다 보여준다', () => {
    render(
      <AnswerMenuPanel
        menus={menus}
        primaryColor="#6569DF"
        onSelect={jest.fn()}
      />,
    );
    const panel = screen.getByRole('group', { name: 'HR 메뉴 바로가기' });
    const rows = within(panel).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('급여명세서');
    expect(rows[0]).toHaveTextContent('월별 급여·상여 내역');
  });

  it('줄을 누르면 그 메뉴로 onSelect를 호출한다', () => {
    const onSelect = jest.fn();
    render(
      <AnswerMenuPanel
        menus={menus}
        primaryColor="#6569DF"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /급여명세서/ }));
    expect(onSelect).toHaveBeenCalledWith(menus[0]);
  });

  it('메뉴가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(
      <AnswerMenuPanel
        menus={[]}
        primaryColor="#6569DF"
        onSelect={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('모든 HR 메뉴에 한 줄 설명이 있다', () => {
    const missing = CHATBOT_MENUS.filter((m) => !m.description?.trim()).map(
      (m) => m.id,
    );
    expect(missing).toEqual([]);
  });
});
