import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import MarkdownTable from '../MarkdownTable';

const renderInline = (text: string) => [text.replace(/\*\*/g, '')];

const month = Array.from({ length: 10 }, (_, i) => [
  `9/${i + 1}`,
  i === 5 ? '토' : '월',
  '8.3',
  i === 1 ? '지각' : '정상',
]);

describe('MarkdownTable', () => {
  it('숫자 열은 오른쪽 정렬한다', () => {
    render(
      <MarkdownTable
        headers={['일자', '요일', '근무(h)', '상태']}
        aligns={[]}
        rows={month.slice(0, 3)}
        renderInline={renderInline}
      />,
    );
    const cell = screen.getAllByText('8.3')[0].closest('td') as HTMLElement;
    expect(cell.style.textAlign).toBe('right');
    expect(screen.getByText('9/1').closest('td')?.style.textAlign).toBe('left');
  });

  it('상태 값은 알약으로, 주말은 칩으로 표시한다', () => {
    render(
      <MarkdownTable
        headers={['일자', '요일', '근무(h)', '상태']}
        aligns={[]}
        rows={month.slice(0, 7)}
        renderInline={renderInline}
      />,
    );
    expect(screen.getByText('지각')).toHaveAttribute('data-status', 'warn');
    expect(screen.getAllByText('정상')[0]).toHaveAttribute('data-status', 'ok');
    expect(screen.getByText('토')).toHaveAttribute('data-weekend', 'sat');
  });

  it('금액 열에는 값 크기만큼의 막대를 그리고 합계 줄에는 그리지 않는다', () => {
    const { container } = render(
      <MarkdownTable
        headers={['항목', '금액(원)']}
        aligns={[]}
        rows={[
          ['기본급', '3,200,000'],
          ['식대', '200,000'],
          ['합계', '3,400,000'],
        ]}
        renderInline={renderInline}
      />,
    );
    const bars = Array.from(container.querySelectorAll('[data-bar]')).map((b) =>
      b.getAttribute('data-bar'),
    );
    expect(bars).toEqual(['100', '6']);
    expect(screen.getByText('합계').closest('tr')).toHaveAttribute(
      'data-total',
      'true',
    );
  });

  it('시각 열에는 막대를 그리지 않는다', () => {
    const { container } = render(
      <MarkdownTable
        headers={['일자', '출근']}
        aligns={[]}
        rows={[
          ['9/1', '08:52'],
          ['9/2', '09:14'],
        ]}
        renderInline={renderInline}
      />,
    );
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(0);
  });

  it('7줄이 넘으면 접고, 더 보기로 펼치고 접기로 다시 접는다', () => {
    render(
      <MarkdownTable
        headers={['일자', '요일', '근무(h)', '상태']}
        aligns={[]}
        rows={month}
        renderInline={renderInline}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(1 + 7);
    fireEvent.click(screen.getByRole('button', { name: '나머지 3줄 더 보기' }));
    expect(screen.getAllByRole('row')).toHaveLength(1 + 10);
    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.getAllByRole('row')).toHaveLength(1 + 7);
  });

  it('접혀 있어도 합계 줄은 맨 아래에 보인다', () => {
    const rows = [...month.map((r) => [r[0], r[2]]), ['합계', '83']];
    render(
      <MarkdownTable
        headers={['일자', '근무(h)']}
        aligns={[]}
        rows={rows}
        renderInline={renderInline}
      />,
    );
    const all = screen.getAllByRole('row');
    expect(all).toHaveLength(1 + 7 + 1);
    expect(all[all.length - 1]).toHaveTextContent('합계');
  });

  it('7줄 이하면 더 보기 버튼이 없다', () => {
    render(
      <MarkdownTable
        headers={['일자', '근무(h)']}
        aligns={[]}
        rows={month.slice(0, 7).map((r) => [r[0], r[2]])}
        renderInline={renderInline}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
