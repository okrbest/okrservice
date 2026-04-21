export const types = `
  type WorkSchedule {
    _id: String!
    userId: String!
    startHour: Int!
    startMinute: Int!
    endHour: Int!
    endMinute: Int!
    deeplinkUrl: String!
    deeplinkParams: JSON
    lastPushSentDate: String
  }

  input WorkScheduleInput {
    userId: String!
    startHour: Int!
    startMinute: Int!
    endHour: Int!
    endMinute: Int!
    deeplinkUrl: String!
    deeplinkParams: JSON
  }
`

export const queries = `
  workSchedule(userId: String!): WorkSchedule
`

export const mutations = `
  workScheduleUpsert(input: WorkScheduleInput!): WorkSchedule
  workScheduleDelete(userId: String!): Boolean
`
