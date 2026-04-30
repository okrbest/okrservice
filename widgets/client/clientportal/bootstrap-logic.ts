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

function extractClientPortalAccessToken(loginPayload: unknown): string {
  if (typeof loginPayload === 'string' && loginPayload.trim() !== '') {
    return loginPayload
  }
  if (!loginPayload || typeof loginPayload !== 'object') {
    return ''
  }
  const o = loginPayload as Record<string, unknown>
  if (typeof o.token === 'string' && o.token.trim() !== '') {
    return o.token
  }
  /* tokenPassMethod 이 cookie 인 포털은 JSON 에 access token 대신 refreshToken 만 옴 */
  if (typeof o.refreshToken === 'string' && o.refreshToken.trim() !== '') {
    return o.refreshToken
  }
  return ''
}

interface ConnectPayload {
  email: string
  name: string
  code: string
  /** 생략 시 DB에 클라이언트 포털이 정확히 하나 있어야 함 */
  clientPortalId?: string
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

export function parseConnectMessage(data: any): ConnectPayload | null {
  if (data?.type !== 'connect') return null
  if (!data.email) return null
  const rawId = data.clientPortalId != null ? String(data.clientPortalId).trim() : ''
  return {
    email: String(data.email).trim(),
    name: data.name != null ? String(data.name) : '',
    code: data.code != null ? String(data.code) : '',
    ...(rawId !== '' ? { clientPortalId: rawId } : {}),
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

let bootstrapInFlight = false
let bootstrapped = false

export function installClientPortalListeners(announce: (payload: object) => void): void {
  const isEmbedded = window.parent !== window
  const waitingEl = document.getElementById('root')
  if (waitingEl) {
    if (!isEmbedded) {
      waitingEl.innerHTML =
        '<div style="padding:24px;max-width:420px;margin:40px auto;font:15px system-ui,sans-serif;line-height:1.5;color:#333">' +
        '<p><strong>이 주소는 보통 상위 페이지의 iframe 안에서만 완성됩니다.</strong></p>' +
        '<p>주소창에 <code>/clientportal</code>만 직접 열면 부모 창에서 보내는 로그인(<code>postMessage</code>)이 없어 채팅 화면이 뜨지 않습니다. Network에 <code>graphql</code>이 없는 것도 그 때문일 수 있습니다.</p>' +
        '<p><a href="/static/clientportal-widget-test.html">클라이언트 포털 위젯 테스트 페이지</a>를 열고 오른쪽 아래 <strong>포털</strong>을 눌러 보세요.</p>' +
        '</div>'
    } else {
      waitingEl.innerHTML =
        '<p style="padding:20px;font:14px system-ui;color:#444;text-align:center">부모 창에서 로그인 정보를 받는 중…</p>'
    }
  }
  const waitTimer = window.setTimeout(() => {
    if (bootstrapped || !waitingEl || !isEmbedded) return
    if (waitingEl.innerHTML.includes('받는 중')) {
      waitingEl.innerHTML =
        '<p style="padding:20px;font:14px system-ui;color:#666;text-align:center">아직 연결되지 않았습니다.<br>주소를 <code>http://localhost:3200</code> 과 섞어 쓰지 않았는지 확인하거나, 게이트웨이 재시작 후 다시 「포털」을 눌러 보세요.</p>'
    }
  }, 12000)

  async function bootstrap(payload: ConnectPayload): Promise<void> {
    if (bootstrapped) {
      announce({
        type: 'clientportal-info',
        message: '이미 위젯이 떠 있습니다. iframe을 새로고침한 뒤 다시 시도하세요.',
      })
      return
    }
    if (bootstrapInFlight) {
      announce({ type: 'clientportal-info', message: '로그인 요청이 이미 진행 중입니다.' })
      return
    }

    bootstrapInFlight = true
    try {
      const { API_URL } = getEnv()
      if (!API_URL || String(API_URL).trim() === '') {
        throw new Error(
          'API_URL이 비어 있습니다. 위젯 서버 .env의 API_URL(및 ROOT_URL)을 설정하고 서버를 재시작하세요.'
        )
      }

      const { ApolloClient, InMemoryCache, createHttpLink } = await import('@apollo/client')
      const tempClient = new ApolloClient({
        link: createHttpLink({ uri: `${API_URL}/graphql`, credentials: 'include' }),
        cache: new InMemoryCache(),
      })

      const codeTrim =
        payload.code != null && String(payload.code).trim() !== ''
          ? String(payload.code).trim()
          : undefined

      const loginRes = await tempClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: {
          login: payload.email,
          ...(codeTrim !== undefined ? { password: codeTrim } : {}),
          ...(payload.clientPortalId ? { clientPortalId: payload.clientPortalId } : {}),
        },
      })

      if (loginRes.errors && loginRes.errors.length > 0) {
        throw new Error(loginRes.errors.map((e) => e.message).join('; '))
      }

      const token = extractClientPortalAccessToken(loginRes.data?.clientPortalLogin)
      if (!token) throw new Error('로그인 실패: 토큰 없음(GraphQL 응답 확인)')

      const authedClient = createApolloClient(token)

      const userRes = await authedClient.query({ query: CURRENT_USER_QUERY })
      const user: CurrentUser = userRes.data?.clientPortalCurrentUser
      if (!user?.erxesCustomerId) throw new Error('고객 정보를 찾을 수 없습니다')

      const container = document.getElementById('root')
      if (!container) throw new Error('#root 요소가 없습니다')

      const root = createRoot(container)
      const appElement = React.createElement(App, {
        client: authedClient,
        erxesCustomerId: user.erxesCustomerId,
        clientPortalUserType: user.type,
      })
      const providerElement = React.createElement(ApolloProvider, { client: authedClient, children: appElement })
      root.render(providerElement)
      bootstrapped = true
      window.clearTimeout(waitTimer)
      announce({ type: 'clientportal-connected' })
    } catch (err: unknown) {
      window.clearTimeout(waitTimer)
      const message = err instanceof Error ? err.message : String(err)
      announce({ type: 'clientportal-error', message })
      throw err
    } finally {
      bootstrapInFlight = false
    }
  }

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data

    const connectPayload = parseConnectMessage(data)
    if (connectPayload) {
      bootstrap(connectPayload).catch((err) => {
        const container = document.getElementById('root')
        if (container) {
          const msg = err instanceof Error ? err.message : String(err)
          container.innerHTML = `<div style="padding:20px;text-align:center;color:#c00">연결에 실패했습니다.<br>${msg}</div>`
        }
      })
      return
    }

    const notifPayload = parseNotificationMessage(data)
    if (notifPayload?.notifType === 'attendance') {
      saveAttendanceRecord(notifPayload)
    }
  })
}
