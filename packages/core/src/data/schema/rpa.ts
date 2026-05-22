export const types = `
  type RpaMessage {
    _id: String
    loginId: String
    rpaCode: String
    messageCode: String
    message: String
    overtime: String
    receivedAt: Date
  }
`;

export const queries = `
  rpaMessages(loginId: String!, limit: Int): [RpaMessage]
`;

export const subscriptions = `
  rpaMessageReceived(loginId: String!): RpaMessage
`;
