import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { VizBlockRenderer, dispatchViz } from '../vizRenderers';

beforeAll(() => {
  // recharts의 ResponsiveContainer가 jsdom에서 크기를 측정할 수 있도록 폴리필.
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 220,
  });
  // ResponsiveContainer는 getBoundingClientRect()로 초기 크기를 재는데 jsdom은
  // 레이아웃을 계산하지 않아 항상 0을 반환한다 — 고정값으로 대체한다.
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      width: 400,
      height: 220,
      top: 0,
      left: 0,
      right: 400,
      bottom: 220,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
});

describe('VizBlockRenderer', () => {
  it('workstatus 블록을 막대 차트로 렌더한다', async () => {
    const dispatch = dispatchViz(
      JSON.stringify({
        type: 'workstatus',
        data: { labels: ['정상', '지각'], values: [28, 2] },
      }),
    );
    const { container } = render(<VizBlockRenderer dispatch={dispatch} />);
    await waitFor(() =>
      expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBe(
        2,
      ),
    );
  });

  it('salarytrend 다중 시리즈를 series 개수만큼 선으로 렌더하고 범례를 띄운다', async () => {
    const dispatch = dispatchViz(
      JSON.stringify({
        type: 'salarytrend',
        data: {
          labels: ['2025-01', '2025-02'],
          series: [
            { name: '실지급액', values: [3200000, 3300000] },
            { name: '기본급', values: [2800000, 2800000] },
          ],
        },
      }),
    );
    const { container } = render(<VizBlockRenderer dispatch={dispatch} />);
    await waitFor(() =>
      expect(container.querySelectorAll('.recharts-line').length).toBe(2),
    );
    expect(container.querySelector('.recharts-legend-wrapper')).not.toBeNull();
    expect(screen.getByText('실지급액')).toBeInTheDocument();
    expect(screen.getByText('기본급')).toBeInTheDocument();
  });

  it('salarytrend 단일 시리즈는 범례를 띄우지 않는다', async () => {
    const dispatch = dispatchViz(
      JSON.stringify({
        type: 'salarytrend',
        data: {
          labels: ['2025-01'],
          series: [{ name: '실지급액', values: [3200000] }],
        },
      }),
    );
    const { container } = render(<VizBlockRenderer dispatch={dispatch} />);
    await waitFor(() =>
      expect(container.querySelectorAll('.recharts-line').length).toBe(1),
    );
    expect(container.querySelector('.recharts-legend-wrapper')).toBeNull();
  });

  it('orgchart 블록을 트리(이름·직급 텍스트)로 렌더한다', async () => {
    const dispatch = dispatchViz(
      JSON.stringify({
        type: 'orgchart',
        data: {
          root: '개발1팀',
          members: [{ name: '홍길동', title: '팀장' }],
        },
      }),
    );
    render(<VizBlockRenderer dispatch={dispatch} />);
    expect(await screen.findByText('개발1팀')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('팀장')).toBeInTheDocument();
  });

  it('데이터가 없으면 안내 문구를 보여준다', () => {
    const dispatch = dispatchViz(
      JSON.stringify({ type: 'workstatus', data: { labels: [], values: [] } }),
    );
    render(<VizBlockRenderer dispatch={dispatch} />);
    expect(screen.getByText('표시할 데이터가 없습니다.')).toBeInTheDocument();
  });

  it('스키마가 잘못되면 아무것도 렌더하지 않는다', () => {
    const dispatch = dispatchViz(
      JSON.stringify({ type: 'workstatus', data: {} }),
    );
    const { container } = render(<VizBlockRenderer dispatch={dispatch} />);
    expect(container.firstChild).toBeNull();
  });
});
