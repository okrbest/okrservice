// 새 탭 화면 상태: 서버 오류 코드(contracts/graphql.md)를 화면 상태로 바꾼다
export type ViewErrorState = 'expired' | 'notFound' | 'error';

const EXPIRED = 'TICKET_VIEW_LINK_EXPIRED';
const NOT_FOUND = 'TICKET_VIEW_NOT_FOUND';

export const viewStateFromError = (error: any): ViewErrorState => {
  const messages: string[] = [
    ...((error && error.graphQLErrors) || []).map((e: any) => e && e.message),
    error && error.message,
  ].filter(Boolean);

  if (messages.some((message) => message.includes(EXPIRED))) {
    return 'expired';
  }

  if (messages.some((message) => message.includes(NOT_FOUND))) {
    return 'notFound';
  }

  return 'error';
};
