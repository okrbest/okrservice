import { getEnv } from './core';

// apolloClient.ts's errorLink checks this name to avoid refreshing
// in response to the refresh mutation's own failure (infinite loop).
export const REFRESH_AUTH_TOKEN_OPERATION_NAME = 'RefreshAuthToken';

let pendingRefresh: Promise<boolean> | null = null;

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
  if (!pendingRefresh) {
    pendingRefresh = requestRefresh().finally(() => {
      pendingRefresh = null;
    });
  }

  return pendingRefresh;
};
