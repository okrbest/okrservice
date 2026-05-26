import { generateModels } from '../../../connectionResolver';
import { getIntentButtons } from './intent';

function resolveButtons(
  rpaCode: string,
  buttons?: Array<{ label: string; path: string }> | null,
) {
  if (Array.isArray(buttons) && buttons.length > 0) {
    return buttons;
  }

  return getIntentButtons(rpaCode);
}

const rpaQueries = {
  async rpaMessages(
    _root,
    { loginId, limit = 20 }: { loginId: string; limit?: number },
    { subdomain }: { subdomain: string },
  ) {
    const models = await generateModels(subdomain);
    const msgs = await models.RpaMessages.getRpaMessagesByLoginId(loginId, limit);

    // sort ascending so the widget renders oldest → newest
    return [...msgs]
      .reverse()
      .map((msg) => ({
        ...msg,
        buttons: resolveButtons(msg.rpaCode, msg.buttons),
      }));
  },
};

export default rpaQueries;
