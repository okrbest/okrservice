import { Document, Schema } from 'mongoose'
import { field } from './utils'

export interface IWorkSchedule {
  userId: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  deeplinkUrl: string
  deeplinkParams: Record<string, string>
  lastPushSentDate?: string  // 'YYYY-MM-DD' — 중복 발송 방지
}

export interface IWorkScheduleDocument extends IWorkSchedule, Document {}

export const workScheduleSchema = new Schema({
  userId: field({ type: String, required: true, unique: true }),
  startHour: field({ type: Number, required: true, min: 0, max: 23 }),
  startMinute: field({ type: Number, required: true, min: 0, max: 59 }),
  endHour: field({ type: Number, required: true, min: 0, max: 23 }),
  endMinute: field({ type: Number, required: true, min: 0, max: 59 }),
  deeplinkUrl: field({ type: String, required: true }),
  deeplinkParams: field({ type: Object, default: {} }),
  lastPushSentDate: field({ type: String }),
})
