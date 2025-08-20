import { Document, Schema } from "mongoose";
import { commonItemFieldsSchema, IItemCommonFields } from "./boards";
import { field } from "./utils";

export interface ITicket extends IItemCommonFields {
  source?: string;
  requestType?: string;
}

export interface ITicketDocument extends ITicket, Document {
  _id: string;
}

// Mongoose schemas =======================
export const ticketSchema = new Schema({
  ...commonItemFieldsSchema,

  source: field({ type: String, label: "Source" }),
  requestType: field({ type: String, label: "Request Type" })
});