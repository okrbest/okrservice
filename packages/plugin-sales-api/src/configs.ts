import * as serverTiming from 'server-timing';
import * as http from 'http';
import * as https from 'https';

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
import {
  handleAdminPageWebhook,
  handleAdminDealSendMail,
  handleAdminDealHistory,
} from './adminPageWebhook';
import { buildCustomFieldsData } from './adminPageUtils';
import {
  buildAdminPageUpsertPayload,
  triggerAdminPageSyncIfConfigured,
  triggerAdminPageDeleteSyncIfConfigured,
} from './adminPageSync';
import { getService } from '@erxes/api-utils/src/serviceDiscovery';

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
    app.use('/deals', (req: any, res: any, next: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-SECRET, erxes-subdomain');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    // 관리 웹 파일 업로드: /upload → core /upload-file 파이프
    app.options('/upload', (_req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-SECRET, erxes-subdomain');
      return res.sendStatus(204);
    });

    app.post('/upload', (req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*');

      getService('core').then((coreInfo) => {
        const coreAddress = (coreInfo.address || 'http://localhost:3300').replace(/\/$/, '');
        const coreUrl = new URL('/upload-file', coreAddress);
        const transport = coreUrl.protocol === 'https:' ? https : http;

        const reqHeaders: Record<string, string> = {
          hostname: req.hostname || '',
          'erxes-subdomain': (req.headers['erxes-subdomain'] as string) || '',
        };
        if (req.headers['content-type']) reqHeaders['content-type'] = req.headers['content-type'] as string;
        if (req.headers['content-length']) reqHeaders['content-length'] = req.headers['content-length'] as string;
        if (req.headers['transfer-encoding']) reqHeaders['transfer-encoding'] = req.headers['transfer-encoding'] as string;

        const proxyReq = transport.request(
          {
            hostname: coreUrl.hostname,
            port: Number(coreUrl.port) || (coreUrl.protocol === 'https:' ? 443 : 80),
            path: coreUrl.pathname,
            method: 'POST',
            headers: reqHeaders,
          },
          (proxyRes) => {
            res.status(proxyRes.statusCode || 500);
            proxyRes.pipe(res);
          },
        );

        proxyReq.on('error', (err: Error) => {
          if (!res.headersSent) res.status(500).send(err.message);
        });

        req.pipe(proxyReq);
      }).catch((err: Error) => {
        if (!res.headersSent) res.status(500).send(err.message);
      });
    });

    const adminPageMethodNotAllowed = (endpoint: string, allowed = ['POST', 'OPTIONS']) => (_req: any, res: any) =>
      res.status(405).json({
        success: false,
        error: 'METHOD_NOT_ALLOWED',
        message: `Use /api/sales${endpoint} with X-ADMIN-SECRET header.`,
        allowedMethods: allowed,
      });

    app.get('/deals/dbupdate', adminPageMethodNotAllowed('/deals/dbupdate'));
    app.get('/deals/send-mail', adminPageMethodNotAllowed('/deals/send-mail'));

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
      '/deals/dbupdate',
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
      '/deals/send-mail',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const { dealId, to, cc, subject, body, attachments } = req.body;

        if (!dealId || !to || !subject || !body) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await handleAdminDealSendMail(models, subdomain, secret, dealId, {
          to,
          cc: cc || '',
          subject,
          body,
          attachments: Array.isArray(attachments) ? attachments : [],
        });
        const statusCode = result.statusCode || 200;
        return res.status(statusCode).json(result);
      })
    );

    // 파이프라인 전체 딜 목록 조회 (DB 새로고침)
    app.get(
      '/deals',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';

        if (!secret) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const pipeline = await models.Pipelines.findOne({
          adminPageSecret: secret,
          adminPageEnabled: true,
        }).lean() as any;

        if (!pipeline) {
          return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        }

        const pipelineId = String(pipeline._id);

        // 파이프라인의 모든 스테이지 ID 조회
        const stages = await models.Stages.find({ pipelineId }).lean() as any[];
        const stageIds = stages.map((s: any) => String(s._id));

        if (!stageIds.length) {
          return res.json({ success: true, deals: [] });
        }

        // 활성 딜 전체 조회
        const deals = await models.Deals.find({
          stageId: { $in: stageIds },
          status: { $ne: 'archived' },
        }).lean() as any[];

        // 각 딜을 web-push upsert 포맷으로 변환 (병렬)
        const payloads = await Promise.all(
          deals.map(deal => buildAdminPageUpsertPayload(subdomain, deal, pipelineId))
        );

        return res.json({ success: true, deals: payloads });
      })
    );

    // 소통 이력 조회
    app.get(
      '/deals/:dealId/history',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const { dealId } = req.params;

        if (!dealId) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await handleAdminDealHistory(models, subdomain, secret, dealId);
        const statusCode = result.statusCode || 200;
        return res.status(statusCode).json(result);
      })
    );

    // 관리 웹에서 딜 신규 생성
    app.post(
      '/deals',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const {
          회사명, 담당자, 연락처, 이메일,
          직원규모, 유입경로,
          제목, 내용, 첨부파일,
          직전소통일, 안내자,
          관심모듈, 진행, 데모생성, 견적, 미팅, 비고,
        } = req.body;

        if (!회사명 || !담당자 || !이메일) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: '회사명, 담당자, 이메일은 필수입니다.' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        // 시크릿으로 파이프라인 찾기
        const pipeline = await models.Pipelines.findOne({
          adminPageSecret: secret,
          adminPageEnabled: true,
        }).lean() as any;

        if (!pipeline) {
          return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        }

        // 파이프라인의 첫 번째 스테이지 찾기
        const firstStage = await models.Stages.findOne({
          pipelineId: pipeline._id,
          status: { $ne: 'archived' },
        }).sort({ order: 1 }).lean() as any;

        if (!firstStage) {
          return res.status(400).json({ success: false, error: 'STAGE_NOT_FOUND', message: '파이프라인에 스테이지가 없습니다.' });
        }

        // 커스텀 필드 ID 조회 후 customFieldsData 구성
        const customFieldsData = await buildCustomFieldsData(
          subdomain,
          String(pipeline._id),
          { 관심모듈, 진행, 데모생성, 견적, 미팅, 비고, 직원규모, 유입경로 }
        );

        // 첨부파일 배열 정규화
        const attachmentsData = (Array.isArray(첨부파일) ? 첨부파일 : [])
          .filter(Boolean)
          .map((url: string) => ({ url, name: url.split('/').pop() || url, type: 'file' }));

        const deal = await models.Deals.createDeal({
          name: 제목 || `${회사명} 문의`,
          description: 내용 || '',
          stageId: String(firstStage._id),
          attachments: attachmentsData,
          customFieldsData,
          extraData: {
            adminPageCustomer: { 회사명, 담당자, 연락처: 연락처 || '', 이메일, 직원규모: 직원규모 || '', 유입경로: 유입경로 || '' },
            adminPageHistory: [],
          },
        } as any);

        // 안내자(담당자) 처리: 이름으로 사용자 매핑
        if (안내자) {
          const users = await models.Deals.db.collection('users').find(
            {},
            { projection: { _id: 1, details: 1, email: 1, username: 1 } }
          ).toArray();
          const names = String(안내자).split(',').map((n: string) => n.trim()).filter(Boolean);
          const matchedIds = users
            .filter((u: any) => {
              const full = u.details?.fullName || u.email || u.username || '';
              return names.some((n: string) => full.includes(n) || n.includes(full));
            })
            .map((u: any) => String(u._id));

          if (matchedIds.length) {
            await models.Deals.updateOne({ _id: deal._id }, { $set: { assignedUserIds: matchedIds } });
          }
        }

        // 800ms 후 web-push 콜백
        triggerAdminPageSyncIfConfigured(models, subdomain, String(deal._id));

        return res.json({ success: true, dealId: String(deal._id) });
      })
    );

    // 관리 웹에서 딜 삭제
    app.delete(
      '/deals/:dealId',
      routeErrorHandling(async (req: any, res) => {
        const secret = (req.headers['x-admin-secret'] as string) || '';
        const { dealId } = req.params;

        if (!dealId) {
          return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
        }

        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const deal = await models.Deals.findOne({ _id: dealId }).lean() as any;
        if (!deal) {
          return res.status(404).json({ success: false, error: 'DEAL_NOT_FOUND' });
        }

        const stage = await models.Stages.findOne({ _id: deal.stageId }).lean() as any;
        const pipelineId: string = stage?.pipelineId || '';

        const pipeline = pipelineId
          ? await models.Pipelines.findOne({ _id: pipelineId }).lean() as any
          : null;

        const adminPageSecret: string = (pipeline?.adminPageSecret || '').trim();
        if (!adminPageSecret || secret !== adminPageSecret) {
          return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        }

        await models.Deals.removeDeals([dealId]);

        // 800ms 후 delete web-push 콜백
        triggerAdminPageDeleteSyncIfConfigured(subdomain, dealId, pipelineId);

        return res.json({ success: true });
      })
    );

  },
  setupMessageConsumers
};
