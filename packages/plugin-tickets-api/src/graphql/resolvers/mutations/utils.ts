import resolvers from "..";
import {
  destroyBoardItemRelations,
  getCollection,
  getCompanyIds,
  getCustomerIds,
  getItem,
  getNewOrder,
} from "../../../models/utils";
import {
  IItemCommonFields,
  IItemDragCommonFields,
  IStageDocument,
} from "../../../models/definitions/boards";
import { BOARD_STATUSES } from "../../../models/definitions/constants";
import { ITicket, ITicketDocument } from "../../../models/definitions/tickets";

import graphqlPubsub from "@erxes/api-utils/src/graphqlPubsub";
import {
  putActivityLog,
  putCreateLog,
  putDeleteLog,
  putUpdateLog,
} from "../../../logUtils";
import { checkUserIds } from "@erxes/api-utils/src";
import {
  copyChecklists,
  copyPipelineLabels,
  createConformity,
  IBoardNotificationParams,
  prepareBoardItemDoc,
  sendNotifications,
} from "../../utils";
import { IUserDocument } from "@erxes/api-utils/src/types";
import { generateModels, IModels } from "../../../connectionResolver";
import {
  sendCoreMessage,
  sendNotificationsMessage,
} from "../../../messageBroker";

export const itemResolver = async (
  models: IModels,
  subdomain: string,
  user: any,
  type: string,
  item: IItemCommonFields
) => {
  let resolverType = "";

  switch (type) {
    case "ticket":
      resolverType = "Ticket";
      break;
  }

  const additionInfo = {};
  const resolver = resolvers[resolverType] || {};

  for (const subResolver of Object.keys(resolver)) {
    try {
      additionInfo[subResolver] = await resolver[subResolver](
        item,
        {},
        { models, subdomain, user },
        { isSubscription: true }
      );
    } catch (unused) {
      continue;
    }
  }

  return additionInfo;
};

export const itemsAdd = async (
  models: IModels,
  subdomain: string,
  doc: (ITicket | IItemCommonFields) & {
    proccessId: string;
    aboveItemId: string;
  },
  type: string,
  createModel: any,
  user?: IUserDocument,
  docModifier?: any
) => {
  const { collection } = getCollection(models, type);

  doc.initialStageId = doc.stageId;
  doc.watchedUserIds = user && [user._id];

  if (doc.customerIds && doc.customerIds.length > 0 && !doc.companyIds) {
    const companyIds = new Set<string>();

    for (const customerId of doc.customerIds) {
      try {
        // Customer의 Company 관계 조회
        const customerCompanyIds = await sendCoreMessage({
          subdomain,
          action: "conformities.savedConformity",
          data: {
            mainType: "customer",
            mainTypeId: customerId,
            relTypes: ["company"],
          },
          isRPC: true,
          defaultValue: [],
        });

        // Company ID 수집
        customerCompanyIds.forEach((id) => companyIds.add(id));
      } catch (error) {
        console.error(
          `Failed to get companies for customer ${customerId}:`,
          error
        );
      }
    }

    // 수집된 Company IDs를 doc에 추가
    if (companyIds.size > 0) {
      doc.companyIds = Array.from(companyIds);
    }
  }

  const modifiedDoc = docModifier
    ? docModifier(doc)
    : {
        ...doc,
        name: doc.name || "Untitled",
      };
  const extendedDoc = {
    ...modifiedDoc,
    modifiedBy: user && user._id,
    userId: user ? user._id : doc.userId,
    order: await getNewOrder({
      collection,
      stageId: doc.stageId,
      aboveItemId: doc.aboveItemId,
    }),
  };

  if (extendedDoc.customFieldsData) {
    // clean custom field values
    extendedDoc.customFieldsData = await sendCoreMessage({
      subdomain,
      action: "fields.prepareCustomFieldsData",
      data: extendedDoc.customFieldsData,
      isRPC: true,
      defaultValue: [],
    });
  }

  const item = await createModel(extendedDoc);
  const stage = await models.Stages.getStage(item.stageId);

  await createConformity(subdomain, {
    mainType: type,
    mainTypeId: item._id,
    companyIds: doc.companyIds,
    customerIds: doc.customerIds,
  });

  if (user) {
    const pipeline = await models.Pipelines.getPipeline(stage.pipelineId);

    // assignedUserIds가 있을 때만 invitedUsers로 전달
    // 이렇게 하면 실제 담당자에게만 "담당자로 지정되었습니다" 알림이 전송됨
    const invitedUsers = item.assignedUserIds && item.assignedUserIds.length > 0 
      ? item.assignedUserIds.filter(id => id !== user._id)
      : undefined;

    sendNotifications(models, subdomain, {
      item,
      user,
      type: `${type}Add`,
      action: `invited you to the ${pipeline.name}`,
      content: `'${item.name}'.`,
      contentType: type,
      invitedUsers, // assignedUserIds가 있을 때만 전달
    });

    await putCreateLog(
      models,
      subdomain,
      {
        type,
        newData: extendedDoc,
        object: item,
      },
      user
    );
  }

  graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
    ticketsPipelinesChanged: {
      _id: stage.pipelineId,
      proccessId: doc.proccessId,
      action: "itemAdd",
      data: {
        item,
        aboveItemId: doc.aboveItemId,
        destinationStageId: stage._id,
      },
    },
  });

  return item;
};

export const changeItemStatus = async (
  models: IModels,
  subdomain: string,
  user: any,
  {
    type,
    item,
    status,
    proccessId,
    stage,
  }: {
    type: string;
    item: any;
    status: string;
    proccessId: string;
    stage: IStageDocument;
  }
) => {
  if (status === "archived") {
    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: stage.pipelineId,
        proccessId,
        action: "itemRemove",
        data: {
          item,
          oldStageId: item.stageId,
        },
      },
    });

    return;
  }

  const { collection } = getCollection(models, type);

  const aboveItems = await collection
    .find({
      stageId: item.stageId,
      status: { $ne: BOARD_STATUSES.ARCHIVED },
      order: { $lt: item.order },
    })
    .sort({ order: -1 })
    .limit(1);

  const aboveItemId = aboveItems[0]?._id || "";

  // maybe, recovered order includes to oldOrders
  await collection.updateOne(
    {
      _id: item._id,
    },
    {
      order: await getNewOrder({
        collection,
        stageId: item.stageId,
        aboveItemId,
      }),
    }
  );

  // For subscriptions, only include minimal item data to avoid unnecessary queries
  // itemResolver is expensive and will be called when client actually needs the data
  graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
    ticketsPipelinesChanged: {
      _id: stage.pipelineId,
      proccessId,
      action: "itemAdd",
      data: {
        item: item._doc || item,
        aboveItemId,
        destinationStageId: item.stageId,
      },
    },
  });
};

export const itemsEdit = async (
  models: IModels,
  subdomain: string,
  _id: string,
  type: string,
  oldItem: any,
  doc: any,
  proccessId: string,
  user: IUserDocument,
  modelUpate
) => {
  const extendedDoc = {
    ...doc,
    modifiedAt: new Date(),
    modifiedBy: user._id,
  };

  // description 변경 시 manualEmailRequest는 변경하지 않음 (Send Email 버튼을 눌렀을 때만 변경)
  // extendedDoc에서 manualEmailRequest를 제거하여 기존 값 유지 (단, Send Email 버튼 클릭 시에는 제외)
  if (
    type === "ticket" &&
    doc.description &&
    doc.description !== oldItem?.description &&
    doc.manualEmailRequest !== true  // Send Email 버튼 클릭이 아닌 경우에만 제거
  ) {
    // description 변경 시 manualEmailRequest를 제거하여 기존 값 유지
    if (extendedDoc.manualEmailRequest !== undefined) {
      delete extendedDoc.manualEmailRequest;
    }
  }

  // Optimize: fetch needed fields (canEditMemberIds, pipelineId) for permission check and pipeline operations
  const stage = await models.Stages.findOne({ _id: oldItem.stageId })
    .select("canEditMemberIds pipelineId")
    .lean();

  if (!stage) {
    throw new Error("Stage not found");
  }

  const { canEditMemberIds } = stage;

  if (
    canEditMemberIds &&
    canEditMemberIds.length > 0 &&
    !canEditMemberIds.includes(user._id)
  ) {
    throw new Error("Permission denied");
  }

  if (extendedDoc.customFieldsData) {
    // clean custom field values
    extendedDoc.customFieldsData = await sendCoreMessage({
      subdomain,
      action: "fields.prepareCustomFieldsData",
      data: extendedDoc.customFieldsData,
      isRPC: true,
    });
  }

  // Optimize: manualEmailRequest가 true인 경우 emailSent를 extendedDoc에 먼저 포함
  // description 변경보다 먼저 처리하여 manualEmailRequest가 true일 때 emailSent = true가 유지되도록 함
  // manualEmailRequest는 true로 설정된 후 false로 리셋되므로, 이미 true였어도 다시 처리 가능
  if (
    type === "ticket" &&
    doc.manualEmailRequest === true
  ) {
    // manualEmailRequest가 true인 경우, emailSent를 true로 설정하여 버튼 비활성화
    // extendedDoc에 포함하여 modelUpate에서 한 번에 처리되도록 함
    extendedDoc.emailSent = true;
    // manualEmailRequest는 자동화 트리거 후 false로 리셋되도록 설정
    // 이렇게 하면 다음에 다시 Send Email 버튼을 클릭할 수 있음
    extendedDoc.manualEmailRequest = false;
  }

  // Optimize: description 변경 시 필요한 필드를 미리 extendedDoc에 포함하여 한 번의 업데이트로 처리
  // 단, manualEmailRequest가 동시에 true인 경우 emailSent = true를 유지해야 함
  if (
    type === "ticket" &&
    doc.description &&
    doc.description !== oldItem.description
  ) {
    // description 변경 시 필요한 필드들을 extendedDoc에 추가
    // manualEmailRequest가 동시에 true인 경우 emailSent는 이미 true로 설정되었으므로 덮어쓰지 않음
    if (doc.manualEmailRequest !== true) {
      extendedDoc.emailSent = false; // emailSent는 항상 false로 리셋 (단, manualEmailRequest가 true인 경우 제외)
    }
    extendedDoc.assignAlarm = true; // assignAlarm을 true로 설정

    // widgetAlarm이 true인 경우에만 false로 업데이트
    if ((oldItem as any).widgetAlarm === true) {
      extendedDoc.widgetAlarm = false;
    }
  }

  const updatedItem = await modelUpate(_id, extendedDoc);

  // 티켓의 description이 수정된 경우 자동화 트리거 처리
  let shouldSkipAutomationTrigger = false; // putUpdateLog에서 자동화 트리거 스킵 플래그
  
  // Optimize: description 변경 시 자동화 트리거를 비동기로 처리하여 응답 지연 방지
  if (
    type === "ticket" &&
    doc.description &&
    doc.description !== oldItem.description
  ) {
    // description 변경으로 인한 자동화 트리거를 이미 보낼 예정이므로
    // putUpdateLog에서는 자동화 트리거를 스킵하도록 플래그 설정
    shouldSkipAutomationTrigger = true;

    // Optimize: use lean object directly (already lean from updateTicket)
    const ticketForAutomation = { ...updatedItem, assignAlarm: true };
    
    // Optimize: 자동화 트리거를 비동기로 처리하여 응답 지연 방지
    const { sendMessage } = await import("@erxes/api-utils/src/core");
    sendMessage({
      subdomain,
      serviceName: "automations",
      action: "trigger",
      data: {
        type: "tickets:ticket",
        targets: [ticketForAutomation],  // assignAlarm: true인 데이터 전달
        triggerSource: "assignAlarm"
      }
    }).catch(error => {
      console.error('❌ Failed to send assignAlarm automation trigger:', error);
      // 에러 발생해도 계속 진행 (assignAlarm은 그대로 유지)
    });
    
    // 자동화 트리거 전송 후 10초 뒤에 assignAlarm을 false로 리셋
    // 이렇게 해야 description이 다시 변경되면 자동화가 재등록(재실행)될 수 있음
    setTimeout(async () => {
      try {
        await models.Tickets.updateOne(
          { _id },
          { $set: { assignAlarm: false } }
        );
      } catch (error) {
        console.error(`❌ Failed to reset assignAlarm for ticket ${_id}:`, error);
      }
    }, 10000); // 10초 대기
  }

  // manualEmailRequest가 true인 경우 자동화 트리거 (description 변경과 독립적)
  // 이미 true였어도 다시 클릭한 경우이므로 항상 처리해야 함
  if (doc.manualEmailRequest === true) {
    // Ensure updatedItem has emailSent = true for GraphQL response
    // This is critical for button disable functionality on the client side
    updatedItem.emailSent = true;
    // manualEmailRequest는 false로 리셋되었으므로 반영
    updatedItem.manualEmailRequest = false;
    
    // Optimize: use lean object directly (already lean from updateTicket)
    // 자동화 트리거에는 emailSent: false로 보냄 (아직 이메일 발송 전 상태)
    // oldItem에서 manualEmailRequest가 이미 true였는지 확인
    const wasAlreadyTrue = !!(oldItem as any).manualEmailRequest;
    const ticketForAutomation = { 
      ...updatedItem, 
      manualEmailRequest: true, 
      emailSent: false,
      // oldItem의 다른 필드들도 포함 (자동화 세그먼트 매칭을 위해)
      ...(wasAlreadyTrue ? oldItem : {})
    };

    // Optimize: 자동화 트리거를 비동기로 처리하여 응답 지연 방지
    // 자동화 트리거를 먼저 보냄 (manualEmailRequest: true 상태로)
    // 이렇게 하면 세그먼트 조건이 정상적으로 매칭됨
    const { sendMessage } = await import("@erxes/api-utils/src/core");
    sendMessage({
      subdomain,
      serviceName: "automations",
      action: "trigger",
      data: {
        type: "tickets:ticket",
        targets: [ticketForAutomation],  // manualEmailRequest: true인 데이터 전달
        triggerSource: "manualEmailRequest"
      }
    }).catch(error => {
      console.error('❌ Failed to send manual email automation trigger:', error);
      // 에러 발생 시에도 DB 업데이트는 진행 (버튼 비활성화)
    });
    
    // Note: emailSent는 이미 extendedDoc에 포함되어 modelUpate에서 처리되었고,
    // updatedItem에도 명시적으로 설정했으므로 GraphQL 응답에 정확히 반영됨
    // manualEmailRequest도 false로 리셋되어 다음 클릭을 위해 준비됨
  }

  // labels should be copied to newly moved pipeline
  if (doc.stageId) {
    await copyPipelineLabels(models, { item: oldItem, doc, user });
  }

  const notificationDoc: IBoardNotificationParams = {
    item: updatedItem,
    user,
    type: `${type}Edit`,
    contentType: type,
  };

  if (doc.status && oldItem.status && oldItem.status !== doc.status) {
    const activityAction = doc.status === "active" ? "activated" : "archived";

    putActivityLog(subdomain, {
      action: "createArchiveLog",
      data: {
        item: updatedItem,
        contentType: type,
        action: "archive",
        userId: user._id,
        createdBy: user._id,
        contentId: updatedItem._id,
        content: activityAction,
      },
    });

    // order notification
    await changeItemStatus(models, subdomain, user, {
      type,
      item: updatedItem,
      status: activityAction,
      proccessId,
      stage,
    });
  }

  if (doc.assignedUserIds) {
    const { addedUserIds, removedUserIds } = checkUserIds(
      oldItem.assignedUserIds,
      doc.assignedUserIds
    );

    const activityContent = { addedUserIds, removedUserIds };

    putActivityLog(subdomain, {
      action: "createAssigneLog",
      data: {
        contentId: _id,
        userId: user._id,
        contentType: type,
        content: activityContent,
        action: "assignee",
        createdBy: user._id,
      },
    });

    notificationDoc.invitedUsers = addedUserIds;
    notificationDoc.removedUsers = removedUserIds;
  }

  // Optimize: send notifications asynchronously to avoid blocking response
  // But for critical updates (assigned users, status), wait for completion
  const notificationPromise = sendNotifications(models, subdomain, notificationDoc)
    .catch(error => {
      console.error('Failed to send notifications:', error);
    });

  if (!notificationDoc.invitedUsers && !notificationDoc.removedUsers) {
    // Optimize: mobile notification can be sent asynchronously
    sendCoreMessage({
      subdomain: "os",
      action: "sendMobileNotification",
      data: {
        title: notificationDoc?.item?.name,
        body: `${
          user?.details?.fullName || user?.details?.shortName
        } has updated`,
        receivers: notificationDoc?.item?.assignedUserIds,
        data: {
          type,
          id: _id,
        },
      },
    }).catch(error => {
      console.error('Failed to send mobile notification:', error);
    });
  }

  // exclude [null]
  if (doc.tagIds && doc.tagIds.length) {
    doc.tagIds = doc.tagIds.filter((ti) => ti);
  }

  // Optimize: putUpdateLog can be async for description-only updates
  // But wait for it if there are assigned user changes (critical notification)
  const updateLogPromise = putUpdateLog(
    models,
    subdomain,
    {
      type,
      object: oldItem,
      newData: extendedDoc,
      updatedDocument: updatedItem,
    },
    user,
    { skipAutomationTrigger: shouldSkipAutomationTrigger }
  ).catch(error => {
    console.error('Failed to put update log:', error);
  });

  // Optimize: only fetch stage if needed for pipeline change check
  // For description-only updates, we already have the stage info
  let updatedStage: any = stage; // Use existing stage by default (lean object)
  const needsStageUpdate = updatedItem.stageId !== oldItem.stageId;
  
  if (needsStageUpdate) {
    // Only fetch new stage if stage actually changed (use lean for consistency)
    updatedStage = await models.Stages.findOne({ _id: updatedItem.stageId })
      .select("pipelineId")
      .lean();
    
    if (!updatedStage) {
      throw new Error("Updated stage not found");
    }
  }
  
  // Wait for critical operations only (assigned users or status changes)
  // Description-only updates don't need to wait for these
  const hasCriticalChanges = doc.assignedUserIds || (doc.status && oldItem.status !== doc.status);
  if (hasCriticalChanges) {
    await Promise.all([notificationPromise, updateLogPromise]);
  }

  // Optimize: only publish subscription if there are significant changes
  // Description-only updates may not need immediate subscription updates
  if (doc.tagIds || doc.startDate || doc.closeDate || doc.name || doc.assignedUserIds) {
    // Optimize: only publish minimal data for simple updates
    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: stage.pipelineId,
        proccessId,
        action: "itemUpdate",
      },
    });
  }

  // Optimize: check if stage changed using already-fetched stage info
  if (needsStageUpdate && updatedStage.pipelineId !== stage.pipelineId) {
    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: stage.pipelineId,
        proccessId,
        action: "itemRemove",
        data: {
          item: oldItem,
          oldStageId: stage._id,
        },
      },
    });
    // Optimize: avoid expensive itemResolver for subscriptions
    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: updatedStage.pipelineId,
        proccessId,
        action: "itemAdd",
        data: {
          item: updatedItem, // Already lean object, no need for _doc check
          aboveItemId: "",
          destinationStageId: updatedStage._id,
        },
      },
    });
  } else {
    // Optimize: avoid expensive itemResolver for subscriptions
    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: stage.pipelineId,
        proccessId,
        action: "itemUpdate",
        data: {
          item: updatedItem, // Already lean object, no need for _doc check
        },
      },
    });
  }

  // Optimize: return early for description-only updates (no stage change)
  // This avoids unnecessary processing and improves response time
  if (oldItem.stageId === updatedItem.stageId) {
    // For description-only updates, return immediately without waiting for background tasks
    return updatedItem;
  }

  // if task moves between stages (only happens if stageId changed)
  const { content, action } = await itemMover(
    models,
    subdomain,
    user._id,
    oldItem,
    type,
    updatedItem.stageId
  );

  // Optimize: stage change notifications can be async (non-blocking)
  sendNotifications(models, subdomain, {
    item: updatedItem,
    user,
    type: `${type}Change`,
    content,
    action,
    contentType: type,
  }).catch(error => {
    console.error('Failed to send stage change notifications:', error);
  });

  return updatedItem;
};

const itemMover = async (
  models: IModels,
  subdomain: string,
  userId: string,
  item: ITicketDocument,
  contentType: string,
  destinationStageId: string
) => {
  const oldStageId = item.stageId;

  let action = `changed order of your ${contentType}:`;
  let content = `'${item.name}'`;

  if (oldStageId !== destinationStageId) {
    const stage = await models.Stages.getStage(destinationStageId);
    const oldStage = await models.Stages.getStage(oldStageId);

    const pipeline = await models.Pipelines.getPipeline(stage.pipelineId);
    const oldPipeline = await models.Pipelines.getPipeline(oldStage.pipelineId);

    const board = await models.Boards.getBoard(pipeline.boardId);
    const oldBoard = await models.Boards.getBoard(oldPipeline.boardId);

    action = `moved '${item.name}' from ${oldBoard.name}-${oldPipeline.name}-${oldStage.name} to `;

    content = `${board.name}-${pipeline.name}-${stage.name}`;

    const link = `/${contentType}/board?id=${board._id}&pipelineId=${pipeline._id}&itemId=${item._id}`;

    const activityLogContent = {
      oldStageId,
      destinationStageId,
      text: `${oldStage.name} to ${stage.name}`,
    };

    await putActivityLog(subdomain, {
      action: "createBoardItemMovementLog",
      data: {
        item,
        contentType,
        userId,
        activityLogContent,
        link,
        action: "moved",
        contentId: item._id,
        createdBy: userId,
        content: activityLogContent,
      },
    });

    sendNotificationsMessage({
      subdomain,
      action: "batchUpdate",
      data: {
        selector: { contentType, contentTypeId: item._id },
        modifier: { $set: { link } },
      },
    });
  }

  return { content, action };
};

export const checkMovePermission = (
  stage: IStageDocument,
  user: IUserDocument
) => {
  if (
    stage.canMoveMemberIds &&
    stage.canMoveMemberIds.length > 0 &&
    !stage.canMoveMemberIds.includes(user._id)
  ) {
    throw new Error("Permission denied");
  }
};

export const itemsChange = async (
  models: IModels,
  subdomain: string,
  doc: IItemDragCommonFields,
  type: string,
  user: IUserDocument,
  modelUpdate: any
) => {
  const { collection } = getCollection(models, type);

  const { proccessId, itemId, aboveItemId, destinationStageId, sourceStageId } =
    doc;

  const item = await getItem(models, type, { _id: itemId });
  const stage = await models.Stages.getStage(item.stageId);

  const extendedDoc: IItemCommonFields = {
    modifiedAt: new Date(),
    modifiedBy: user._id,
    stageId: destinationStageId,
    order: await getNewOrder({
      collection,
      stageId: destinationStageId,
      aboveItemId,
    }),
  };

  if (item.stageId !== destinationStageId) {
    checkMovePermission(stage, user);

    const destinationStage = await models.Stages.getStage(destinationStageId);

    checkMovePermission(destinationStage, user);

    extendedDoc.stageChangedDate = new Date();
  }

  const updatedItem = await modelUpdate(itemId, extendedDoc);

  const { content, action } = await itemMover(
    models,
    subdomain,
    user._id,
    item,
    type,
    destinationStageId
  );

  await sendNotifications(models, subdomain, {
    item,
    user,
    type: `${type}Change`,
    content,
    action,
    contentType: type,
  });

  if (item?.assignedUserIds && item?.assignedUserIds?.length > 0) {
    sendCoreMessage({
      subdomain: "os",
      action: "sendMobileNotification",
      data: {
        title: `${item.name}`,
        body: `${user?.details?.fullName || user?.details?.shortName} ${action + content}`,
        receivers: item?.assignedUserIds,
        data: {
          type,
          id: item._id,
        },
      },
    });
  }

  await putUpdateLog(
    models,
    subdomain,
    {
      type,
      object: item,
      newData: extendedDoc,
      updatedDocument: updatedItem,
    },
    user
  );

  // order notification
  const labels = await models.PipelineLabels.find({
    _id: {
      $in: item.labelIds,
    },
  });

  graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
    ticketsPipelinesChanged: {
      _id: stage.pipelineId,
      proccessId,
      action: "orderUpdated",
      data: {
        item: {
          ...(item._doc || item),
          labels,
        },
        aboveItemId,
        destinationStageId,
        oldStageId: sourceStageId,
      },
    },
  });

  return item;
};

export const itemsRemove = async (
  models: IModels,
  subdomain: string,
  _id: string,
  type: string,
  user: IUserDocument
) => {
  const item = await getItem(models, type, { _id });

  await sendNotifications(models, subdomain, {
    item,
    user,
    type: `${type}Delete`,
    action: `deleted ${type}:`,
    content: `'${item.name}'`,
    contentType: type,
  });

  if (item?.assignedUserIds && item?.assignedUserIds?.length > 0) {
    sendCoreMessage({
      subdomain: "os",
      action: "sendMobileNotification",
      data: {
        title: `${item.name}`,
        body: `${user?.details?.fullName || user?.details?.shortName} deleted the ${type}`,
        receivers: item?.assignedUserIds,
        data: {
          type,
          id: item._id,
        },
      },
    });
  }

  await destroyBoardItemRelations(models, subdomain, item._id, type);

  const removed = await getCollection(models, type).collection.findOneAndDelete(
    { _id: item._id }
  );

  await putDeleteLog(models, subdomain, { type, object: item }, user);

  return removed;
};

export const itemsCopy = async (
  models: IModels,
  subdomain: string,
  _id: string,
  proccessId: string,
  type: string,
  user: IUserDocument,
  extraDocParam: string[],
  modelCreate: any
) => {
  const { collection } = getCollection(models, type);
  const item = await collection.findOne({ _id }).lean();

  const doc = await prepareBoardItemDoc(item, collection, user._id);

  delete doc.sourceConversationIds;

  for (const param of extraDocParam) {
    doc[param] = item[param];
  }

  const clone = await modelCreate(doc);

  const companyIds = await getCompanyIds(subdomain, type, _id);
  const customerIds = await getCustomerIds(subdomain, type, _id);

  await createConformity(subdomain, {
    mainType: type,
    mainTypeId: clone._id,
    customerIds,
    companyIds,
  });

  await copyChecklists(models, {
    contentType: type,
    contentTypeId: item._id,
    targetContentId: clone._id,
    user,
  });

  // order notification
  const stage = await models.Stages.getStage(clone.stageId);

  graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
    ticketsPipelinesChanged: {
      _id: stage.pipelineId,
      proccessId,
      action: "itemAdd",
      data: {
        item: clone._doc || clone,
        aboveItemId: _id,
        destinationStageId: stage._id,
      },
    },
  });

  await publishHelperItemsConformities(clone, stage);

  return clone;
};

export const itemsArchive = async (
  models: IModels,
  subdomain: string,
  stageId: string,
  type: string,
  proccessId: string,
  user: IUserDocument
) => {
  const { collection } = getCollection(models, type);

  const items = await collection
    .find({
      stageId,
      status: { $ne: BOARD_STATUSES.ARCHIVED },
    })
    .lean();

  await collection.updateMany(
    { stageId },
    { $set: { status: BOARD_STATUSES.ARCHIVED } }
  );

  // order notification
  const stage = await models.Stages.getStage(stageId);

  for (const item of items) {
    await putActivityLog(subdomain, {
      action: "createArchiveLog",
      data: {
        item,
        contentType: type,
        action: "archive",
        userId: user._id,
        createdBy: user._id,
        contentId: item._id,
        content: "archived",
      },
    });

    graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
      ticketsPipelinesChanged: {
        _id: stage.pipelineId,
        proccessId,
        action: "itemsRemove",
        data: {
          item,
          destinationStageId: stage._id,
        },
      },
    });
  }

  return "ok";
};

export const publishHelperItemsConformities = async (
  item: ITicketDocument,
  stage: IStageDocument
) => {
  graphqlPubsub.publish(`ticketsPipelinesChanged:${stage.pipelineId}`, {
    ticketsPipelinesChanged: {
      _id: stage.pipelineId,
      proccessId: Math.random().toString(),
      action: "itemOfConformitiesUpdate",
      data: {
        item: {
          ...item,
        },
      },
    },
  });
};

export const publishHelper = async (
  subdomain: string,
  type: string,
  itemId: string
) => {
  const models = await generateModels(subdomain);

  const item = await getItem(models, type, { _id: itemId });

  const stage = await models.Stages.getStage(item.stageId);
  await publishHelperItemsConformities(item, stage);
};
