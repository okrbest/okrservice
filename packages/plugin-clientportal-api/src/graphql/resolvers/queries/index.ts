import clientPortal from './clientPortal';
import clientPortalUser from './clientPortalUser';
import clientPortalNotifications from './clientPortalNotifications';
import comment from './comment';
import fieldConfig from './fieldConfig';
import vercel from './vercel';
import { IContext } from '../../../connectionResolver';

export default {
  ...clientPortal,
  ...clientPortalUser,
  ...clientPortalNotifications,
  ...comment,
  ...fieldConfig,
  ...vercel,

  workSchedule: async (_root: any, { userId }: { userId: string }, { models }: IContext) => {
    return models.WorkSchedules.findOne({ userId });
  },
};
