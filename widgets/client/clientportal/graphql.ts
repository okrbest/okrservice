import { gql } from '@apollo/client'

export const LOGIN_MUTATION = gql`
  mutation ClientPortalLogin($login: String!, $password: String, $clientPortalId: String) {
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

export const CLIENT_PORTAL_TICKET_DETAIL_QUERY = gql`
  query ClientPortalTicketDetail($_id: String!) {
    clientPortalTicket(_id: $_id) {
      _id
      name
      status
      description
      stageId
      modifiedAt
      createdAt
      assignedUserIds
    }
  }
`

export const CLIENT_PORTAL_TICKET_STAGE_META_QUERY = gql`
  query ClientPortalTicketStageMeta($ticketId: String!) {
    clientPortalTicketStageMeta(ticketId: $ticketId) {
      stageId
      pipelineId
    }
  }
`

export const CLIENT_PORTAL_TICKET_STAGES_QUERY = gql`
  query ClientPortalGetTicketStages($pipelineId: String!) {
    clientPortalGetTicketStages(pipelineId: $pipelineId) {
      _id
      name
      pipelineId
      probability
    }
  }
`

export const CLIENT_PORTAL_TICKET_CONTACTS_QUERY = gql`
  query ClientPortalTicketContacts($ticketId: String!) {
    clientPortalTicketContacts(ticketId: $ticketId) {
      customers {
        _id
        firstName
        lastName
        primaryEmail
        primaryPhone
      }
      companies {
        _id
        primaryName
        primaryEmail
        primaryPhone
      }
    }
  }
`

export const CLIENT_PORTAL_TICKET_COMMENTS_QUERY = gql`
  query ClientPortalTicketComments($typeId: String!, $type: String!) {
    clientPortalComments(typeId: $typeId, type: $type) {
      _id
      content
      userType
      createdAt
      createdUser {
        _id
        firstName
        lastName
        fullName
        email
      }
    }
  }
`

export const CLIENT_PORTAL_COMMENTS_ADD_MUTATION = gql`
  mutation ClientPortalCommentsAdd($type: String!, $typeId: String!, $content: String!, $userType: String!) {
    clientPortalCommentsAdd(type: $type, typeId: $typeId, content: $content, userType: $userType) {
      _id
      content
      userType
      createdAt
      createdUser {
        _id
        firstName
        lastName
        fullName
        email
      }
    }
  }
`

export const CLIENT_PORTAL_ASSIGNABLE_MEMBERS_QUERY = gql`
  query ClientPortalAssignableMembers {
    clientPortalAssignableMembers {
      _id
      firstName
      lastName
      email
    }
  }
`

export const CLIENT_PORTAL_TICKET_ASSIGN_MUTATION = gql`
  mutation ClientPortalTicketAssign($ticketId: String!, $assignedUserIds: [String]!) {
    clientPortalTicketAssign(ticketId: $ticketId, assignedUserIds: $assignedUserIds)
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

export interface CpTicketDetail {
  _id: string
  name: string
  status: string
  description?: string
  stageId?: string
  modifiedAt: string
  createdAt: string
  assignedUserIds?: string[]
}

export interface CpTicketStage {
  _id: string
  name: string
  pipelineId: string
  probability?: string
}

export interface CpTicketComment {
  _id: string
  content?: string
  userType?: string
  createdAt: string
  createdUser?: {
    _id: string
    firstName?: string
    lastName?: string
    fullName?: string
    email?: string
  }
}

export interface CpAssignableMember {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
}
