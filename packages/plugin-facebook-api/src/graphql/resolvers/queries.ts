import { IContext, IModels } from '../../connectionResolver';
import { INTEGRATION_KINDS } from '../../constants';
import { sendInboxMessage } from '../../messageBroker';
import { IConversationMessageDocument } from '../../models/definitions/conversationMessages';
import {
  fetchPagePost,
  fetchPagePosts,
  getPageList,
  graphRequest,
  fetchPagesPostsList
} from '../../utils';


interface FacebookPosts {
  message?: string;
  created_time: string;
  picture?: string;
  full_picture?: string;
  permalink_url: string;
  id: string;
}

interface IKind {
  kind: string;
}

interface IDetailParams {
  erxesApiId: string;
}

interface IConversationId {
  conversationId: string;
}

interface IPageParams {
  skip?: number;
  limit?: number;
}

interface ICommentsParams extends IConversationId, IPageParams {
  isResolved?: boolean;
  commentId?: string;
  senderId: string;
}

interface IMessagesParams extends IConversationId, IPageParams {
  getFirst?: boolean;
}

const buildSelector = async (conversationId: string, model: any) => {
  const query = { conversationId: '' };

  const conversation = await model.findOne({
    erxesApiId: conversationId
  });

  if (conversation) {
    query.conversationId = conversation._id;
  }

  return query;
};

const facebookQueries = {
  async facebookGetAccounts(_root, { kind }: IKind, { models }: IContext) {
    return models.Accounts.find({ kind });
  },

  async facebookGetIntegrations(_root, { kind }: IKind, { models }: IContext) {
    return models.Integrations.find({ kind });
  },

  async facebookGetIntegrationDetail(
    _root,
    { erxesApiId }: IDetailParams,
    { models }: IContext
  ) {
    return models.Integrations.findOne({ erxesApiId });
  },

  async facebookGetConfigs(_root, _args, { models }: IContext) {
    return models.Configs.find({}).lean();
  },

  async facebookGetComments(
    _root,
    args: ICommentsParams,
    { models }: IContext
  ) {
    const {
      conversationId,
      isResolved,
      commentId,
      senderId,
      limit = 10
    } = args;
    const post = await models.PostConversations.findOne({
      erxesApiId: conversationId
    });

    const query: {
      postId: string;
      isResolved?: boolean;
      parentId?: string;
      senderId?: string;
    } = {
      postId: post ? post.postId || '' : '',
      isResolved: isResolved === true
    };

    if (senderId && senderId !== 'undefined') {
      const customer = await models.Customers.findOne({ erxesApiId: senderId });

      if (customer && customer.userId) {
        query.senderId = customer.userId;
      }
    } else {
      query.parentId = commentId !== 'undefined' ? commentId : '';
    }

    const result = await models.CommentConversation.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: 'customers_facebooks',
          localField: 'senderId',
          foreignField: 'userId',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'posts_conversations_facebooks',
          localField: 'postId',
          foreignField: 'postId',
          as: 'post'
        }
      },
      {
        $unwind: {
          path: '$post',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'comments_facebooks',
          localField: 'commentId',
          foreignField: 'parentId',
          as: 'replies'
        }
      },
      {
        $addFields: {
          commentCount: { $size: '$replies' },
          'customer.avatar': '$customer.profilePic',
          'customer._id': '$customer.erxesApiId',
          conversationId: '$post.erxesApiId'
        }
      },

      { $sort: { timestamp: -1 } },
      { $limit: limit }
    ]);

    return result.reverse();
  },

  async facebookGetCommentCount(_root, args, { models }: IContext) {
    const { conversationId, isResolved = false } = args;

    const commentCount = await models.CommentConversation.countDocuments({
      erxesApiId: conversationId
    });

    const comments = await models.CommentConversation.find({
      erxesApiId: conversationId
    });
    // Extracting comment_ids from the comments array
    const comment_ids = comments?.map((item) => item.comment_id);

    // Using the extracted comment_ids to search for matching comments
    const search = await models.CommentConversation.find({
      comment_id: { $in: comment_ids } // Using $in to find documents with comment_ids in the extracted array
    });

    if (search.length > 0) {
      // Returning the count of matching comments
      return {
        commentCount: commentCount,
        searchCount: search.length
      };
    }

    // If no matching comments are found, return only the commentCount
    return {
      commentCount: commentCount,
      searchCount: 0
    };
  },

  async facebookGetPages(_root, args, { models }: IContext) {
    const { kind, accountId } = args;
    const account = await models.Accounts.getAccount({ _id: accountId });
    const accessToken = account.token;
    let pages: any[] = [];

    try {
      pages = await getPageList(models, accessToken, kind);
    } catch (e) {
      if (!e.message.includes('Application request limit reached')) {
        await models.Integrations.updateOne(
          { accountId },
          { $set: { healthStatus: 'account-token', error: `${e.message}` } }
        );
      }
    }

    return pages;
  },

  async facebookConversationDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    const conversation = await models.Conversations.findOne({ _id });
    if (conversation) {
      return conversation;
    }
    return await models.CommentConversation.findOne({ _id });
  },

  async facebookConversationMessages(
    _root,
    args: IMessagesParams,
    { models }: IContext
  ) {
    const { conversationId, limit, skip, getFirst } = args;

    const conversation = await models.Conversations.findOne({
      erxesApiId: conversationId
    });
    let messages: IConversationMessageDocument[] = [];
    const query = await buildSelector(conversationId, models.Conversations);
    if (conversation) {
      if (limit) {
        const sort: any = getFirst ? { createdAt: 1 } : { createdAt: -1 };

        messages = await models.ConversationMessages.find(query)
          .sort(sort)
          .skip(skip || 0)
          .limit(limit);

        return getFirst ? messages : messages.reverse();
      }

      messages = await models.ConversationMessages.find(query)
        .sort({ createdAt: -1 })
        .limit(50);

      return messages.reverse();
    } else {
      let comment: any[] = [];
      const sort: any = getFirst ? { createdAt: 1 } : { createdAt: -1 };
      comment = await models.CommentConversation.find({
        erxesApiId: conversationId
      })
        .sort(sort)
        .skip(skip || 0);

      const comment_ids = comment?.map((item) => item.comment_id);
      const search = await models.CommentConversationReply.find({
        parentId: comment_ids
      })
        .sort(sort)
        .skip(skip || 0);

      if (search.length > 0) {
        // Combine the arrays and sort by createdAt in ascending order
        const combinedResult = [...comment, ...search].sort((a, b) =>
          a.createdAt > b.createdAt ? 1 : -1
        );
        return combinedResult;
      } else {
        return comment;
      }
    }
  },
  /**
   *  Get all conversation messages count. We will use it in pager
   */
  async facebookConversationMessagesCount(
    _root,
    { conversationId }: { conversationId: string },
    { models }: IContext
  ) {
    const selector = await buildSelector(conversationId, models.Conversations);

    return models.ConversationMessages.countDocuments(selector);
  },

  async facebookGetPost(
    _root,
    { erxesApiId }: IDetailParams,
    { models }: IContext
  ) {
    const comment = await models.CommentConversation.findOne({
      erxesApiId: erxesApiId
    });
    if (comment) {
      const postConversation = await models.PostConversations.findOne({
        postId: comment.postId
      });
      return postConversation; // Return the postConversation when comment is found
    }

    // Return null or some appropriate value when comment is not found
    return null;
  },

  async facebookGetBotPosts(_root, { botId }, { models }: IContext) {
    const bot = await models.Bots.findOne({ _id: botId });

    if (!bot) {
      throw new Error('Bot not found');
    }

    return await fetchPagePosts(bot.pageId, bot.token);
  },

  async facebookGetPosts(
    _root,
    {
      brandIds,
      channelIds,
      limit = 20
    }: {
      brandIds: string | string[];
      channelIds: string | string[];
      limit?: number;
    },
    { models, subdomain }: IContext
  ): Promise<FacebookPosts[]> {

    try {
      const brandIntegrations = brandIds
        ? await sendInboxMessage({
          subdomain,
          action: 'integrations.find',
          data: {
            query: {
              kind: 'facebook-post',
              brandId: brandIds,
              isActive: true
            }
          },
          isRPC: true,
          defaultValue: []
        })
        : [];

      const erxesApiIds = brandIntegrations.map(integration => integration._id);

      const facebookAccounts = await models.Integrations.find({
        erxesApiId: { $in: erxesApiIds },
      });

      const postsPromises = facebookAccounts.map(async account => {
        if (!account.facebookPageIds || !account.facebookPageTokensMap) {
          return [];
        }
        try {
          return await fetchPagesPostsList(
            account.facebookPageIds,
            account.facebookPageTokensMap,
            limit
          );
        } catch (error) {
          console.error(`Error fetching posts for account ${account._id}:`, error);
          return [];
        }
      });

      const posts = (await Promise.all(postsPromises)).flat();

      const sortedPosts = posts.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      return sortedPosts.slice(0, limit);

    } catch (error) {
      console.error('Error in facebookGetPosts:', error);
      throw error;
    }

  },


  async facebookGetBotPost(_root, { botId, postId }, { models }: IContext) {
    const bot = await models.Bots.findOne({ _id: botId });

    if (!bot) {
      throw new Error('Bot not found');
    }

    return await fetchPagePost(postId, bot.token);
  },

  async facebookGetBotAds(_root, { botId }, { models }: IContext) {
    const bot = await models.Bots.findOne({ _id: botId });

    if (!bot) {
      throw new Error('Bot not found');
    }

    const adAccounts = await graphRequest.get(
      `${bot.uid}/adaccounts?access_token=${bot.token}`
    );

    const adAccountId = adAccounts?.data[0]?.id;

    if (!adAccountId) {
      throw new Error('Something went wrong during fetch ads');
    }

    const { data } = await graphRequest.get(
      `${adAccountId}/adsets?fields=id,name,adcreatives{thumbnail_url},ads{id}&access_token=${bot.token}`
    );

    return data.map((data) => ({
      _id: data?.ads?.data[0]?.id,
      name: data.name,
      thumbnail: data?.adcreatives?.data[0]?.thumbnail_url
    }));
  },

  async facebookHasTaggedMessages(
    _root,
    { conversationId }: IConversationId,
    { models, subdomain }: IContext
  ) {
    const commonParams = { isRPC: true, subdomain };
    const inboxConversation = await sendInboxMessage({
      ...commonParams,
      action: 'conversations.findOne',
      data: { query: { _id: conversationId } }
    });

    let integration;

    if (inboxConversation) {
      integration = await sendInboxMessage({
        ...commonParams,
        action: 'integrations.findOne',
        data: { _id: inboxConversation.integrationId }
      });
    }

    if (integration && integration.kind !== INTEGRATION_KINDS.MESSENGER) {
      return false;
    }

    const query = await buildSelector(conversationId, models.Conversations);

    const messages = await models.ConversationMessages.find({
      ...query,
      customerId: { $exists: true },
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .limit(2)
      .lean();

    if (messages.length >= 1) {
      return false;
    }
    return true;
  },

  async facebookPostMessages(
    _root,
    args: IMessagesParams,
    { models }: IContext
  ) {
    const { conversationId, limit, skip, getFirst } = args;
    let messages: any[] = [];
    const query = await buildSelector(conversationId, models.PostConversations);

    if (limit) {
      const sort: any = getFirst ? { createdAt: 1 } : { createdAt: -1 };

      messages = await models.CommentConversation.find(query)
        .sort(sort)
        .skip(skip || 0)
        .limit(limit);

      return getFirst ? messages : messages.reverse();
    }

    messages = await models.CommentConversation.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return messages.reverse();
  },

  async facebootMessengerBots(_root, _args, { models }: IContext) {
    return await models.Bots.find({});
  },
  async facebootMessengerBotsTotalCount(_root, _args, { models }: IContext) {
    return await models.Bots.find({}).countDocuments();
  },
  async facebootMessengerBot(_root, { _id }, { models }: IContext) {
    return await models.Bots.findOne({ _id });
  }
};

export default facebookQueries;
