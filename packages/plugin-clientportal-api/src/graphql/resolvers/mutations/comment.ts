import { IContext } from "../../../connectionResolver";
import { sendNotification } from "../../../utils";
import {
  sendCoreMessage,
  sendNotificationsMessage,
  sendTicketsMessage,
} from "../../../messageBroker";
const clientPortalCommentMutations = {
  async clientPortalCommentsAdd(
    _root: any,
    args: { type: string; typeId: string; content: string; userType: string },
    context: { cpUser: any; user: any; models: any; subdomain: string }
  ) {
    const { type: rawType, typeId, content, userType } = args;
    const { cpUser, user, models, subdomain } = context;

    // Clean the type (e.g., from 's:ticket' to 'ticket')
    const type = rawType.replace(/^s:/, "");

    // Ticket comments are stored in tickets service (ticket_comments).
    // If we write to local client_portal_comments, staff-app detail query won't see them.
    // NOTE: Must run before resolving userId — client portal 직원은 context.user(Erxes)가 없고
    // cpUser만 있어서, team 분기에서 user._id 접근 시 댓글이 저장되기 전에 예외가 난다.
    if (type === "ticket") {
      const created = await sendTicketsMessage({
        subdomain,
        action: "widgets.commentAdd",
        data: {
          type,
          typeId,
          content,
          userType,
          customerId: userType === "client" ? cpUser?.erxesCustomerId : undefined,
        },
        isRPC: true,
      });

      // 고객 푸시는 tickets:widgets.commentAdd 에서 한 번만 발송한다 (중복 알림 방지).
      return created;
    }

    const userId =
      userType === "client"
        ? cpUser
          ? cpUser._id
          : (() => {
              throw new Error("You are not logged in");
            })()
        : user?._id ||
          (() => {
            throw new Error("Staff comment requires Erxes user context");
          })();

    // Create the comment
    const comment = await models.Comments.createComment({
      type,
      typeId,
      content,
      userType,
      userId,
    });

    // Get related cards
    const relatedCards = await models.ClientPortalUserCards.getUserIds(
      type,
      typeId
    );

    // Handle notifications for team members if no related cards

    try {
      if (userType === "client") {
        // Step 1: Find conformities for the ticket
        const conformities = await sendCoreMessage({
          subdomain,
          action: "conformities.findConformities",
          data: {
            mainType: "ticket",
            mainTypeId: typeId,
            relType: "customer",
          },
          isRPC: true,
          defaultValue: [],
        });

        if (!conformities || conformities.length === 0) return;

        // Step 2: Find related tickets
        const mainTypeIds = conformities.map((item) => item.mainTypeId);
        const tickets = await sendTicketsMessage({
          subdomain,
          action: "tickets.find",
          data: {
            query: {
              _id: { $in: mainTypeIds },
            },
          },
          isRPC: true,
        });
        if (!tickets || tickets.length === 0) return;

        const stageIds = tickets.map((ticket) => ticket.stageId);

        const stages = await sendTicketsMessage({
          subdomain,
          action: "stages.find",
          data: {
            _id: { $in: stageIds },
          },
          isRPC: true,
        });

        if (!stages || stages.length === 0) return;

        // Step 4: Find pipelines for the stages
        const pipelineIds = stages.map((stage) => stage.pipelineId);
        const pipelines = await sendTicketsMessage({
          subdomain,
          action: "pipelines.find",
          data: {
            _id: { $in: pipelineIds },
          },
          isRPC: true,
        });

        if (!pipelines || pipelines.length === 0) return;

        const pipeline = pipelines[0];
        const assignedUserIds = tickets.flatMap(
          (ticket) => ticket.assignedUserIds || []
        );
        const sendUsers = Array.from(new Set([...assignedUserIds, user._id]));
        const names = tickets.map((ticket) => ticket.name).filter(Boolean);
        // Step 5: Send notification
        await sendNotificationsMessage({
          subdomain,
          action: "send",
          data: {
            notifType: `${type}Comment`,
            title: `${names} - New comment added to ${type}`,
            action: `New comment added to ${type}`,
            content: `${names} - New comment added to ${type}`,
            link: `${type}/board?id=${pipeline.boardId}&pipelineId=${pipeline._id}&itemId=${typeId}`,
            createdUser: user,
            contentType: type,
            contentTypeId: typeId,
            receivers: sendUsers,
          },
        });
      } else {
        for (const cardUserId of relatedCards) {
          await sendNotification(models, subdomain, {
            receivers: [cardUserId],
            title: `${user.details?.fullName} commented on your ${type}.`,
            content: `<a href=/tickets?itemId=${typeId}>View ${type}</a>`,
            notifType: "system",
            link: `/tickets?itemId=${typeId}`,
          });
        }
      }
    } catch (error) {
      throw new Error("Error in notification workflow:", error);
    }

    return comment;
  },

  async clientPortalCommentsRemove(
    _root,
    { _id }: { _id: string },
    { cpUser, models }: IContext
  ) {
    if (!cpUser) {
      throw new Error("You are not logged in");
    }

    await models.Comments.deleteComment(_id);

    return "deleted";
  },
};

export default clientPortalCommentMutations;
