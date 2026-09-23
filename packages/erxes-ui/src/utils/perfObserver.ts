import * as Sentry from '@sentry/react';

const LONGTASK_THRESHOLD_MS = 200;
const INPUT_DELAY_THRESHOLD_MS = 200;

/**
 * 메인 스레드가 오래 막혀서 타이핑이 밀리는 현상(증상 2)을 잡기 위한
 * 전역 PerformanceObserver. longtask(메인 스레드 블로킹)와
 * event(입력 처리 지연)를 관찰해서 임계값을 넘으면 Sentry breadcrumb만 남긴다.
 * 지원 안 하는 브라우저(Safari 구버전 등)에서는 조용히 아무것도 하지 않는다.
 */
export const setupPerformanceObserver = (): (() => void) => {
  if (typeof PerformanceObserver === 'undefined') {
    return () => {};
  }

  const supportedTypes = (PerformanceObserver as any).supportedEntryTypes as
    | string[]
    | undefined;

  const observers: PerformanceObserver[] = [];

  const observeLongtasks = () => {
    if (supportedTypes && !supportedTypes.includes('longtask')) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= LONGTASK_THRESHOLD_MS) {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: 'longtask',
            level: 'warning',
            data: { durationMs: Math.round(entry.duration) },
          });
        }
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
    observers.push(observer);
  };

  const observeInputDelay = () => {
    if (supportedTypes && !supportedTypes.includes('event')) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (entry.duration >= INPUT_DELAY_THRESHOLD_MS) {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `input delay (${entry.name})`,
            level: 'warning',
            data: { durationMs: Math.round(entry.duration) },
          });
        }
      }
    });

    // durationThreshold: 이 값 미만인 이벤트는 애초에 관찰하지 않음 (오버헤드 최소화)
    observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: INPUT_DELAY_THRESHOLD_MS,
    } as any);
    observers.push(observer);
  };

  try {
    observeLongtasks();
    observeInputDelay();
  } catch (e) {
    // 관찰 자체가 실패해도 앱 동작에는 영향 없어야 함
  }

  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};
