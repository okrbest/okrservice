import { Model } from 'mongoose';
import { IRpaMessage, IRpaMessageDocument, rpaMessageSchema } from './definitions/rpaMessages';
import { IModels } from '../../connectionResolver';

export interface IRpaMessageModel extends Model<IRpaMessageDocument> {
  createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument>;
  getRpaMessagesByLoginId(loginId: string, limit?: number): Promise<IRpaMessageDocument[]>;
}

export const loadRpaMessageClass = (models: IModels) => {
  class RpaMessage {
    public static async createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument> {
      return models.RpaMessages.create({
        ...doc,
        receivedAt: new Date(),
      });
    }

    public static async getRpaMessagesByLoginId(
      loginId: string,
      limit = 50,
    ): Promise<IRpaMessageDocument[]> {
      return models.RpaMessages.find({ loginId })
        .sort({ receivedAt: -1 })
        .limit(limit)
        .lean();
    }
  }

  rpaMessageSchema.loadClass(RpaMessage);
  return rpaMessageSchema;
};
