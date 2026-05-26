import { Document, Schema } from 'mongoose';
import { field } from './utils';

export interface IRpaButton {
  label: string;
  path: string;
}

export interface IRpaMessage {
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: Date;
  buttons: IRpaButton[];
}

export interface IRpaMessageDocument extends IRpaMessage, Document {
  _id: string;
}

const rpaButtonSchema = new Schema(
  {
    label: field({ type: String, label: '버튼 텍스트' }),
    path: field({ type: String, label: '5240 경로' }),
  },
  { _id: false },
);

export const rpaMessageSchema = new Schema({
  _id: field({ pkey: true }),
  loginId: field({ type: String, label: 'Receiver login ID (email)', index: true }),
  rpaCode: field({ type: String, label: 'RPA code' }),
  messageCode: field({ type: String, label: 'Message code' }),
  message: field({ type: String, label: 'Message body' }),
  overtime: field({ type: String, label: 'Overtime minutes', optional: true }),
  receivedAt: field({ type: Date, label: 'Received at' }),
  buttons: { type: [rpaButtonSchema], default: [] },
});
