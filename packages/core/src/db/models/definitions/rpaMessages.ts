import { Document, Schema } from 'mongoose';
import { field } from './utils';

export interface IRpaMessage {
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: Date;
}

export interface IRpaMessageDocument extends IRpaMessage, Document {
  _id: string;
}

export const rpaMessageSchema = new Schema({
  _id: field({ pkey: true }),
  loginId: field({ type: String, label: 'Receiver login ID (email)', index: true }),
  rpaCode: field({ type: String, label: 'RPA code' }),
  messageCode: field({ type: String, label: 'Message code' }),
  message: field({ type: String, label: 'Message body' }),
  overtime: field({ type: String, label: 'Overtime minutes', optional: true }),
  receivedAt: field({ type: Date, label: 'Received at' }),
});
