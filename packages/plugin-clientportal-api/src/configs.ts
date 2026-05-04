import { getSubdomain } from '@erxes/api-utils/src/core';
import * as cookieParser from 'cookie-parser';

import afterMutations from './afterMutations';
import { generateModels } from './connectionResolver';
import forms from './forms';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
import { setupMessageConsumers } from './messageBroker';
import cpUserMiddleware from "@erxes/api-utils/src/middlewares/clientportal";
import * as permissions from './permissions';
import automations from "./automations";
export default {
  name: 'clientportal',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers,
    };
  },
  hasSubscriptions: true,
  subscriptionPluginPath: require('path').resolve(
    __dirname,
    'graphql',
    'subscriptionPlugin.js'
  ),

  meta: {
    forms,
    permissions,
    afterMutations,
    automations
  },

  apolloServerContext: async (context, req, res) => {
    const subdomain = getSubdomain(req);

    const requestInfo = {
      secure: req.secure,
      cookies: req.cookies,
      headers: req.headers,
    };

    const models = await generateModels(subdomain);

    context.subdomain = subdomain;
    context.models = models;
    context.requestInfo = requestInfo;
    context.res = res;
    context.isPassed2FA = req?.isPassed2FA;
    if (req.cpUser) {
      context.cpUser = req.cpUser;
    }

    return context;
  },
  middlewares: [cookieParser(), cpUserMiddleware],
  onServerInit: async () => {
    // 출근 10분 전 FCM 푸시는 사용하지 않음 (스케줄러 비활성화).
    // 재사용 시: ./jobs/attendanceScheduler 의 startAttendanceScheduler 를 여기서 호출.
  },
  setupMessageConsumers,
};
