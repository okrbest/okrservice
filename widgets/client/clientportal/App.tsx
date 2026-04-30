import * as React from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { ChatTab } from './ChatTab'
import { NotificationsTab } from './NotificationsTab'

type Tab = 'chat' | 'notifications'

interface Props {
  client: ApolloClient<NormalizedCacheObject>
  erxesCustomerId: string
  /** clientPortalCurrentUser.type (예: staff → 담당자 UI) */
  clientPortalUserType?: string
  unreadNotifCount?: number
}

export function App({
  client,
  erxesCustomerId,
  clientPortalUserType = '',
  unreadNotifCount = 0,
}: Props) {
  const [activeTab, setActiveTab] = React.useState<Tab>('chat')
  const isStaff = String(clientPortalUserType).toLowerCase() === 'staff'

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ color: '#f4f8ff', fontSize: 15, fontWeight: 700 }}>고객 채팅</span>
        <button
          type="button"
          style={closeBtnStyle}
          onClick={() => {
            // window.ReactNativeWebView is injected by the iOS/Android WebView bridge
            const rnWebView = (window as any).ReactNativeWebView
            if (rnWebView?.postMessage) {
              rnWebView.postMessage(JSON.stringify({ type: 'close' }))
            }
          }}
        >
          ✕
        </button>
      </div>

      <div style={tabBarStyle}>
        <button
          type="button"
          style={{ ...tabBtnStyle, ...(activeTab === 'chat' ? tabActiveStyle : {}) }}
          onClick={() => setActiveTab('chat')}
        >
          💬 채팅
        </button>
        <button
          type="button"
          style={{ ...tabBtnStyle, ...(activeTab === 'notifications' ? tabActiveStyle : {}) }}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 알림
          {unreadNotifCount > 0 && <span style={badgeStyle}>{unreadNotifCount}</span>}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <ChatTab client={client} erxesCustomerId={erxesCustomerId} />
        ) : (
          <NotificationsTab client={client} isStaff={isStaff} />
        )}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: '#f5f7fa',
}

const headerStyle: React.CSSProperties = {
  background: '#1f3f73',
  padding: '10px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 16,
  cursor: 'pointer',
  padding: '0 4px',
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #d9e6f7',
  background: '#fff',
  flexShrink: 0,
}

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  textAlign: 'center',
  fontSize: 13,
  color: '#999',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  fontWeight: 500,
}

const tabActiveStyle: React.CSSProperties = {
  color: '#4a90d9',
  fontWeight: 700,
  borderBottom: '2px solid #4a90d9',
}

const badgeStyle: React.CSSProperties = {
  background: '#e53e3e',
  color: '#fff',
  borderRadius: 8,
  fontSize: 10,
  padding: '1px 5px',
  marginLeft: 4,
}
