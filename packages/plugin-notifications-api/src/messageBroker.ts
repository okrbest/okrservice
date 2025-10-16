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
  } = doc;

  let { link } = doc;
  // remove duplicated ids
  const receiverIds = Array.from(new Set(receivers));

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
      // getNotificationByEmail 설정도 함께 체크
      const recipient = recipients.find((r) => r._id === receiverId);
      if (recipient && recipient.email && recipient.getNotificationByEmail) {
        console.log(`📧 [Email] Adding to email list: ${recipient.email} (notifType: ${notifType})`);
        toEmails.push(recipient.email);
      } else if (recipient && recipient.email) {
        console.log(`⚠️ [Email] Skipped (getNotificationByEmail=false): ${recipient.email}`);
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

    sendCoreMessage({
      subdomain,
      action: "sendEmail",
      data: {
        toEmails,
        title: "Notification",
        template: {
          name: "notification",
          data: {
            notification: { ...doc, link },
            action,
            userName: getUserDetail(createdUser),
          },
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
