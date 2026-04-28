import { useState, useCallback, useEffect } from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  CLIENT_PORTAL_NOTIFICATIONS_QUERY,
  CUSTOMER_UNREAD_NOTIFICATION_COUNT_QUERY,
  MARK_CUSTOMER_NOTIFICATIONS_READ_MUTATION,
  DELETE_CUSTOMER_NOTIFICATIONS_MUTATION,
  Notification,
} from '../graphql'

const POLL_INTERVAL_MS = 30_000
const FETCH_LIMIT = 100

export function useCustomerNotifications(client: ApolloClient<NormalizedCacheObject>) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [listRes, countRes] = await Promise.all([
        client.query({
          query: CLIENT_PORTAL_NOTIFICATIONS_QUERY,
          variables: { page: 1, perPage: FETCH_LIMIT, requireRead: false },
          fetchPolicy: 'network-only',
        }),
        client.query({
          query: CUSTOMER_UNREAD_NOTIFICATION_COUNT_QUERY,
          fetchPolicy: 'network-only',
        }),
      ])
      setNotifications(listRes.data?.clientPortalNotifications ?? [])
      setUnreadCount(countRes.data?.clientPortalNotificationCount ?? 0)
    } catch {
      setError('알림을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchAll().catch(() => {})
    const timer = setInterval(() => { fetchAll().catch(() => {}) }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchAll])

  const markAllRead = useCallback(async () => {
    await client.mutate({
      mutation: MARK_CUSTOMER_NOTIFICATIONS_READ_MUTATION,
      variables: { markAll: true },
    })
    await fetchAll()
  }, [client, fetchAll])

  const markOneRead = useCallback(async (id: string) => {
    await client.mutate({
      mutation: MARK_CUSTOMER_NOTIFICATIONS_READ_MUTATION,
      variables: { _ids: [id], markAll: false },
    })
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [client])

  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    await client.mutate({
      mutation: DELETE_CUSTOMER_NOTIFICATIONS_MUTATION,
      variables: { _ids: ids },
    })
    await fetchAll()
  }, [client, fetchAll])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllRead,
    markOneRead,
    deleteNotifications,
    refresh: fetchAll,
  }
}
