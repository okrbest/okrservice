import { useState, useCallback, useEffect, useRef } from 'react'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { CONVERSATIONS_QUERY, MESSAGES_QUERY, Message } from '../graphql'

const POLL_INTERVAL_MS = 10_000

export function useMessages(
  client: ApolloClient<NormalizedCacheObject>,
  integrationId: string,
  customerId: string
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!integrationId || !customerId) {
      setMessages([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const { data: convData } = await client.query({
        query: CONVERSATIONS_QUERY,
        variables: { integrationId, customerId },
        fetchPolicy: 'network-only',
      })
      const conversation = convData.widgetsConversations?.[0]
      if (!conversation) {
        setMessages([])
        return
      }
      conversationIdRef.current = conversation._id
      const { data: msgData } = await client.query({
        query: MESSAGES_QUERY,
        variables: { conversationId: conversation._id },
        fetchPolicy: 'network-only',
      })
      setMessages(msgData.widgetsMessages || [])
    } catch {
      setError('메시지를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [client, integrationId, customerId])

  useEffect(() => {
    fetchMessages().catch(() => {})
    const timer = setInterval(() => { fetchMessages().catch(() => {}) }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchMessages])

  return { messages, isLoading, error, refetch: fetchMessages }
}
