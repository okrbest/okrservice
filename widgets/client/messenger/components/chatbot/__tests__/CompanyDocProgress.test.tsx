import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import CompanyDocProgress, {
  LONG_PROCESSING_MS,
  progressFraction,
} from '../CompanyDocProgress';

const START = new Date('2026-11-11T10:00:00.000Z');
const LONG_NOTICE =
  'Taking longer than usual. Large files can take a few minutes.';

function widthOf(bar: HTMLElement): number {
  return parseFloat(bar.style.width);
}

describe('progressFraction', () => {
  it('막 올렸을 때는 0에서 시작한다', () => {
    expect(progressFraction(0)).toBe(0);
  });

  it('1분이면 대부분 차지만 90%는 넘지 않는다', () => {
    const f = progressFraction(60_000);
    expect(f).toBeGreaterThan(0.75);
    expect(f).toBeLessThan(0.9);
  });

  it('아무리 오래 걸려도 90%를 넘지 않는다 — 끝은 서버가 확인해야 찬다', () => {
    expect(progressFraction(60 * 60_000)).toBeLessThanOrEqual(0.9);
  });

  it('기기 시계가 서버보다 늦어 경과 시간이 음수면 0', () => {
    expect(progressFraction(-5_000)).toBe(0);
  });
});

describe('CompanyDocProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START);
  });

  afterEach(() => jest.useRealTimers());

  it('시간이 지나면 막대가 차오른다 (숫자는 보여주지 않는다)', () => {
    render(<CompanyDocProgress createdAt={START.toISOString()} />);
    const bar = screen.getByTestId('company-doc-progress-fill');
    const before = widthOf(bar);

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(widthOf(bar)).toBeGreaterThan(before);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow',
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('3분이 넘으면 오래 걸린다는 안내를 붙인다', () => {
    render(<CompanyDocProgress createdAt={START.toISOString()} />);
    expect(screen.queryByText(LONG_NOTICE)).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(LONG_PROCESSING_MS + 1_000);
    });

    expect(screen.getByText(LONG_NOTICE)).toBeInTheDocument();
  });

  it('화면에서 사라지면 타이머를 멈춘다', () => {
    const { unmount } = render(
      <CompanyDocProgress createdAt={START.toISOString()} />,
    );
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
