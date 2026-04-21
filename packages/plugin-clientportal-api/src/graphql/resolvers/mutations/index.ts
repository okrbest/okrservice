import clientPortal from './clientPortal';
import { clientPortalUserMutations, userMutations } from './clientPortalUser';
import clientPortalUserPost from './clientPortalUserPost';
import notificationMutations from './clientPortalNotifications';
import comment from './comment';
import fieldConfig from './fieldConfig';
import vercel from './vercel';
import workSchedule from './workSchedule';

export default {
  ...clientPortal,
  ...clientPortalUserMutations,
  ...userMutations,
  ...notificationMutations,
  ...comment,
  ...fieldConfig,
  ...clientPortalUserPost,
  ...vercel,
  ...workSchedule,
};
