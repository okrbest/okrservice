import { Model } from 'mongoose'
import { IWorkScheduleDocument } from './definitions/workSchedule'

// 모델 생성은 connectionResolver의 db.model()을 통해 이루어짐
export interface IWorkScheduleModel extends Model<IWorkScheduleDocument> {}
