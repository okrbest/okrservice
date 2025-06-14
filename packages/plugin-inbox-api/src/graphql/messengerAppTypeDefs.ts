export const types = `
  type MessengerApp {
    _id: String!
    kind: String!
    name: String!
    showInInbox: Boolean
    credentials: JSON
    accountId: String
  }

  type WebSiteApp {
    description: String
    buttonText: String
    url: String
    openInNewWindow: Boolean
  }

  type KnowledgebaseApp {
    topicId: String
  }

  type LeadApp {
    formCode: String
  }

  type MessengerAppsResponse {
    websites: [WebSiteApp]
    knowledgebases: [KnowledgebaseApp]
    leads: [LeadApp]
  }

  input WebSiteMessengerAppInput {
    description: String
    buttonText: String
    url: String
    openInNewWindow: Boolean
  }

  input KnowledgeBaseMessengerAppInput {
    topicId: String
  }

  input LeadMessengerAppInput {
    formCode: String
  }

  input MessengerAppsInput {
    websites: [WebSiteMessengerAppInput]
    knowledgebases: [KnowledgeBaseMessengerAppInput]
    leads: [LeadMessengerAppInput]
  }
`;

export const mutations = `
  messengerAppSave(integrationId: String!, messengerApps: MessengerAppsInput): String
`;

export const queries = `
  messengerApps(integrationId: String!): MessengerAppsResponse
`;
