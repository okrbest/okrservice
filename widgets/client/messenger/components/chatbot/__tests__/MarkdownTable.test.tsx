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

  it('콜론 없는 4자리 시각(0900) 열에도 막대를 그리지 않는다', () => {
    const { container } = render(
      <MarkdownTable
        headers={['일자', '출근', '기준퇴근']}
        aligns={[]}
        rows={[
          ['9/1', '0855', '1800'],
          ['9/2', '0910', '2200'],
        ]}
        renderInline={renderInline}
      />,
    );
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(0);
  });

  it('지각한 날은 출근 칸을, 조퇴한 날은 퇴근 칸을 강조한다(상태가 정상이어도)', () => {
    const { container } = render(
      <MarkdownTable
        headers={['일자', '출근', '퇴근', '상태', '지각', '조퇴(분)']}
        aligns={[]}
        rows={[
          ['7/1', '08:55', '18:10', '정상', '', ''],
          ['7/3', '09:10', '18:05', '정상', 'Y', ''],
          ['7/4', '08:50', '17:30', '정상', '', '30'],
        ]}
        renderInline={renderInline}
      />,
    );
    const flagged = Array.from(
      container.querySelectorAll('[data-issue="true"]'),
    ).map((td) => td.textContent);
    expect(flagged).toEqual(['09:10', '17:30']);
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

// 한도·사용·잔여 표 (teamplgpt specs/018 D11) — 열 막대 대신 잔여 중심 게이지 / 월별 사용률 막대
describe('MarkdownTable — 한도·사용·잔여', () => {
  const LIMIT_HEADERS = ['구분', '한도', '사용', '잔여'];

  it('gauge: 줄마다 잔여를 크게, 남은 양만큼 채운 게이지, 한도·사용을 이름과 단위로', () => {
    const { container } = render(
      <MarkdownTable
        headers={LIMIT_HEADERS}
        aligns={[]}
        rows={[
          ['이번 주(10/19 기준)', '12.0', '4.0', '8.0'],
          ['이번 달(10월)', '52.0', '10.0', '42.0'],
        ]}
        renderInline={renderInline}
      />,
    );
    const gauges = container.querySelectorAll('[data-gauge]');
    expect(gauges).toHaveLength(2);
    expect(container.querySelector('table')).toBeNull();
    expect(gauges[0]).toHaveTextContent('이번 주(10/19 기준)');
    expect(gauges[0]).toHaveTextContent('8.0시간 남음');
    expect(gauges[0]).toHaveTextContent('한도 12.0시간 중 4.0시간 사용');
    const meter = gauges[0].querySelector('[role="img"]') as HTMLElement;
    expect(meter).toHaveAttribute(
      'aria-label',
      '이번 주(10/19 기준) 잔여 8.0시간, 한도 12.0시간 중 4.0시간 사용',
    );
    expect(meter.getAttribute('data-left')).toBe('67');
  });

  it('gauge: 잔여가 0 이하면 채움 0, 경고 표시(판단 문구 없음)', () => {
    const { container } = render(
      <MarkdownTable
        headers={LIMIT_HEADERS}
        aligns={[]}
        rows={[['이번 주(10/19 기준)', '12.0', '14.0', '-2.0']]}
        renderInline={renderInline}
      />,
    );
    const gauge = container.querySelector('[data-gauge]') as HTMLElement;
    expect(gauge).toHaveAttribute('data-over', 'true');
    expect(gauge.querySelector('[role="img"]')?.getAttribute('data-left')).toBe(
      '0',
    );
    expect(gauge).toHaveTextContent('-2.0시간 남음');
    expect(gauge).not.toHaveTextContent('초과');
  });

  it('gauge: 값이 숫자가 아니면 게이지 없이 값만', () => {
    const { container } = render(
      <MarkdownTable
        headers={LIMIT_HEADERS}
        aligns={[]}
        rows={[['이번 달(10월)', '—', '10.0', '—']]}
        renderInline={renderInline}
      />,
    );
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container).toHaveTextContent(
      '이번 달(10월): 한도 — · 사용 10.0 · 잔여 —',
    );
  });

  const months = [
    ['2026-01', '52.0', '10.0', '42.0'],
    ['2026-02', '52.0', '0.0', '52.0'],
    ['2026-03', '—', '—', '—'],
    ['2026-04', '52.0', '22.0', '30.0'],
    ['2026-05', '—', '—', '—'],
    ['2026-06', '52.0', '8.0', '44.0'],
    ['2026-07', '52.0', '31.0', '21.0'],
    ['2026-08', '52.0', '12.0', '40.0'],
    ['2026-09', '52.0', '18.0', '34.0'],
    ['2026-10', '52.0', '6.0', '46.0'],
    ['합계 (조회된 8개월)', '—', '107.0', '—'],
  ];

  it('monthly: 접지 않고, 사용 칸에만 그 달 한도 기준 막대', () => {
    const { container } = render(
      <MarkdownTable
        headers={['월', '한도', '사용', '잔여']}
        aligns={[]}
        rows={months}
        renderInline={renderInline}
      />,
    );
    expect(screen.queryByText(/더 보기/)).toBeNull();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(11);
    const usage = Array.from(container.querySelectorAll('[data-usage]')).map(
      (el) => el.getAttribute('data-usage'),
    );
    // 1월 10/52=19, 2월 0, 4월 22/52=42, 6월 15, 7월 60, 8월 23, 9월 35, 10월 12 — —·합계 줄은 막대 없음
    expect(usage).toEqual(['19', '0', '42', '15', '60', '23', '35', '12']);
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(0);
    expect(container.querySelector('tr[data-total="true"]')).toHaveTextContent(
      '합계 (조회된 8개월)',
    );
  });

  it('monthly: 막대 시작점이 모든 줄에서 같다(값 칸 고정폭 격자)', () => {
    const { container } = render(
      <MarkdownTable
        headers={['월', '한도', '사용', '잔여']}
        aligns={[]}
        rows={months}
        renderInline={renderInline}
      />,
    );
    const cells = Array.from(
      container.querySelectorAll('[data-usage-cell]'),
    ) as HTMLElement[];
    expect(cells.length).toBe(11);
    for (const cell of cells) {
      expect(cell.style.display).toBe('inline-grid');
      expect(cell.style.gridTemplateColumns).toBe('48px 4.5ch');
    }
  });

  it('다른 머리글의 표는 기존 규칙(열 막대·7줄 접기) 그대로', () => {
    render(
      <MarkdownTable
        headers={['일자', '요일', '근무(h)', '상태']}
        aligns={[]}
        rows={month}
        renderInline={renderInline}
      />,
    );
    expect(screen.getByText(/나머지 3줄 더 보기/)).toBeInTheDocument();
  });
});
