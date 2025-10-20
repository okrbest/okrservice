import {
  IActionsMap,
  ITrigger,
  TriggerType
} from './models/definitions/automaions';

import { ACTIONS } from './constants';
import {
  EXECUTION_STATUS,
  IExecAction,
  IExecutionDocument
} from './models/definitions/executions';

import { getActionsMap } from './helpers';
import { sendCommonMessage, sendSegmentsMessage } from './messageBroker';

import { debugError } from '@erxes/api-utils/src/debuggers';
import { IModels } from './connectionResolver';
import { handleEmail } from './common/emailUtils';
import { setActionWait } from './actions/wait';

export const getEnv = ({
  name,
  defaultValue
}: {
  name: string;
  defaultValue?: string;
}): string => {
  const value = process.env[name];

  if (!value && typeof defaultValue !== 'undefined') {
    return defaultValue;
  }

  if (!value) {
    debugError(`Missing environment variable configuration for ${name}`);
  }

  return value || '';
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isInSegment = async (
  subdomain: string,
  segmentId: string,
  targetId: string,
  options?: any
) => {
  console.log('🔍 isInSegment - Checking:', { segmentId, targetId, hasOptions: !!options });
  
  await delay(15000);

  const response = await sendSegmentsMessage({
    subdomain,
    action: 'isInSegment',
    data: { segmentId, idToCheck: targetId, options },
    isRPC: true
  });

  console.log('🔍 isInSegment - Response:', { segmentId, targetId, response });

  return response;
};

export const executeActions = async (
  subdomain: string,
  triggerType: string,
  execution: IExecutionDocument,
  actionsMap: IActionsMap,
  currentActionId?: string
): Promise<string | null | undefined> => {
  if (!currentActionId) {
    execution.status = EXECUTION_STATUS.COMPLETE;
    await execution.save();

    console.log('✅ executeActions - Execution completed:', {
      executionId: execution._id,
      automationId: execution.automationId,
      triggerId: execution.triggerId,
      targetId: execution.targetId
    });

    return 'finished';
  }

  const action = actionsMap[currentActionId];
  if (!action) {
    execution.status = EXECUTION_STATUS.MISSID;
    await execution.save();

    return 'missed action';
  }

  console.log('🎯 executeActions - Executing action:', {
    executionId: execution._id,
    actionId: currentActionId,
    actionType: action.type,
    targetId: execution.targetId
  });

  execution.status = EXECUTION_STATUS.ACTIVE;

  const execAction: IExecAction = {
    actionId: currentActionId,
    actionType: action.type,
    actionConfig: action.config,
    nextActionId: action.nextActionId
  };

  let actionResponse: any = null;

  try {
    if (action.type === ACTIONS.WAIT) {
      execution.waitingActionId = action.id;
      execution.startWaitingDate = new Date();
      execution.status = EXECUTION_STATUS.WAITING;
      execution.actions = [...(execution.actions || []), execAction];
      await execution.save();
      return 'paused';
    }

    if (action.type === ACTIONS.IF) {
      let ifActionId;

      const isIn = await isInSegment(
        subdomain,
        action.config.contentId,
        execution.targetId
      );
      if (isIn) {
        ifActionId = action.config.yes;
      } else {
        ifActionId = action.config.no;
      }

      execAction.nextActionId = ifActionId;
      execAction.result = { condition: isIn };
      execution.actions = [...(execution.actions || []), execAction];
      execution = await execution.save();

      return executeActions(
        subdomain,
        triggerType,
        execution,
        actionsMap,
        ifActionId
      );
    }

    if (action.type === ACTIONS.SET_PROPERTY) {
      const { module } = action.config;
      const [serviceName, collectionType] = module.split(':');

      actionResponse = await sendCommonMessage({
        subdomain,
        serviceName,
        action: 'automations.receiveActions',
        data: {
          triggerType,
          actionType: 'set-property',
          action,
          execution,
          collectionType
        },
        isRPC: true
      });
    }

    if (action.type === ACTIONS.SEND_EMAIL) {
      try {
        actionResponse = await handleEmail({
          subdomain,
          target: execution.target,
          triggerType,
          config: action.config,
          execution
        });
      } catch (err) {
        actionResponse = err.messsage;
      }
    }

    if (action.type.includes('create')) {
      // action.type이 "ticket.create" 또는 "tickets:ticket.create" 형태 모두 처리
      let serviceName: string;
      let collectionType: string;
      
      if (action.type.includes(':')) {
        // "tickets:ticket.create" 형태
        const [service, type] = action.type.split(':');
        serviceName = service;
        collectionType = type.replace('.create', '');
      } else {
        // "ticket.create" 형태
        const typeMapping = {
          'ticket': 'tickets',
          'deal': 'sales',
          'task': 'tasks',
          'purchase': 'purchases',
        };
        
        const baseType = action.type.replace('.create', '');
        serviceName = typeMapping[baseType] || baseType;
        collectionType = baseType;
      }

      console.log('🎯 executeActions - create action:', { actionType: action.type, serviceName, collectionType });

      actionResponse = await sendCommonMessage({
        subdomain,
        serviceName,
        action: 'automations.receiveActions',
        data: {
          actionType: 'create',
          action,
          execution,
          collectionType
        },
        isRPC: true
      });

      if (actionResponse?.objToWait) {
        setActionWait({
          ...actionResponse.objToWait,
          execution,
          action,
          result: actionResponse?.result
        });

        return 'paused';
      }

      if (actionResponse.error) {
        throw new Error(actionResponse.error);
      }
    }
  } catch (e) {
    execAction.result = { error: e.message, result: e.result };
    execution.actions = [...(execution.actions || []), execAction];
    execution.status = EXECUTION_STATUS.ERROR;
    execution.description = `An error occurred while working action: ${action.type}`;
    await execution.save();
    return;
  }

  execAction.result = actionResponse;
  execution.actions = [...(execution.actions || []), execAction];
  execution = await execution.save();

  console.log('✅ executeActions - Action completed, moving to next:', {
    executionId: execution._id,
    completedActionId: currentActionId,
    nextActionId: action.nextActionId
  });

  return executeActions(
    subdomain,
    triggerType,
    execution,
    actionsMap,
    action.nextActionId
  );
};

const isDiffValue = (latest, target, field) => {
  if (field.includes('customFieldsData') || field.includes('trackedData')) {
    const [ct, fieldId] = field.split('.');
    const latestFoundItem = latest[ct].find((i) => i.field === fieldId);
    const targetFoundItem = target[ct].find((i) => i.field === fieldId);

    // previously empty and now receiving new value
    if (!latestFoundItem && targetFoundItem) {
      return true;
    }

    if (latestFoundItem && targetFoundItem) {
      return latestFoundItem.value !== targetFoundItem.value;
    }

    return false;
  }

  const getValue = (obj, attr) => {
    try {
      return obj[attr];
    } catch (e) {
      return undefined;
    }
  };

  const extractFields = field.split('.');

  let latestValue = latest;
  let targetValue = target;

  for (const f of extractFields) {
    latestValue = getValue(latestValue, f);
    targetValue = getValue(targetValue, f);
  }

  if (targetValue !== latestValue) {
    return true;
  }

  return false;
};

export const calculateExecution = async ({
  models,
  subdomain,
  automationId,
  trigger,
  target
}: {
  models: IModels;
  subdomain: string;
  automationId: string;
  trigger: ITrigger;
  target: any;
}): Promise<IExecutionDocument | null | undefined> => {
  const { id, type, config, isCustom } = trigger;
  const { reEnrollment, reEnrollmentRules, contentId } = config || {};

  try {
    if (!!isCustom) {
      const [serviceName, collectionType] = (trigger?.type || '').split(':');

      const isValid = await sendCommonMessage({
        subdomain,
        serviceName,
        action: 'automations.checkCustomTrigger',
        data: { collectionType, automationId, trigger, target, config },
        isRPC: true,
        defaultValue: false
      });
      if (!isValid) {
        return;
      }
    } else {
      console.log('🔍 calculateExecution - Checking segment condition:', {
        triggerId: id,
        contentId,
        targetId: target._id,
        targetStageId: target.stageId,
        targetName: target.name,
        targetData: target  // 트리거 시점의 target 데이터 전체 로깅
      });
      
      // target 객체를 함께 전달하여 트리거 시점의 데이터로 segment 조건 체크
      const isInSegmentResult = await isInSegment(subdomain, contentId, target._id, { targetObject: target });
      
      console.log('🔍 calculateExecution - Segment check result:', {
        triggerId: id,
        isInSegmentResult,
        targetId: target._id
      });
      
      if (!isInSegmentResult) {
        console.log('⚠️ calculateExecution - Target does not match segment condition, skipping');
        return;
      }
      
      console.log('✅ calculateExecution - Target matches segment condition, proceeding');
    }
  } catch (e) {
    await models.Executions.createExecution({
      automationId,
      triggerId: id,
      triggerType: type,
      triggerConfig: config,
      targetId: target._id,
      target,
      status: EXECUTION_STATUS.ERROR,
      description: `An error occurred while checking the is in segment: "${e.message}"`
    });
    return;
  }

  const executions = await models.Executions.find({
    automationId,
    triggerId: id,
    targetId: target._id
  })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();

  const latestExecution: IExecutionDocument | null = executions.length
    ? executions[0]
    : null;

  console.log('🔍 calculateExecution - Latest execution check:', {
    triggerId: id,
    targetId: target._id,
    hasLatestExecution: !!latestExecution,
    latestExecutionStatus: latestExecution?.status,
    latestExecutionId: latestExecution?._id
  });

  if (latestExecution) {
    // 실행 중이거나 대기 중인 execution이 있으면 무한 루프 방지를 위해 새로운 execution 생성 안 함
    if (latestExecution.status === EXECUTION_STATUS.ACTIVE || 
        latestExecution.status === EXECUTION_STATUS.WAITING) {
      console.log('⚠️ calculateExecution - Active or waiting execution exists, preventing infinite loop', {
        executionId: latestExecution._id,
        status: latestExecution.status
      });
      return;
    }

    // 에러 상태의 execution은 재시도 허용
    if (latestExecution.status === EXECUTION_STATUS.ERROR) {
      console.log('🔄 calculateExecution - Previous execution failed, allowing retry', {
        executionId: latestExecution._id,
        status: latestExecution.status
      });
      // 에러 상태는 재등록 검사 없이 바로 새 execution 생성
    } else {
      // 수동 트리거(manualEmailRequest 등)는 재등록 검사 없이 항상 실행
      const isManualTrigger = target.manualEmailRequest === true;
      
      if (isManualTrigger) {
        console.log('🔄 calculateExecution - Manual trigger detected, bypassing re-enrollment check');
      } else {
        // 완료/누락 상태인 경우에만 재등록 검사
        console.log('🔍 calculateExecution - Checking re-enrollment:', {
          reEnrollment,
          hasReEnrollmentRules: !!reEnrollmentRules?.length
        });

        if (!reEnrollment || !reEnrollmentRules.length) {
          console.log('⚠️ calculateExecution - No re-enrollment configured, skipping');
      return;
    }

    let isChanged = false;

    for (const reEnrollmentRule of reEnrollmentRules) {
      const ruleResult = isDiffValue(latestExecution.target, target, reEnrollmentRule);
          console.log('🔍 calculateExecution - Re-enrollment rule check:', {
            rule: reEnrollmentRule,
            ruleResult
          });
      if (ruleResult) {
        isChanged = true;
        break;
      }
    }

    if (!isChanged) {
          console.log('⚠️ calculateExecution - No value changed, skipping re-enrollment');
          return;
        }

        console.log('✅ calculateExecution - Value changed, allowing re-enrollment');
      }
    }
  }

  console.log('✅ calculateExecution - Creating new execution:', {
    automationId,
    triggerId: id,
    targetId: target._id
  });

  const newExecution = await models.Executions.createExecution({
    automationId,
    triggerId: id,
    triggerType: type,
    triggerConfig: config,
    targetId: target._id,
    target,
    status: EXECUTION_STATUS.ACTIVE,
    description: `Met enrollement criteria`
  });

  console.log('✅ calculateExecution - New execution created:', newExecution._id);

  return newExecution;
};

const isWaitingDateConfig = (dateConfig) => {
  if (dateConfig) {
    const NOW = new Date();

    if (dateConfig.type === 'range') {
      const { startDate, endDate } = dateConfig;
      if (startDate < NOW && endDate > NOW) {
        return true;
      }
    }

    if (dateConfig?.type === 'cycle') {
      const { frequencyType } = dateConfig;

      const generateDate = (inputDate, isMonth?) => {
        const date = new Date(inputDate);

        return new Date(
          NOW.getFullYear(),
          isMonth ? NOW.getMonth() : date.getMonth(),
          date.getDay()
        );
      };

      if (frequencyType === 'everyYear') {
        const startDate = generateDate(dateConfig.startDate);
        if (dateConfig?.endDate) {
          const endDate = generateDate(dateConfig.endDate);

          if (NOW < startDate && NOW > endDate) {
            return true;
          }
        }
        if (NOW < startDate) {
          return true;
        }
      }
      if (frequencyType === 'everyMonth') {
        const startDate = generateDate(dateConfig.startDate, true);
        if (dateConfig?.endDate) {
          const endDate = generateDate(dateConfig.endDate, true);

          if (NOW < startDate && NOW > endDate) {
            return true;
          }
        }
        if (NOW < startDate) {
          return true;
        }
      }
    }
  }
  return false;
};

/*
 * target is one of the TriggerType objects
 */
export const receiveTrigger = async ({
  models,
  subdomain,
  type,
  targets
}: {
  models: IModels;
  subdomain: string;
  type: TriggerType;
  targets: any[];
}) => {
  console.log('🎯 receiveTrigger - type:', type, 'targets count:', targets.length);
  
  // DB에 'ticket' 형태로 저장된 경우를 위해 변환
  const shortType = type.includes(':') ? type.split(':')[1] : type;
  
  const automations = await models.Automations.find({
    status: 'active',
    $or: [
      {
        'triggers.type': { $in: [type, shortType] }  // 'tickets:ticket' 또는 'ticket' 둘 다 매칭
      },
      {
        'triggers.type': { $regex: `^${type}\\..*` }
      }
    ]
  }).lean();

  console.log('🎯 receiveTrigger - found automations:', automations.length);

  if (!automations.length) {
    console.log('⚠️ receiveTrigger - No active automations found for type:', type);
    return;
  }

  for (const target of targets) {
    console.log('🎯 receiveTrigger - Processing target:', target._id);
    
    for (const automation of automations) {
      console.log('🎯 receiveTrigger - Processing automation:', automation.name);
      
      for (const trigger of automation.triggers) {
        // trigger.type이 'ticket' 형태로 저장되어 있고, type이 'tickets:ticket'으로 올 수 있으므로
        const triggerMatches = trigger.type.includes(type) || 
                              trigger.type === shortType || 
                              type.includes(trigger.type);
        
        console.log('🎯 receiveTrigger - Checking trigger type:', trigger.type, 'matches', type, '?', triggerMatches);
        
        if (!triggerMatches) {
          console.log('⚠️ receiveTrigger - Trigger type mismatch, skipping');
          continue;
        }

        if (isWaitingDateConfig(trigger?.config?.dateConfig)) {
          console.log('⚠️ receiveTrigger - Waiting date config, skipping');
          continue;
        }

        console.log('🎯 receiveTrigger - Calculating execution for automation:', automation.name);

        const execution = await calculateExecution({
          models,
          subdomain,
          automationId: automation._id,
          trigger,
          target
        });
        
        console.log('🎯 receiveTrigger - Execution result:', execution ? 'Created' : 'Skipped');

        if (execution) {
          const actionsMap = await getActionsMap(automation.actions);
          
          await executeActions(
            subdomain,
            trigger.type,
            execution,
            actionsMap,
            trigger.actionId
          );
        }
      }
    }
  }
};

export const executePrevAction = async (
  models: IModels,
  subdomain: string,
  data: any
) => {
  const { query = {} } = data;

  const lastExecution = await models.Executions.findOne(query).sort({
    createdAt: -1
  });

  if (!lastExecution) {
    throw new Error('No execution found');
  }

  const { actions = [] } = lastExecution;

  const lastExecutionAction = actions?.at(-1);

  if (!lastExecutionAction) {
    throw new Error(`Execution doesn't execute any actions`);
  }

  const automation = await models.Automations.findOne({
    _id: lastExecution.automationId
  });

  if (!automation) {
    throw new Error(`No automation found of execution`);
  }

  const prevAction = automation.actions.find((action) => {
    const { nextActionId, config } = action;
    if (nextActionId === lastExecutionAction.actionId) {
      return true;
    }

    const { optionalConnects = [] } = config || {};

    return optionalConnects.find(
      (c) => c.actionId === lastExecutionAction.actionId
    );
  });

  if (!prevAction) {
    throw new Error('No previous action found for execution');
  }

  await executeActions(
    subdomain,
    lastExecution.triggerType,
    lastExecution,
    await getActionsMap(automation.actions),
    prevAction.id
  );
};
