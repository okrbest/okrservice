import {
  createHttpLink,
  from,
  ApolloClient,
  InMemoryCache,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { split } from '@apollo/client/link/core';
import { fromPromise } from '@apollo/client/link/utils';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { __, getEnv } from './utils/core';
import { createClient } from 'graphql-ws';
import * as Sentry from '@sentry/react';
import addMergeKeyfieldPolicy from './add-merge-keyfield-policy';
import noIdNestedTypes from './no-id-nested-types';
import {
  refreshAuthToken,
  REFRESH_AUTH_TOKEN_OPERATION_NAME,
} from './utils/authRefresh';

const { REACT_APP_API_SUBSCRIPTION_URL, REACT_APP_API_URL } = getEnv();

// Create an http link:
const httpLink = createHttpLink({
  uri: `${REACT_APP_API_URL}/graphql`,
  credentials: 'include',
});

// 중복 리다이렉트 방지를 위한 플래그
let isRedirecting = false;

const isAuthError = (graphQLErrors: any, networkError: any): boolean => {
  if (
    graphQLErrors &&
    graphQLErrors.some(
      (error: any) => error.message?.toLowerCase() === 'login required',
    )
  ) {
    return true;
  }

  if (!networkError) {
    return false;
  }

  const statusCode = (networkError as any).statusCode;
  const status = (networkError as any).status;
  if (statusCode === 401 || status === 401) {
    return true;
  }

  const errorMessage = (
    (networkError as any).message || String(networkError)
  ).toLowerCase();

  return (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('login required') ||
    errorMessage.includes('token expired')
  );
};

const redirectToLogin = (reason: string) => {
  if (isRedirecting) {
    return;
  }
  isRedirecting = true;
  console.log(reason);
  // 강제 리다이렉트 발생 시점을 세션 리플레이와 함께 확인할 수 있도록 기록
  Sentry.captureMessage(reason, {
    level: 'warning',
    tags: { session_event: 'forced_redirect' },
  });
  window.location.href = '/';
};

// Error handler: 만료된 access token은 우선 refresh-token으로 조용히 갱신을 시도하고,
// 갱신에 성공하면 실패했던 요청을 재시도한다. refresh 자체가 실패한 경우에만
// (refresh-token까지 만료 등) 로그인 화면으로 리다이렉트한다.
const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (isRedirecting) {
      return;
    }

    if (!isAuthError(graphQLErrors, networkError)) {
      return;
    }

    // refresh 요청 자체가 실패한 경우: 더 이상 재시도할 방법이 없음
    if (operation.operationName === REFRESH_AUTH_TOKEN_OPERATION_NAME) {
      redirectToLogin(
        '리프레시 토큰도 만료: 로그인 화면으로 리다이렉트합니다.',
      );
      return;
    }

    return fromPromise(
      refreshAuthToken().then((refreshed) => {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: refreshed
            ? 'token refresh succeeded'
            : 'token refresh failed',
          level: refreshed ? 'info' : 'error',
        });

        if (!refreshed) {
          redirectToLogin('세션 갱신 실패: 로그인 화면으로 리다이렉트합니다.');
        }
        return refreshed;
      }),
    )
      .filter((refreshed) => Boolean(refreshed))
      .flatMap(() => forward(operation));
  },
);

const authLink = setContext((_, { headers }) => {
  const sessioncode = sessionStorage.getItem('sessioncode') || '';

  // nginx 액세스 로그와 조인할 수 있도록 Sentry 이벤트에도 같은 세션 식별자를 붙임
  Sentry.setTag('sessioncode', sessioncode);

  return {
    headers: {
      ...headers,
      sessioncode,
    },
  };
});

// Combining httpLink and warelinks altogether
const httpLinkWithMiddleware = from([errorLink, authLink, httpLink]);

// Subscription config
export const wsLink: any = new GraphQLWsLink(
  createClient({
    url: REACT_APP_API_SUBSCRIPTION_URL || 'ws://localhost:4000/graphql',
    retryAttempts: 1000,
    retryWait: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    },
    on: {
      connected: () => {
        Sentry.addBreadcrumb({
          category: 'socket',
          message: 'graphql-ws connected',
          level: 'info',
        });
      },
      closed: (event: any) => {
        Sentry.addBreadcrumb({
          category: 'socket',
          message: 'graphql-ws closed',
          level: 'warning',
          data: { code: event?.code, reason: event?.reason },
        });
      },
      error: (error: any) => {
        Sentry.addBreadcrumb({
          category: 'socket',
          message: 'graphql-ws error',
          level: 'error',
          data: { message: error?.message },
        });
      },
    },
  }),
);

type Definintion = {
  kind: string;
  operation?: string;
};

// Setting up subscription with link
const link = split(
  // split based on operation type
  ({ query }) => {
    const { kind, operation }: Definintion = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLinkWithMiddleware,
);

const typePolicies = {};

addMergeKeyfieldPolicy(typePolicies, noIdNestedTypes);

// Creating Apollo-client
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies,
    addTypename: true,
  }),
  queryDeduplication: true,
  link,
  connectToDevTools: true,
});

export default client;
