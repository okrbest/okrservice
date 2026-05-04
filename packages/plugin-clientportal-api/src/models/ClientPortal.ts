import { Model } from 'mongoose';

import { IModels } from '../connectionResolver';
import {
  clientPortalSchema,
  IClientPortal,
  IClientPortalDocument,
} from './definitions/clientPortal';

import {
  removeLastTrailingSlash,
  removeExtraSpaces,
} from '@erxes/api-utils/src/commonUtils';
import slugify from 'slugify';
import { isEnabled } from '@erxes/api-utils/src/serviceDiscovery';
import { sendCommonMessage } from '../messageBroker';

export interface IClientPortalModel extends Model<IClientPortalDocument> {
  getSingletonId(): Promise<string>;
  getConfig(_id: string): Promise<IClientPortalDocument>;
  createOrUpdateConfig(args: IClientPortal): Promise<IClientPortalDocument>;
}

export const loadClientPortalClass = (models: IModels) => {
  class ClientPortal {
    /**
     * DB에 클라이언트 포털이 정확히 하나일 때만 ID 반환. 없거나 여러 개면 에러.
     */
    public static async getSingletonId(): Promise<string> {
      const portals = await models.ClientPortals.find().select('_id').lean();
      if (portals.length === 0) {
        throw new Error('Invalid login');
      }
      if (portals.length > 1) {
        throw new Error('Invalid login');
      }
      return String(portals[0]._id);
    }

    public static async getConfig(_id: string) {
      const config = await models.ClientPortals.findOne({ _id }).lean();

      if (!config) {
        throw new Error('Config not found');
      }

      return config;
    }

    public static async createOrUpdateConfig({ _id, ...doc }: IClientPortal) {
      let config = await models.ClientPortals.findOne({ _id });

      if (doc.url) {
        doc.url = removeExtraSpaces(removeLastTrailingSlash(doc.url));
      }

      if (!doc.slug && doc.name) {
        doc.slug = slugify(doc.name, { lower: true });
      }

      if (!config) {
        config = await models.ClientPortals.create(doc);

        return config.toJSON();
      }

      await models.ClientPortals.findOneAndUpdate(
        { _id: config._id },
        { $set: doc },
        { new: true }
      );

      return models.ClientPortals.findOne({ _id: config._id });
    }
  }

  clientPortalSchema.loadClass(ClientPortal);

  return clientPortalSchema;
};
