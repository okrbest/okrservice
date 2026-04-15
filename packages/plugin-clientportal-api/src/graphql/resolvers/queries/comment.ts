import { IContext } from '../../../connectionResolver';
import { sendTicketsMessage } from '../../../messageBroker';

const commentQueries = {
  async clientPortalComments(
    _root,
    { typeId, type }: { typeId: string; type: string },
    { subdomain }: IContext
  ) {
    const comments = await sendTicketsMessage({
      subdomain,
      action: 'widgets.comments.find',
      data: { typeId },
      isRPC: true,
      defaultValue: []
    });

    // Keep backward compatibility for callers that pass type.
    return (comments || []).filter((comment: { type?: string }) => !type || comment.type === type);
  }
};

export default commentQueries;
