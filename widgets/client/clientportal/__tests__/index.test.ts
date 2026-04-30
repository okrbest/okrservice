// postMessage 핸들러의 핵심 로직만 단위 테스트
jest.mock('../../utils', () => ({ getEnv: () => ({ API_URL: '', API_SUBSCRIPTIONS_URL: '' }) }))
jest.mock('react-dom/client', () => ({ createRoot: jest.fn() }))
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  ApolloClient: jest.fn(),
  InMemoryCache: jest.fn(),
  createHttpLink: jest.fn(),
  ApolloProvider: ({ children }: any) => children,
}))

import { parseConnectMessage, parseNotificationMessage } from '../bootstrap-logic'

describe('parseConnectMessage', () => {
  it('connect 메시지 파싱', () => {
    const result = parseConnectMessage({
      type: 'connect',
      email: 'user@test.com',
      name: '홍길동',
      code: 'abc',
      clientPortalId: 'pid',
    })
    expect(result).toEqual({
      email: 'user@test.com',
      name: '홍길동',
      code: 'abc',
      clientPortalId: 'pid',
    })
  })

  it('type이 connect가 아니면 null 반환', () => {
    expect(parseConnectMessage({ type: 'other' })).toBeNull()
  })

  it('clientPortalId 없이 connect 가능(단일 포털 서버)', () => {
    const result = parseConnectMessage({
      type: 'connect',
      email: 'user@test.com',
      code: 'secret',
    })
    expect(result).toEqual({
      email: 'user@test.com',
      name: '',
      code: 'secret',
    })
  })

  it('email 없으면 null 반환', () => {
    expect(parseConnectMessage({ type: 'connect', clientPortalId: 'pid' })).toBeNull()
  })
})

describe('parseNotificationMessage', () => {
  it('attendance 알림 파싱', () => {
    const result = parseNotificationMessage({
      type: 'notification',
      notifType: 'attendance',
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      deeplinkUrl: 'app://x',
      deeplinkParams: {},
    })
    expect(result?.notifType).toBe('attendance')
    expect(result?.startHour).toBe(9)
  })

  it('type이 notification이 아니면 null 반환', () => {
    expect(parseNotificationMessage({ type: 'other' })).toBeNull()
  })

  it('알 수 없는 notifType이면 null 반환', () => {
    expect(parseNotificationMessage({ type: 'notification', notifType: 'unknown' })).toBeNull()
  })
})
