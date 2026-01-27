import * as momentTz from "moment-timezone";

import { IContext, IModels } from "../../connectionResolver";
import { sendCoreMessage, sendKnowledgeBaseMessage } from "../../messageBroker";
import { isEnabled } from "@erxes/api-utils/src/serviceDiscovery";
import { IBrowserInfo } from "@erxes/api-utils/src/definitions/common";
import { IIntegrationDocument } from "../../models/definitions/integrations";
import { getOrCreateEngageMessage } from "../../widgetUtils";
import { sendAutomationsMessage, sendTicketsMessage } from "../../../src/messageBroker";

const isMessengerOnline = async (
  models: IModels,
  integration: IIntegrationDocument,
  userTimezone?: string
) => {
  if (!integration.messengerData) {
    return false;
  }

  const { availabilityMethod, isOnline, onlineHours, timezone } =
    integration.messengerData;

  const modifiedIntegration = {
    ...(integration.toJSON ? integration.toJSON() : integration),
    messengerData: {
      availabilityMethod,
      isOnline,
      onlineHours,
      timezone
    }
  };

  return models.Integrations.isOnline(modifiedIntegration, userTimezone);
};


const fetchUsers = async (
  models: IModels,
  subdomain: string,
  integration: IIntegrationDocument,
  query: any
) => {
  const users = await sendCoreMessage({
    subdomain,
    action: "users.find",
    data: { query },
    isRPC: true,
    defaultValue: []
  });

  for (const user of users) {
    if (user.details && user.details.location) {
      user.isOnline = await isMessengerOnline(
        models,
        integration,
        user.details.location
      );
    }
  }

  return users;
};

const getWidgetMessages = (models: IModels, conversationId: string) => {
  return models.ConversationMessages.find({
    conversationId,
    internal: false
    // fromBot: { $exists: false }
  }).sort({
    createdAt: 1
  });
};

export default {
  async widgetsTicketComments(
    _root,
    args: { typeId?: string },
    { subdomain }: IContext
  ) {

    const { typeId } = args;

    const data = await sendTicketsMessage({
      subdomain,
      action: 'widgets.comments.find',
      data: { typeId },
      isRPC: true,
      defaultValue: null
    });
    return data
  },
  async widgetsTicketCustomerDetail(
    _root,
    args: { customerId?: string; type?: string },
    { models, subdomain }: IContext
  ) {
    const { customerId } = args;
    return await sendCoreMessage({
      subdomain,
      action: 'customers.findOne',
      data: { _id: customerId },
      isRPC: true,
      defaultValue: null
    });
  },
  async widgetsTicketActivityLogs(
    _root,
    args: { contentId?: string; contentType?: string },
    { subdomain }: IContext
  ) {
    const { contentId, contentType } = args;
    return await sendCoreMessage({
      subdomain,
      action: 'activityLogs.findOne',
      data: { contentType, contentId, },
      isRPC: true,
      defaultValue: null
    });
  },

  async widgetsTicketList(
    _root,
    args: { customerId: string; includeCompanyTickets?: boolean },
    { subdomain }: IContext
  ) {
    const { customerId, includeCompanyTickets } = args;

    console.log('🔔 widgetsTicketList resolver called with:', { customerId, includeCompanyTickets, subdomain });
    
    // sendTicketsMessage는 RPC 응답에서 자동으로 data를 추출하여 반환합니다
    console.log('🔔 Sending RPC message to tickets-api with action: widgets.ticketList.find');
    const tickets = await sendTicketsMessage({
      subdomain,
      action: 'widgets.ticketList.find',
      data: { customerId, includeCompanyTickets: includeCompanyTickets || false },
      isRPC: true,
      defaultValue: []
    });
    
    console.log('🔔 widgetsTicketList resolver received response, tickets count:', tickets?.length || 0);
    if (tickets && tickets.length > 0) {
      console.log('🔔 First ticket customerName:', tickets[0]?.customerName);
    }
    
    return tickets || [];
  },

  async widgetsGetMessengerIntegration(
    _root,
    args: { brandCode: string },
    { models }: IContext
  ) {
    return models.Integrations.getWidgetIntegration(
      args.brandCode,
      "messenger"
    );
  },

  async widgetsConversations(
    _root,
    args: { integrationId: string; customerId?: string; visitorId?: string },
    { models }: IContext
  ) {
    const { integrationId, customerId, visitorId } = args;

    const query = customerId
      ? { integrationId, customerId }
      : { integrationId, visitorId };

    return models.Conversations.find(query).sort({ updatedAt: -1 });
  },
  async widgetsConversationDetail(
    _root,
    args: { _id: string; integrationId: string },
    { models, subdomain }: IContext
  ) {
    try {
      const { _id, integrationId } = args;

      const [conversation, integration] = await Promise.all([
        models.Conversations.findOne({ _id, integrationId }),
        models.Integrations.findOne({ _id: integrationId })
      ]);

      if (!integration) return null;
      let getStartedCondition: { isSelected?: boolean } | false = false;

      if (isEnabled("automations")) {
        const getStarted = await sendAutomationsMessage({
          subdomain,
          action: "trigger.find",
          data: {
            query: {
              triggerType: "inbox:messages",
              botId: integration._id
            }
          },
          isRPC: true
        }).catch((error) => {
          throw error;
        });

        getStartedCondition = (
          getStarted[0]?.triggers[0]?.config?.conditions || []
        ).find((condition) => condition.type === "getStarted");
      }

      const messengerData = integration.messengerData || {
        supporterIds: [],
        persistentMenus: [],
        botGreetMessage: ""
      };

      if (!conversation) {
        return {
          persistentMenus: messengerData.persistentMenus,
          botGreetMessage: messengerData.botGreetMessage,
          getStarted: getStartedCondition
            ? getStartedCondition.isSelected
            : false,
          messages: [],
          isOnline: await isMessengerOnline(models, integration)
        };
      }

      const [messages, participatedUsers, readUsers, supporters, isOnline] =
        await Promise.all([
          getWidgetMessages(models, conversation._id),
          fetchUsers(models, subdomain, integration, {
            _id: { $in: conversation.participatedUserIds }
          }),
          fetchUsers(models, subdomain, integration, {
            _id: { $in: conversation.readUserIds }
          }),
          fetchUsers(models, subdomain, integration, {
            _id: { $in: messengerData.supporterIds }
          }),
          isMessengerOnline(models, integration)
        ]);

      return {
        _id,
        persistentMenus: messengerData.persistentMenus,
        botGreetMessage: messengerData.botGreetMessage,
        getStarted: getStartedCondition
          ? getStartedCondition.isSelected
          : false,
        messages,
        isOnline,
        operatorStatus: conversation.operatorStatus,
        participatedUsers,
        readUsers,
        supporters
      };
    } catch (error) {
      throw new Error("Failed to fetch conversation details");
    }
  },

  async widgetsMessages(
    _root,
    args: { conversationId: string },
    { models }: IContext
  ) {
    const { conversationId } = args;

    return getWidgetMessages(models, conversationId);
  },

  async widgetsUnreadCount(
    _root,
    args: { conversationId: string },
    { models }: IContext
  ) {
    const { conversationId } = args;

    return models.ConversationMessages.widgetsGetUnreadMessagesCount(
      conversationId
    );
  },

  async widgetsTotalUnreadCount(
    _root,
    args: { integrationId: string; customerId?: string },
    { models }: IContext
  ) {
    const { integrationId, customerId } = args;

    if (!customerId) {
      return 0;
    }
    // find conversations
    const convs = await models.Conversations.find({
      integrationId,
      customerId
    });

    // find read messages count
    return models.ConversationMessages.countDocuments(
      models.Conversations.widgetsUnreadMessagesQuery(convs)
    );
  },

  async widgetsMessengerSupporters(
    _root,
    { integrationId }: { integrationId: string },
    { models, subdomain }: IContext
  ) {
    const integration = await models.Integrations.findOne({
      _id: integrationId
    });

    let timezone = momentTz.tz.guess();

    if (!integration) {
      return {
        supporters: [],
        isOnline: false
      };
    }

    const messengerData = integration.messengerData || { supporterIds: [] };

    if (integration.messengerData && integration.messengerData.timezone) {
      timezone = integration.messengerData.timezone;
    }

    return {
      supporters: await fetchUsers(models, subdomain, integration, {
        _id: { $in: messengerData.supporterIds || [] }
      }),
      isOnline: await isMessengerOnline(models, integration),
      timezone
    };
  },

  async widgetsGetEngageMessage(
    _root,
    {
      integrationId,
      customerId,
      visitorId,
      browserInfo
    }: {
      integrationId: string;
      customerId?: string;
      visitorId?: string;
      browserInfo: IBrowserInfo;
    },
    { models, subdomain }: IContext
  ) {
    return getOrCreateEngageMessage(
      models,
      subdomain,
      integrationId,
      browserInfo,
      visitorId,
      customerId
    );
  },

  async widgetsProductCategory(_root, { _id }: { _id: string }) {
    return {
      __typename: "ProductCategory",
      _id
    };
  },

  /*
   * Search published articles that contain searchString (case insensitive)
   * in a topic found by topicId
   * @return {Promise} searched articles
   */
  async widgetsKnowledgeBaseArticles(
    _root: any,
    args: { topicId: string; searchString: string },
    { subdomain }: IContext
  ) {
    const { topicId, searchString = "" } = args;
    
    const trimmedSearch = searchString.trim();
    
    return sendKnowledgeBaseMessage({
      subdomain,
      action: "articles.find",
      data: {
        query: {
          topicId,
          $or: [
            { title: { $regex: `.*${trimmedSearch}.*`, $options: "i" } },
            { summary: { $regex: `.*${trimmedSearch}.*`, $options: "i" } },
            { content: { $regex: `.*${trimmedSearch}.*`, $options: "i" } }
          ],
          status: "publish"
        }
      },
      isRPC: true
    });
  },

  /**
   * Topic detail
   */
  async widgetsKnowledgeBaseTopicDetail(
    _root,
    { _id }: { _id: string },
    { subdomain }: IContext
  ) {
    const commonOptions = { subdomain, isRPC: true };

    const topic = await sendKnowledgeBaseMessage({
      ...commonOptions,
      action: "topics.findOne",
      data: {
        query: {
          _id
        }
      }
    });

    if (topic && topic.createdBy) {
      const user = await sendCoreMessage({
        ...commonOptions,
        action: "users.findOne",
        data: {
          _id: topic.createdBy
        },
        defaultValue: {}
      });

      sendCoreMessage({
        subdomain,
        action: "registerOnboardHistory",
        data: {
          type: "knowledgeBaseInstalled",
          user
        }
      });
    }

    return topic;
  },

  async widgetsGetDealFields(
    _root,
    args: { boardId: string; pipelineId: string },
    { subdomain }: IContext
  ) {
    const { boardId, pipelineId } = args;
    const fields = await sendCoreMessage({
      subdomain,
      action: "fields.fieldsCombinedByContentType",
      data: {
        contentType: "sales:deal",
        config: { boardId, pipelineId },
      },
      isRPC: true,
      defaultValue: [],
    });

    const customFields = (fields || []).filter(
      (f: any) =>
        f.name && String(f.name).startsWith("customFieldsData.")
    );

    return customFields.map((f: any) => {
      const fieldId = String(f.name).replace(/^customFieldsData\./, "");
      const raw = f.options || f.selectOptions || [];
      const opts = (Array.isArray(raw) ? raw : []).map((o: any) => {
        if (typeof o === "string") {
          return { value: o, label: o };
        }
        return {
          value: o.value != null ? String(o.value) : "",
          label: o.label != null ? String(o.label) : o.value != null ? String(o.value) : "",
        };
      });
      return {
        _id: fieldId,
        name: f.name,
        label: f.label || f.name,
        type: (f.type || "input").toLowerCase(),
        options: opts,
      };
    });
  },
};