import {
  replacePlaceHolders,
  setProperty
} from '@erxes/api-utils/src/automations';
import { generateModels, IModels } from '../connectionResolver';
import { ITicket } from '../models/definitions/tickets';
import { actionCreate } from './actionCreate';
import { getRelatedValue } from './getRelatedValue';
import { sendCommonMessage } from '../messageBroker';
import { getItems } from './getItems';

export default {
  checkCustomTrigger: async ({ subdomain, data }) => {
    const { collectionType, target, config } = data;
    const models = await generateModels(subdomain);

    if (collectionType === 'ticket.probability') {
      return checkTriggerDealStageProbality({ models, target, config });
    }

    return false;
  },
  receiveActions: async ({
    subdomain,
    data: { action, execution, collectionType, triggerType, actionType }
  }) => {
    const models = await generateModels(subdomain);

    if (actionType === 'create') {
      return actionCreate({
        models,
        subdomain,
        action,
        execution,
        collectionType
      });
    }

    const { module, rules } = action.config;

    const relatedItems = await getItems(
      subdomain,
      module,
      execution,
      triggerType.split('.')[0]
    );

    return setProperty({
      models,
      subdomain,
      getRelatedValue,
      module,
      rules,
      execution,
      relatedItems,
      sendCommonMessage,
      triggerType
    });
  },
  replacePlaceHolders: async ({
    subdomain,
    data: { target, config, relatedValueProps }
  }) => {
    const models = await generateModels(subdomain);

    // target을 plain object로 변환 (Mongoose Document일 경우 대비)
    const plainTarget = target && typeof target.toObject === 'function' 
      ? target.toObject() 
      : target;

    console.log('🔍 [replacePlaceHolders] Original target type:', target?.constructor?.name);
    console.log('🔍 [replacePlaceHolders] Plain target fields:', Object.keys(plainTarget || {}));
    console.log('🔍 [replacePlaceHolders] Target data:', {
      _id: plainTarget?._id,
      name: plainTarget?.name,
      description: plainTarget?.description?.substring(0, 100),
      stageId: plainTarget?.stageId,
      status: plainTarget?.status
    });

    console.log('🔍 [replacePlaceHolders] relatedValueProps:', relatedValueProps);
    
    return await replacePlaceHolders({
      models,
      subdomain,
      getRelatedValue,
      actionData: config,
      target: {
        ...plainTarget,
        ['createdBy.department']: '-',
        ['createdBy.branch']: '-',
        ['createdBy.phone']: '-',
        ['createdBy.fullName']: '-',
        ['createdBy.email']: '-',
        ['customers.email']: '-',
        ['customers.phone']: '-',
        ['customers.fullName']: '-',
        ['branches.title']: '-',
        link: '-',
        pipelineLabels: '-'
      },
      relatedValueProps,
      isRelated: true, // relatedValueProps를 사용하기 위해 명시적으로 true 설정
      complexFields: ['productsData']
    });
  },
  constants: {
    triggers: [
      {
        type: 'ticket',
        img: 'automation3.svg',
        icon: 'file-plus-alt',
        label: 'Ticket',
        description:
          'Start with a blank workflow that enrolls and is triggered off ticket'
      },
      {
        type: 'ticket.probability',
        img: 'automation3.svg',
        icon: 'file-plus-alt',
        label: 'Ticket stage probability based',
        description:
          'Start with a blank workflow that triggered off ticket item stage probability',
        isCustom: true
      }
    ],
    actions: [
      {
        type: 'ticket.create',
        icon: 'file-plus-alt',
        label: 'Create ticket',
        description: 'Create ticket',
        isAvailable: true
      }
    ]
  }
};

const checkTriggerDealStageProbality = async ({
  models,
  target,
  config
}: {
  models: IModels;
  target: ITicket;
  config: any;
}) => {
  const { boardId, pipelineId, stageId, probability } = config || {};

  if (!probability) {
    return false;
  }

  const filter = { _id: target?.stageId, probability };
  if (stageId && stageId !== target.stageId) {
    return false;
  }

  if (!stageId && pipelineId) {
    const stageIds = await models.Stages.find({
      pipelineId,
      probability
    }).distinct('_id');

    if (!stageIds.find((stageId) => target.stageId === stageId)) {
      return false;
    }
  }

  if (!stageId && !pipelineId && boardId) {
    const pipelineIds = await models.Pipelines.find({ boardId }).distinct(
      '_id'
    );

    const stageIds = await models.Stages.find({
      pipelineId: { $in: pipelineIds },
      probability
    }).distinct('_id');

    if (!stageIds.find((stageId) => target.stageId === stageId)) {
      return false;
    }
  }

  return !!(await models.Stages.findOne(filter));
};
