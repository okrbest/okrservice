import { viewStateFromError } from '../viewState';

describe('viewStateFromError', () => {
  it('서버가 링크 만료라고 하면 expired', () => {
    expect(
      viewStateFromError({
        graphQLErrors: [{ message: 'TICKET_VIEW_LINK_EXPIRED' }],
      }),
    ).toBe('expired');
  });

  it('티켓이 없거나 보관됐으면 notFound', () => {
    expect(
      viewStateFromError({
        graphQLErrors: [{ message: 'TICKET_VIEW_NOT_FOUND' }],
      }),
    ).toBe('notFound');
  });

  it('오류 메시지 자체에 코드가 담긴 경우도 인식한다', () => {
    expect(viewStateFromError({ message: 'TICKET_VIEW_LINK_EXPIRED' })).toBe(
      'expired',
    );
    expect(
      viewStateFromError(new Error('GraphQL error: TICKET_VIEW_NOT_FOUND')),
    ).toBe('notFound');
  });

  it('네트워크 등 그 밖의 오류는 error(다시 시도)', () => {
    expect(
      viewStateFromError({
        networkError: new Error('Failed to fetch'),
        graphQLErrors: [],
      }),
    ).toBe('error');
    expect(viewStateFromError(new Error('boom'))).toBe('error');
    expect(viewStateFromError(undefined)).toBe('error');
  });
});
