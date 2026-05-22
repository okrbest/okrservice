import { generateModels } from '../../../connectionResolver';

const rpaQueries = {
  async rpaMessages(
    _root,
    { loginId, limit = 20 }: { loginId: string; limit?: number },
    { subdomain }: { subdomain: string },
  ) {
    const models = await generateModels(subdomain);
    const msgs = await models.RpaMessages.getRpaMessagesByLoginId(loginId, limit);
    // sort ascending so the widget renders oldest → newest
    return [...msgs].reverse();
  },
};

export default rpaQueries;
