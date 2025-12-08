import { getUserDetail } from "@erxes/api-utils/src";
import graphqlPubsub from "@erxes/api-utils/src/graphqlPubsub";
import { IModels } from "./connectionResolver";
import { generateModels } from "./connectionResolver";
import {
  MessageArgs,
  MessageArgsOmitService,
  sendMessage,
  getEnv,
} from "@erxes/api-utils/src/core";
import {
  consumeQueue,
  consumeRPCQueue,
} from "@erxes/api-utils/src/messageBroker";
import { debugError } from "@erxes/api-utils/src/debuggers";
import { NOTIFICATION_TYPES } from "./constants";

interface ISendNotification {
  createdUser;
  receivers: string[];
  title: string;
  content: string;
  notifType: string;
  link: string;
  action: string;
  contentType: string;
  contentTypeId: string;
  toMail: string;
  emailTitle?: string;
  emailContent?: string;
  itemName?: string;
  itemDescription?: string;
}

const sendNotification = async (
  models: IModels,
  subdomain: string,
  doc: ISendNotification
) => {
  const {
    createdUser,
    receivers,
    title,
    content,
    notifType,
    action,
    contentType,
    contentTypeId,
    emailTitle,
    emailContent,
    itemName,
    itemDescription,
  } = doc;

  console.log(`🔍 [Debug] sendNotification called:`, {
    notifType,
    receivers,
    receiversCount: receivers?.length || 0,
    emailTitle,
    itemName,
  });

  let { link } = doc;
  // remove duplicated ids
  const receiverIds = Array.from(new Set(receivers || []));

  await sendCoreMessage({
    subdomain,
    action: "users.updateMany",
    data: {
      selector: {
        _id: { $in: receiverIds },
      },
      modifier: {
        $set: { isShowNotification: false },
      },
    },
  });

  // collecting emails
  const recipients = await sendCoreMessage({
    subdomain,
    action: "users.find",
    data: {
      query: {
        _id: { $in: receiverIds },
        isActive: true,
      },
    },
    isRPC: true,
    defaultValue: [],
  });
  
  console.log(`🔍 [Debug] Recipients info:`, {
    receiverIds,
    receiverIdsCount: receiverIds.length,
    recipientsCount: recipients.length,
    recipients: recipients.map(r => ({
      _id: r._id,
      email: r?.email || 'no email',
      getNotificationByEmail: r?.getNotificationByEmail || false,
    })),
  });
  
  // collect recipient emails only from users who successfully received notification
  // and have email notification enabled
  const toEmails: string[] = [];

  // loop through receiver ids
  for (const receiverId of receiverIds) {
    try {
      // send web and mobile notification
      const notification = await models.Notifications.createNotification(
        {
          link,
          title,
          content,
          notifType,
          receiver: receiverId,
          action,
          contentType,
          contentTypeId,
        },
        createdUser._id
      );

      graphqlPubsub.publish(`notificationInserted:${subdomain}:${receiverId}`, {
        notificationInserted: {
          _id: notification._id,
          userId: receiverId,
          title: notification.title,
          content: notification.content,
        },
      });

      // 알림 생성이 성공했을 때만 이메일 수집
      // 담당자 지정 이메일은 getNotificationByEmail 설정과 무관하게 발송
      const recipient = recipients.find((r) => r._id === receiverId);
      const isTicketAssignNotification = notifType === NOTIFICATION_TYPES.TICKET_ADD;
      
      if (recipient && recipient.email) {
        // 담당자 지정 이메일은 항상 발송
        if (isTicketAssignNotification) {
          console.log(`📧 [Email] Adding to email list (ticket assign): ${recipient.email} (notifType: ${notifType})`);
          toEmails.push(recipient.email);
        } else if (recipient.getNotificationByEmail) {
          // 다른 알림은 getNotificationByEmail 설정 확인
          console.log(`📧 [Email] Adding to email list: ${recipient.email} (notifType: ${notifType})`);
          toEmails.push(recipient.email);
        } else {
          console.log(`⚠️ [Email] Skipped (getNotificationByEmail=false): ${recipient.email}`);
        }
      } else if (recipient && !recipient.email) {
        console.log(`⚠️ [Email] Skipped (no email): ${recipient._id}`);
      } else {
        console.log(`⚠️ [Email] Recipient not found: ${receiverId}`);
      }
    } catch (e) {
      // Any other error is serious
      if (e.message !== "Configuration does not exist") {
        throw e;
      }
      console.log(`🚫 [Email] Notification blocked for receiver: ${receiverId} (notifType: ${notifType})`);
      // Configuration does not exist = 사용자가 이 알림을 끔 -> 이메일도 보내지 않음
    }
  } // end receiverIds loop

  const DOMAIN = getEnv({ name: "DOMAIN" });

  link = `${DOMAIN}${link}`;

  const isTicketAssign = notifType === NOTIFICATION_TYPES.TICKET_ADD;
  
  // 디버깅: notifType과 비교값 확인
  console.log(`🔍 [Debug] Checking isTicketAssign:`, {
    notifType,
    TICKET_ADD: NOTIFICATION_TYPES.TICKET_ADD,
    isTicketAssign,
    contentType,
    emailTitle,
    itemName,
  });
  
  let finalEmailTitle: string;
  if (isTicketAssign) {
    if (emailTitle) {
      finalEmailTitle = emailTitle;
    } else {
      const fallbackTicketTitle =
        itemName ||
        (typeof content === "string" ? content.replace(/'/g, "") : "") ||
        title;
      finalEmailTitle = fallbackTicketTitle ? `담당자 지정 : ${fallbackTicketTitle}` : title || "Notification";
    }
    console.log(`📧 [Email] Ticket assign email title:`, {
      isTicketAssign,
      emailTitle,
      itemName,
      finalEmailTitle,
    });
  } else {
    finalEmailTitle = title || "Notification";
  }

  const notificationTemplateData: Record<string, any> = {
    ...doc,
    link,
    isTicketAssign,
  };

  if (isTicketAssign && (emailContent || itemDescription)) {
    notificationTemplateData.content =
      emailContent || itemDescription || notificationTemplateData.content;
  }

  // 이메일 수신자가 있을 때만 이메일 발송
  if (toEmails.length > 0) {
    console.log(`✉️ [Email] Sending notification emails:`, {
      notifType,
      recipients: toEmails.length,
      emails: toEmails
    });
    
    // for controlling email template data filling
    const modifier = (data: any, email: string) => {
      const user = recipients.find((item) => item.email === email);

      if (user) {
        data.uid = user._id;
      }
    };

    // 디버깅: 템플릿 데이터 확인
    const templateData = {
      isTicketAssign,
      notification: notificationTemplateData,
      action,
      userName: getUserDetail(createdUser),
    };
    console.log(`🔍 [Debug] Template data before sending:`, {
      isTicketAssign: templateData.isTicketAssign,
      notificationIsTicketAssign: templateData.notification.isTicketAssign,
      finalEmailTitle,
    });

    sendCoreMessage({
      subdomain,
      action: "sendEmail",
      data: {
        toEmails,
        title: finalEmailTitle,
        template: {
          name: "notification",
          data: templateData,
        },
        modifier,
      },
    });
  } else {
    console.log(`🔇 [Email] No email recipients for notifType: ${notifType}`);
  }
};

async function markNotificationsAsUnread(
  subdomain: string,
  receiverIds: string[]
) {
  await sendCoreMessage({
    subdomain,
    action: "users.updateMany",
    data: {
      selector: { _id: { $in: receiverIds } },
      modifier: { $set: { isShowNotification: false } },
    },
  });
}

export const setupMessageConsumers = async () => {
  consumeQueue("notifications:send", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    if (data.receivers && Array.isArray(data.receivers)) {
      data.receivers = [...new Set(data.receivers.filter((id) => id))];
    }

    await sendNotification(models, subdomain, data);
  });

  consumeRPCQueue("notifications:send", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    if (data.receivers && Array.isArray(data.receivers)) {
      data.receivers = [...new Set(data.receivers.filter((id) => id))];
    }

    await sendNotification(models, subdomain, data);

    return {
      status: "success",
    };
  });

  consumeQueue(
    "notifications:batchUpdate",
    async ({ subdomain, data: { selector, modifier } }) => {
      const models = await generateModels(subdomain);
      await models.Notifications.updateMany(selector, modifier);
    }
  );

  consumeRPCQueue(
    "notifications:checkIfRead",
    async ({ subdomain, data: { userId, itemId } }) => {
      const models = await generateModels(subdomain);
      return {
        status: "success",
        data: await models.Notifications.checkIfRead(userId, itemId),
      };
    }
  );

  consumeRPCQueue(
    "notifications:find",
    async ({ subdomain, data: { selector, fields } }) => {
      const models = await generateModels(subdomain);
      return {
        status: "success",
        data: await models.Notifications.find(selector, fields),
      };
    }
  );
};

export const sendCoreMessage = (args: MessageArgsOmitService): Promise<any> => {
  return sendMessage({
    serviceName: "core",
    ...args,
  });
};

export const sendCommonMessage = async (
  args: MessageArgs & { serviceName: string }
) => {
  return sendMessage({
    ...args,
  });
};

export const sendSegmentsMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "segments",
    ...args,
  });
};

export const sendClientPortalMessagge = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "clientportal",
    ...args,
  });
};
