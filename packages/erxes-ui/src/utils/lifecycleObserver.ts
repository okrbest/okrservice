import * as Sentry from '@sentry/react';

/**
 * 탭 백그라운드 전환, 네트워크 단절 등 브라우저 환경 변화를 breadcrumb로 남긴다.
 * 증상 1/3처럼 "그 순간 브라우저가 무엇을 하고 있었는지" 재구성할 때 참고용.
 */
export const setupLifecycleObserver = (): (() => void) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  const handleVisibilityChange = () => {
    Sentry.addBreadcrumb({
      category: 'lifecycle',
      message: `visibility: ${document.visibilityState}`,
      level: 'info',
    });
  };

  const handleOnline = () => {
    Sentry.addBreadcrumb({
      category: 'lifecycle',
      message: 'network: online',
      level: 'info',
    });
  };

  const handleOffline = () => {
    Sentry.addBreadcrumb({
      category: 'lifecycle',
      message: 'network: offline',
      level: 'warning',
    });
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
