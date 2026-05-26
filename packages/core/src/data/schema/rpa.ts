export const types = `
  type RpaButton {
    label: String
    path: String
  }

  type RpaMessage {
    _id: String
    loginId: String
    rpaCode: String
    messageCode: String
    message: String
    overtime: String
    receivedAt: Date
    buttons: [RpaButton]
  }
`;

export const queries = `
  rpaMessages(loginId: String!, limit: Int): [RpaMessage]
`;

export const subscriptions = `
  rpaMessageReceived(loginId: String!): RpaMessage
`;
