import { Document, Schema } from 'mongoose';
import {
  IRule,
  attachmentSchema,
  ruleSchema
} from "@erxes/api-utils/src/definitions/common";
import {
  LEAD_LOAD_TYPES,
  LEAD_SUCCESS_ACTIONS,
  MESSENGER_DATA_AVAILABILITY
} from "./constants";
import { field, schemaHooksWrapper } from "./utils";

export interface ISubmission extends Document {
  customerId: string;
  submittedAt: Date;
}

export interface ILink {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface IMessengerOnlineHours {
  day?: string;
  from?: string;
  to?: string;
}

export interface IMessengerOnlineHoursDocument
  extends IMessengerOnlineHours,
    Document {}

export interface IMessengerDataMessagesItem {
  greetings?: { title?: string; message?: string };
  away?: string;
  thank?: string;
  welcome?: string;
}

export interface IMessageDataMessages {
  [key: string]: IMessengerDataMessagesItem;
}
type BotPersistentMenuTypeMessenger = {
  _id: string;
  type: string;
  text: string;
  link: string;
  isEditing?: boolean;
};
export interface IMessengerData {
  botEndpointUrl?: string;
  botShowInitialMessage?: boolean;
  botCheck?: boolean;
  botGreetMessage?: string;
  persistentMenus?: BotPersistentMenuTypeMessenger[];
  getStarted?: boolean;
  skillData?: {
    typeId: string;
    options: Array<{
      label: string;
      response: string;
      typeId: string;
    }>;
  };
  supporterIds?: string[];
  notifyCustomer?: boolean;
  availabilityMethod?: string;
  isOnline?: boolean;
  onlineHours?: IMessengerOnlineHours[];
  timezone?: string;
  responseRate?: string;
  showTimezone?: boolean;
  messages?: IMessageDataMessages;
  links?: ILink;
  externalLinks?: IExternalLink[];
  showChat?: boolean;
  showLauncher?: boolean;
  hideWhenOffline?: boolean;
  requireAuth?: boolean;
  forceLogoutWhenResolve?: boolean;
  showVideoCallRequest?: boolean;
  isReceiveWebCall?: boolean;
}
export interface ITicketData {
  ticketLabel?: String;
  ticketToggle?: Boolean;
  ticketStageId?: String;
  ticketPipelineId?: String;
  ticketBoardId?: String;
}

export interface IMessengerDataDocument extends IMessengerData, Document {}
// export interface ITicketDataDocument extends ITicketData, Document {}

export interface ITicketDataDocument extends Document {
  ticketLabel?: String;
  ticketToggle?: Boolean;
  ticketStageId?: String;
  ticketPipelineId?: String;
  ticketBoardId?: String;
}
export interface ICallout extends Document {
  title?: string;
  body?: string;
  buttonText?: string;
  featuredImage?: string;
  skip?: boolean;
  calloutImgSize?: string;
}

export interface IAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface ILeadData {
  loadType?: string;
  successAction?: string;
  fromEmail?: string;
  userEmailTitle?: string;
  userEmailContent?: string;
  adminEmails?: string;
  adminEmailTitle?: string;
  adminEmailContent?: string;
  thankTitle?: string;
  thankContent?: string;
  redirectUrl?: string;
  themeColor?: string;
  callout?: ICallout;
  rules?: IRule;
  viewCount?: number;
  contactsGathered?: number;
  isRequireOnce?: boolean;
  saveAsCustomer?: boolean;
  templateId?: string;
  attachments?: IAttachment[];
  css?: string;
  successImage?: string;
  successImageSize?: string;
  verifyEmail?: boolean;
}

export interface IWebhookData {
  script: string;
  token: string;
  origin: string;
}

export interface ILeadDataDocument extends ILeadData, Document {
  viewCount?: number;
  contactsGathered?: number;
}

export interface IUiOptions {
  color?: string;
  wallpaper?: string;
  logo?: string;
  textColor?: string;
}

// subdocument schema for messenger UiOptions
export interface IUiOptionsDocument extends IUiOptions, Document {}

export interface IIntegration {
  kind: string;
  name?: string;
  brandId?: string;
  languageCode?: string;
  tagIds?: string[];
  formId?: string;
  leadData?: ILeadData;
  messengerData?: IMessengerData;
  ticketData?: ITicketData;
  uiOptions?: IUiOptions;
  isActive?: boolean;
  isConnected?: boolean;
  channelIds?: string[];
  departmentIds?: string[];
  visibility?: string;
}

export interface IExternalLink {
  url: String;
}

export interface IIntegrationDocument extends IIntegration, Document {
  _id: string;
  createdUserId: string;
  // TODO remove
  formData?: ILeadData;
  leadData?: ILeadDataDocument;
  messengerData?: IMessengerDataDocument;
  ticketData?: ITicketDataDocument;
  webhookData?: IWebhookData;
  uiOptions?: IUiOptionsDocument;
}

// subdocument schema for MessengerOnlineHours
const messengerOnlineHoursSchema = new Schema(
  {
    day: field({ type: String }),
    from: field({ type: String }),
    to: field({ type: String }),
  },
  { _id: false },
);

const persistentMenuSchema = new Schema({
  _id: { type: String },
  text: { type: String },
  type: { type: String },
  link: { type: String, optional: true },
  isEditing: { type: Boolean }
});

// subdocument schema for MessengerData
const messengerDataSchema = new Schema(
  {
    skillData: field({ type: Object, optional: true }),
    botEndpointUrl: field({ type: String }),
    botShowInitialMessage: field({ type: Boolean }),
    getStarted: field({ type: Boolean }),
    botCheck: field({ type: Boolean }),
    botGreetMessage: field({ type: String }),
    persistentMenus: field({ type: [persistentMenuSchema] }),
    ticketLabel: field({ type: String, optional: true }),
    ticketStageId: field({ type: String }),
    ticketPipelineId: field({ type: String }),
    ticketBoardId: field({ type: String }),
    supporterIds: field({ type: [String] }),
    notifyCustomer: field({ type: Boolean }),
    availabilityMethod: field({
      type: String,
      enum: MESSENGER_DATA_AVAILABILITY.ALL,
    }),
    isOnline: field({
      type: Boolean,
    }),
    onlineHours: field({ type: [messengerOnlineHoursSchema] }),
    timezone: field({
      type: String,
      optional: true,
    }),
    responseRate: field({
      type: String,
      optional: true,
    }),
    showTimezone: field({
      type: Boolean,
      optional: true,
    }),
    messages: field({ type: Object, optional: true }),
    links: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
    },
    externalLinks: field({ type: Object, optional: true }),
    requireAuth: field({ type: Boolean, default: true }),
    showChat: field({ type: Boolean, default: true }),
    showLauncher: field({ type: Boolean, default: true }),
    hideWhenOffline: field({ type: Boolean, default: false }),
    forceLogoutWhenResolve: field({ type: Boolean, default: false }),
    showVideoCallRequest: field({ type: Boolean, default: false }),
  },
  { _id: false },
);

// schema for lead's callout component
export const calloutSchema = new Schema(
  {
    title: field({ type: String, optional: true, label: 'Title' }),
    body: field({ type: String, optional: true, label: 'Body' }),
    buttonText: field({ type: String, optional: true, label: 'Button text' }),
    calloutImgSize: field({
      type: String,
      optional: true,
      label: 'Callout image size',
    }),
    featuredImage: field({
      type: String,
      optional: true,
      label: 'Featured image',
    }),
    skip: field({ type: Boolean, optional: true, label: 'Skip' }),
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    ticketLabel: { type: String, required: true },
    ticketToggle: { type: Boolean, required: true },
    ticketStageId: { type: String, required: true },
    ticketPipelineId: { type: String, required: true },
    ticketBoardId: { type: String, required: true }
  },
  { _id: false }
);

// TODO: remove
// schema for lead submission details
export const submissionSchema = new Schema(
  {
    customerId: field({ type: String }),
    submittedAt: field({ type: Date }),
  },
  { _id: false },
);

// subdocument schema for LeadData
export const leadDataSchema = new Schema(
  {
    loadType: field({
      type: String,
      enum: LEAD_LOAD_TYPES.ALL,
      label: 'Load type',
    }),
    successAction: field({
      type: String,
      enum: LEAD_SUCCESS_ACTIONS.ALL,
      optional: true,
      label: 'Success action',
    }),
    fromEmail: field({
      type: String,
      optional: true,
      label: 'From email',
    }),
    userEmailTitle: field({
      type: String,
      optional: true,
      label: 'User email title',
    }),
    userEmailContent: field({
      type: String,
      optional: true,
      label: 'User email content',
    }),
    adminEmails: field({
      type: [String],
      optional: true,
      label: 'Admin emails',
    }),
    adminEmailTitle: field({
      type: String,
      optional: true,
      label: 'Admin email title',
    }),
    adminEmailContent: field({
      type: String,
      optional: true,
      label: 'Admin email content',
    }),
    thankTitle: field({
      type: String,
      optional: true,
      label: 'Thank content title',
    }),
    thankContent: field({
      type: String,
      optional: true,
      label: 'Thank content',
    }),
    redirectUrl: field({
      type: String,
      optional: true,
      label: 'Redirect URL',
    }),
    themeColor: field({
      type: String,
      optional: true,
      label: 'Theme color code',
    }),
    callout: field({
      type: calloutSchema,
      optional: true,
      label: 'Callout',
    }),
    viewCount: field({
      type: Number,
      optional: true,
      label: 'View count',
    }),
    contactsGathered: field({
      type: Number,
      optional: true,
      label: 'Contacts gathered',
    }),
    rules: field({
      type: [ruleSchema],
      optional: true,
      label: 'Rules',
    }),
    isRequireOnce: field({
      type: Boolean,
      optional: true,
      label: 'Do not show again if already filled out',
    }),
    saveAsCustomer: field({
      type: Boolean,
      optional: true,
      label: 'Save as customer',
    }),
    templateId: field({
      type: String,
      optional: true,
      label: 'Template',
    }),
    attachments: field({ type: Object, optional: true, label: 'Attachments' }),
    css: field({
      type: String,
      optional: true,
      label: 'Custom CSS',
    }),
    successImage: field({
      type: String,
      optional: true,
      label: 'Success image',
    }),
    successImageSize: field({
      type: String,
      optional: true,
      label: 'Success image size',
    }),
    verifyEmail: field({
      type: Boolean,
      optional: true,
      label: 'Verify email',
    }),
  },
  { _id: false },
);

// subdocument schema for messenger UiOptions
const uiOptionsSchema = new Schema(
  {
    color: field({ type: String }),
    textColor: field({ type: String }),
    wallpaper: field({ type: String }),
    logo: field({ type: String }),
  },
  { _id: false },
);

const webhookDataSchema = new Schema(
  {
    script: field({ type: String, optional: true }),
    token: field({ type: String }),
    origin: field({ type: String, optional: true }),
  },
  { _id: false },
);

// schema for integration document
export const integrationSchema = schemaHooksWrapper(
  new Schema({
    _id: field({ pkey: true }),
    createdUserId: field({ type: String, label: 'Created by' }),

    kind: field({
      type: String,
      label: 'Kind',
    }),
    createdAt: field({ type: 'Date', label: 'Created at' }),

    name: field({ type: String, label: 'Name' }),
    languageCode: field({
      type: String,
      label: 'Language Code',
      optional: true,
    }),
    brandId: field({ type: String, label: 'Brand' }),

    tagIds: field({ type: [String], label: 'Tags', index: true }),
    formId: field({ type: String, label: 'Form' }),
    isActive: field({
      type: Boolean,
      optional: true,
      default: true,
      label: 'Is active',
    }),
    isConnected: field({
      type: Boolean,
      optional: true,
      default: false,
      label: 'Is connect',
    }),
    webhookData: field({ type: webhookDataSchema }),
    // TODO: remove
    formData: field({ type: leadDataSchema }),
    messengerData: field({ type: messengerDataSchema }),

    ticketData: field({ type: ticketSchema }),
    uiOptions: field({ type: uiOptionsSchema })

  }),
  'erxes_integrations',
);
