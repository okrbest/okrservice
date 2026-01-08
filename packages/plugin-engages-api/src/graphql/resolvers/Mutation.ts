import { checkPermission } from "@erxes/api-utils/src/permissions";
import { IContext } from "../../connectionResolver";
import { putCreateLog, putDeleteLog, putUpdateLog } from "../../logUtils";
import { sendToWebhook } from "@erxes/api-utils/src";
import { debugError } from "@erxes/api-utils/src/debuggers";
import { CAMPAIGN_KINDS } from "../../constants";
import { checkCampaignDoc, send } from "../../engageUtils";
import { sendCoreMessage, sendImapMessage } from "../../messageBroker";
import { IEngageMessage } from "../../models/definitions/engages";
import { sendEmail } from "../../sender";
import { awsRequests } from "../../trackers/engageTracker";
import {
  createTransporter,
  getEditorAttributeUtil,
  updateConfigs,
} from "../../utils";

interface IEngageMessageEdit extends IEngageMessage {
  _id: string;
}

const MODULE_ENGAGE = "engage";

interface ITestEmailParams {
  from: string;
  to: string;
  content: string;
  title: string;
}

/**
 * These fields contain too much data & it's inappropriate
 * to save such data in each log row
 */
const emptyCustomers = {
  customerIds: [],
  messengerReceivedCustomerIds: [],
};

const engageMutations = {
  /**
   * Create new message
   */
  async engageMessageAdd(
    _root,
    doc: IEngageMessage,
    { user, docModifier, models, subdomain }: IContext
  ) {
    await checkCampaignDoc(models, subdomain, doc);

    // fromUserId is not required in sms engage, so set it here
    if (!doc.fromUserId) {
      doc.fromUserId = user._id;
    }

    const engageMessage = await models.EngageMessages.createEngageMessage(
      docModifier({ ...doc, createdBy: user._id })
    );

    await sendToWebhook({
      subdomain,
      data: {
        action: "create",
        type: "engages:engageMessages",
        params: engageMessage,
      },
    });

    await send(models, subdomain, engageMessage, doc.forceCreateConversation);

    const logDoc = {
      type: MODULE_ENGAGE,
      newData: {
        ...doc,
        ...emptyCustomers,
      },
      object: {
        ...engageMessage.toObject(),
        ...emptyCustomers,
      },
    };

    await putCreateLog(subdomain, logDoc, user);

    return engageMessage;
  },

  /**
   * Edit message
   */
  async engageMessageEdit(
    _root,
    { _id, ...doc }: IEngageMessageEdit,
    { models, subdomain, user }: IContext
  ) {
    await checkCampaignDoc(models, subdomain, doc);

    const engageMessage = await models.EngageMessages.getEngageMessage(_id);
    const updated = await models.EngageMessages.updateEngageMessage(_id, doc);

    // run manually when it was draft & live afterwards
    if (
      !engageMessage.isLive &&
      doc.isLive &&
      doc.kind === CAMPAIGN_KINDS.MANUAL
    ) {
      await send(models, subdomain, updated);
    }

    const logDoc = {
      type: MODULE_ENGAGE,
      object: { ...engageMessage.toObject(), ...emptyCustomers },
      newData: { ...updated.toObject(), ...emptyCustomers },
      updatedDocument: updated,
    };

    await putUpdateLog(subdomain, logDoc, user);

    return models.EngageMessages.findOne({ _id });
  },

  /**
   * Remove message
   */
  async engageMessageRemove(
    _root,
    { _id }: { _id: string },
    { models, subdomain, user }: IContext
  ) {
    const engageMessage = await models.EngageMessages.getEngageMessage(_id);

    const removed = await models.EngageMessages.removeEngageMessage(_id);

    const logDoc = {
      type: MODULE_ENGAGE,
      object: { ...engageMessage.toObject(), ...emptyCustomers },
    };

    await putDeleteLog(subdomain, logDoc, user);

    return removed;
  },

  /**
   * Engage message set live
   */
  async engageMessageSetLive(
    _root,
    { _id }: { _id: string },
    { models, subdomain, user }: IContext
  ) {
    const campaign = await models.EngageMessages.getEngageMessage(_id);

    if (campaign.isLive) {
      throw new Error("Campaign is already live");
    }

    await checkCampaignDoc(models, subdomain, campaign);

    await sendCoreMessage({
      subdomain,
      action: "registerOnboardHistory",
      data: {
        type: "setCampaignLive",
        user,
      },
    });

    return models.EngageMessages.engageMessageSetLive(_id);
  },

  /**
   * Engage message set pause
   */
  async engageMessageSetPause(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return models.EngageMessages.engageMessageSetPause(_id);
  },

  /**
   * Engage message set live manual
   */
  async engageMessageSetLiveManual(
    _root,
    { _id }: { _id: string },
    { models, subdomain, user }: IContext
  ) {
    const draftCampaign = await models.EngageMessages.getEngageMessage(_id);

    await checkCampaignDoc(models, subdomain, draftCampaign);

    const live = await models.EngageMessages.engageMessageSetLive(_id);

    await send(models, subdomain, live);

    await putUpdateLog(
      subdomain,
      {
        type: MODULE_ENGAGE,
        newData: {
          isLive: true,
          isDraft: false,
        },
        object: {
          _id,
          isLive: draftCampaign.isLive,
          isDraft: draftCampaign.isDraft,
        },
        description: `Broadcast "${draftCampaign.title}" has been set live`,
      },
      user
    );

    return live;
  },

  async engagesUpdateConfigs(_root, { configsMap }, { models }: IContext) {
    await updateConfigs(models, configsMap);

    return { status: "ok" };
  },

  /**
   * Engage message verify email
   */
  async engageMessageVerifyEmail(
    _root,
    { email }: { email: string },
    { models }: IContext
  ) {
    const response = await awsRequests.verifyEmail(models, email);

    return JSON.stringify(response);
  },

  /**
   * Engage message remove verified email
   */
  async engageMessageRemoveVerifiedEmail(
    _root,
    { email }: { email: string },
    { models }: IContext
  ) {
    const response = await awsRequests.removeVerifiedEmail(models, email);

    return JSON.stringify(response);
  },

  async engageMessageSendTestEmail(
    _root,
    args: ITestEmailParams,
    { subdomain, models }: IContext
  ) {
    const { content, from, to, title } = args;
    if (!(content && from && to && title)) {
      throw new Error(
        "Email content, title, from address or to address is missing"
      );
    }

    let replacedContent = content;

    const emails = to.split(",");
    if (emails.length > 1) {
      throw new Error("Test email can only be sent to one recipient");
    }

    const targetUser = await sendCoreMessage({
      data: { email: to },
      action: "users.findOne",
      subdomain,
      isRPC: true,
      defaultValue: null,
    });

    const fromUser = await sendCoreMessage({
      data: { email: from },
      action: "users.findOne",
      subdomain,
      isRPC: true,
      defaultValue: null,
    });

    if (!targetUser && !fromUser) {
      throw new Error("User not found");
    }

    const attributeUtil = await getEditorAttributeUtil(subdomain);

    replacedContent = await attributeUtil.replaceAttributes({
      content,
      user: targetUser,
    });

    try {
      const transporter = await createTransporter(models);
      const response = await transporter.sendMail({
        from,
        to,
        subject: title,
        html: content,
        content: replacedContent,
      });
      return JSON.stringify(response);
    } catch (e) {
      debugError(e.message);

      return e;
    }
  },

  // Helps users fill less form fields to create a campaign
  async engageMessageCopy(
    _root,
    { _id }: { _id },
    { docModifier, models, subdomain, user }: IContext
  ) {
    const sourceCampaign = await models.EngageMessages.getEngageMessage(_id);

    const doc = docModifier({
      ...sourceCampaign.toObject(),
      createdAt: new Date(),
      createdBy: user._id,
      title: `${sourceCampaign.title} - duplicated`,
      isDraft: true,
      isLive: false,
      runCount: 0,
      totalCustomersCount: 0,
      validCustomersCount: 0,
    });

    delete doc._id;

    if (doc.scheduleDate && doc.scheduleDate.dateTime) {
      // schedule date should be manually set
      doc.scheduleDate.dateTime = null;
    }

    const copy = await models.EngageMessages.createEngageMessage(doc);

    await putCreateLog(
      subdomain,
      {
        type: MODULE_ENGAGE,
        newData: {
          ...doc,
          ...emptyCustomers,
        },
        object: {
          ...copy.toObject(),
          ...emptyCustomers,
        },
        description: `Campaign "${sourceCampaign.title}" has been copied`,
      },
      user
    );

    return copy;
  },

  /**
   * Send mail
   */
  async engageSendMail(
    _root,
    args: any,
    { user, models, subdomain }: IContext
  ) {
    const { body, customerId, ...doc } = args;
    const customerQuery = customerId
      ? { _id: customerId }
      : { primaryEmail: doc.to };

    const customer = await sendCoreMessage({
      subdomain,
      action: "customers.findOne",
      data: customerQuery,
      isRPC: true,
    });

    doc.body = body || "";

    try {
      await sendEmail(subdomain, models, {
        fromEmail: doc.from || "",
        email: {
          content: doc.body,
          subject: doc.subject,
          attachments: doc.attachments,
          sender: doc.from || "",
          cc: doc.cc || [],
          bcc: doc.bcc || [],
        },
        customers: [customer],
        customer,
        createdBy: user._id,
        title: doc.subject,
      });

      // 이메일 발송 성공 후 고객 필드 업데이트
      if (customer && customer._id) {
        try {
          // 현재 고객 정보 다시 가져오기 (customFieldsData 포함)
          const updatedCustomer = await sendCoreMessage({
            subdomain,
            action: "customers.findOne",
            data: { _id: customer._id },
            isRPC: true,
          });

          if (updatedCustomer) {
            // 필드 ID 찾기 (메일 발송일, 직전소통일)
            const fieldsGroups = await sendCoreMessage({
              subdomain,
              action: "fieldsGroups.find",
              data: {
                query: { contentType: "core:customer" },
              },
              isRPC: true,
              defaultValue: [],
            });

            let mailSentDateFieldId: string | null = null;
            let lastContactDateFieldId: string | null = null;

            // 모든 필드 그룹에서 필드 찾기
            for (const group of fieldsGroups) {
              const fields = await sendCoreMessage({
                subdomain,
                action: "fields.find",
                data: {
                  query: { groupId: group._id, type: "date" },
                },
                isRPC: true,
                defaultValue: [],
              });

              for (const field of fields) {
                const fieldName = (field.text || field.name || "").toLowerCase();
                
                if (
                  fieldName.includes("메일") &&
                  (fieldName.includes("발송") || fieldName.includes("보낸"))
                ) {
                  mailSentDateFieldId = field._id;
                }
                if (fieldName.includes("직전") && fieldName.includes("소통")) {
                  lastContactDateFieldId = field._id;
                }
              }
            }

            // customFieldsData 업데이트
            const currentDate = new Date().toISOString();
            const currentCustomFieldsData = Array.isArray(
              updatedCustomer.customFieldsData
            )
              ? [...updatedCustomer.customFieldsData]
              : [];

            // 메일 발송일 업데이트
            if (mailSentDateFieldId) {
              const existingIndex = currentCustomFieldsData.findIndex(
                (data: any) => data.field === mailSentDateFieldId
              );

              if (existingIndex >= 0) {
                currentCustomFieldsData[existingIndex].value = currentDate;
              } else {
                currentCustomFieldsData.push({
                  field: mailSentDateFieldId,
                  value: currentDate,
                });
              }
            }

            // 직전소통일 업데이트
            if (lastContactDateFieldId) {
              const existingIndex = currentCustomFieldsData.findIndex(
                (data: any) => data.field === lastContactDateFieldId
              );

              if (existingIndex >= 0) {
                currentCustomFieldsData[existingIndex].value = currentDate;
              } else {
                currentCustomFieldsData.push({
                  field: lastContactDateFieldId,
                  value: currentDate,
                });
              }
            }

            // 고객 정보 업데이트
            if (mailSentDateFieldId || lastContactDateFieldId) {
              await sendCoreMessage({
                subdomain,
                action: "customers.updateCustomer",
                data: {
                  _id: customer._id,
                  doc: {
                    customFieldsData: currentCustomFieldsData,
                  },
                },
                isRPC: true,
              });
            }
          }
        } catch (fieldUpdateError) {
          // 필드 업데이트 실패해도 이메일 발송은 성공한 것으로 처리
          debugError(
            `Failed to update customer date fields: ${fieldUpdateError.message}`
          );
        }
      }
    } catch (e) {
      debugError(e);
      throw e;
    }

    const customerIds = await sendCoreMessage({
      subdomain,
      action: "customers.getCustomerIds",
      data: {
        primaryEmail: { $in: doc.to },
      },
      isRPC: true,
    });

    doc.userId = user._id;

    for (const cusId of customerIds) {
      await sendCoreMessage({
        subdomain,
        action: "emailDeliveries.create",
        data: {
          ...doc,
          customerId: cusId,
          kind: "transaction",
          status: "pending",
        },
        isRPC: true,
      });
    }

    if (doc.integrationId) {
      try {
        const imapSendMail = await sendImapMessage({
          subdomain,
          action: "imapMessage.create",
          data: {
            ...doc,
          },
          isRPC: true,
        });
        return { status: "imap-sent", result: imapSendMail };
      } catch (e) {
        throw e;
      }
    }

    // Return generic success response
    return { status: "sent" };
  },
};

checkPermission(engageMutations, "engageMessageAdd", "engageMessageAdd");
checkPermission(engageMutations, "engageSendMail", "engageMessageAdd");
checkPermission(engageMutations, "engageMessageEdit", "engageMessageEdit");
checkPermission(engageMutations, "engageMessageRemove", "engageMessageRemove");
checkPermission(
  engageMutations,
  "engageMessageSetLive",
  "engageMessageSetLive"
);
checkPermission(
  engageMutations,
  "engageMessageSetPause",
  "engageMessageSetPause"
);
checkPermission(
  engageMutations,
  "engageMessageSetLiveManual",
  "engageMessageSetLiveManual"
);
checkPermission(
  engageMutations,
  "engageMessageVerifyEmail",
  "engageMessageRemove"
);
checkPermission(
  engageMutations,
  "engageMessageRemoveVerifiedEmail",
  "engageMessageRemove"
);

checkPermission(
  engageMutations,
  "engageMessageSendTestEmail",
  "engageMessageRemove"
);

checkPermission(engageMutations, "engageMessageCopy", "engageMessageAdd");

export default engageMutations;
