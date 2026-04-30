import * as React from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { useCustomerNotifications } from './hooks/useCustomerNotifications'
import { Notification } from './graphql'
import { getTicketIdFromNotification, openExternalNotificationLink } from './notificationTicket'
import { TicketDetailSheet } from './TicketDetailSheet'

interface Props {
  client: ApolloClient<NormalizedCacheObject>
  /** clientPortalCurrentUser.type === 'staff' */
  isStaff: boolean
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (date.toDateString() === now.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function NotificationsTab({ client, isStaff }: Props) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllRead,
    markOneRead,
    deleteNotifications,
    refresh,
  } = useCustomerNotifications(client)

  const [isEditing, setIsEditing] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [ticketDetailId, setTicketDetailId] = React.useState<string | null>(null)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleNotificationPress = React.useCallback(
    async (item: Notification) => {
      try {
        await markOneRead(item._id)
      } catch {
        /* 읽음 처리 실패해도 이동은 시도 */
      }
      const tid = getTicketIdFromNotification(item)
      if (tid) {
        setTicketDetailId(tid)
        return
      }
      if (item.link?.trim()) {
        openExternalNotificationLink(item.link)
      }
    },
    [markOneRead]
  )

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          알림{unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isEditing && unreadCount > 0 && (
            <button type="button" style={actionBtnStyle} onClick={() => markAllRead().catch(() => {})}>
              모두 읽음
            </button>
          )}
          <button
            type="button"
            style={actionBtnStyle}
            onClick={() => { setIsEditing((v) => !v); setSelectedIds([]) }}
          >
            {isEditing ? '완료' : '편집'}
          </button>
          {isEditing && (
            <>
              <button type="button" style={actionBtnStyle} onClick={() => setSelectedIds(sorted.map((n) => n._id))}>
                전체선택
              </button>
              <button
                type="button"
                style={{ ...actionBtnStyle, background: '#dc2626', opacity: selectedIds.length ? 1 : 0.5 }}
                disabled={!selectedIds.length}
                onClick={() => deleteNotifications(selectedIds).then(() => setSelectedIds([]))}
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {!!error && (
        <div style={errorStyle}>
          <span style={{ flex: 1, fontSize: 12 }}>{error}</span>
          <button type="button" style={retryStyle} onClick={() => refresh().catch(() => {})}>재시도</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {isLoading && (
          <p style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>로딩 중...</p>
        )}
        {!isLoading && sorted.length === 0 && (
          <div style={emptyStyle}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>새로운 알림이 없습니다</p>
            <p style={{ color: '#666', fontSize: 12 }}>새 이벤트가 발생하면 여기에 표시됩니다.</p>
          </div>
        )}
        {sorted.map((item) => (
          <NotificationItem
            key={item._id}
            item={item}
            isEditing={isEditing}
            isSelected={selectedIds.includes(item._id)}
            onToggleSelect={() => toggleSelect(item._id)}
            onPrimaryAction={() => handleNotificationPress(item)}
          />
        ))}
      </div>
      <TicketDetailSheet
        client={client}
        ticketId={ticketDetailId}
        isStaff={isStaff}
        onClose={() => setTicketDetailId(null)}
      />
    </div>
  )
}

function NotificationItem({
  item,
  isEditing,
  isSelected,
  onToggleSelect,
  onPrimaryAction,
}: {
  item: Notification
  isEditing: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onPrimaryAction: () => void
}) {
  const cursor = isEditing ? 'pointer' : 'pointer'
  return (
    <div
      style={{
        ...itemStyle,
        background: item.isRead ? '#fff' : '#f0f6ff',
        border: item.isRead ? '1px solid #e0e8f0' : '1px solid #2f6fdf',
        cursor,
      }}
      onClick={isEditing ? onToggleSelect : onPrimaryAction}
      onKeyDown={
        !isEditing
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPrimaryAction()
              }
            }
          : undefined
      }
      role={!isEditing ? 'button' : undefined}
      tabIndex={!isEditing ? 0 : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {isEditing && (
          <div style={{ ...checkboxStyle, ...(isSelected ? checkboxSelectedStyle : {}) }}>
            {isSelected && <span style={{ color: '#fff', fontSize: 11, lineHeight: '12px' }}>✓</span>}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600, color: item.isRead ? '#333' : '#1a4db3' }}>
            {item.title}
          </span>
          {!item.isRead && <span style={unreadDotStyle} />}
        </div>
      </div>
      <p style={{ marginTop: 4, fontSize: 12, color: '#666', lineHeight: '16px' }}>{item.content}</p>
      <span style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{formatTime(item.createdAt)}</span>
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #e8ecf2',
}

const badgeStyle: React.CSSProperties = {
  background: '#e53e3e',
  color: '#fff',
  borderRadius: 8,
  fontSize: 10,
  padding: '1px 5px',
  marginLeft: 4,
}

const actionBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid #d0d8e8',
  borderRadius: 12,
  padding: '3px 10px',
  fontSize: 11,
  color: '#333',
  cursor: 'pointer',
}

const itemStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: '10px 12px',
  marginBottom: 8,
}

const checkboxStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 9,
  border: '1px solid #8ea8d8',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: 1,
}

const checkboxSelectedStyle: React.CSSProperties = {
  background: '#2f6fdf',
  border: '1px solid #2f6fdf',
}

const unreadDotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: 4,
  background: '#ef4444',
  marginLeft: 4,
  verticalAlign: 'middle',
}

const errorStyle: React.CSSProperties = {
  margin: '8px 12px',
  background: '#ffecef',
  border: '1px solid #f4b9c3',
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const retryStyle: React.CSSProperties = {
  background: '#f8dbe1',
  border: 'none',
  borderRadius: 12,
  padding: '4px 10px',
  color: '#9f2f3b',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const emptyStyle: React.CSSProperties = {
  marginTop: 24,
  background: '#fff',
  border: '1px solid #e0e8f0',
  borderRadius: 8,
  padding: 16,
  textAlign: 'center',
}
