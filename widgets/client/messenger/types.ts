import {
  ICustomer,
  IIntegrationMessengerData,
  IIntegrationUiOptions,
  IParticipator,
  IUser,
} from "../types";

import { ICarouselItem } from "./components/bot/Carousel";

export interface IWebsiteApp {
  kind: string;
  name: string;
  _id: string;
  credentials: {
    buttonText: string;
    description: string;
    url: string;
    openInNewWindow?: boolean;
  };
}

export interface IEngageData {
  content: string;
  kind: string;
  sentAs: string;
  messageId: string;
  brandId: string;
}

export interface IAttachment {
  name: string;
  url: string;
}

export interface IMessengerAppData {
  customer: ICustomer;
  hangoutLink: string;
}

export interface IVideoCallData {
  url: string;
  name?: string;
  status?: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  user?: IUser;
  content: string;
  contentType?: string;
  dailyStatus?: string;
  createdAt: Date;
  internal?: boolean;
  engageData: IEngageData;
  botData: any;
  messengerAppData: IMessengerAppData;
  attachments: IAttachment[];
}

export type EngageMessageQueryResponse = {
  widgetsGetEngageMessage: IMessage;
};

export type BotPersistentMenuTypeMessenger = {
  _id: string;
  type: string;
  text: string;
  link: string;
};

export interface IConversation {
  _id: string;
  content: string;
  createdAt: Date;
  operatorStatus?: string;
  participatedUsers?: IParticipator[];
  messages: IMessage[];
  isOnline: boolean;
  supporters?: IUser[];
  botGreetMessage?: string;
  persistentMenus?: BotPersistentMenuTypeMessenger[];
  fromBot?: boolean;
  botData?: IBotData;
  getStarted?: boolean;
}

export interface IConnectResponse {
  integrationId: string;
  customerId: string;
  languageCode: string;
  messengerData: IIntegrationMessengerData;
  uiOptions: IIntegrationUiOptions;
  ticketData?: { ticketStageId?: string; ticketToggle?: boolean; [k: string]: any };
  dealData?: { dealStageId?: string; dealToggle?: boolean; [k: string]: any };
  visitorId?: string;
  brand?: { name?: string; description?: string };
  callData?: any;
}

// faq
interface ICommonFields {
  _id: string;
  title: string;
}

export interface IFaqArticle extends ICommonFields {
  summary: string;
  content: string;
  status: string;
  createdDate: Date;
  attachments?: IAttachment[];
}

export interface IFaqCategory extends ICommonFields {
  description: string;
  icon: string;
  createdDate: Date;

  articles: IFaqArticle[];
  numOfArticles: number;
  parentCategoryId: string;
}

export interface IFaqTopic extends ICommonFields {
  description: string;
  categories: IFaqCategory[];
  parentCategories: IFaqCategory[];
}

export interface IUpdateCustomerMutationVariables {
  _id: string;
  email: string;
}

export interface IUpdateCustomerMutationResponse {
  updateCustomerMutation: (params: {
    variables: IUpdateCustomerMutationVariables;
  }) => Promise<any>;
  refetch: () => void;
}

export interface IMessengerSupporters {
  supporters: [IUser];
  isOnline: boolean;
}

export interface IBotData {
  type: string;
  text?: string;
  title?: string;
  url?: string;
  fromCustomer?: boolean;
  module?: string;
  component: string;
  elements?: ICarouselItem[];
  quick_replies?: [
    {
      mainTitle: string;
      title: string;
      payload: string;
      type: string;
    },
  ];
  wrapped?: {
    type: string;
    text: string;
    typing: boolean;
  };
}

export interface IAttachment {
  name: string;
  url: string;
}

export interface ITicketActivityLog {
  _id: string;
  contentType: string;
  action: string;
  content: any;
  createdAt: string;
  createdByDetail: {
    type: string;
    content: any;
  };
}

export interface ITicketComment {
  _id: string;
  userType: string;
  customerId: string;
  type: string;
  content: any;
  attachments?: Array<{ name?: string; url?: string; type?: string; size?: number }>;
  createdAt: string;
  createdUser: {
    _id: string;
    email: string;
    emails: string[];
    avatar: string;
    firstName: string;
    lastName: string;
    phone: string;
    phones: string[];
  };
}

export interface ITicketStage {
  _id: string;
  name: string;
}

export interface ITicketItem {
  _id: string;
  name: string;
  number: string;
  status: string;
  stage: ITicketStage;
  description: string;
  type: string;
  requestType?: string;
  createdAt: string;
  priority?: string;
  attachments?: IAttachment[];
}

export interface ITicketListResponse {
  widgetsTicketList: ITicketItem[];
}
