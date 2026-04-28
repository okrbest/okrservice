import * as React from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { useMessages } from './hooks/useMessages'
import { useAttendanceRecord } from './hooks/useAttendanceRecord'
import { AttendanceCard } from './AttendanceCard'
import { Message } from './graphql'

const INTEGRATION_ID = (window as any).erxesEnv?.INTEGRATION_ID || process.env.INTEGRATION_ID || ''

interface Props {
  client: ApolloClient<NormalizedCacheObject>
  erxesCustomerId: string
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`
}

export function ChatTab({ client, erxesCustomerId }: Props) {
  const { messages, isLoading, error, refetch } = useMessages(
    client,
    INTEGRATION_ID,
    erxesCustomerId
  )
  const { record: attendanceRecord } = useAttendanceRecord()
  const [inputText, setInputText] = React.useState('')
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const sortedMessages = React.useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {isLoading && (
        <div style={{ padding: '8px', textAlign: 'center', fontSize: 12, color: '#999' }}>
          로딩 중...
        </div>
      )}
      {!!error && (
        <div style={errorBannerStyle}>
          <span style={{ flex: 1, fontSize: 12 }}>{error}</span>
          <button type="button" style={retryBtnStyle} onClick={() => refetch().catch(() => {})}>
            재시도
          </button>
        </div>
      )}
      <div ref={listRef} style={messageListStyle}>
        {attendanceRecord && <AttendanceCard record={attendanceRecord} />}
        {sortedMessages.length === 0 && !isLoading && (
          <div style={emptyStateStyle}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>아직 대화가 없어요</p>
            <p style={{ color: '#666', fontSize: 12 }}>
              아래 입력창에서 첫 메시지를 보내면 상담이 시작됩니다.
            </p>
          </div>
        )}
        {sortedMessages.map((msg) => (
          <MessageItem key={msg._id} message={msg} />
        ))}
      </div>
      <div style={inputRowStyle}>
        <input
          style={inputStyle}
          placeholder="메시지 입력..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputText.trim()) {
              // 메시지 전송은 서버 연결 후 구현
            }
          }}
        />
        <button
          type="button"
          style={{ ...sendBtnStyle, opacity: inputText.trim() ? 1 : 0.5 }}
          disabled={!inputText.trim()}
        >
          전송
        </button>
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  const isBot = !message.userId
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isBot ? 'flex-start' : 'flex-end',
        marginBottom: 8,
        paddingLeft: isBot ? 0 : 24,
        paddingRight: isBot ? 24 : 0,
      }}
    >
      <div style={isBot ? botBubbleStyle : userBubbleStyle}>
        <span style={{ fontSize: 13 }} dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
      <span style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        {formatTime(message.createdAt)}
      </span>
      {message.botData?.type === 'cta' && (
        <button
          type="button"
          style={ctaBotStyle}
          onClick={() => {
            // window.ReactNativeWebView is injected by the iOS/Android WebView bridge
            const rnWebView = (window as any).ReactNativeWebView
            if (rnWebView?.postMessage) {
              rnWebView.postMessage(
                JSON.stringify({
                  type: 'deeplink',
                  url: message.botData!.url,
                  params: message.botData!.params,
                })
              )
            }
          }}
        >
          {message.botData.label}
        </button>
      )}
    </div>
  )
}

const messageListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '10px 12px',
  background: '#f5f7fa',
}

const inputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  padding: 8,
  background: '#fff',
  borderTop: '1px solid #e8ecf2',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#f0f3f8',
  border: 'none',
  borderRadius: 16,
  padding: '7px 12px',
  fontSize: 13,
  outline: 'none',
}

const sendBtnStyle: React.CSSProperties = {
  background: '#4a90d9',
  color: '#fff',
  border: 'none',
  borderRadius: 16,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const botBubbleStyle: React.CSSProperties = {
  background: '#e8f0fd',
  border: '1px solid #b8cef5',
  borderRadius: 8,
  padding: '8px 10px',
  maxWidth: '78%',
}

const userBubbleStyle: React.CSSProperties = {
  background: '#4a90d9',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 10px',
  maxWidth: '78%',
}

const ctaBotStyle: React.CSSProperties = {
  marginTop: 4,
  background: '#eaf2ff',
  border: '1.5px solid #4a90d9',
  borderRadius: 8,
  padding: '7px 14px',
  color: '#4a90d9',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const errorBannerStyle: React.CSSProperties = {
  margin: '8px 12px',
  background: '#ffecef',
  border: '1px solid #f4b9c3',
  borderRadius: 8,
  padding: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const retryBtnStyle: React.CSSProperties = {
  background: '#f8dbe1',
  border: 'none',
  borderRadius: 12,
  padding: '4px 10px',
  color: '#9f2f3b',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const emptyStateStyle: React.CSSProperties = {
  marginTop: 24,
  background: '#fff',
  border: '1px solid #e0e8f0',
  borderRadius: 8,
  padding: 16,
  textAlign: 'center',
}
