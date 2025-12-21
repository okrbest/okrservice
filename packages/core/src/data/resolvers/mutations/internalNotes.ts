import {
  moduleRequireLogin,
  requireLogin
} from "@erxes/api-utils/src/permissions";
import { IContext } from "../../../connectionResolver";
import graphqlPubsub from "@erxes/api-utils/src/graphqlPubsub";
import { putCreateLog, putDeleteLog, putUpdateLog } from "../../../logUtils";
import {
  sendCommonMessage,
  sendNotificationsMessage
} from "../../../messageBroker";
import { isEnabled } from "@erxes/api-utils/src/serviceDiscovery";
import { IInternalNote } from "../../../db/models/definitions/internalNotes";

interface IInternalNotesEdit extends IInternalNote {
  _id: string;
}

const sendNotificationOfItems = async (
  subdomain: string,
  serviceName: any,
  item: any,
  doc: any,
  contentType: string,
  excludeUserIds: string[]
) => {
  const notifDocItems = { ...doc };

  const relatedReceivers = await sendCommonMessage({
    serviceName,
    action: "notifiedUserIds",
    subdomain,
    data: item,
    isRPC: true
  });

  notifDocItems.action = `added note in ${contentType}`;

  // relatedReceivers가 배열인지 확인하고 필터링
  const receiversArray = Array.isArray(relatedReceivers) ? relatedReceivers : [];
  notifDocItems.receivers = receiversArray.filter(id => {
    return id && excludeUserIds.indexOf(id) < 0;
  });

  // receivers가 비어있지 않을 때만 알림 전송
  if (notifDocItems.receivers.length > 0) {
    console.log(`[InternalNote] Sending notification to ticket members:`, {
      contentType,
      itemId: item?._id,
      receiversCount: notifDocItems.receivers.length,
      receivers: notifDocItems.receivers
    });

    sendNotificationsMessage({
      subdomain,
      action: "send",
      data: notifDocItems
    });
  } else {
    console.log(`[InternalNote] No receivers to notify for ticket note:`, {
      contentType,
      itemId: item?._id,
      relatedReceiversCount: receiversArray.length,
      excludeUserIds
    });
  }

  graphqlPubsub.publish("activityLogsChanged", {});
};

const internalNoteMutations = {
  /**
   * Adds internalNote object and also adds an activity log
   */
  async internalNotesAdd(
    _root,
    args: IInternalNote,
    { user, models, subdomain }: IContext
  ) {
    const { contentType, contentTypeId, mentionedUserIds = [] } = args;

    const [serviceName, type] = contentType.split(":");

    const isServiceAvailable = await isEnabled(serviceName);

    if (!isServiceAvailable) {
      return null;
    }

    const notifDoc = {
      title: `${type.toUpperCase()} updated`,
      createdUser: user,
      action: `mentioned you in ${contentType}`,
      receivers: mentionedUserIds,
      content: "",
      link: "",
      notifType: "",
      contentType: "",
      contentTypeId: ""
    };

    const updatedNotifDoc = await sendCommonMessage({
      subdomain,
      serviceName,
      action: "generateInternalNoteNotif",
      data: {
        type,
        contentTypeId,
        notifDoc
      },
      isRPC: true
    });

    if (updatedNotifDoc.notifOfItems) {
      const { item } = updatedNotifDoc;

      await sendNotificationOfItems(
        subdomain,
        serviceName,
        item,
        updatedNotifDoc,
        type,
        [...mentionedUserIds, user._id]
      );
    }

    // 멘션 알림 전송 - mentionedUserIds가 있을 때만
    console.log(`[InternalNote] Checking mention notification conditions:`, {
      userId: user._id,
      hasUpdatedNotifDoc: !!updatedNotifDoc,
      hasContentType: !!(updatedNotifDoc && updatedNotifDoc.contentType),
      contentType: updatedNotifDoc?.contentType,
      mentionedUserIds,
      mentionedUserIdsLength: mentionedUserIds?.length || 0,
      mentionedUserIdsArray: Array.isArray(mentionedUserIds)
    });

    if (updatedNotifDoc && updatedNotifDoc.contentType && mentionedUserIds && Array.isArray(mentionedUserIds) && mentionedUserIds.length > 0) {
      // mentionedUserIds에서 유효한 ID만 필터링
      const validMentionedIds = mentionedUserIds.filter(id => id && typeof id === 'string');
      
      if (validMentionedIds.length > 0) {
        // 멘션 알림은 ticketComment 타입 사용 (ticketDelete는 차단될 수 있음)
        const mentionNotifType = type === 'ticket' ? 'ticketComment' : (updatedNotifDoc.notifType || `${type}Mention`);
        
        const mentionNotifDoc = {
          ...updatedNotifDoc,
          receivers: validMentionedIds,
          action: `mentioned you in ${updatedNotifDoc.contentType}`,
          notifType: mentionNotifType,
          title: updatedNotifDoc.title || `${type.toUpperCase()} updated`
        };

        console.log(`[InternalNote] Sending mention notification:`, {
          createdUserId: user._id,
          receivers: mentionNotifDoc.receivers,
          receiversCount: mentionNotifDoc.receivers.length,
          contentType: mentionNotifDoc.contentType,
          notifType: mentionNotifDoc.notifType,
          title: mentionNotifDoc.title,
          link: mentionNotifDoc.link
        });

        try {
          await sendNotificationsMessage({
            subdomain,
            action: "send",
            data: mentionNotifDoc
          });
          console.log(`[InternalNote] Mention notification sent successfully`);
        } catch (error) {
          console.error(`[InternalNote] Error sending mention notification:`, error);
        }
      } else {
        console.log(`[InternalNote] No valid mentioned user IDs after filtering:`, {
          mentionedUserIds,
          validMentionedIds
        });
      }
    } else {
      console.log(`[InternalNote] Mention notification NOT sent - conditions not met:`, {
        hasUpdatedNotifDoc: !!updatedNotifDoc,
        hasContentType: !!(updatedNotifDoc && updatedNotifDoc.contentType),
        hasMentionedUserIds: !!mentionedUserIds,
        isMentionedUserIdsArray: Array.isArray(mentionedUserIds),
        mentionedUserIdsLength: mentionedUserIds?.length || 0
      });
    }

    const internalNote = await models.InternalNotes.createInternalNote(
      args,
      user
    );

    await putCreateLog(
      models,
      subdomain,
      {
        type: "internalNote",
        newData: {
          ...args,
          createdUserId: user._id,
          createdAt: internalNote.createdAt
        },
        object: internalNote,
        description: `A note for ${internalNote.contentType} "${updatedNotifDoc.content}" has been created`
      },
      user
    );

    return internalNote;
  },

  /**
   * Updates internalNote object
   */
  async internalNotesEdit(
    _root,
    { _id, ...doc }: IInternalNotesEdit,
    { user, models, subdomain }: IContext
  ) {
    const internalNote = await models.InternalNotes.getInternalNote(_id);
    const updated = await models.InternalNotes.updateInternalNote(_id, doc);

    await putUpdateLog(
      models,
      subdomain,
      {
        type: "internalNote",
        object: internalNote,
        newData: doc
      },
      user
    );

    graphqlPubsub.publish("activityLogsChanged", {});

    return updated;
  },

  /**
   * Removes an internal note
   */
  async internalNotesRemove(
    _root,
    { _id }: { _id: string },
    { user, models, subdomain }: IContext
  ) {
    const internalNote = await models.InternalNotes.getInternalNote(_id);
    const removed = await models.InternalNotes.removeInternalNote(_id);

    await putDeleteLog(
      models,
      subdomain,
      { type: "internalNote", object: internalNote },
      user
    );

    graphqlPubsub.publish("activityLogsChanged", {});

    return removed;
  }
};

requireLogin(internalNoteMutations, "internalNotesAdd");
requireLogin(internalNoteMutations, "internalNotesEdit");
requireLogin(internalNoteMutations, "internalNotesRemove");

export default internalNoteMutations;
