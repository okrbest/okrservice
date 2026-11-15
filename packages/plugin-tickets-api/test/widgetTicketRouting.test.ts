// 실행: widgetTicketEdit.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import {
  WIDGET_REQUEST_TYPE,
  isWidgetTypeSwitch,
  resolveWidgetTicketStageId,
} from '../src/widgetTicketRouting';

const modelsWith = (existingStageIds: string[]) =>
  ({
    Stages: {
      exists: jest.fn(async ({ _id }) =>
        existingStageIds.includes(_id) ? { _id } : null,
      ),
    },
  }) as any;

describe('resolveWidgetTicketStageId', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('위젯 유형은 설정된 운영자 보드 단계로 보낸다', async () => {
    const models = modelsWith(['op-stage']);
    await expect(
      resolveWidgetTicketStageId(
        models,
        { type: WIDGET_REQUEST_TYPE, stageId: 'customer-stage' },
        'op-stage',
      ),
    ).resolves.toBe('op-stage');
  });

  it('다른 유형은 원래 단계 그대로 — 단계 조회도 하지 않는다', async () => {
    const models = modelsWith(['op-stage']);
    await expect(
      resolveWidgetTicketStageId(
        models,
        { type: 'inquiry', stageId: 'customer-stage' },
        'op-stage',
      ),
    ).resolves.toBe('customer-stage');
    expect(models.Stages.exists).not.toHaveBeenCalled();
  });

  it('설정이 비어 있으면 원래 단계', async () => {
    const models = modelsWith(['op-stage']);
    for (const configured of [undefined, '', '   ']) {
      await expect(
        resolveWidgetTicketStageId(
          models,
          { type: WIDGET_REQUEST_TYPE, stageId: 'customer-stage' },
          configured,
        ),
      ).resolves.toBe('customer-stage');
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('설정된 단계가 없으면(삭제 등) 원래 단계로 보내고 기록을 남긴다', async () => {
    const models = modelsWith([]);
    await expect(
      resolveWidgetTicketStageId(
        models,
        { type: WIDGET_REQUEST_TYPE, stageId: 'customer-stage' },
        'gone-stage',
      ),
    ).resolves.toBe('customer-stage');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gone-stage'));
  });
});

describe('isWidgetTypeSwitch', () => {
  it('위젯 ↔ 다른 유형 전환이면 true', () => {
    expect(isWidgetTypeSwitch(WIDGET_REQUEST_TYPE, 'inquiry')).toBe(true);
    expect(isWidgetTypeSwitch('inquiry', WIDGET_REQUEST_TYPE)).toBe(true);
  });

  it('고객사 유형끼리, 같은 유형, 바꾸지 않음은 false', () => {
    expect(isWidgetTypeSwitch('inquiry', 'error')).toBe(false);
    expect(isWidgetTypeSwitch(WIDGET_REQUEST_TYPE, WIDGET_REQUEST_TYPE)).toBe(
      false,
    );
    expect(isWidgetTypeSwitch(WIDGET_REQUEST_TYPE, undefined)).toBe(false);
  });

  it('유형이 비어 있던 예전 티켓을 위젯으로 바꾸는 것도 막는다', () => {
    expect(isWidgetTypeSwitch(undefined, WIDGET_REQUEST_TYPE)).toBe(true);
  });
});
