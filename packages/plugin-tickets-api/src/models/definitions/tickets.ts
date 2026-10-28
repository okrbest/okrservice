import { Document, Schema } from 'mongoose';
import { commonItemFieldsSchema, IItemCommonFields } from './boards';
import { field } from './utils';
import { VISIBLITIES } from './constants';

export interface ITicket extends IItemCommonFields {
  source?: string;
  requestType?: string;
  qualityImpact?: string;
  functionCategory?: string;
  hasNotified?: boolean;
  widgetAlarm?: boolean;
  manualEmailRequest?: boolean;
  emailSent?: boolean;
  // 직원 위젯 댓글 뒤 고객 알림 메일 자동 발송 예정 시각(없으면 예약 없음)
  autoEmailDueAt?: Date;
  visibility?: string;
}

export interface ITicketDocument extends ITicket, Document {
  _id: string;
}

// Mongoose schemas =======================
export const ticketSchema = new Schema({
  ...commonItemFieldsSchema,

  source: field({ type: String, label: 'Source' }),
  requestType: field({ type: String, label: 'Request Type' }),
  qualityImpact: field({ type: String, label: 'Quality Impact' }),
  functionCategory: field({ type: String, label: 'Function Category' }),
  hasNotified: field({ type: Boolean, default: true, label: 'Has Notified' }),
  widgetAlarm: field({ type: Boolean, default: true, label: 'Widget Alarm' }),
  manualEmailRequest: field({
    type: Boolean,
    default: false,
    label: 'Manual Email Request',
  }),
  emailSent: field({ type: Boolean, default: false, label: 'Email Sent' }),
  autoEmailDueAt: field({
    type: Date,
    optional: true,
    label: 'Auto customer email due at',
  }),
  visibility: field({
    type: String,
    enum: VISIBLITIES.ALL,
    default: VISIBLITIES.PUBLIC,
    label: 'Visibility',
  }),
});
