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
    let customerMapByEmail: { [email: string]: any } = {};
    
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

            // 고객의 회사 정보 조회 (Conformity를 통해)
            let companyName = null;
            try {
              // 먼저 customer.companyIds가 있는지 확인
              let companyIds = customer.companyIds || [];
              
              console.log(`📧 [handleEmail] Checking companyIds for customer ${customer._id}:`, {
                hasCompanyIds: !!customer.companyIds,
                companyIds: customer.companyIds
              });
              
              // companyIds가 없으면 Conformity를 통해 조회
              if (!companyIds || companyIds.length === 0) {
                console.log(`📧 [handleEmail] Fetching companyIds from Conformity for customer ${customer._id}`);
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
                console.log(`📧 [handleEmail] Conformity returned companyIds:`, companyIds);
              }
              
              if (companyIds && companyIds.length > 0) {
                console.log(`📧 [handleEmail] Fetching companies for IDs:`, companyIds);
                const companies = await sendCoreMessage({
                  subdomain,
                  action: 'companies.find',
                  data: {
                    query: { _id: { $in: companyIds } },
                    limit: 1
                  },
                  isRPC: true,
                  defaultValue: []
                });
                
                console.log(`📧 [handleEmail] Companies found:`, companies?.map(c => ({
                  _id: c._id,
                  primaryName: c.primaryName,
                  names: c.names
                })));
                
                if (companies && companies.length > 0) {
                  companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                  console.log(`📧 [handleEmail] Selected companyName:`, companyName);
                } else {
                  console.log(`📧 [handleEmail] No companies found for IDs:`, companyIds);
                }
              } else {
                console.log(`📧 [handleEmail] No companyIds found for customer ${customer._id}`);
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
            
            console.log(`📧 [handleEmail] Customer info from target.customerIds:`, {
              customerName: customerInfo.customerName,
              companyName: customerInfo.companyName,
              customerId: customer._id,
              companyIds: customer.companyIds,
              emails: emails
            });

            // 각 이메일 주소에 대해 매핑 저장
            emails.forEach(email => {
              if (email && !customerMapByEmail[email]) {
                customerMapByEmail[email] = customerInfo;
                console.log(`📧 [handleEmail] Added to customerMapByEmail from target for ${email}:`, customerInfo);
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

            // 고객의 회사 정보 조회 (Conformity를 통해)
            let companyName = null;
            try {
              // 먼저 customer.companyIds가 있는지 확인
              let companyIds = customer.companyIds || [];
              
              console.log(`📧 [handleEmail] Checking companyIds for customer ${customer._id}:`, {
                hasCompanyIds: !!customer.companyIds,
                companyIds: customer.companyIds
              });
              
              // companyIds가 없으면 Conformity를 통해 조회
              if (!companyIds || companyIds.length === 0) {
                console.log(`📧 [handleEmail] Fetching companyIds from Conformity for customer ${customer._id}`);
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
                console.log(`📧 [handleEmail] Conformity returned companyIds:`, companyIds);
              }
              
              if (companyIds && companyIds.length > 0) {
                console.log(`📧 [handleEmail] Fetching companies for IDs:`, companyIds);
                const companies = await sendCoreMessage({
                  subdomain,
                  action: 'companies.find',
                  data: {
                    query: { _id: { $in: companyIds } },
                    limit: 1
                  },
                  isRPC: true,
                  defaultValue: []
                });
                
                console.log(`📧 [handleEmail] Companies found:`, companies?.map(c => ({
                  _id: c._id,
                  primaryName: c.primaryName,
                  names: c.names
                })));
                
                if (companies && companies.length > 0) {
                  companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                  console.log(`📧 [handleEmail] Selected companyName:`, companyName);
                } else {
                  console.log(`📧 [handleEmail] No companies found for IDs:`, companyIds);
                }
              } else {
                console.log(`📧 [handleEmail] No companyIds found for customer ${customer._id}`);
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
            
            console.log(`📧 [handleEmail] Customer info from email query:`, {
              customerName: customerInfo.customerName,
              companyName: customerInfo.companyName,
              customerId: customer._id,
              companyIds: customer.companyIds,
              emails: emails
            });

              // 각 이메일 주소에 대해 매핑 저장
              // emailsToQuery에 있는 이메일만 매핑 (이미 조회한 이메일은 제외)
              emails.forEach(email => {
                if (email) {
                  // emailsToQuery에 포함된 이메일이거나, 아직 매핑되지 않은 이메일인 경우 매핑
                  if (emailsToQuery.includes(email) && !customerMapByEmail[email]) {
                    customerMapByEmail[email] = customerInfo;
                    console.log(`📧 [handleEmail] Added to customerMapByEmail for ${email}:`, customerInfo);
                  } else if (!customerMapByEmail[email]) {
                    // emailsToQuery에 없지만 매핑되지 않은 경우에도 매핑 (모든 이메일 주소에 대해)
                    customerMapByEmail[email] = customerInfo;
                    console.log(`📧 [handleEmail] Added to customerMapByEmail (not in query) for ${email}:`, customerInfo);
                  }
                }
              });
            }
          }
        }
      } catch (emailQueryError) {
        debugError(`Failed to fetch customer info by emails:`, emailQueryError);
      }
    }

    console.log(`📧 [handleEmail] Calling sendEmails with customerMapByEmail:`, Object.keys(customerMapByEmail).map(email => ({
      email,
      customerInfo: customerMapByEmail[email]
    })));
    
    const responses = await sendEmails({
      subdomain,
      params,
      customerMapByEmail // 미리 조회한 고객 정보 맵 전달
    });
    
    console.log(`📧 [handleEmail] sendEmails responses:`, responses.map(r => ({
      toEmail: r.toEmail,
      hasCustomerInfo: !!r.customerInfo,
      customerInfo: r.customerInfo
    })));

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

const sendEmails = async ({
  subdomain,
  params,
  customerMapByEmail = {}
}: {
  subdomain: string;
  params: any;
  customerMapByEmail?: { [email: string]: any };
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
    const mailOptions: any = {
      from: fromEmail || COMPANY_EMAIL_FROM,
      to: toEmail,
      subject: title,
      html: customHtml,
      attachments
    };
    let headers: { [key: string]: string } = {};

    if (!!AWS_SES_ACCESS_KEY_ID?.length && !!AWS_SES_SECRET_ACCESS_KEY.length) {
      const emailDelivery = await sendCoreMessage({
        subdomain,
        action: 'emailDeliveries.create',
        data: {
          kind: 'transaction',
          to: toEmail,
          from: fromEmail,
          subject: title,
          body: customHtml,
          status: 'pending'
        },
        isRPC: true
      });

      headers = {
        'X-SES-CONFIGURATION-SET': AWS_SES_CONFIG_SET || 'erxes',
        EmailDeliveryId: emailDelivery && emailDelivery._id
      };
    } else {
      headers['X-SES-CONFIGURATION-SET'] = 'erxes';
    }

    mailOptions.headers = headers;

    if (!mailOptions.from) {
      throw new Error(`"From" email address is missing: ${mailOptions.from}`);
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      
      // 먼저 미리 조회한 고객 정보 맵에서 확인
      let customerInfo = customerMapByEmail[toEmail] || null;
      
      if (customerInfo) {
        console.log(`📧 [sendEmails] Found customerInfo in map for ${toEmail}:`, customerInfo);
      } else {
        console.log(`📧 [sendEmails] No customerInfo in map for ${toEmail}, will query`);
      }
      
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
            // 고객의 회사 정보 조회 (Conformity를 통해)
            let companyName = null;
            try {
              // 먼저 customer.companyIds가 있는지 확인
              let companyIds = customer.companyIds || [];
              
              console.log(`📧 [handleEmail] Checking companyIds for customer ${customer._id}:`, {
                hasCompanyIds: !!customer.companyIds,
                companyIds: customer.companyIds
              });
              
              // companyIds가 없으면 Conformity를 통해 조회
              if (!companyIds || companyIds.length === 0) {
                console.log(`📧 [handleEmail] Fetching companyIds from Conformity for customer ${customer._id}`);
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
                console.log(`📧 [handleEmail] Conformity returned companyIds:`, companyIds);
              }
              
              if (companyIds && companyIds.length > 0) {
                console.log(`📧 [handleEmail] Fetching companies for IDs:`, companyIds);
                const companies = await sendCoreMessage({
                  subdomain,
                  action: 'companies.find',
                  data: {
                    query: { _id: { $in: companyIds } },
                    limit: 1
                  },
                  isRPC: true,
                  defaultValue: []
                });
                
                console.log(`📧 [handleEmail] Companies found:`, companies?.map(c => ({
                  _id: c._id,
                  primaryName: c.primaryName,
                  names: c.names
                })));
                
                if (companies && companies.length > 0) {
                  companyName = companies[0].primaryName || companies[0].names?.[0] || null;
                  console.log(`📧 [handleEmail] Selected companyName:`, companyName);
                } else {
                  console.log(`📧 [handleEmail] No companies found for IDs:`, companyIds);
                }
              } else {
                console.log(`📧 [handleEmail] No companyIds found for customer ${customer._id}`);
              }
            } catch (companyError) {
              console.error(`📧 [handleEmail] Error fetching company info:`, companyError);
              debugError(`Failed to fetch company info for customer ${customer._id}:`, companyError);
            }

            customerInfo = {
              customerName: [customer.firstName, customer.lastName]
                .filter(Boolean)
                .join(' ') || toEmail,
              companyName: companyName
            };
            
            console.log(`📧 [sendEmails] Customer info for ${toEmail}:`, {
              customerName: customerInfo.customerName,
              companyName: customerInfo.companyName,
              customerId: customer._id,
              companyIds: customer.companyIds
            });
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
        console.log(`📧 [sendEmails] Response item with customerInfo for ${toEmail}:`, responseItem);
      } else {
        console.log(`📧 [sendEmails] No customerInfo for ${toEmail}`);
      }
      
      responses.push(responseItem);
    } catch (error) {
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
