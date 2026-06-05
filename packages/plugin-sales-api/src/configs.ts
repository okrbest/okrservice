import * as serverTiming from 'server-timing';

import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';

import { setupMessageConsumers } from './messageBroker';
import * as permissions from './permissions';
import { routeErrorHandling } from '@erxes/api-utils/src/requests';
import { buildFile } from './exporterByUrl';
import segments from './segments';
import forms from './forms';
import logs from './logUtils';
import { generateModels } from './connectionResolver';
import imports from './imports';
import internalNotes from './internalNotes';
import automations from './automations';
import search from './search';
import { getSubdomain } from '@erxes/api-utils/src/core';
import webhooks from './webhooks';
import documents from './documents';
import tags from './tags';
import exporter from './exporter';
import cronjobs from './cronjobs/common';
import dashboards from './dashboards';
import payment from './payment';
import reports from './reports/reports';
import app from '@erxes/api-utils/src/app';
import { handleSheetWebhook } from './googleSheetsSync';
import type { SheetWebhookPayload } from './googleSheetsSync';
import { handleAdminPageWebhook, handleAdminDealSendMail } from './adminPageWebhook';

import { NOTIFICATION_MODULES } from './constants';
import templates from './templates';
import loyalties from './loyalties';

export default {
  name: 'sales',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers
    };
  },
  hasSubscriptions: true,
  subscriptionPluginPath: require('path').resolve(
    __dirname,
    'graphql',
    'subscriptionPlugin.js'
  ),

  meta: {
    cronjobs,
    reports,
    forms,
    logs: { providesActivityLog: true, consumers: logs },
    segments,
    automations,
    imports,
    exporter,
    internalNotes,
    search,
    webhooks,
    tags,
    permissions,
    documents,
    dashboards,
    notificationModules: NOTIFICATION_MODULES,
    payment,
    templates,
    loyalties
  },

  apolloServerContext: async (context, req, res) => {
    const subdomain = getSubdomain(req);

    context.models = await generateModels(subdomain);
    context.subdomain = subdomain;
    context.req = req;

    context.serverTiming = {
      startTime: res.startTime,
      endTime: res.endTime,
      setMetric: res.setMetric
    };

    return context;
  },
  middlewares: [(serverTiming as any)()],
  onServerInit: async () => {
    app.get(
      '/file-export',
      routeErrorHandling(async (req: any, res) => {
        const { query } = req;

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await buildFile(models, subdomain, query);

        res.attachment(`${result.name}.xlsx`);

        return res.send(result.response);
      })
    );


    app.post(
      '/sheets-webhook',
      routeErrorHandling(async (req: any, res) => {
        const secret = req.headers['x-sheets-secret'];
        const expectedSecret = process.env.SHEETS_WEBHOOK_SECRET || '';

        if (!expectedSecret || secret !== expectedSecret) {
          return res.status(401).json({ ok: false, reason: 'unauthorized' });
        }

        const { dealId, columnName, newValue, sheetEditedAt } =
          req.body as SheetWebhookPayload;

        if (!dealId || !columnName || newValue === undefined || !sheetEditedAt) {
          return res.status(400).json({ ok: false, reason: 'missing_fields' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await handleSheetWebhook(models, subdomain, {
          dealId,
          columnName,
          newValue: String(newValue),
          sheetEditedAt,
        });

        return res.json(result);
      })
    );

    app.post(
      '/admin-deal-webhook',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const { dealId, changes } = req.body;

        if (!dealId || !changes) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await handleAdminPageWebhook(models, subdomain, secret, dealId, changes);

        if (result.statusCode) {
          return res.status(result.statusCode).json(result);
        }
        return res.json(result);
      })
    );

    app.post(
      '/admin-deal-send-mail',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const { dealId } = req.body;

        if (!dealId) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await handleAdminDealSendMail(models, subdomain, secret, dealId);
        const statusCode = result.statusCode || 200;
        return res.status(statusCode).json(result);
      })
    );
  },
  setupMessageConsumers
};
