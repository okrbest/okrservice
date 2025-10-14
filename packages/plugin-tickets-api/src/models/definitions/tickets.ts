import { Document, Schema } from "mongoose";
import { commonItemFieldsSchema, IItemCommonFields } from "./boards";
import { field } from "./utils";

export interface ITicket extends IItemCommonFields {
  source?: string;
  requestType?: string;
  hasNotified?: boolean;
  widgetAlarm?: boolean;
  manualEmailRequest?: boolean;
  emailSent?: boolean;
}

export interface ITicketDocument extends ITicket, Document {
  _id: string;
}

// Mongoose schemas =======================
export const ticketSchema = new Schema({
  ...commonItemFieldsSchema,

  source: field({ type: String, label: "Source" }),
  requestType: field({ type: String, label: "Request Type" }),
  hasNotified: field({ type: Boolean, default: true, label: "Has Notified" }),
  widgetAlarm: field({ type: Boolean, default: true, label: "Widget Alarm" }),
  manualEmailRequest: field({ type: Boolean, default: false, label: "Manual Email Request" }),
  emailSent: field({ type: Boolean, default: false, label: "Email Sent" })
});