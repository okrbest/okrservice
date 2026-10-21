import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import WorkHoursGauge from '../WorkHoursGauge';

// teamplgpt specs/019 contracts/widget-work-hours-gauge.md 테스트 벡터
const HEADERS = ['구분', '누적 근로', '월간 소정', '최대 가능', '소정까지'];
const draw = (rows: string[][]) =>
  render(<WorkHoursGauge headers={HEADERS} rows={rows} />).container;

describe('WorkHoursGauge', () => {
  it('이번 달: 누적을 크게, 채움·소정 위치, 소정까지 줄', () => {
    const c = draw([['이번 달(10월)', '82.5', '171.0', '224.0', '88.5']]);
    const gauge = c.querySelector('[data-work-hours]') as HTMLElement;
    expect(gauge).toHaveTextContent('이번 달(10월) 근무시간');
    expect(gauge).toHaveTextContent('82.5시간 근로');
    expect(gauge).toHaveTextContent('소정 171.0');
    expect(gauge).toHaveTextContent('최대 224.0');
    expect(gauge).toHaveTextContent(
      '월간 소정 171.0시간 중 82.5시간 · 소정까지 88.5시간',
    );
    const bar = gauge.querySelector('[role="img"]') as HTMLElement;
    expect(bar.getAttribute('data-fill')).toBe('37');
    expect(bar.getAttribute('data-normal')).toBe('76');
    expect(bar.getAttribute('data-over')).toBeNull();
    expect(bar).toHaveAttribute(
      'aria-label',
      '이번 달(10월) 누적 근로 82.5시간, 월간 소정 171.0시간, 최대 가능 224.0시간',
    );
  });

  it('지난 달 소정 초과: 주황 구간 + 범례, 소정까지 대신 최대 가능 줄', () => {
    const c = draw([['9월', '176.0', '168.0', '220.0', '—']]);
    const bar = c.querySelector('[role="img"]') as HTMLElement;
    expect(bar.getAttribute('data-fill')).toBe('80');
    expect(bar.getAttribute('data-normal')).toBe('76');
    expect(bar.getAttribute('data-over')).toBe('true');
    expect(c).toHaveTextContent('월간 소정 168.0시간 · 최대 가능 220.0시간');
    expect(c).toHaveTextContent('소정 초과');
    expect(c).not.toHaveTextContent('소정까지');
  });

  it('값이 없으면 막대 없이 — 와 안내', () => {
    const c = draw([['이번 달(10월)', '—', '—', '—', '—']]);
    expect(c.querySelector('[role="img"]')).toBeNull();
    expect(c).toHaveTextContent('—');
    expect(c).toHaveTextContent('근무시간을 조회하지 못했습니다.');
    expect(c).not.toHaveTextContent('0.0');
  });

  it('누적이 최대를 넘으면 채움은 100에서 멈추고 값은 그대로', () => {
    const c = draw([['이번 달(10월)', '250.0', '171.0', '224.0', '-79.0']]);
    const bar = c.querySelector('[role="img"]') as HTMLElement;
    expect(bar.getAttribute('data-fill')).toBe('100');
    expect(bar.getAttribute('data-over')).toBe('true');
    // 주황은 소정 세로선(76%)에서 시작한다(019 코드 리뷰 M-1)
    expect(bar.getAttribute('data-normal')).toBe('76');
    expect(bar.getAttribute('data-split')).toBe('76');
    expect(c).toHaveTextContent('250.0시간 근로');
  });

  it('최대 가능이 없으면 막대 없이 숫자만', () => {
    const c = draw([['이번 달(10월)', '82.5', '171.0', '—', '88.5']]);
    expect(c.querySelector('[role="img"]')).toBeNull();
    expect(c).toHaveTextContent('82.5시간 근로');
  });

  it('여러 줄이면 모든 막대의 시작 위치·너비 기준이 같다', () => {
    const c = draw([
      ['9월', '176.0', '168.0', '220.0', '—'],
      ['이번 달(10월)', '82.5', '171.0', '224.0', '88.5'],
    ]);
    const tracks = Array.from(
      c.querySelectorAll('[data-track]'),
    ) as HTMLElement[];
    expect(tracks).toHaveLength(2);
    for (const t of tracks) expect(t.style.width).toBe('100%');
  });
});
