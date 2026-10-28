// automations-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-automations-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/executionActionTime.test.ts"]}'
import * as mongoose from 'mongoose';
import { executionSchema } from '../src/models/definitions/executions';

// 실제 모듈은 불러올 때 redis·메시지 서버에 연결하므로 가짜로 바꾼다
jest.mock('../src/connectionResolver', () => ({ generateModels: jest.fn() }));
jest.mock('@erxes/api-utils/src/logUtils', () => ({}));

import { generateModels } from '../src/connectionResolver';
import logUtils from '../src/logUtils';

const Executions = mongoose.model('ExecutionActionTimeTest', executionSchema);

describe('자동화 실행의 동작(action) 기록 시각', () => {
  // mongoose는 스키마를 만들 때의 Date.now를 들고 있어 jest 가짜 시계가 닿지 않는다 → 실제 시계로 확인
  it('동작을 기록한 순간의 시각이 들어간다(모듈을 불러온·서버가 켜진 시각으로 고정되지 않음)', async () => {
    // 모듈을 불러온 시각과 확실히 구분되게 잠깐 기다린다
    await new Promise((resolve) => setTimeout(resolve, 20));

    const before = Date.now();
    const execution = new Executions({
      actions: [{ actionId: 'a1', actionType: 'sendEmail' }],
    });
    const after = Date.now();

    const recorded = (execution as any).actions[0].createdAt.getTime();
    expect(recorded).toBeGreaterThanOrEqual(before);
    expect(recorded).toBeLessThanOrEqual(after);
  });
});

describe('collectItems — 티켓 상세 활동 기록의 자동 메일 시각', () => {
  function mockExecutions(executions: any[]) {
    (generateModels as jest.Mock).mockResolvedValue({
      Executions: {
        find: () => ({ sort: () => ({ lean: async () => executions }) }),
      },
    });
  }

  const activityLogs = [{ createdBy: 'automation', action: 'sendEmail' }];

  it('제대로 기록된 동작 시각은 그대로 보여 준다', async () => {
    mockExecutions([
      {
        createdAt: new Date('2026-10-28T05:00:00Z'),
        actions: [
          {
            actionType: 'sendEmail',
            createdAt: new Date('2026-10-28T05:00:02Z'),
          },
        ],
      },
    ]);

    const { data } = await logUtils.collectItems({
      subdomain: 'os',
      data: { activityLogs, contentId: 't1' },
    });

    expect(data[0].createdAt.toISOString()).toBe('2026-10-28T05:00:02.000Z');
  });

  it('예전 기록처럼 동작 시각이 실행 시작보다 이르면(서버 켜진 시각) 실행 시작 시각으로 보여 준다', async () => {
    mockExecutions([
      {
        createdAt: new Date('2026-10-28T05:00:00Z'),
        actions: [
          {
            actionType: 'sendEmail',
            createdAt: new Date('2026-10-02T23:50:00Z'),
          },
        ],
      },
    ]);

    const { data } = await logUtils.collectItems({
      subdomain: 'os',
      data: { activityLogs, contentId: 't1' },
    });

    expect(data[0].createdAt.toISOString()).toBe('2026-10-28T05:00:00.000Z');
  });
});
