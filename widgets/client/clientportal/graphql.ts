import { gql } from '@apollo/client'

export const LOGIN_MUTATION = gql`
  mutation ClientPortalLogin($login: String!, $password: String!, $clientPortalId: String!) {
    clientPortalLogin(login: $login, password: $password, clientPortalId: $clientPortalId)
  }
`

export const CURRENT_USER_QUERY = gql`
  query ClientPortalCurrentUser {
    clientPortalCurrentUser {
      _id
      email
      firstName
      lastName
      erxesCustomerId
      type
    }
  }
`

export const CONVERSATIONS_QUERY = gql`
  query WidgetsConversations($integrationId: String!, $customerId: String) {
    widgetsConversations(integrationId: $integrationId, customerId: $customerId) {
      _id
    }
  }
`

export const MESSAGES_QUERY = gql`
  query WidgetsMessages($conversationId: String!) {
    widgetsMessages(conversationId: $conversationId) {
      _id
      content
      createdAt
      userId
      botData
    }
  }
`

export const CLIENT_PORTAL_NOTIFICATIONS_QUERY = gql`
  query ClientPortalNotifications($page: Int, $perPage: Int, $requireRead: Boolean) {
    clientPortalNotifications(page: $page, perPage: $perPage, requireRead: $requireRead) {
      _id
      title
      content
      link
      notifType
      createdAt
      isRead
      eventData
    }
  }
`

export const CUSTOMER_UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query ClientPortalCustomerUnreadCount {
    clientPortalNotificationCount(all: false)
  }
`

export const MARK_CUSTOMER_NOTIFICATIONS_READ_MUTATION = gql`
  mutation ClientPortalNotificationsMarkAsRead($_ids: [String], $markAll: Boolean) {
    clientPortalNotificationsMarkAsRead(_ids: $_ids, markAll: $markAll)
  }
`

export const DELETE_CUSTOMER_NOTIFICATIONS_MUTATION = gql`
  mutation ClientPortalNotificationsRemove($_ids: [String]!) {
    clientPortalNotificationsRemove(_ids: $_ids)
  }
`

export interface Message {
  _id: string
  content: string
  createdAt: string
  userId: string | null
  botData: { type: string; label: string; url: string; params: Record<string, string> } | null
}

export interface Notification {
  _id: string
  title: string
  content: string
  notifType: string
  link?: string
  isRead: boolean
  createdAt: string
  eventData?: { ticketId?: string; type?: string; [key: string]: unknown }
}

export interface CurrentUser {
  _id: string
  email?: string
  firstName?: string
  lastName?: string
  erxesCustomerId?: string
  type?: string
}
