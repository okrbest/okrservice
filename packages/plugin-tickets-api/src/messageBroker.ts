import type {
  MessageArgs,
  MessageArgsOmitService
} from "@erxes/api-utils/src/core";
import {
  consumeQueue,
  consumeRPCQueue
} from "@erxes/api-utils/src/messageBroker";
import {
  conversationConvertToCard,
  createBoardItem,
  updateName
} from "./models/utils";
import {
  createConformity,
  notifiedUserIds,
  sendNotifications
} from "./graphql/utils";
import { itemsEdit, publishHelper } from "./graphql/resolvers/mutations/utils";

import { checkItemPermByUser } from "../src/graphql/resolvers/queries/utils";
import { generateModels } from "./connectionResolver";
import { getCardItem } from "./utils";
import graphqlPubsub from "@erxes/api-utils/src/graphqlPubsub";
import { itemsAdd } from "../src/graphql/resolvers/mutations/utils";
import { sendMessage } from "@erxes/api-utils/src/core";

export const setupMessageConsumers = async () => {
  consumeRPCQueue("tickets:tickets.create", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const tickets = await models.Tickets.create(data);

    const { customerId = "" } = data;

    if (customerId) {
      await createConformity(subdomain, {
        customerIds: [customerId],
        mainType: "ticket",
        mainTypeId: tickets._id
      });
    }
    return {
      status: "success",
      data: tickets
    };
  });

  consumeRPCQueue("tickets:editItem", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    const objModels = {
      ticket: models.Tickets
    };

    const { itemId, processId, type, user, ...doc } = data;

    if (!itemId || !type || !user || !processId) {
      return {
        status: "error",
        errorMessage: "you must provide some params"
      };
    }
    const collection = objModels[type];

    const oldItem = await collection.findOne({ _id: itemId });
    const typeUpperCase = type.charAt(0).toUpperCase() + type.slice(1);

    // 티켓의 description이 수정된 경우 widgetAlarm을 false로 설정
    if (type === "ticket" && doc.description && doc.description !== oldItem.description) {
      // widgetAlarm이 true에서 false로 바뀌는지 확인
      const wasWidgetAlarmTrue = (oldItem as any).widgetAlarm === true;
      
      // description 수정 후 widgetAlarm을 false로 설정
      const updatedItem = await itemsEdit(
        models,
        subdomain,
        itemId,
        type,
        oldItem,
        doc,
        processId,
        user,
        collection[`update${typeUpperCase}`]
      );
      
      // widgetAlarm이 true인 경우에만 false로 업데이트
      // assignAlarm을 true로 설정 (description 변경 시)
      if (wasWidgetAlarmTrue) {
        await models.Tickets.updateOne(
          { _id: itemId },
          { $set: { widgetAlarm: false, assignAlarm: true } }
        );
      } else {
        // widgetAlarm이 이미 false인 경우에도 assignAlarm은 true로 설정
        await models.Tickets.updateOne(
          { _id: itemId },
          { $set: { assignAlarm: true } }
        );
      }
      
      return {
        status: "success",
        data: updatedItem
      };
    }

    return {
      status: "success",
      data: await itemsEdit(
        models,
        subdomain,
        itemId,
        type,
        oldItem,
        doc,
        processId,
        user,
        collection[`update${typeUpperCase}`]
      )
    };
  });

  // tickets:edit action 추가 (티켓 수정 시 widgetAlarm 처리)
  consumeRPCQueue("tickets:edit", async ({ subdomain, data }) => {
    console.log('🔔 tickets:edit called with:', { subdomain, data });
    const models = await generateModels(subdomain);

    const { _id, ...doc } = data;

    if (!_id) {
      return {
        status: "error",
        errorMessage: "Ticket ID is required"
      };
    }

    // 기존 티켓 정보 가져오기
    const oldTicket = await models.Tickets.findOne({ _id });
    
    if (!oldTicket) {
      return {
        status: "error",
        errorMessage: "Ticket not found"
      };
    }

    // description이 수정된 경우 widgetAlarm을 false로 설정
    if (doc.description && doc.description !== oldTicket.description) {
      // widgetAlarm이 true에서 false로 바뀌는지 확인
      const wasWidgetAlarmTrue = (oldTicket as any).widgetAlarm === true;
      
      let updatedTicket;
      
      // widgetAlarm이 true인 경우에만 false로 업데이트
      if (wasWidgetAlarmTrue) {
        updatedTicket = await models.Tickets.updateOne(
          { _id },
          { $set: { ...doc, widgetAlarm: false } }
        );
      } else {
        // widgetAlarm이 이미 false인 경우 description만 업데이트
        updatedTicket = await models.Tickets.updateOne(
          { _id },
          { $set: doc }
        );
      }
      
      return {
        status: "success",
        data: updatedTicket
      };
    }

    // description이 수정되지 않은 경우 일반 업데이트
    const updatedTicket = await models.Tickets.updateOne(
      { _id },
      { $set: doc }
    );

    return {
      status: "success",
      data: updatedTicket
    };
  });

  // tickets:updateName action에도 widgetAlarm 처리 추가
  consumeRPCQueue("tickets:updateName", async ({ subdomain, data }) => {
    console.log('🔔 tickets:updateName called with:', { subdomain, data });
    
    // 기존 updateName 로직 실행
    await updateName(subdomain, data.mainType, data.itemId);
    
    // 티켓인 경우 widgetAlarm을 false로 설정
    if (data.mainType === 'ticket') {
      console.log('🔔 tickets:updateName - Ticket updated, setting widgetAlarm to false');
      
      const models = await generateModels(subdomain);
      await models.Tickets.updateOne(
        { _id: data.itemId },
        { $set: { widgetAlarm: false } }
      );
      
      console.log('🔔 Widget alarm set to false for ticket:', data.itemId, 'due to updateName');
    }
    
    return {
      status: "success",
      data: {}
    };
  });

  consumeRPCQueue("tickets:createChildItem", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    const { type, itemId, ...doc } = data;

    const parent = await getCardItem(models, {
      contentType: type,
      contentTypeId: itemId
    });

    if (!parent) {
      return {
        status: "error",
        errorMessage: "Parent not found"
      };
    }

    const childCard = await createBoardItem(
      models,
      subdomain,
      { parentId: itemId, stageId: parent.stageId, ...doc },
      type
    );

    return {
      status: "success",
      data: childCard
    };
  });

  consumeRPCQueue("tickets:createRelatedItem", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    const { type, sourceType, itemId, name, stageId } = data;

    const relatedCard = await createBoardItem(
      models,
      subdomain,
      { name, stageId },
      type
    );

    await sendCoreMessage({
      subdomain,
      action: "conformities.addConformity",
      data: {
        mainType: sourceType,
        mainTypeId: itemId,
        relType: type,
        relTypeId: relatedCard._id
      }
    });

    return {
      status: "success",
      data: relatedCard
    };
  });

  consumeRPCQueue(
    "tickets:tickets.remove",
    async ({ subdomain, data: { _ids } }) => {
      const models = await generateModels(subdomain);

      return {
        status: "success",
        data: await models.Tickets.removeTickets(_ids)
      };
    }
  );

  consumeRPCQueue("tickets:stages.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Stages.find(data).sort({ order: 1 }).lean()
    };
  });

  consumeRPCQueue("tickets:stages.findOne", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Stages.findOne(data).lean()
    };
  });

  consumeRPCQueue("tickets:pipelines.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Pipelines.find(data).lean()
    };
  });

  consumeRPCQueue("tickets:boards.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Boards.find(data).lean()
    };
  });

  consumeRPCQueue("tickets:boards.findOne", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Boards.findOne(data).lean()
    };
  });

  consumeRPCQueue(
    "tickets:boards.count",
    async ({ subdomain, data: { selector } }) => {
      const models = await generateModels(subdomain);

      return {
        status: "success",
        data: await models.Boards.find(selector).countDocuments()
      };
    }
  );

  consumeQueue(
    "tickets:checklists.removeChecklists",
    async ({ subdomain, data: { type, itemIds } }) => {
      const models = await generateModels(subdomain);

      return {
        status: "success",
        data: await models.Checklists.removeChecklists(type, itemIds)
      };
    }
  );

  consumeRPCQueue(
    "tickets:conversationConvert",
    async ({ subdomain, data }) => {
      const models = await generateModels(subdomain);

      return {
        status: "success",
        data: await conversationConvertToCard(models, subdomain, data)
      };
    }
  );

  consumeRPCQueue("tickets:tickets.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    if (!data.query) {
      return {
        status: "success",
        data: await models.Tickets.find(data).lean()
      };
    }

    const { query, skip, limit, sort = {} } = data;

    return {
      status: "success",
      data: await models.Tickets.find(query)
        .skip(skip || 0)
        .limit(limit || 20)
        .sort(sort)
        .lean()
    };
  });

  consumeRPCQueue("tickets:tickets.count", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Tickets.find(data).countDocuments()
    };
  });

  consumeRPCQueue("tickets:tickets.findOne", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await models.Tickets.findOne(data).lean()
    };
  });



  consumeRPCQueue("tickets:widgets.createTicket", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { doc } = data;
    const customerIds = doc.customerIds || [];

    const customer = await sendCoreMessage({
      subdomain,
      action: "customers.find",
      data: {
        _id: { $in: customerIds },
      },
      isRPC: true,
      defaultValue: null
    });

    // Widget에서 description의 엔터키(\n)를 HTML <p> 태그로 변환
    let description = doc.description;
    if (description && typeof description === 'string') {
      // 이미 HTML 태그가 있는지 확인 (일반 텍스트인 경우만 변환)
      const hasHtmlTags = /<[^>]+>/.test(description);
      if (!hasHtmlTags) {
        // 일반 텍스트인 경우 \n을 <p> 태그로 변환
        description = description
          .split(/\r\n|\r|\n/) // 줄바꿈 문자로 분리
          .filter(line => line.trim() !== '') // 빈 줄 제거
          .map(line => `<p>${line}</p>`) // 각 줄을 <p> 태그로 감싸기
          .join('') || description; // 빈 배열인 경우 원본 반환
      }
    }

    // Widget에서 선택한 ticketType을 requestType 필드에도 저장
    const modifiedDoc = {
      ...doc,
      requestType: doc.type,
      description: description
    };

    return {
      status: "success",
      data: await itemsAdd(
        models,
        subdomain,
        modifiedDoc,
        "ticket",
        models.Tickets.createTicket,
        customer
      )
    };
  });
  consumeRPCQueue("tickets:widgets.fetchTicketProgress", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { number, user } = data;
    if (!number) {
      throw new Error("Ticket number is required");
    }

    const ticket = await models.Tickets.findOne({ number });

    if (!ticket) {
      throw new Error("Ticket not found");
    }
    const result = await checkItemPermByUser(subdomain, models, user, ticket);
    return {
      status: "success",
      data: result
    };
  });


  consumeRPCQueue("tickets:widgets.fetchTicketProgressForget", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { email, phoneNumber } = data;
    const field = email ? 'emails' : phoneNumber ? 'phones' : null;
    const value = email || phoneNumber;

    const customer = field
      ? await sendCoreMessage({
        subdomain,
        action: "customers.findOne",
        data: { [field]: value },
        isRPC: true,
        defaultValue: null
      })
      : null;
    if (!customer) {
      throw new Error("Customer not found");
    }
    const customerIds = [customer._id];
    const mainTypeIds = await sendCoreMessage({
      subdomain,
      action: "conformities.findConformities",
      data: {
        mainType: "ticket",
        relType: "customer",
        relTypeId: customerIds
      },
      isRPC: true,
      defaultValue: []
    });
    const ticketIds = mainTypeIds.map((mainType) => mainType.mainTypeId);

    const tickets = await models.Tickets.find({
      _id: { $in: ticketIds },
      number: { $exists: true, $ne: null }
    });
    const formattedTickets = tickets.map((ticket) => ({
      userId: ticket.userId,
      name: ticket.name,
      stageId: ticket.stageId,
      number: ticket.number,
      type: ticket.type
    }));
    return {
      status: "success",
      data: formattedTickets
    };
  });
  consumeRPCQueue("tickets:widgets.commentAdd", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { type, typeId, content, userType, customerId } = data;
    
    // 댓글 생성
    const comment = await models.Tickets.createTicketComment(type, typeId, content, userType, customerId);
    
    // 티켓 정보 가져오기
    const ticket = await models.Tickets.findOne({ _id: typeId });
    if (ticket) {
      // 고객 정보 가져오기
      let customerName = "고객";
      if (customerId) {
        const customer = await sendCoreMessage({
          subdomain,
          action: "customers.findOne",
          data: { _id: customerId },
          isRPC: true,
          defaultValue: null
        });
        if (customer) {
          customerName = customer.firstName || customer.lastName || customer.primaryEmail || "고객";
        }
      }
      
      // 티켓 담당자들에게 알림 보내기 (고객이 댓글을 남긴 경우에만)
      const assignedUserIds = ticket.assignedUserIds || [];
      
      // userType이 "client"가 아닌 경우 (담당자 등이 댓글을 단 경우)
      // 해당 티켓의 widgetAlarm을 false로, emailSent도 false로 설정하여 Send Email 버튼 활성화
      if (userType !== "client") {
        console.log('🔔 Setting widgetAlarm and emailSent to false for ticket:', typeId, 'userType:', userType);
        
        await models.Tickets.updateOne(
          { _id: typeId },
          { $set: { widgetAlarm: false, emailSent: false } }
        );
        
        console.log('✅ Widget alarm and emailSent set to false - Send Email button enabled');
        
        // 🔥 자동 이메일 발송 비활성화 - 수동 버튼으로만 발송
        // if (wasWidgetAlarmTrue) {
        //   try {
        //     const updatedTicket = await models.Tickets.findOne({ _id: typeId });
        //     if (updatedTicket) {
        //       await sendMessage({
        //         subdomain,
        //         serviceName: "automations",
        //         action: "trigger",
        //         data: {
        //           type: "tickets:ticket",
        //           targets: [updatedTicket]
        //         }
        //       });
        //     }
        //   } catch (error) {
        //     console.error('Failed to send automation trigger for comment:', error);
        //   }
        // }
      }
      
      // userType이 "client"인 경우에만 알림 보내기 (담당자 댓글은 제외)
      if (assignedUserIds.length > 0 && userType === "client") {
        // assignAlarm을 true로 설정 (client가 댓글을 단 경우)
        await models.Tickets.updateOne(
          { _id: typeId },
          { $set: { assignAlarm: true } }
        );
        console.log('🔔 Assign alarm set to true for ticket:', typeId, 'due to client comment');
        
        // 티켓 정보를 가져와서 자동화 트리거에 전달할 수 있도록 업데이트된 티켓 사용
        const updatedTicket = await models.Tickets.findOne({ _id: typeId });
        
        // assignAlarm이 true로 설정되었으므로 자동화 트리거 전송
        if (updatedTicket) {
          const ticketForAutomation: any = updatedTicket.toObject ? updatedTicket.toObject() : { ...updatedTicket };
          ticketForAutomation.assignAlarm = true;  // 자동화 트리거를 위해 true로 명시적 설정
          
          try {
            await sendMessage({
              subdomain,
              serviceName: "automations",
              action: "trigger",
              data: {
                type: "tickets:ticket",
                targets: [ticketForAutomation],  // assignAlarm: true인 데이터 전달
                triggerSource: "assignAlarm"
              }
            });
            console.log('✅ assignAlarm 자동화 트리거 전송 완료 (client comment)');
            
            // 자동화 트리거 전송 후 10초 뒤에 assignAlarm을 false로 리셋
            // 이렇게 해야 고객이 다시 댓글을 달면 자동화가 재등록(재실행)될 수 있음
            setTimeout(async () => {
              try {
                await models.Tickets.updateOne(
                  { _id: typeId },
                  { $set: { assignAlarm: false } }
                );
                console.log('✅ Assign alarm set to false after 10 seconds for ticket:', typeId, '(client comment)');
              } catch (error) {
                console.error(`❌ Failed to reset assignAlarm for ticket ${typeId}:`, error);
              }
            }, 10000); // 10초 대기
          } catch (error) {
            console.error('❌ Failed to send assignAlarm automation trigger (client comment):', error);
            // 에러 발생해도 계속 진행 (assignAlarm은 그대로 유지)
          }
        }
        
        // stage와 pipeline 정보 가져오기
        const stage = await models.Stages.findOne({ _id: ticket.stageId });
        let boardId = "";
        let pipelineId = "";
        
        if (stage) {
          pipelineId = stage.pipelineId;
          const pipeline = await models.Pipelines.findOne({ _id: stage.pipelineId });
          if (pipeline) {
            boardId = pipeline.boardId;
          }
        }
        
        // notifications 서비스에 알림 요청
        await sendMessage({
          subdomain,
          serviceName: "notifications",
          action: "send",
          data: {
            notifType: "ticketComment",
            title: "새로운 댓글이 추가되었습니다",
            content: `${customerName}님이 티켓 '${ticket.name}'에 댓글을 달았습니다: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            action: "새로운 댓글",
            link: `ticket/board?id=${boardId}&pipelineId=${pipelineId}&itemId=${ticket._id}`,
            createdUser: { _id: customerId, details: { fullName: customerName } },
            contentType: "ticket",
            contentTypeId: ticket._id,
            receivers: assignedUserIds
          }
        });
      }
    }
    
    return {
      status: "success",
      data: comment
    };
  });
  consumeRPCQueue("tickets:widgets.comment.remove", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { _id } = data;
    await models.Comments.deleteComment(_id)
    return {
      status: "success",
    };
  });

  consumeRPCQueue("tickets:widgets.comment.edit", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { _id, content } = data;
    
    const comment = await models.Comments.findOne({ _id });
    if (!comment) {
      return {
        status: "error",
        errorMessage: "Comment not found"
      };
    }

    // 댓글 내용 업데이트
    console.log('🔧 Updating comment:', { _id, content, beforeUpdate: comment.toObject() });
    
    await models.Comments.updateComment(_id, { content } as any);
    
    // 업데이트된 댓글 반환
    const updatedComment = await models.Comments.findOne({ _id });
    console.log('🔧 Comment updated:', { _id, afterUpdate: updatedComment?.toObject() });
    
    return {
      status: "success",
      data: updatedComment
    };
  });
  consumeRPCQueue("tickets:widgets.comments.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { typeId } = data;
    const comments = await models.Comments.find({ typeId }).sort({ createdAt: 1 });
    
    // updatedAt 필드가 있는지 확인하고 반환
    const commentsWithUpdatedAt = comments.map(comment => {
      const commentObj = comment.toObject();
      console.log('🔍 Comment data:', {
        _id: commentObj._id,
        content: commentObj.content?.substring(0, 50),
        createdAt: commentObj.createdAt,
        updatedAt: commentObj.updatedAt,
        hasUpdatedAt: !!commentObj.updatedAt
      });
      
      return {
        ...commentObj,
        updatedAt: commentObj.updatedAt || commentObj.createdAt
      };
    });
    
    return {
      status: "success",
      data: commentsWithUpdatedAt
    };
  });
  consumeRPCQueue("tickets:widgets.ticketList.find", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);
    const { customerId } = data;

    if (!customerId) {
      return {
        status: "error",
        errorMessage: "Customer ID is required"
      };
    }

    // Get ticket IDs associated with this customer
    const mainTypeIds = await sendCoreMessage({
      subdomain,
      action: "conformities.findConformities",
      data: {
        mainType: "ticket",
        relType: "customer",
        relTypeId: [customerId]
      },
      isRPC: true,
      defaultValue: []
    });

    const ticketIds = mainTypeIds.map((mainType) => mainType.mainTypeId);

    if (ticketIds.length === 0) {
      return {
        status: "success",
        data: []
      };
    }

    // Find tickets with stage information
    const tickets = await models.Tickets.find({
      _id: { $in: ticketIds }
    }).sort({ createdAt: -1 });

    // Populate stage information
    const ticketsWithStages = await Promise.all(
      tickets.map(async (ticket) => {
        const stage = await models.Stages.findOne({ _id: ticket.stageId });
        return {
          _id: ticket._id,
          name: ticket.name,
          number: ticket.number,
          status: ticket.status,
          stage: stage ? { _id: stage._id, name: stage.name } : null,
          description: ticket.description,
          type: ticket.type,
          requestType: ticket.requestType,
          createdAt: ticket.createdAt,
          priority: ticket.priority,
          hasNotified: (ticket as any).hasNotified !== undefined ? (ticket as any).hasNotified : true,
          attachments: ticket.attachments || []
        };
      })
    );

    return {
      status: "success",
      data: ticketsWithStages
    };
  });
  
  // widgets.ticketList.find action 추가 (sendTicketsMessage용)
  consumeRPCQueue("widgets.ticketList.find", async ({ subdomain, data }) => {
    console.log('🔔 widgets.ticketList.find called with:', { subdomain, data });
    const models = await generateModels(subdomain);
    const { customerId, includeCompanyTickets } = data;

    if (!customerId) {
      return {
        status: "error",
        errorMessage: "Customer ID is required"
      };
    }

    // 티켓 조회 조건 설정
    let ticketQuery: any = {
      customerIds: { $in: [customerId] }
    };

    // 회사 티켓 포함 옵션이 활성화된 경우
    if (includeCompanyTickets) {
      try {
        let companyIds: string[] = [];

        // 먼저 customer.companyIds 확인
        const customer = await sendCoreMessage({
          subdomain,
          action: 'customers.findOne',
          data: { _id: customerId },
          isRPC: true,
          defaultValue: null
        });

        if (customer && customer.companyIds && customer.companyIds.length > 0) {
          companyIds = customer.companyIds;
          console.log('🔔 Using customer.companyIds:', companyIds);
        } else {
          // customer.companyIds가 없으면 conformities 테이블을 통해 조회
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

          if (customerCompanyIds && customerCompanyIds.length > 0) {
            companyIds = customerCompanyIds;
            console.log('🔔 Using conformities.savedConformity:', companyIds);
          }
        }

        if (companyIds.length > 0) {
          // 같은 회사의 모든 티켓 조회
          ticketQuery = {
            $or: [
              { customerIds: { $in: [customerId] } },
              { companyIds: { $in: companyIds } }
            ]
          };
          console.log('🔔 Including company tickets for companyIds:', companyIds);
        }
      } catch (error) {
        console.error(
          `Failed to get companies for customer ${customerId}:`,
          error
        );
      }
    }

    // 고객이 생성한 티켓들을 가져오기
    const tickets = await models.Tickets.find(ticketQuery).sort({ createdAt: -1 });
    
    console.log('🔔 Found tickets:', tickets.length, 'for customerId:', customerId, 'includeCompanyTickets:', includeCompanyTickets);
    console.log('🔔 Raw ticket data:', tickets.map(t => ({ _id: t._id, hasNotified: (t as any).hasNotified, type: typeof (t as any).hasNotified })));

    // Populate stage information
    const ticketsWithStages = await Promise.all(
      tickets.map(async (ticket) => {
        const stage = await models.Stages.findOne({ _id: ticket.stageId });
        
        // hasNotified 필드 확인
        const hasNotified = (ticket as any).hasNotified !== undefined ? (ticket as any).hasNotified : true;
        console.log('🔔 Ticket hasNotified:', ticket._id, 'hasNotified:', hasNotified, 'original:', (ticket as any).hasNotified, 'type:', typeof (ticket as any).hasNotified);
        
        return {
          _id: ticket._id,
          name: ticket.name,
          number: ticket.number,
          status: ticket.status,
          stage: stage ? { _id: stage._id, name: stage.name } : null,
          description: ticket.description,
          type: ticket.type,
          requestType: ticket.requestType,
          createdAt: ticket.createdAt,
          priority: ticket.priority,
          widgetAlarm: (ticket as any).widgetAlarm,
          hasNotified: hasNotified,
          attachments: ticket.attachments || []
        };
      })
    );

    console.log('🔔 widgets.ticketList.find returning data:', ticketsWithStages.length, 'tickets');
    
    return {
      status: "success",
      data: ticketsWithStages
    };
  });
  
  // tickets:widgets.ticketList.find action 추가
  consumeRPCQueue("tickets:widgets.ticketList.find", async ({ subdomain, data }) => {
    console.log('🔔 widgets.ticketList.find called with:', { subdomain, data });
    const models = await generateModels(subdomain);
    const { customerId } = data;

    if (!customerId) {
      return {
        status: "error",
        errorMessage: "Customer ID is required"
      };
    }

    // 고객이 생성한 티켓들을 가져오기
    const tickets = await models.Tickets.find({
      customerIds: { $in: [customerId] }
    }).sort({ createdAt: -1 });
    
    console.log('🔔 Found tickets:', tickets.length, 'for customerId:', customerId);
    console.log('🔔 Raw ticket data:', tickets.map(t => ({ _id: t._id, hasNotified: (t as any).hasNotified, type: typeof (t as any).hasNotified })));

    // Populate stage information
    const ticketsWithStages = await Promise.all(
      tickets.map(async (ticket) => {
        const stage = await models.Stages.findOne({ _id: ticket.stageId });
        
        // hasNotified 필드 확인
        const hasNotified = (ticket as any).hasNotified !== undefined ? (ticket as any).hasNotified : true;
        console.log('🔔 Ticket hasNotified:', ticket._id, 'hasNotified:', hasNotified, 'original:', (ticket as any).hasNotified, 'type:', typeof (ticket as any).hasNotified);
        
        return {
          _id: ticket._id,
          name: ticket.name,
          number: ticket.number,
          status: ticket.status,
          stage: stage ? { _id: stage._id, name: stage.name } : null,
          description: ticket.description,
          type: ticket.type,
          requestType: ticket.requestType,
          createdAt: ticket.createdAt,
          priority: ticket.priority,
          hasNotified: hasNotified,
          attachments: ticket.attachments || []
        };
      })
    );

    console.log('🔔 widgets.ticketList.find returning data:', ticketsWithStages.length, 'tickets');
    
    return {
      status: "success",
      data: ticketsWithStages
    };
  });
  
  consumeRPCQueue("tickets:findItem", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return { data: await getCardItem(models, data), status: "success" };
  });

  consumeRPCQueue(
    "tickets:findTicketProductIds",
    async ({ subdomain, data: { _ids } }) => {
      const models = await generateModels(subdomain);

      const ticketProductIds = await await models.Tickets.find({
        "productsData.productId": { $in: _ids }
      }).distinct("productsData.productId");

      return { data: ticketProductIds, status: "success" };
    }
  );

  consumeRPCQueue(
    "tickets:tickets.updateMany",
    async ({ subdomain, data: { selector, modifier } }) => {
      const models = await generateModels(subdomain);

      return {
        data: await models.Tickets.updateMany(selector, modifier),
        status: "success"
      };
    }
  );

  consumeRPCQueue(
    "tickets:tickets.updateOne",
    async ({ subdomain, data: { selector, modifier } }) => {
      const models = await generateModels(subdomain);

      return {
        data: await models.Tickets.updateOne(selector, modifier),
        status: "success"
      };
    }
  );

  consumeRPCQueue("tickets:notifiedUserIds", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await notifiedUserIds(models, data)
    };
  });

  consumeRPCQueue("tickets:sendNotifications", async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    return {
      status: "success",
      data: await sendNotifications(models, subdomain, data)
    };
  });

  consumeRPCQueue(
    "tickets:getLink",
    async ({ subdomain, data: { _id, type } }) => {
      const models = await generateModels(subdomain);

      const item = await getCardItem(models, {
        contentTypeId: _id,
        contentType: type
      });

      if (!item) {
        return {
          status: "error",
          errorMessage: "Item not found"
        };
      }

      const stage = await models.Stages.getStage(item.stageId);
      const pipeline = await models.Pipelines.getPipeline(stage.pipelineId);
      const board = await models.Boards.getBoard(pipeline.boardId);

      return {
        status: "success",
        data: `/${stage.type}/board?id=${board._id}&pipelineId=${pipeline._id}&itemId=${_id}`
      };
    }
  );

  consumeRPCQueue(
    "tickets:pipelines.findOne",
    async ({ subdomain, data: { _id, stageId } }) => {
      let pipelineId = _id;
      const models = await generateModels(subdomain);
      if (!pipelineId && stageId) {
        const stage = await models.Stages.findOne({ _id: stageId }).lean();
        if (stage) {
          pipelineId = stage.pipelineId;
        }
      }

      if (!pipelineId) {
        return {
          status: "error",
          errorMessage: "Pipeline not found"
        };
      }

      return {
        status: "success",
        data: await models.Pipelines.getPipeline(pipelineId)
      };
    }
  );

  consumeRPCQueue(
    "tickets:pipelineLabels.find",
    async ({ subdomain, data: { query, fields } }) => {
      const models = await generateModels(subdomain);

      return {
        status: "success",
        data: await models.PipelineLabels.find(query, fields)
      };
    }
  );

  consumeQueue(
    "tickets:ticketsPipelinesChanged",
    async ({ subdomain, data: { pipelineId, action, data } }) => {
      graphqlPubsub.publish("ticketsPipelinesChanged", {
        ticketsPipelinesChanged: {
          _id: pipelineId,
          proccessId: Math.random(),
          action,
          data
        }
      });

      return {
        status: "success"
      };
    }
  );

  consumeQueue(
    "tickets:publishHelperItems",
    async ({ subdomain, data: { addedTypeIds, removedTypeIds, doc } }) => {
      const targetTypes = ["ticket"];
      const targetRelTypes = ["company", "customer"];

      if (
        targetTypes.includes(doc.mainType) &&
        targetRelTypes.includes(doc.relType)
      ) {
        await publishHelper(subdomain, doc.mainType, doc.mainTypeId);
      }

      if (
        targetTypes.includes(doc.relType) &&
        targetRelTypes.includes(doc.mainType)
      ) {
        for (const typeId of addedTypeIds.concat(removedTypeIds)) {
          await publishHelper(subdomain, doc.relType, typeId);
        }
      }
      if (targetTypes.includes(doc.mainType)) {
        await updateName(subdomain, doc.mainType, doc.mainTypeId);
      }

      return {
        status: "success"
      };
    }
  );

  consumeRPCQueue(
    "tickets:getModuleRelation",
    async ({ subdomain, data: { module, target, triggerType } }) => {
      let filter;

      if (module.includes("contacts")) {
        const relTypeIds = await sendCommonMessage({
          subdomain,
          serviceName: "core",
          action: "conformities.savedConformity",
          data: {
            mainType: triggerType.split(":")[1],
            mainTypeId: target._id,
            relTypes: [module.split(":")[1]]
          },
          isRPC: true,
          defaultValue: []
        });

        if (relTypeIds.length) {
          filter = { _id: { $in: relTypeIds } };
        }
      }

      return {
        status: "success",
        data: filter
      };
    }
  );
};

export const sendInternalNotesMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "internalnotes",
    ...args
  });
};

export const sendCoreMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "core",
    ...args
  });
};

export const sendEngagesMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "engages",
    ...args
  });
};

export const sendInboxMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "inbox",
    ...args
  });
};

export const sendNotificationsMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "notifications",
    ...args
  });
};

export const sendLoyaltiesMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "loyalties",
    ...args
  });
};

export const sendTasksMessage = async (
  args: MessageArgsOmitService
): Promise<any> => {
  return sendMessage({
    serviceName: "tasks",
    ...args
  });
};

export const sendCommonMessage = async (args: MessageArgs): Promise<any> => {
  return sendMessage({
    ...args
  });
};

export const fetchSegment = (
  subdomain: string,
  segmentId: string,
  options?,
  segmentData?: any
) =>
  sendCoreMessage({
    subdomain,
    action: "fetchSegment",
    data: { segmentId, options, segmentData },
    isRPC: true
  });
