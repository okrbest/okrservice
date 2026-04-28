import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import { createApolloClient } from './apollo'
import { saveAttendanceRecord } from './hooks/useAttendanceRecord'
import { App } from './App'
import {
  LOGIN_MUTATION,
  CURRENT_USER_QUERY,
  CurrentUser,
} from './graphql'
import { getEnv } from '../utils'

interface ConnectPayload {
  email: string
  name: string
  code: string
  clientPortalId: string
}

interface AttendanceNotifPayload {
  notifType: 'attendance'
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  deeplinkUrl: string
  deeplinkParams: Record<string, string>
}

// 단위 테스트 가능하도록 export
export function parseConnectMessage(data: any): ConnectPayload | null {
  if (data?.type !== 'connect') return null
  if (!data.email || !data.clientPortalId) return null
  return {
    email: data.email,
    name: data.name || '',
    code: data.code || '',
    clientPortalId: data.clientPortalId,
  }
}

export function parseNotificationMessage(data: any): AttendanceNotifPayload | null {
  if (data?.type !== 'notification') return null
  if (data.notifType === 'attendance') {
    return {
      notifType: 'attendance',
      startHour: Number(data.startHour),
      startMinute: Number(data.startMinute),
      endHour: Number(data.endHour),
      endMinute: Number(data.endMinute),
      deeplinkUrl: data.deeplinkUrl || '',
      deeplinkParams: data.deeplinkParams || {},
    }
  }
  return null
}

async function bootstrap(payload: ConnectPayload): Promise<void> {
  const { API_URL } = getEnv()

  // 임시 클라이언트로 로그인
  const { ApolloClient, InMemoryCache, createHttpLink } = await import('@apollo/client')
  const tempClient = new ApolloClient({
    link: createHttpLink({ uri: `${API_URL}/graphql`, credentials: 'include' }),
    cache: new InMemoryCache(),
  })

  const loginRes = await tempClient.mutate({
    mutation: LOGIN_MUTATION,
    variables: {
      login: payload.email,
      password: payload.code,
      clientPortalId: payload.clientPortalId,
    },
  })

  const token: string = loginRes.data?.clientPortalLogin
  if (!token) throw new Error('로그인 실패: 토큰 없음')

  // 토큰으로 인증된 클라이언트 생성
  const authedClient = createApolloClient(token)

  // 현재 사용자 조회
  const userRes = await authedClient.query({ query: CURRENT_USER_QUERY })
  const user: CurrentUser = userRes.data?.clientPortalCurrentUser
  if (!user?.erxesCustomerId) throw new Error('고객 정보를 찾을 수 없습니다')

  // React 마운트
  const container = document.getElementById('root')
  if (!container) throw new Error('#root 요소가 없습니다')

  const root = createRoot(container)
  const appElement = React.createElement(App, { client: authedClient, erxesCustomerId: user.erxesCustomerId })
  const providerElement = React.createElement(ApolloProvider, { client: authedClient, children: appElement })
  root.render(providerElement)
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data

  const connectPayload = parseConnectMessage(data)
  if (connectPayload) {
    bootstrap(connectPayload).catch((err) => {
      const container = document.getElementById('root')
      if (container) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:#c00">연결에 실패했습니다.<br>${err.message}</div>`
      }
    })
    return
  }

  const notifPayload = parseNotificationMessage(data)
  if (notifPayload?.notifType === 'attendance') {
    saveAttendanceRecord(notifPayload)
  }
})
