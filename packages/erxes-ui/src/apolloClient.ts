import {
  createHttpLink,
  from,
  ApolloClient,
  InMemoryCache
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import { split } from "@apollo/client/link/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { __, getEnv } from "./utils/core";
import { createClient } from "graphql-ws";
import addMergeKeyfieldPolicy from "./add-merge-keyfield-policy";
import noIdNestedTypes from "./no-id-nested-types";

const { REACT_APP_API_SUBSCRIPTION_URL, REACT_APP_API_URL } = getEnv();

// Create an http link:
const httpLink = createHttpLink({
  uri: `${REACT_APP_API_URL}/graphql`,
  credentials: "include"
});

// 중복 리다이렉트 방지를 위한 플래그
let isRedirecting = false;

// Error handler
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  // 이미 리다이렉트 중이면 무시
  if (isRedirecting) {
    return;
  }

  // GraphQL 에러 체크
  if (graphQLErrors && graphQLErrors.length > 0) {
    for (const error of graphQLErrors) {
      // "Login required" 에러는 토큰 만료로 발생
      if (error.message === "Login required" || error.message === "login required") {
        isRedirecting = true;
        console.log('토큰 만료 감지: 로그인 화면으로 리다이렉트합니다.');
        window.location.href = "/";
        return;
      }
    }
  }

  // 네트워크 에러 체크 (401 Unauthorized 등)
  if (networkError) {
    const statusCode = (networkError as any).statusCode;
    const status = (networkError as any).status;
    
    // 401 Unauthorized는 토큰 만료를 의미
    if (statusCode === 401 || status === 401) {
      isRedirecting = true;
      console.log('인증 실패 (401): 로그인 화면으로 리다이렉트합니다.');
      window.location.href = "/";
      return;
    }

    // 네트워크 에러 메시지에 "unauthorized" 또는 "login"이 포함된 경우
    const errorMessage = (networkError as any).message || String(networkError);
    if (
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('login required') ||
      errorMessage.toLowerCase().includes('token expired')
    ) {
      isRedirecting = true;
      console.log('인증 에러 감지: 로그인 화면으로 리다이렉트합니다.');
      window.location.href = "/";
      return;
    }
  }
});

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      sessioncode: sessionStorage.getItem("sessioncode") || ""
    }
  };
});

// Combining httpLink and warelinks altogether
const httpLinkWithMiddleware = from([errorLink, authLink, httpLink]);

// Subscription config
export const wsLink: any = new GraphQLWsLink(
  createClient({
    url: REACT_APP_API_SUBSCRIPTION_URL || "ws://localhost:4000/graphql",
    retryAttempts: 1000,
    retryWait: async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  })
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
    return kind === "OperationDefinition" && operation === "subscription";
  },
  wsLink,
  httpLinkWithMiddleware
);

const typePolicies = {};

addMergeKeyfieldPolicy(typePolicies, noIdNestedTypes);

// Creating Apollo-client
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies,
    addTypename: true
  }),
  queryDeduplication: true,
  link,
  connectToDevTools: true
});

export default client;
