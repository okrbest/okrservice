import { ILogDataParams } from '@erxes/api-utils/src/logUtils';

import {
  putCreateLog as commonPutCreateLog,
  putUpdateLog as commonPutUpdateLog,
  putDeleteLog as commonPutDeleteLog,
} from '@erxes/api-utils/src/logUtils';

import { putActivityLog as commonPutActivityLog } from '@erxes/api-utils/src/logUtils';

import { generateModels } from './connectionResolver';

export const putDeleteLog = async (
  subdomain: string,
  logDoc: ILogDataParams,
  user,
) => {
  await commonPutDeleteLog(
    subdomain,
    { ...logDoc, type: `automations:${logDoc.type}` },
    user,
  );
};

export const putUpdateLog = async (
  subdomain: string,
  logDoc: ILogDataParams,
  user,
) => {
  await commonPutUpdateLog(
    subdomain,
    { ...logDoc, type: `automations:${logDoc.type}` },
    user,
  );
};

export const putCreateLog = async (
  subdomain: string,
  logDoc: ILogDataParams,
  user,
) => {
  await commonPutCreateLog(
    subdomain,
    { ...logDoc, type: `automations:${logDoc.type}` },
    user,
  );
};

export const putActivityLog = async (
  subdomain,
  params: { action: string; data: any },
) => {
  const { data, action } = params;

  const updatedParams = {
    ...params,
    data: { ...data, contentType: `${data.contentType}` },
  };

  return commonPutActivityLog(subdomain, {
    ...updatedParams,
  });
};

const sendSuccess = (data) => ({
  data,
  status: 'success',
});

// 예전 기록은 동작 시각이 서버가 켜진 시각으로 저장돼 있다. 동작은 실행 시작보다 앞설 수 없으므로
// 그런 값은 실행 시작 시각으로 보여 준다.
const getActionLogTime = (actionCreatedAt, executionCreatedAt) => {
  if (!actionCreatedAt) {
    return executionCreatedAt;
  }

  if (
    executionCreatedAt &&
    new Date(actionCreatedAt).getTime() < new Date(executionCreatedAt).getTime()
  ) {
    return executionCreatedAt;
  }

  return actionCreatedAt;
};

const getResultDoc = (action, result, target) => {
  if (action === 'sendEmail') {
    const { responses } = result || {};

    return responses;
  }

  return null;
};

export default {
  collectItems: async ({ subdomain, data }) => {
    const { activityLogs, contentId } = data || {};

    const models = await generateModels(subdomain);

    const items = (activityLogs || []).filter(
      (item) => item.createdBy === 'automation',
    );

    if (!items.length) {
      return sendSuccess([]);
    }

    const itemsActions = [...new Set(items.map((item) => item.action))];

    const excutions = await models.Executions.find({
      targetId: contentId,
      status: 'complete',
      'actions.actionType': { $in: itemsActions },
    })
      .sort({ createdAt: -1 })
      .lean();

    const excutionLogs: any[] = [];

    for (const itemAction of itemsActions) {
      for (const {
        triggerType,
        automationId,
        triggerConfig,
        actions,
        target,
        createdAt,
      } of excutions) {
        for (const action of actions || []) {
          if (action?.actionType === itemAction) {
            let excutionLog = {
              action: itemAction,
              contentType: `automations:${itemAction}`,
              contentDetail: {
                automationId,
                triggerConfig,
                triggerType,
                actionConfig: action.actionConfig,
                result: getResultDoc(itemAction, action.result, target),
              },
              createdAt: getActionLogTime(action.createdAt, createdAt),
            };

            excutionLogs.push(excutionLog);
          }
        }
      }
    }

    return {
      data: excutionLogs,
      status: 'success',
    };
  },
};
