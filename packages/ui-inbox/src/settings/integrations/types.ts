import {
  ILeadData,
  ILeadIntegration,
  IWebhookData,
} from "@erxes/ui-leads/src/types";

import { IBrand } from "@erxes/ui/src/brands/types";
import { IForm } from "@erxes/ui-forms/src/forms/types";
import { IProductCategory } from "@erxes/ui-products/src/types";
import { QueryResponse } from "@erxes/ui/src/types";

interface IFacebookCustomer {
  _id: string;
  userId: string;
  erxesApiId: string;
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  integrationId: string;
}

export interface IPages {
  id: string;
  name?: string;
  checked?: boolean;
  isUsed?: boolean;
}

export interface IFacebookComment {
  _id: string;
  postId: string;
  conversationId: string;
  parentId: string;
  commentId: string;
  content: string;
  attachments: string[];
  commentCount: number;
  timestamp: Date;
  customer: IFacebookCustomer;
  isResolved: boolean;
  permalink_url: string;
}

export interface IImapForm {
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export interface IEmailTemplate {
  _id: string;
  name: string;
  content: string;
}

export interface IExchangeForm {
  email: string;
  password: string;
  host: number;
  username?: string;
}

export interface IMessengerApps {
  knowledgebases?: ITopic[];
  websites?: IWebsite[];
  leads?: ILead[];
}

export interface IAccount {
  _id: string;
  name: string;
  kind: string;
  id: string;
}

// query types
export type IntegrationTypes = "facebook";
export type IntegrationTypesInstagram = "instagram";
export type IntegrationTypesWhatsapp = "whatsapp";
export type IntegrationDetailQueryResponse = {
  integrationDetail: IIntegration;
} & QueryResponse;

export type MessengerAppsQueryResponse = {
  messengerApps: IMessengerApps;
} & QueryResponse;

export type AccountsQueryResponse = {
  integrationsGetAccounts: IAccount[];
  error?: Error;
} & QueryResponse;

// mutation types
export type SaveMessengerMutationVariables = {
  name: string;
  brandId: string;
  languageCode: string;
  channelIds?: string[];
};

export type SaveMessengerMutationResponse = {
  saveMessengerMutation: (params: {
    variables: SaveMessengerMutationVariables;
  }) => Promise<any>;
};

export type SaveMessengerAppearanceMutationResponse = {
  saveAppearanceMutation: (params: {
    variables: { _id: string; uiOptions: IUiOptions };
  }) => Promise<any>;
};

export type SaveMessengerAppsMutationResponse = {
  messengerAppSaveMutation: (params: {
    variables: { integrationId: string; messengerApps: IMessengerApps };
  }) => Promise<any>;
};

export type SaveMessengerConfigsMutationResponse = {
  saveConfigsMutation: (params: {
    variables: {
      _id: string;
      messengerData: IMessengerData;
      callData: ICallData;
    };
  }) => any;
};
export type SaveMessengerTicketMutationResponse = {
  saveConfigsMutation: (params: {
    variables: { _id: string; ticketData: ITicketTypeMessenger };
  }) => any;
};
export type EditMessengerMutationVariables = {
  _id: string;
  name: string;
  brandId: string;
  languageCode: string;
  channelIds?: string[];
};

export type EditMessengerMutationResponse = {
  editMessengerMutation: (params: {
    variables: EditMessengerMutationVariables;
  }) => any;
};

export type RemoveMutationResponse = {
  removeMutation: (params: { variables: { _id: string } }) => Promise<any>;
};

export type RepairMutationResponse = {
  repairIntegration: (params: {
    variables: { _id: string; kind: string };
  }) => Promise<any>;
};

export type RemoveAccountMutationResponse = {
  removeAccount: (params: { variables: { _id: string } }) => Promise<any>;
};

export type CommonFieldsEditResponse = {
  editCommonFields: (params: {
    variables: {
      _id: string;
      name: string;
      brandId: string;
      channelIds?: string[];
      details: any;
    };
  }) => Promise<any>;
};

export interface IMessengerApp {
  _id: string;
  name: string;
}

export interface IStyle {
  itemShape?: string;
  widgetColor: string;
  productAvailable: string;
  line?: string;
  columns?: number;
  rows?: number;
  margin?: number;
  baseFont?: string;
}

export interface IBookingData {
  name?: string;
  image?: any;
  description?: string;
  userFilters?: string[];
  productCategoryId?: string;
  style?: IStyle;
  mainProductCategory?: IProductCategory;
  navigationText?: string;
  bookingFormText?: string;

  viewCount?: number;
  productFieldIds?: string[];
}

export interface ILink {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  youtube?: string;
}
export interface IExternalLink {
  url: string;
}

export interface IOnlineHour {
  _id: string;
  day: string;
  from: string;
  to: string;
}

export interface IMessagesItem {
  greetings: { title?: string; message?: string };
  away?: string;
  thank?: string;
  welcome?: string;
}

export interface IMessages {
  [key: string]: IMessagesItem;
}

export interface ISkillData {
  typeId: string;
  options: Array<{
    label: string;
    response: string;
    skillId: string;
  }>;
}
type BotPersistentMenuTypeMessenger = {
  _id: string;
  type: string;
  text: string;
  link: string;
};

export interface IMessengerData {
  botEndpointUrl?: string;
  botShowInitialMessage?: boolean;
  botCheck?: boolean;
  botGreetMessage?: string;
  persistentMenus?: BotPersistentMenuTypeMessenger[];
  name?: string;
  skillData?: ISkillData;
  messages?: IMessages;
  notifyCustomer?: boolean;
  supporterIds?: string[];
  availabilityMethod?: string;
  isOnline?: boolean;
  timezone?: string;
  responseRate?: string;
  showTimezone?: boolean;
  requireAuth?: boolean;
  showChat?: boolean;
  showLauncher?: boolean;
  forceLogoutWhenResolve?: boolean;
  showVideoCallRequest?: boolean;
  onlineHours?: IOnlineHour[];
  hideWhenOffline?: boolean;
  links?: ILink;
  externalLinks?: IExternalLink[];
}

export interface IUiOptions {
  color?: string;
  textColor?: string;
  wallpaper?: string;
  logo?: string;
  logoPreviewUrl?: string;
}

export interface ITopic {
  topicId: string;
}

export interface ITopicMessengerApp {
  credentials: ITopic;
}

export interface IWebsite {
  url: string;
  buttonText: string;
  description: string;
  openInNewWindow: boolean;
}

export interface IWebsiteMessengerApp {
  credentials: IWebsite;
}

export interface ILead {
  formCode: string;
}

export interface ILeadMessengerApp {
  credentials: ILead;
}

interface IIntegartionHealthStatus {
  status: string;
  error: string;
}

export interface ITicketTypeMessenger {
  ticketToggle?: boolean;
  ticketStageId?: string;
  ticketPipelineId?: string;
  ticketBoardId?: string;
}

export interface IIntegration {
  _id: string;
  kind: string;
  name: string;
  brandId?: string;
  code: string;
  formId: string;
  languageCode?: string;
  createUrl: string;
  messengerData?: IMessengerData;
  ticketData?: ITicketTypeMessenger;
  form: IForm;
  uiOptions?: IUiOptions;
  leadData: ILeadData;
  brand: IBrand;
  channels: any[];
  isActive?: boolean;
  isConnected?: boolean;
  healthStatus?: IIntegartionHealthStatus;
  webhookData?: IWebhookData;
  leadMessengerApps?: ILeadMessengerApp[];
  websiteMessengerApps?: IWebsiteMessengerApp[];
  knowledgeBaseMessengerApps?: ITopicMessengerApp[];
  bookingData?: IBookingData;
  visibility?: string;
  departmentIds?: string[];
  details?: any;
  callData?: ICallData;
}

export type QueryVariables = {
  page?: number;
  perPage?: number;
  searchValue?: string;
};

export type IntegrationsQueryResponse = {
  integrations: IIntegration[];
  loading: boolean;
  refetch: (variables?: QueryVariables) => Promise<any>;
};

export type ArchiveIntegrationResponse = {
  archiveIntegration: (params: {
    variables: { _id: string; status: boolean };
  }) => Promise<any>;
};

export type IntegrationMutationVariables = {
  brandId: string;
  name: string;
  channelIds?: string[];
  visibility?: string;
  departmentIds?: string[];
  details?: any;
};

export type AddIntegrationMutationVariables = {
  leadData: ILeadData;
  languageCode: string;
  formId: string;
} & IntegrationMutationVariables;

export type AddIntegrationMutationResponse = {
  addIntegrationMutation: (params: {
    variables: AddIntegrationMutationVariables;
  }) => Promise<any>;
};

export type EditIntegrationMutationVariables = {
  _id: string;
  leadData: ILeadData;
  languageCode: string;
  formId: string;
} & IntegrationMutationVariables;

export type EditIntegrationMutationResponse = {
  editIntegrationMutation: (params: {
    variables: EditIntegrationMutationVariables;
  }) => Promise<void>;
};

export type LeadIntegrationDetailQueryResponse = {
  integrationDetail: ILeadIntegration;
} & QueryResponse;

export type SendSmsMutationVariables = {
  integrationId: string;
  content: string;
  to: string;
};

export type SendSmsMutationResponse = (params: {
  variables: SendSmsMutationVariables;
}) => Promise<any>;

type By = { [key: string]: number };

export type ByKindTotalCount = {
  messenger: number;
  lead: number;
  facebook: number;
  instagram: number;
  gmail: number;
  callpro: number;
  chatfuel: number;
  imap: number;
  office365: number;
  outlook: number;
  yahoo: number;
  telegram: number;
  viber: number;
  line: number;
  twilio: number;
  whatsapp: number;
};

type IntegrationsCount = {
  total: number;
  byTag: By;
  byChannel: By;
  byBrand: By;
  byKind: ByKindTotalCount;
};

export type IntegrationsCountQueryResponse = {
  integrationsTotalCount: IntegrationsCount;
  loading: boolean;
};

export interface IOperator {
  userId: string;
  name?: string;
}

export interface IDepartment {
  name: string;
  operators: IOperator[];
}

export interface ICallData {
  header?: String;
  description?: String;
  secondPageHeader?: String;
  secondPageDescription?: String;
  departments?: IDepartment[];
  isReceiveWebCall?: boolean;
}
