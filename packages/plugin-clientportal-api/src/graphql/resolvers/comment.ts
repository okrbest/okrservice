import { IContext } from '../../connectionResolver';
import { sendCoreMessage } from '../../messageBroker';
import { ICommentDocument } from '../../models/definitions/comment';

export default {
  async __resolveReference({ _id }, { models }: IContext) {
    return models.Comments.findOne({ _id });
  },

  async createdUser(
    comment: ICommentDocument,
    _args,
    { subdomain, models }: IContext
  ) {
    if (comment.userType === 'team') {
      const user = await sendCoreMessage({
        subdomain,
        action: 'users.findOne',
        data: {
          _id: comment.userId
        },
        isRPC: true
      });

      if (!user) {
        return null;
      }

      const { details = {} } = user;

      return {
        _id: user._id,
        avatar: details.avatar,
        firstName: details.firstName,
        lastName: details.lastName,
        fullName: details.fullName,
        email: user.email
      };
    }

    let cpUser: any = null;
    try {
      cpUser = await models.ClientPortalUsers.getUser({
        _id: comment.userId
      });
    } catch {
      cpUser = null;
    }

    // Some historic comments can point to removed users.
    // Return null instead of throwing so comment lists stay readable.
    if (!cpUser) {
      return null;
    }

    return {
      _id: cpUser._id,
      avatar: cpUser.avatar,
      fullName: [cpUser.firstName, cpUser.lastName].filter(Boolean).join(' ').trim(),
      firstName: cpUser.firstName,
      lastName: cpUser.lastName,
      email: cpUser.email
    };
  }
};
