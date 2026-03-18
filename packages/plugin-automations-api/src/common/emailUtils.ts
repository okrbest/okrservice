import {
  sendCommonMessage,
  sendCoreMessage,
  sendSegmentsMessage
} from '../messageBroker';
import { EMAIL_RECIPIENTS_TYPES } from '../constants';
import { getEnv } from '../utils';
import * as AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';
import { debugError } from '@erxes/api-utils/src/debuggers';
import {
  getServices,
  getService,
  isEnabled
} from '@erxes/api-utils/src/serviceDiscovery';
import { putActivityLog } from '../logUtils';

export const getEmailRecipientTypes = async () => {
  let reciepentTypes = [...EMAIL_RECIPIENTS_TYPES];

  const services = await getServices();

  for (const serviceName of services) {
    const service = await getService(serviceName);
    const meta = service.config?.meta || {};

    if (meta?.automations?.constants?.emailRecipIentTypes) {
      const { emailRecipIentTypes } = meta?.automations?.constants || {};

      reciepentTypes = [
        ...reciepentTypes,
        ...emailRecipIentTypes.map((eTR) => ({ ...eTR, serviceName }))
      ];
    }
  }
  return reciepentTypes;
};

const generateEmails = (entry: string | any[], key?: string): string[] => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (Array.isArray(entry)) {
    if (key) {
      entry = entry.map((item) => item?.[key]);
    }

    return entry
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => emailRegex.test(value));
  }

  if (typeof entry === 'string') {
    return entry
      .split(/[\s,;]+/) // split by space, comma, or semicolon
      .map((value) => value.trim())
      .filter(
        (value) =>
          value &&
          value.toLowerCase() !== 'null' &&
          value.toLowerCase() !== 'undefined' &&
          emailRegex.test(value)
      );
  }

  return [];
};

const getTeamMemberEmails = async ({ subdomain, params }) => {
  const users = await sendCoreMessage({
    subdomain,
    action: 'users.find',
    data: {
      query: {
        ...params
      }
    },
    isRPC: true
  });

  return generateEmails(users, 'email');
};

const getAttributionEmails = async ({
  subdomain,
  serviceName,
  contentType,
  target,
  execution,
  value,
  key
}) => {
  let emails: string[] = [];
  const matches = (value || '').match(/\{\{\s*([^}]+)\s*\}\}/g);
  const attributes = matches.map((match) =>
    match.replace(/\{\{\s*|\s*\}\}/g, '')
  );
  const relatedValueProps = {};

  if (!attributes?.length) {
    console.log('⚠️ [getAttributionEmails] No attributes found in value:', value);
    return [];
  }

  console.log('🔍 [getAttributionEmails] Attributes found:', attributes);
  console.log('🔍 [getAttributionEmails] Target assignedUserIds:', target?.assignedUserIds);

  for (const attribute of attributes) {
    if (attribute === 'triggerExecutors') {
      const excutorEmails = await getSegmentEmails({
        subdomain,
        serviceName,
        contentType,
        execution
      });
      emails = [...emails, ...excutorEmails];
    }

    relatedValueProps[attribute] = {
      key: 'email',
      filter: {
        key: 'registrationToken',
        value: null
      }
    };

    if (['customers', 'companies'].includes(attribute)) {
      relatedValueProps[attribute] = {
        key: 'primaryEmail'
      };
      target[attribute] = null;
    }
  }

  console.log('🔍 [getAttributionEmails] Calling replacePlaceHolders with relatedValueProps:', relatedValueProps);

  const replacedContent = await sendCommonMessage({
    subdomain,
    serviceName,
    action: 'automations.replacePlaceHolders',
    data: {
      target: { ...target, type: contentType },
      config: {
        [key]: value
      },
      relatedValueProps
    },
    isRPC: true,
    defaultValue: {}
  });
  
  console.log('🔍 [getAttributionEmails] Replaced content result:', replacedContent);

  console.log('🔍 [getAttributionEmails] Replaced content:', replacedContent[key]);

  const generatedEmails = generateEmails(replacedContent[key]);

  console.log('🔍 [getAttributionEmails] Generated emails:', generatedEmails);

  return [...emails, ...generatedEmails];
};

const getSegmentEmails = async ({
  subdomain,
  serviceName,
  contentType,
  execution
}) => {
  const { triggerConfig, targetId } = execution;
  const contentTypeIds = await sendSegmentsMessage({
    subdomain,
    action: 'fetchSegment',
    data: {
      segmentId: triggerConfig.contentId,
      options: {
        defaultMustSelector: [
          {
            match: {
              _id: targetId
            }
          }
        ]
      }
    },
    isRPC: true,
    defaultValue: []
  });

  if (contentType === 'user') {
    return getTeamMemberEmails({
      subdomain,
      params: { _id: { $in: contentTypeIds } }
    });
  }

  return await sendCommonMessage({
    subdomain,
    serviceName,
    action: 'automations.getRecipientsEmails',
    data: {
      type: contentType,
      config: {
        [`${contentType}Ids`]: contentTypeIds
      }
    },
    isRPC: true
  });
};

const generateFromEmail = (sender, fromUserEmail) => {
  if (sender && fromUserEmail) {
    return `${sender} <${fromUserEmail}>`;
  }

  if (fromUserEmail) {
    return fromUserEmail;
  }

  return null;
};

const replaceDocuments = async (subdomain, content, target) => {
  if (!isEnabled('documents')) {
    return content;
  }

  // Regular expression to match `documents.<id>` within `{{ }}`
  const documentIds = [
    ...content.matchAll(/\{\{\s*document\.([a-zA-Z0-9_]+)\s*\}\}/g)
  ].map((match) => match[1]);

  if (!!documentIds?.length) {
    for (const documentId of documentIds) {
      const response = await sendCommonMessage({
        serviceName: 'documents',
        subdomain,
        action: 'printDocument',
        data: {
          ...target,
          _id: documentId,
          itemId: target._id
        },
        isRPC: true,
        defaultValue: ''
      });

      content = content.replace(`{{ document.${documentId} }}`, response);
    }
  }

  return content;
};

export const generateDoc = async ({
  subdomain,
  target,
  execution,
  triggerType,
  config
}) => {
  const { templateId, fromUserId, sender } = config;
  const [serviceName, type] = triggerType.split(':');
  const version = getEnv({ name: 'VERSION' });
  const DEFAULT_AWS_EMAIL = getEnv({ name: 'DEFAULT_AWS_EMAIL' });

  const template = await sendCoreMessage({
    subdomain,
    action: 'emailTemplatesFindOne',
    data: {
      _id: templateId
    },
    isRPC: true,
    defaultValue: null
  });

  let fromUserEmail = version === 'saas' ? DEFAULT_AWS_EMAIL : '';

  if (fromUserId) {
    const fromUser = await sendCoreMessage({
      subdomain,
      action: 'users.findOne',
      data: {
        _id: fromUserId
      },
      isRPC: true,
      defaultValue: null
    });

    fromUserEmail = fromUser?.email;
  }

  // assignAlarm이 true이고 modifiedBy가 있을 때만 수정자 이메일 가져오기
  // (description 수정으로 인한 assignAlarm인 경우에만 수정자 제외)
  let modifiedByEmail = '';
  if (target?.assignAlarm === true && target?.modifiedBy) {
    const modifiedUser = await sendCoreMessage({
      subdomain,
      action: 'users.findOne',
      data: {
        _id: target.modifiedBy
      },
      isRPC: true,
      defaultValue: null
    });

    modifiedByEmail = modifiedUser?.email || '';
  }

  let replacedContent = (template?.content || '').replace(
    new RegExp(`{{\\s*${type}\\.\\s*(.*?)\\s*}}`, 'g'),
    '{{ $1 }}'
  );

  replacedContent = await replaceDocuments(subdomain, replacedContent, target);

  const { subject, content } = await sendCommonMessage({
    subdomain,
    serviceName,
    action: 'automations.replacePlaceHolders',
    data: {
      target,
      config: {
        subject: config.subject,
        content: replacedContent
      }
    },
    isRPC: true,
    defaultValue: {}
  });

  const toEmails = await getRecipientEmails({
    subdomain,
    config,
    triggerType,
    target,
    execution
  });

  if (!toEmails?.length) {
    const errorDetails = {
      triggerType,
      configKeys: Object.keys(config),
      targetAssignedUserIds: target?.assignedUserIds,
      targetId: target?._id
    };
    console.error('❌ [generateDoc] No recipient emails found:', errorDetails);
    throw new Error(`"Recieving emails not found. Check if ticket has assigned users or email configuration is correct. Details: ${JSON.stringify(errorDetails)}"`);
  }

  // 발신자는 항상 제외
  // assignAlarm이 true이고 modifiedBy가 있을 때만 수정자도 제외 (description 수정인 경우)
  const excludedEmails = [fromUserEmail];
  if (modifiedByEmail) {
    excludedEmails.push(modifiedByEmail);
  }
  
  const filteredToEmails = toEmails.filter(
    (email) => !excludedEmails.includes(email)
  );

  const emailDoc = {
    title: subject,
    fromEmail: generateFromEmail(sender, fromUserEmail),
    toEmails: filteredToEmails,
    customHtml: content
  };

  return emailDoc;
};

export const getRecipientEmails = async ({
  subdomain,
  config,
  triggerType,
  target,
  execution
}) => {
  let toEmails: string[] = [];
  const reciepentTypes: any = await getEmailRecipientTypes();

  const reciepentTypeKeys = reciepentTypes.map((rT) => rT.name);

  console.log('🔍 [getRecipientEmails] Config keys:', Object.keys(config));
  console.log('🔍 [getRecipientEmails] Trigger type:', triggerType);
  console.log('🔍 [getRecipientEmails] Target assignedUserIds:', target?.assignedUserIds);

  for (const key of Object.keys(config)) {
    if (reciepentTypeKeys.includes(key) && !!config[key]) {
      const [serviceName, contentType] = triggerType
        .replace('.', ':')
        .split(':');

      const { type, ...reciepentType } = reciepentTypes.find(
        (rT) => rT.name === key
      );

      console.log(`🔍 [getRecipientEmails] Processing recipient type: ${type}, key: ${key}, value:`, config[key]);

      if (type === 'teamMember') {
        const emails = await getTeamMemberEmails({
          subdomain,
          params: {
            _id: { $in: config[key] || [] }
          }
        });

        console.log(`🔍 [getRecipientEmails] Team member emails:`, emails);
        toEmails = [...toEmails, ...emails];
        continue;
      }

      if (type === 'attributionMail') {
        const emails = await getAttributionEmails({
          subdomain,
          serviceName,
          contentType,
          target,
          execution,
          value: config[key],
          key: type
        });

        console.log(`🔍 [getRecipientEmails] Attribution emails:`, emails);
        toEmails = [...toEmails, ...emails];
        continue;
      }

      if (type === 'customMail') {
        const emails = config[key] || [];

        console.log(`🔍 [getRecipientEmails] Custom emails:`, emails);
        toEmails = [...toEmails, ...emails];
        continue;
      }

      if (!!reciepentType.serviceName) {
        const emails = await sendCommonMessage({
          subdomain,
          serviceName: reciepentType.serviceName,
          action: 'automations.getRecipientsEmails',
          data: {
            type,
            config
          },
          isRPC: true
        });

        console.log(`🔍 [getRecipientEmails] Service emails:`, emails);
        toEmails = [...toEmails, ...emails];
        continue;
      }
    }
  }

  const uniqueEmails = [...new Set(toEmails)];
  console.log('🔍 [getRecipientEmails] Final unique emails:', uniqueEmails);

  return uniqueEmails;
};

const setActivityLog = async ({
  subdomain,
  triggerType,
  target,
  responses
}) => {
  for (const response of responses || []) {
    if (response?.messageId) {
      await putActivityLog(subdomain, {
        action: 'putActivityLog',
        data: {
          contentType: triggerType,
          contentId: target._id,
          createdBy: 'automation',
          action: 'sendEmail'
        }
      });
    }
  }
};

export const handleEmail = async ({
  subdomain,
  target,
  execution,
  triggerType,
  config
}) => {
  try {
    const params = await generateDoc({
      subdomain,
      triggerType,
      target,
      config,
      execution
    });

    if (!params) {
      return { error: 'Something went wrong fetching data' };
    }

    // target에서 고객 ID 목록 가져오기 (티켓, 딜 등의 경우)
    const customerIds = target?.customerIds || [];
    let targetCompanyIds = target?.companyIds || [];
    let customerMapByEmail: { [email: string]: any } = {};
    
    // target.companyIds가 없으면 triggerType에 따라 직접 조회
    if (!targetCompanyIds || targetCompanyIds.length === 0) {
      const [serviceName, contentType] = triggerType.split(':');
      
      // 티켓의 경우 Conformity를 통해 companyIds 조회
      if (contentType === 'ticket' && target?._id) {
        try {
          targetCompanyIds = await sendCoreMessage({
            subdomain,
            action: 'conformities.savedConformity',
            data: {
              mainType: 'ticket',
              mainTypeId: target._id,
              relTypes: ['company']
            },
            isRPC: true,
            defaultValue: []
          });
        } catch (error) {
          console.error(`📧 [handleEmail] 티켓에서 companyIds 조회 실패:`, error);
        }
      }
    }
    
    // target.companyIds가 있으면 먼저 회사 정보 조회하여 맵에 저장
    let targetCompanyMap: { [companyId: string]: string } = {};
    if (targetCompanyIds && targetCompanyIds.length > 0) {
      try {
        const companies = await sendCoreMessage({
          subdomain,
          action: 'companies.find',
          data: { _id: { $in: targetCompanyIds } },
          isRPC: true,
          defaultValue: []
        });
        
        if (companies && companies.length > 0) {
          companies.forEach(company => {
            const companyName = company.primaryName || company.names?.[0] || null;
            if (companyName) {
              targetCompanyMap[company._id] = companyName;
            }
          });
        }
      } catch (error) {
        console.error(`📧 [handleEmail] Error fetching companies from target.companyIds:`, error);
      }
    }
    
    // 고객 ID가 있으면 미리 고객 정보 조회하여 이메일 주소로 매핑
    if (customerIds && customerIds.length > 0) {
      try {
        const customers = await sendCoreMessage({
          subdomain,
          action: 'customers.find',
          data: {
            query: { _id: { $in: customerIds } }
          },
          isRPC: true,
          defaultValue: []
        });

        if (customers && customers.length > 0) {
          // 각 고객의 이메일 주소로 매핑
          for (const customer of customers) {
            const emails = [
              customer.primaryEmail,
              ...(customer.emails || [])
            ].filter(Boolean);

            // 고객의 회사 정보 조회
            let companyName: string | null = null;
            try {
              // 먼저 target.companyIds에서 회사 정보 확인 (고객이 속한 회사가 target.companyIds에 있는지)
              let companyIds = customer.companyIds || [];
              
              // target.companyIds와 고객의 companyIds 교집합 확인
              if (targetCompanyIds.length > 0 && companyIds.length > 0) {
                const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                if (commonCompanyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                }
              }
              
              // target.companyIds에서 찾지 못한 경우 기존 로직 사용
              if (!companyName) {
                // companyIds가 없으면 Conformity를 통해 조회
                if (!companyIds || companyIds.length === 0) {
                  companyIds = await sendCoreMessage({
                    subdomain,
                    action: 'conformities.savedConformity',
                    data: {
                      mainType: 'customer',
                      mainTypeId: customer._id,
                      relTypes: ['company']
                    },
                    isRPC: true,
                    defaultValue: []
                  });
                }
                
                if (companyIds && companyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                  if (commonCompanyIds.length > 0 && targetCompanyMap[commonCompanyIds[0]]) {
                    companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                  } else {
                    // target.companyIds에 없으면 일반 조회
                    const companiesResult = await sendCoreMessage({
                      subdomain,
                      action: 'companies.find',
                      data: { _id: { $in: companyIds } },
                      isRPC: true,
                      defaultValue: []
                    });
                    const companies = companiesResult?.slice(0, 1) || [];
                    
                    if (companies && companies.length > 0) {
                      companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                    }
                  }
                } else {
                  // 고객의 companyIds가 없고 targetCompanyIds가 있으면 targetCompanyIds 사용
                  if (targetCompanyIds.length > 0) {
                    companyName = targetCompanyMap[targetCompanyIds[0]] || null;
                    
                    // targetCompanyMap에 없으면 직접 조회
                    if (!companyName) {
                      try {
                        const companiesResult = await sendCoreMessage({
                          subdomain,
                          action: 'companies.find',
                          data: { _id: targetCompanyIds[0] },
                          isRPC: true,
                          defaultValue: []
                        });
                        const companies = companiesResult?.slice(0, 1) || [];
                        
                        if (companies && companies.length > 0) {
                          companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                        }
                      } catch (error) {
                        console.error(`📧 [handleEmail] 직접 조회 실패:`, error);
                      }
                    }
                  }
                }
              }
            } catch (companyError) {
              console.error(`📧 [handleEmail] Error fetching company info:`, companyError);
              debugError(`Failed to fetch company info for customer ${customer._id}:`, companyError);
            }

            const customerInfo = {
              customerName: [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ') || customer.primaryEmail || emails[0],
              companyName: companyName
            };
            
            // 각 이메일 주소에 대해 매핑 저장
            emails.forEach(email => {
              if (email && !customerMapByEmail[email]) {
                customerMapByEmail[email] = customerInfo;
              }
            });
          }
        }
      } catch (customerError) {
        debugError(`Failed to fetch customer info from target:`, customerError);
      }
    }

    // toEmails에 있는 모든 이메일 주소에 대해 고객 정보 조회
    // target.customerIds에 없는 경우에도 이메일로 조회
    if (params.toEmails && params.toEmails.length > 0) {
      try {
        // 이미 조회한 이메일은 제외
        const emailsToQuery = params.toEmails.filter(email => !customerMapByEmail[email]);
        
        if (emailsToQuery.length > 0) {
          
          // RPC가 $or를 지원하지 않으므로 각 이메일을 개별 조회
          const allCustomers: any[] = [];
          
          for (const email of emailsToQuery) {
            try {
              // primaryEmail로 조회
              const customerByPrimary = await sendCoreMessage({
                subdomain,
                action: 'customers.findOne',
                data: { primaryEmail: email },
                isRPC: true,
                defaultValue: null
              });
              
              if (customerByPrimary) {
                // 중복 체크
                if (!allCustomers.find(c => c._id === customerByPrimary._id)) {
                  allCustomers.push(customerByPrimary);
                }
                continue;
              }
              
              // emails 배열에서 조회 (findOne은 단일 값만 지원하므로 find 사용)
              const customersByEmails = await sendCoreMessage({
                subdomain,
                action: 'customers.find',
                data: {
                  query: { emails: email }
                },
                isRPC: true,
                defaultValue: []
              });
              
              if (customersByEmails && customersByEmails.length > 0) {
                customersByEmails.forEach(customer => {
                  if (!allCustomers.find(c => c._id === customer._id)) {
                    allCustomers.push(customer);
                  }
                });
              }
            } catch (emailError) {
              // 에러 무시
            }
          }

          const customers = allCustomers;

          if (customers && customers.length > 0) {
            for (const customer of customers) {
              const emails = [
                customer.primaryEmail,
                ...(customer.emails || [])
              ].filter(Boolean);

            // 고객의 회사 정보 조회
            let companyName: string | null = null;
            try {
              // 먼저 target.companyIds에서 회사 정보 확인 (고객이 속한 회사가 target.companyIds에 있는지)
              let companyIds = customer.companyIds || [];
              
              // target.companyIds와 고객의 companyIds 교집합 확인
              if (targetCompanyIds.length > 0 && companyIds.length > 0) {
                const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                if (commonCompanyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                }
              }
              
              // target.companyIds에서 찾지 못한 경우 기존 로직 사용
              if (!companyName) {
                // companyIds가 없으면 Conformity를 통해 조회
                if (!companyIds || companyIds.length === 0) {
                  companyIds = await sendCoreMessage({
                    subdomain,
                    action: 'conformities.savedConformity',
                    data: {
                      mainType: 'customer',
                      mainTypeId: customer._id,
                      relTypes: ['company']
                    },
                    isRPC: true,
                    defaultValue: []
                  });
                }
                
                if (companyIds && companyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                  if (commonCompanyIds.length > 0 && targetCompanyMap[commonCompanyIds[0]]) {
                    companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                  } else {
                    // target.companyIds에 없으면 일반 조회
                    const companiesResult = await sendCoreMessage({
                      subdomain,
                      action: 'companies.find',
                      data: { _id: { $in: companyIds } },
                      isRPC: true,
                      defaultValue: []
                    });
                    const companies = companiesResult?.slice(0, 1) || [];
                    
                    if (companies && companies.length > 0) {
                      companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                    }
                  }
                } else {
                  // 고객의 companyIds가 없고 targetCompanyIds가 있으면 targetCompanyIds 사용
                  if (targetCompanyIds.length > 0) {
                    companyName = targetCompanyMap[targetCompanyIds[0]] || null;
                    
                    // targetCompanyMap에 없으면 직접 조회
                    if (!companyName) {
                      try {
                        const companiesResult = await sendCoreMessage({
                          subdomain,
                          action: 'companies.find',
                          data: { _id: targetCompanyIds[0] },
                          isRPC: true,
                          defaultValue: []
                        });
                        const companies = companiesResult?.slice(0, 1) || [];
                        
                        if (companies && companies.length > 0) {
                          companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                        }
                      } catch (error) {
                        console.error(`📧 [handleEmail] 직접 조회 실패:`, error);
                      }
                    }
                  }
                }
              }
            } catch (companyError) {
              console.error(`📧 [handleEmail] Error fetching company info:`, companyError);
              debugError(`Failed to fetch company info for customer ${customer._id}:`, companyError);
            }

            const customerInfo = {
              customerName: [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ') || customer.primaryEmail || emails[0],
              companyName: companyName
            };

              // 각 이메일 주소에 대해 매핑 저장
              // emailsToQuery에 있는 이메일만 매핑 (이미 조회한 이메일은 제외)
              emails.forEach(email => {
                if (email && !customerMapByEmail[email]) {
                  customerMapByEmail[email] = customerInfo;
                }
              });
            }
          }
        }
      } catch (emailQueryError) {
        debugError(`Failed to fetch customer info by emails:`, emailQueryError);
      }
    }

    let targetForLog = target;
    if (
      triggerType?.includes('ticket') &&
      target?._id &&
      !target?.name
    ) {
      try {
        const ticket = await sendCommonMessage({
          subdomain,
          serviceName: 'tickets',
          action: 'tickets.findOne',
          data: { _id: target._id },
          isRPC: true,
          defaultValue: null
        });
        if (ticket?.name) {
          targetForLog = { ...target, name: ticket.name };
        }
      } catch (e) {
        debugError('triggerSummary ticket lookup:', e);
      }
    }

    const triggerSummary = buildAutomationTriggerSummary(
      triggerType,
      targetForLog
    );

    const responses = await sendEmails({
      subdomain,
      params,
      customerMapByEmail, // 미리 조회한 고객 정보 맵 전달
      targetCompanyMap, // target.companyIds에서 조회한 회사 정보 맵 전달
      targetCompanyIds, // target.companyIds 전달
      triggerType: triggerType || '',
      triggerSummary
    });
    
    await setActivityLog({
      subdomain,
      triggerType,
      target,
      responses
    });

    // 이메일 발송 후 10초 뒤에 assignAlarm을 false로 설정 (티켓의 경우)
    // description 수정으로 인한 assignAlarm인 경우에만 리셋
    if (
      triggerType === 'tickets:ticket' &&
      target?.assignAlarm === true &&
      target?._id
    ) {
      // 비동기로 처리하여 이메일 발송 응답을 기다리지 않음
      (async () => {
        try {
          // 10초 대기
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          await sendCommonMessage({
            subdomain,
            serviceName: 'tickets',
            action: 'tickets.updateOne',
            data: {
              selector: { _id: target._id },
              modifier: { $set: { assignAlarm: false } }
            },
            isRPC: true,
            defaultValue: null
          });
          console.log('✅ Assign alarm set to false after 10 seconds for ticket:', target._id);
        } catch (error) {
          debugError(`Failed to reset assignAlarm for ticket ${target._id}:`, error);
        }
      })();
    }

    return { ...params, responses };
  } catch (err) {
    return { error: err.message };
  }
};

const getConfig = (configs, code, defaultValue?: string) => {
  const version = getEnv({ name: 'VERSION' });

  if (version === 'saas') {
    return getEnv({ name: code, defaultValue });
  }

  return configs[code] || defaultValue || '';
};

const createTransporter = async ({ ses }, configs) => {
  if (ses) {
    const AWS_SES_ACCESS_KEY_ID = getConfig(configs, 'AWS_SES_ACCESS_KEY_ID');

    const AWS_SES_SECRET_ACCESS_KEY = getConfig(
      configs,
      'AWS_SES_SECRET_ACCESS_KEY'
    );
    const AWS_REGION = getConfig(configs, 'AWS_REGION');

    AWS.config.update({
      region: AWS_REGION,
      accessKeyId: AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: AWS_SES_SECRET_ACCESS_KEY
    });

    return nodemailer.createTransport({
      SES: new AWS.SES({ apiVersion: '2010-12-01' })
    });
  }

  const MAIL_SERVICE = configs['MAIL_SERVICE'] || '';
  const MAIL_PORT = configs['MAIL_PORT'] || '';
  const MAIL_USER = configs['MAIL_USER'] || '';
  const MAIL_PASS = configs['MAIL_PASS'] || '';
  const MAIL_HOST = configs['MAIL_HOST'] || '';

  let auth;

  if (MAIL_USER && MAIL_PASS) {
    auth = {
      user: MAIL_USER,
      pass: MAIL_PASS
    };
  }

  return nodemailer.createTransport({
    service: MAIL_SERVICE,
    host: MAIL_HOST,
    port: MAIL_PORT,
    auth
  });
};

/** 자동화 이메일 로그용: 어떤 대상(티켓 제목 등) 때문에 발송됐는지 한 줄 요약 */
const buildAutomationTriggerSummary = (
  triggerType: string | undefined,
  target: any
): string => {
  if (!target && !triggerType) {
    return '';
  }
  const tt = triggerType || '';
  const title =
    target?.name ||
    target?.subject ||
    target?.title ||
    target?.primaryName ||
    (Array.isArray(target?.names) ? target.names[0] : '') ||
    '';

  if (tt.includes('ticket')) {
    return title ? `티켓 · ${title}` : '티켓';
  }
  if (tt.includes('deal') || tt.startsWith('sales:')) {
    return title ? `딜 · ${title}` : '딜';
  }
  if (tt.includes('customer') || tt.includes('contacts:')) {
    const nm = [target?.firstName, target?.lastName].filter(Boolean).join(' ');
    const label = nm || target?.primaryEmail || target?.email;
    return label ? `고객 · ${label}` : '고객';
  }
  if (tt.includes('company') || tt.includes('companies:')) {
    return title ? `회사 · ${title}` : '회사';
  }
  if (tt.includes('lead')) {
    return title ? `리드 · ${title}` : '리드';
  }
  if (title) {
    return `${tt || '자동화'} · ${String(title).slice(0, 120)}`;
  }
  return tt || '자동화 이메일';
};

const sendEmails = async ({
  subdomain,
  params,
  customerMapByEmail = {},
  targetCompanyMap = {},
  targetCompanyIds = [],
  triggerType = '',
  triggerSummary = ''
}: {
  subdomain: string;
  params: any;
  customerMapByEmail?: { [email: string]: any };
  targetCompanyMap?: { [companyId: string]: string };
  targetCompanyIds?: string[];
  triggerType?: string;
  triggerSummary?: string;
}) => {
  const { toEmails = [], fromEmail, title, customHtml, attachments } = params;

  const configs = await sendCoreMessage({
    subdomain,
    action: 'getConfigs',
    data: {},
    isRPC: true,
    defaultValue: {}
  });

  const NODE_ENV = getEnv({ name: 'NODE_ENV' });

  const DEFAULT_EMAIL_SERVICE = getConfig(
    configs,
    'DEFAULT_EMAIL_SERVICE',
    'SES'
  );
  const COMPANY_EMAIL_FROM = getConfig(configs, 'COMPANY_EMAIL_FROM');
  const AWS_SES_CONFIG_SET = getConfig(configs, 'AWS_SES_CONFIG_SET');
  const AWS_SES_ACCESS_KEY_ID = getConfig(configs, 'AWS_SES_ACCESS_KEY_ID');
  const AWS_SES_SECRET_ACCESS_KEY = getConfig(
    configs,
    'AWS_SES_SECRET_ACCESS_KEY'
  );

  if (!fromEmail && !COMPANY_EMAIL_FROM) {
    throw new Error('From Email is required');
  }

  if (NODE_ENV === 'test') {
    throw new Error('Node environment is required');
  }

  let transporter;

  try {
    transporter = await createTransporter(
      { ses: DEFAULT_EMAIL_SERVICE === 'SES' },
      configs
    );
  } catch (e) {
    debugError(e.message);
    throw new Error(e.message);
  }

  const responses: any[] = [];
  for (const toEmail of toEmails) {
    // fromEmail이 있으면 그대로 사용, 없으면 COMPANY_EMAIL_FROM을 "no-reply" 이름과 함께 사용
    let fromAddress = fromEmail;
    if (!fromAddress && COMPANY_EMAIL_FROM) {
      fromAddress = `no-reply <${COMPANY_EMAIL_FROM}>`;
    }
    
    const mailOptions: any = {
      from: fromAddress,
      to: toEmail,
      subject: title,
      html: customHtml,
      attachments
    };
    let headers: { [key: string]: string } = {};

    let pendingDeliveryId: string | null = null;
    if (!!AWS_SES_ACCESS_KEY_ID?.length && !!AWS_SES_SECRET_ACCESS_KEY.length) {
      const emailDelivery = await sendCoreMessage({
        subdomain,
        action: 'emailDeliveries.create',
        data: {
          kind: 'automation',
          to: [toEmail],
          from: fromAddress || fromEmail || '',
          subject: title,
          body: customHtml || '',
          status: 'pending',
          triggerType: triggerType || undefined,
          triggerSummary: triggerSummary || undefined
        },
        isRPC: true
      });

      pendingDeliveryId = emailDelivery?._id || null;

      headers = {
        'X-SES-CONFIGURATION-SET': AWS_SES_CONFIG_SET || 'erxes',
        EmailDeliveryId: pendingDeliveryId || ''
      };
    } else {
      headers['X-SES-CONFIGURATION-SET'] = 'erxes';
    }

    mailOptions.headers = headers;

    if (!mailOptions.from) {
      throw new Error(`"From" email address is missing: ${mailOptions.from}`);
    }

    const logAutomationDelivery = async (status: 'received' | 'failed') => {
      if (pendingDeliveryId) {
        await sendCoreMessage({
          subdomain,
          action: 'emailDeliveries.updateStatus',
          data: { _id: pendingDeliveryId, status },
          isRPC: true
        });
        return;
      }
      await sendCoreMessage({
        subdomain,
        action: 'emailDeliveries.create',
        data: {
          kind: 'automation',
          to: [toEmail],
          from: fromAddress || fromEmail || '',
          subject: title,
          body: customHtml || '',
          status,
          triggerType: triggerType || undefined,
          triggerSummary: triggerSummary || undefined
        },
        isRPC: true
      });
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      try {
        await logAutomationDelivery('received');
      } catch (logErr) {
        debugError('automation email delivery log (received):', logErr);
      }

      // 먼저 미리 조회한 고객 정보 맵에서 확인
      let customerInfo = customerMapByEmail[toEmail] || null;
      
      // 맵에 없으면 이메일 주소로 고객 정보 조회
      if (!customerInfo) {
        try {
          // RPC가 $or를 지원하지 않으므로 각각 개별 조회
          let customer: any = null;
          
          // primaryEmail로 먼저 조회
          customer = await sendCoreMessage({
            subdomain,
            action: 'customers.findOne',
            data: { primaryEmail: toEmail },
            isRPC: true,
            defaultValue: null
          });
          
          // primaryEmail로 찾지 못한 경우 emails 배열에서 조회
          if (!customer) {
            const customersByEmails = await sendCoreMessage({
              subdomain,
              action: 'customers.find',
              data: {
                query: { emails: toEmail },
                limit: 1
              },
              isRPC: true,
              defaultValue: []
            });
            
            if (customersByEmails && customersByEmails.length > 0) {
              customer = customersByEmails[0];
            }
          }

          if (customer) {
            // 고객의 회사 정보 조회
            let companyName: string | null = null;
            try {
              // 먼저 target.companyIds에서 회사 정보 확인 (고객이 속한 회사가 target.companyIds에 있는지)
              let companyIds = customer.companyIds || [];
              
              // target.companyIds와 고객의 companyIds 교집합 확인
              if (targetCompanyIds.length > 0 && companyIds.length > 0) {
                const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                if (commonCompanyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                }
              }
              
              // target.companyIds에서 찾지 못한 경우 기존 로직 사용
              if (!companyName) {
                // companyIds가 없으면 Conformity를 통해 조회
                if (!companyIds || companyIds.length === 0) {
                  companyIds = await sendCoreMessage({
                    subdomain,
                    action: 'conformities.savedConformity',
                    data: {
                      mainType: 'customer',
                      mainTypeId: customer._id,
                      relTypes: ['company']
                    },
                    isRPC: true,
                    defaultValue: []
                  });
                }
                
                if (companyIds && companyIds.length > 0) {
                  // target.companyIds에 있는 회사 정보 우선 사용
                  const commonCompanyIds = companyIds.filter(id => targetCompanyIds.includes(id));
                  if (commonCompanyIds.length > 0 && targetCompanyMap[commonCompanyIds[0]]) {
                    companyName = targetCompanyMap[commonCompanyIds[0]] || null;
                  } else {
                    // target.companyIds에 없으면 일반 조회
                    const companiesResult = await sendCoreMessage({
                      subdomain,
                      action: 'companies.find',
                      data: { _id: { $in: companyIds } },
                      isRPC: true,
                      defaultValue: []
                    });
                    const companies = companiesResult?.slice(0, 1) || [];
                    
                    if (companies && companies.length > 0) {
                      companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                    }
                  }
                } else {
                  // 고객의 companyIds가 없고 targetCompanyIds가 있으면 targetCompanyIds 사용
                  if (targetCompanyIds.length > 0) {
                    companyName = targetCompanyMap[targetCompanyIds[0]] || null;
                    
                    // targetCompanyMap에 없으면 직접 조회
                    if (!companyName) {
                      try {
                        const companiesResult = await sendCoreMessage({
                          subdomain,
                          action: 'companies.find',
                          data: { _id: targetCompanyIds[0] },
                          isRPC: true,
                          defaultValue: []
                        });
                        const companies = companiesResult?.slice(0, 1) || [];
                        
                        if (companies && companies.length > 0) {
                          companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                        }
                      } catch (error) {
                        console.error(`📧 [sendEmails] 직접 조회 실패:`, error);
                      }
                    }
                  }
                }
              }
            } catch (companyError) {
              console.error(`📧 [sendEmails] Error fetching company info:`, companyError);
              debugError(`Failed to fetch company info for customer ${customer._id}:`, companyError);
            }

            customerInfo = {
              customerName: [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ') || toEmail,
              companyName: companyName
            };
          }
        } catch (customerError) {
          // 고객 정보 조회 실패해도 이메일 전송은 계속 진행
          debugError(`Failed to fetch customer info for ${toEmail}:`, customerError);
        }
      }
      
      const responseItem: any = { 
        messageId: info.messageId, 
        toEmail
      };
      
      if (customerInfo) {
        responseItem.customerInfo = customerInfo;
      }
      
      responses.push(responseItem);
    } catch (error) {
      try {
        await logAutomationDelivery('failed');
      } catch (logErr) {
        debugError('automation email log failed:', logErr);
      }
      // 에러가 발생해도 고객 정보는 포함
      const errorResponse: any = { fromEmail, toEmail, error };
      
      // 고객 정보가 있으면 추가
      const customerInfo = customerMapByEmail[toEmail] || null;
      if (customerInfo) {
        errorResponse.customerInfo = customerInfo;
      }
      
      responses.push(errorResponse);
      debugError(error);
    }
  }

  return responses;
};
