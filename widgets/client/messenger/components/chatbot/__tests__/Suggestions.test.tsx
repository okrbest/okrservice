import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Suggestions from '../Suggestions';
import { SuggestionItem } from '../../../intent/suggestions';

const items: SuggestionItem[] = [
  { keyword: '출근', label: '출근', buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }] },
  { keyword: '출장', label: '출장신청', buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }] },
];

describe('Suggestions', () => {
  it('items가 있으면 각 label을 렌더링한다', () => {
    const { getByText } = render(
      <Suggestions items={items} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByText('출근')).toBeInTheDocument();
    expect(getByText('출장신청')).toBeInTheDocument();
  });

  it('items가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(
      <Suggestions items={[]} onSelect={jest.fn()} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('항목 클릭 시 onSelect가 해당 item과 함께 호출되고 onClose도 호출된다', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <Suggestions items={items} onSelect={onSelect} onClose={onClose} />,
    );
    fireEvent.click(getByText('출근'));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
