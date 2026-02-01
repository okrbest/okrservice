import { IUser } from '@erxes/api-utils/src/types';
import { IModels } from '../connectionResolver';
import { sendCommonMessage, sendCoreMessage } from '../messageBroker';
import { getEnv } from '@erxes/api-utils/src';
import * as moment from 'moment';

export const getRelatedValue = async (
  models: IModels,
  subdomain: string,
  target: any = {},
  targetKey = '',
  relatedValueProps: any = {}
) => {
  if (
    [
      'userId',
      'assignedUserId',
      'closedUserId',
      'ownerId',
      'createdBy'
    ].includes(targetKey)
  ) {
    const user = await sendCoreMessage({
      subdomain,
      action: 'users.findOne',
      data: { _id: target[targetKey] },
      isRPC: true
    });

    if (!!relatedValueProps[targetKey]) {
      const key = relatedValueProps[targetKey]?.key;
      return user[key];
    }

    return (
      (user && ((user.detail && user.detail.fullName) || user.email)) || ''
    );
  }

  if (
    ['participatedUserIds', 'assignedUserIds', 'watchedUserIds'].includes(
      targetKey
    )
  ) {
    const users = await sendCoreMessage({
      subdomain,
      action: 'users.find',
      data: {
        query: {
          _id: { $in: target[targetKey] }
        }
      },
      isRPC: true
    });

    if (!!relatedValueProps[targetKey]) {
      const { key, filter } = relatedValueProps[targetKey] || {};
      return users
        .filter((user) => (filter ? user[filter.key] === filter.value : user))
        .map((user) => user[key])
        .join(', ');
    }

    return (
      users.map(
        (user) => (user.detail && user.detail.fullName) || user.email
      ) || []
    ).join(', ');
  }

  if (targetKey === 'tagIds') {
    const tags = await sendCommonMessage({
      subdomain,
      serviceName: 'core',
      action: 'tagFind',
      data: { _id: { $in: target[targetKey] } },
      isRPC: true
    });

    return (tags.map((tag) => tag.name) || []).join(', ');
  }

  if (targetKey === 'labelIds') {
    const labels = await models.PipelineLabels.find({
      _id: { $in: target[targetKey] }
    });

    return (labels.map((label) => label.name) || []).join(', ');
  }

  if (['initialStageId', 'stageId'].includes(targetKey)) {
    const stage = await models.Stages.findOne({
      _id: target[targetKey]
    });

    return (stage && stage.name) || '';
  }

  if (['sourceConversationIds'].includes(targetKey)) {
    const conversations = await sendCommonMessage({
      subdomain,
      serviceName: 'inbox',
      action: 'conversations.find',
      data: { _id: { $in: target[targetKey] } },
      isRPC: true
    });

    return (conversations.map((c) => c.content) || []).join(', ');
  }

  if (['customers', 'companies'].includes(targetKey)) {
    const relTypeConst = {
      companies: 'company',
      customers: 'customer'
    };

    const contactIds = await sendCoreMessage({
      subdomain,
      action: 'conformities.savedConformity',
      data: {
        mainType: 'deal',
        mainTypeId: target._id,
        relTypes: [relTypeConst[targetKey]]
      },
      isRPC: true,
      defaultValue: []
    });

    const upperCasedTargetKey =
      targetKey.charAt(0).toUpperCase() + targetKey.slice(1);

    const activeContacts = await sendCoreMessage({
      subdomain,
      action: `${targetKey}.findActive${upperCasedTargetKey}`,
      data: { selector: { _id: { $in: contactIds } } },
      isRPC: true,
      defaultValue: []
    });

    if (relatedValueProps && !!relatedValueProps[targetKey]) {
      const { key, filter } = relatedValueProps[targetKey] || {};
      return activeContacts
        .filter((contacts) =>
          filter ? contacts[filter.key] === filter.value : contacts
        )
        .map((contacts) => contacts[key])
        .join(', ');
    }

    const result = activeContacts.map((contact) => contact?._id).join(', ');
    return result;
  }

  if (targetKey.includes('productsData')) {
    const [_parentFieldName, childFieldName] = targetKey.split('.');

    if (childFieldName === 'amount') {
      return generateTotalAmount(target.productsData);
    }
  }

  if ((targetKey || '').includes('createdBy.')) {
    return await generateCreatedByFieldValue({ subdomain, target, targetKey });
  }

  if (targetKey.includes('customers.')) {
    return await generateCustomersFielValue({ target, targetKey, subdomain });
  }
  
  if (targetKey.includes('companies.')) {
    return await generateCompaniesFieldValue({ target, targetKey, subdomain });
  }
  
  if (targetKey.includes('customFieldsData.')) {
    return await generateCustomFieldsDataValue({
      target,
      targetKey,
      subdomain
    });
  }

  if (targetKey === 'link') {
    const DOMAIN = getEnv({
      name: 'DOMAIN'
    });

    const stage = await models.Stages.getStage(target.stageId);
    const pipeline = await models.Pipelines.getPipeline(stage.pipelineId);
    const board = await models.Boards.getBoard(pipeline.boardId);
    return `${DOMAIN}/deal/board?id=${board._id}&pipelineId=${pipeline._id}&itemId=${target._id}`;
  }

  if (targetKey === 'pipelineLabels') {
    const labels = await models.PipelineLabels.find({
      _id: { $in: target?.labelIds || [] }
    }).lean();

    return `${labels.map(({ name }) => name).filter(Boolean) || '-'}`;
  }

  if (
    [
      'createdAt',
      'startDate',
      'closeDate',
      'stageChangedDate',
      'modifiedAt'
    ].includes(targetKey)
  ) {
    const dateValue = target[targetKey];
    
    // TIMEZONE 환경 변수 적용 (시간 단위 오프셋, 예: TIMEZONE=9 for KST)
    const timezoneOffset = Number(process.env.TIMEZONE || 0);
    
    return moment(dateValue)
      .add(timezoneOffset, 'hours')
      .format('YYYY-MM-DD HH:mm');
  }

  return false;
};

const generateCustomFieldsDataValue = async ({
  targetKey,
  subdomain,
  target
}: {
  targetKey: string;
  subdomain: string;
  target: any;
}) => {
  const [_, fieldIdentifier] = targetKey.split('customFieldsData.');
  
  // fieldIdentifier가 필드 ID인지 코드인지 확인
  let fieldId = fieldIdentifier;
  let field: any = null;
  
  // 먼저 필드 ID로 직접 찾기 (ObjectId/string 비교를 위해 String으로 통일)
  const customFieldsList = target?.customFieldsData || [];
  let customFieldData = customFieldsList.find(
    (cfd: any) => String(cfd?.field) === String(fieldId)
  );
  
  // 필드 ID로 찾지 못했으면 코드로 찾기 (Deal 필드는 contentType이 'sales:deal')
  if (!customFieldData) {
    field = await sendCoreMessage({
      subdomain,
      action: 'fields.findOne',
      data: {
        query: {
          $or: [
            { contentType: 'sales:deal', code: fieldIdentifier },
            { contentType: 'deal', code: fieldIdentifier }
          ]
        }
      },
      isRPC: true,
      defaultValue: null
    });
    
    if (field && field._id) {
      fieldId = field._id;
      customFieldData = customFieldsList.find(
        (cfd: any) => String(cfd?.field) === String(fieldId)
      );
    }
  }

  if (!customFieldData) {
    return '';
  }

  // 필드 정보가 없으면 조회
  if (!field) {
    field = await sendCoreMessage({
      subdomain,
      action: 'fields.findOne',
      data: {
        query: {
          _id: fieldId
        }
      },
      isRPC: true,
      defaultValue: null
    });
  }

  if (field && field.type === 'users') {
    const users: IUser[] = await sendCoreMessage({
      subdomain,
      action: 'users.find',
      data: {
        query: { _id: { $in: customFieldData?.value || [] } },
        fields: { details: 1 }
      },
      isRPC: true,
      defaultValue: []
    });

    return users
      .map(
        ({ details }) =>
          `${details?.firstName || ''} ${details?.lastName || ''}`
      )
      .filter(Boolean)
      .join(', ');
  }
  
  const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
    customFieldData?.value
  );

  if (
    field &&
    field.type === 'input' &&
    field.validation &&
    ['date', 'datetime'].includes(field.validation) &&
    isISODate
  ) {
    // TIMEZONE 환경 변수 적용 (시간 단위 오프셋, 예: TIMEZONE=9 for KST)
    const timezoneOffset = Number(process.env.TIMEZONE || 0);
    
    return moment(customFieldData.value)
      .add(timezoneOffset, 'hours')
      .format('YYYY-MM-DD HH:mm');
  }

  // 일반 텍스트 필드의 경우 stringValue 반환
  return customFieldData.stringValue || customFieldData.value || '';
};

const generateCustomersFielValue = async ({
  targetKey,
  subdomain,
  target
}: {
  targetKey: string;
  subdomain: string;
  target: any;
}) => {
  const [_, fieldName] = targetKey.split('.');

  const customerIds = await sendCoreMessage({
    subdomain,
    action: 'conformities.savedConformity',
    data: {
      mainType: 'deal',
      mainTypeId: target._id,
      relTypes: ['customer']
    },
    isRPC: true,
    defaultValue: []
  });

  const customers: any[] =
    (await sendCoreMessage({
      subdomain,
      action: 'customers.find',
      data: { _id: { $in: customerIds } },
      isRPC: true,
      defaultValue: []
    })) || [];

  if (fieldName === 'email') {
    return customers
      .map((customer) =>
        customer?.primaryEmail
          ? customer?.primaryEmail
          : (customer?.emails || [])[0]
      )
      .filter(Boolean)
      .join(', ');
  }
  if (fieldName === 'phone') {
    return customers
      .map((customer) =>
        customer?.primaryPhone
          ? customer?.primaryPhone
          : (customer?.phones || [])[0]
      )
      .filter(Boolean)
      .join(', ');
  }
  if (fieldName === 'fullName') {
    return customers
      .map(({ firstName = '', lastName = '' }) => `${firstName} ${lastName}`)
      .filter(Boolean)
      .join(', ');
  }
  
  return '';
};

const generateCompaniesFieldValue = async ({
  targetKey,
  subdomain,
  target
}: {
  targetKey: string;
  subdomain: string;
  target: any;
}) => {
  const [_, fieldName] = targetKey.split('.');

  // 먼저 Deal과 직접 연결된 회사 조회
  let companyIds = await sendCoreMessage({
    subdomain,
    action: 'conformities.savedConformity',
    data: {
      mainType: 'deal',
      mainTypeId: target._id,
      relTypes: ['company']
    },
    isRPC: true,
    defaultValue: []
  });

  // Deal과 연결된 회사가 없으면 Customer를 통해 회사 조회
  if (!companyIds || companyIds.length === 0) {
    const customerIds = await sendCoreMessage({
      subdomain,
      action: 'conformities.savedConformity',
      data: {
        mainType: 'deal',
        mainTypeId: target._id,
        relTypes: ['customer']
      },
      isRPC: true,
      defaultValue: []
    });

    if (customerIds && customerIds.length > 0) {
      const customers = await sendCoreMessage({
        subdomain,
        action: 'customers.find',
        data: { _id: { $in: customerIds } },
        isRPC: true,
        defaultValue: []
      });

      // Customer의 companyIds에서 회사 ID 가져오기
      const customerCompanyIds: string[] = [];
      for (const customer of customers || []) {
        if (customer.companyIds && customer.companyIds.length > 0) {
          customerCompanyIds.push(...customer.companyIds);
        }
      }

      // Customer의 companyIds가 없으면 Conformity를 통해 조회
      if (customerCompanyIds.length === 0) {
        for (const customerId of customerIds) {
          const customerCompanyIdsFromConformity = await sendCoreMessage({
            subdomain,
            action: 'conformities.savedConformity',
            data: {
              mainType: 'customer',
              mainTypeId: customerId,
              relTypes: ['company']
            },
            isRPC: true,
            defaultValue: []
          });
          if (customerCompanyIdsFromConformity && customerCompanyIdsFromConformity.length > 0) {
            customerCompanyIds.push(...customerCompanyIdsFromConformity);
          }
        }
      }

      companyIds = [...new Set(customerCompanyIds)]; // 중복 제거
    }
  }

  if (!companyIds || companyIds.length === 0) {
    return '';
  }

  const companies: any[] =
    (await sendCoreMessage({
      subdomain,
      action: 'companies.find',
      data: { _id: { $in: companyIds } },
      isRPC: true,
      defaultValue: []
    })) || [];

  if (fieldName === 'primaryName' || fieldName === 'name') {
    return companies
      .map((company) => company?.primaryName || company?.names?.[0] || '')
      .filter(Boolean)
      .join(', ');
  }
  
  return '';
};

const generateCreatedByFieldValue = async ({
  targetKey,
  subdomain,
  target
}: {
  targetKey: string;
  subdomain: string;
  target: any;
}) => {
  const [_, userField] = targetKey.split('.');
  const user = await sendCoreMessage({
    subdomain,
    action: 'users.findOne',
    data: { _id: target?.userId },
    isRPC: true
  });
  if (userField === 'branch') {
    const branches = await sendCoreMessage({
      subdomain,
      action: 'branches.find',
      data: { _id: user?.branchIds || [] },
      isRPC: true,
      defaultValue: []
    });

    const branch = (branches || [])[0] || {};

    return `${branch?.title || ''}`;
  }
  if (userField === 'department') {
    const departments = await sendCoreMessage({
      subdomain,
      action: 'departments.find',
      data: { _id: user?.departmentIds || [] },
      isRPC: true,
      defaultValue: []
    });

    const department = (departments || [])[0] || {};

    return `${department?.title || ''}`;
  }

  if (userField === 'phone') {
    const { details } = (user || {}) as IUser;

    return `${details?.operatorPhone || ''}`;
  }
  if (userField === 'email') {
    return `${user?.email || '-'}`;
  }
};

const generateTotalAmount = (productsData) => {
  let totalAmount = 0;

  (productsData || []).forEach((product) => {
    if (product.tickUsed) {
      return;
    }

    totalAmount += product?.amount || 0;
  });

  return totalAmount;
};
