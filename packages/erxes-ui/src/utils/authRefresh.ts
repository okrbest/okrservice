import { getEnv } from './core';

// apolloClient.ts's errorLink checks this name to avoid refreshing
// in response to the refresh mutation's own failure (infinite loop).
export const REFRESH_AUTH_TOKEN_OPERATION_NAME = 'RefreshAuthToken';

// 진행 중인 갱신 요청. 화면 묶음 안에 이 모듈이 두 벌 들어갈 수 있어(호스트 앱 + 공유 모듈)
// 모듈 변수가 아니라 window에 둔다 — 그래야 두 벌이 같은 요청을 같이 쓴다.
const PENDING_REFRESH_KEY = '__erxesPendingAuthRefresh';

type RefreshHolder = { [PENDING_REFRESH_KEY]?: Promise<boolean> | null };

const fallbackHolder: RefreshHolder = {};

const refreshHolder = (): RefreshHolder =>
  typeof window === 'undefined'
    ? fallbackHolder
    : (window as unknown as RefreshHolder);

async function requestRefresh(): Promise<boolean> {
  const { REACT_APP_API_URL } = getEnv();

  if (!REACT_APP_API_URL) {
    return false;
  }

  try {
    const response = await fetch(`${REACT_APP_API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation ${REFRESH_AUTH_TOKEN_OPERATION_NAME} { refreshToken }`,
      }),
    });

    const result = await response.json();

    return Boolean(result.data && result.data.refreshToken === 'refreshed');
  } catch (e) {
    return false;
  }
}

/**
 * Silently renews the access token using the refresh-token cookie.
 * Concurrent callers (e.g. several failed requests at once) share one
 * in-flight refresh instead of racing separate refresh mutations.
 */
export const refreshAuthToken = (): Promise<boolean> => {
  const holder = refreshHolder();
  const pending = holder[PENDING_REFRESH_KEY];

  if (pending) {
    return pending;
  }

  const started = requestRefresh().finally(() => {
    holder[PENDING_REFRESH_KEY] = null;
  });

  holder[PENDING_REFRESH_KEY] = started;

  return started;
};
