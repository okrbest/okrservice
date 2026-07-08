import {
  commonDragParams,
  commonListTypes,
  commonMutationParams,
  commonTypes,
  conformityQueryFields,
  copyParams,
} from "./common";

export const types = ({ contacts, clientPortal }) => `
  type UpdateWidgetAlarmResponse {
    success: Boolean!
    message: String!
  }

  type TicketListItem {
    customPropertiesData: JSON,
    requestType: String,
    qualityImpact: String,
    functionCategory: String,
    visibility: String,
    ${commonListTypes}
  }

  type Ticket @key(fields: "_id") {
    _id: String!
    source: String
    ${
      contacts
        ? `
    requestType: String
    qualityImpact: String
    functionCategory: String
    visibility: String
    ${contacts
    ? `
      companies: [Company]
      customers: [Customer]
      `
        : ""
    }

    tags: [Tag]
    ${clientPortal ? `vendorCustomers: [ClientPortalUser]` : ""}

    ${commonTypes}
    `
        : ""
    }
  }

  type BulkArchiveResult {
    count: Int!
  }

  type ArchivedGroup {
    key: String!
    label: String
    count: Int!
  }

  type ArchivedTicketListItem {
    _id: String
    name: String
    stageName: String
    assignedUsers: JSON
    modifiedAt: Date
    requestType: String
    functionCategory: String
  }
`;

const listQueryParams = `
  _ids: [String]
  pipelineId: String
  pipelineIds: [String]
  page: Int
  perPage: Int
  parentId:String
  stageId: String
  stage: [String]
  customerIds: [String]
  vendorCustomerIds: [String]
  companyIds: [String]
  date: TicketsItemDate
  skip: Int
  limit: Int
  search: String
  assignedUserIds: [String]
  closeDateType: String
  priority: [String]
  source: [String]
  requestType: [String]
  qualityImpact: [String]
  functionCategory: [String]
  labelIds: [String]
  sortField: String
  sortDirection: Int
  userIds: [String]
  segment: String
  segmentData: String
  assignedToMe: String
  startDate: String
  endDate: String
  hasStartAndCloseDate: Boolean
  tagIds: [String]
  noSkipArchive: Boolean
  number: String
  branchIds: [String]
  departmentIds: [String]
  boardIds: [String]
  stageCodes: [String]
  dateRangeFilters:JSON
  customFieldsDataFilters:JSON
  createdStartDate: Date,
  createdEndDate: Date
  stateChangedStartDate: Date
  stateChangedEndDate: Date
  startDateStartDate: Date
  startDateEndDate: Date
  closeDateStartDate: Date
  closeDateEndDate: Date
  resolvedDayBetween:[Int]
  ${conformityQueryFields}
`;

const archivedTicketsParams = `
  pipelineId: String!
  search: String
  userIds: [String]
  priorities: [String]
  assignedUserIds: [String]
  labelIds: [String]
  companyIds: [String]
  customerIds: [String]
  startDate: String
  endDate: String
  createdAtStart: String
  createdAtEnd: String
  noAssignee: Boolean
  noCompany: Boolean
  requestType: String
  functionCategory: String
  noRequestType: Boolean
  noFunctionCategory: Boolean
  sources: [String]
`;

export const queries = `
  ticketDetail(_id: String!, includeRelations: Boolean): Ticket
  tickets(${listQueryParams}): [TicketListItem]
  ticketsTotalCount(${listQueryParams}): Int
  archivedTickets(
    page: Int
    perPage: Int
    pipelineId: String
    ${archivedTicketsParams}
  ): [Ticket]
  archivedTicketsCount(
    ${archivedTicketsParams}
  ): Int
  archivedTicketsGroups(
    pipelineId: String!
    groupBy: String!
    search: String
    assignedUserIds: [String]
    requestType: String
    functionCategory: String
    startDate: String
    endDate: String
  ): [ArchivedGroup!]!
  archivedTicketItems(
    page: Int
    perPage: Int
    ${archivedTicketsParams}
  ): [ArchivedTicketListItem]
`;

const ticketMutationParams = `
  source: String,
  type: String,
  isCheckUserTicket: Boolean
  requestType: String,
  qualityImpact: String,
  functionCategory: String,
`;

export const mutations = `
  ticketsAdd(name: String, ${copyParams}, ${ticketMutationParams}, ${commonMutationParams}): Ticket
  ticketsEdit(_id: String!, name: String, ${ticketMutationParams}, ${commonMutationParams}): Ticket
  ticketsChange(${commonDragParams}): Ticket
  ticketsRemove(_id: String!): Ticket
  ticketsWatch(_id: String, isAdd: Boolean): Ticket
  ticketsCopy(_id: String!, proccessId: String): Ticket
  ticketsArchive(stageId: String!, proccessId: String): String
  ticketsBulkArchive(ids: [String!]!, pipelineId: String!): BulkArchiveResult
  ticketsBulkEdit(ids: [String!]!, status: String!): BulkArchiveResult
  ticketsBulkRemove(ids: [String!]!): Int
  updateWidgetAlarm(ticketId: String!): UpdateWidgetAlarmResponse
`;