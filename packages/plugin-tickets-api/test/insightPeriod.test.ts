// tickets-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":false,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/insightPeriod.test.ts"]}'

// 실제 모듈은 불러올 때 메시지 서버·서비스 목록에 연결하므로 가짜로 바꾼다
jest.mock('../src/messageBroker', () => ({
  sendCoreMessage: jest.fn(),
  sendInboxMessage: jest.fn(),
}));
jest.mock('@erxes/api-utils/src/serviceDiscovery', () => ({
  getService: jest.fn(),
  getServices: jest.fn(),
  isEnabled: jest.fn(),
}));

import * as dayjs from 'dayjs';
import { ticketCharts } from '../src/reports/template/ticket';
import {
  getMonthRangeOf,
  getPeriodReferenceDate,
  getYearRangeOf,
} from '../src/reports/periodScope';

// 2026-11-04 12:00(서버 현지 시각)
const NOW = new Date(2026, 10, 4, 12, 0, 0);

const monthRange = (year: number, month: number) => ({
  $gte: new Date(year, month, 1),
  $lte: new Date(year, month + 1, 0, 23, 59, 59, 999),
});

const yearRange = (year: number) => ({
  $gte: new Date(year, 0, 1),
  $lte: new Date(year, 11, 31, 23, 59, 59, 999),
});

// 차트를 돌리고 DB에 보낸 조회 단계와 결과를 잡아 둔다(rows는 DB가 돌려줄 값)
async function runChartFull(
  templateType: string,
  filter: any,
  rows: any[] = [],
) {
  const template: any = ticketCharts.find(
    (chart: any) => chart.templateType === templateType,
  );
  let pipeline: any[] = [];
  const models: any = {
    Tickets: {
      aggregate: jest.fn(async (p) => {
        pipeline = p;
        return rows;
      }),
    },
  };

  const result = await template.getChartResult(models, filter, 'bar', 'os');

  return { pipeline, result };
}

// 차트가 DB에 보낸 조회 조건(첫 $match)
async function runChart(templateType: string, filter: any) {
  const { pipeline } = await runChartFull(templateType, filter);

  return pipeline[0].$match;
}

describe('상단 조회기간에서 기준일 고르기', () => {
  it('기간의 마지막 날을 기준일로 삼는다', () => {
    const end = new Date(2026, 9, 31, 23, 59, 59, 999);
    expect(getPeriodReferenceDate({ $lte: end }, NOW)).toEqual(end);
  });

  it('마지막 날이 오늘보다 뒤면(올해·이번 주처럼) 오늘을 기준일로 삼는다', () => {
    const end = new Date(2026, 11, 31, 23, 59, 59, 999);
    expect(getPeriodReferenceDate({ $lte: end }, NOW)).toEqual(NOW);
  });

  it('기간이 없으면(전체) 오늘을 기준일로 삼는다', () => {
    expect(getPeriodReferenceDate({}, NOW)).toEqual(NOW);
  });

  it('날짜가 잘못 들어오면(주소를 직접 고친 경우 등) 오늘을 기준일로 삼는다', () => {
    expect(getPeriodReferenceDate({ $lte: new Date('abc') }, NOW)).toEqual(NOW);
  });

  it('기준일이 속한 달의 처음과 끝', () => {
    expect(getMonthRangeOf(new Date(2026, 1, 14))).toEqual(monthRange(2026, 1));
  });

  it('기준일이 속한 해의 처음과 끝', () => {
    expect(getYearRangeOf(new Date(2025, 6, 1))).toEqual(yearRange(2025));
  });
});

describe('담당자별 티켓 수(월) — 상단 조회기간의 달로 센다', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('지난 달을 고르면 지난 달(10월)만 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'lastMonth',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...monthRange(2026, 9) });
  });

  it('직접 지정한 기간이면 그 기간의 달로 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'customDate',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...monthRange(2026, 2) });
  });

  it('올해를 고르면 아직 오지 않은 12월이 아니라 이번 달(11월)로 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'thisYear',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...monthRange(2026, 10) });
  });

  it('전체를 고르면 이번 달로 센다(예전과 같음)', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'all',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...monthRange(2026, 10) });
  });

  it('완료일 기준으로 골라도 그 날짜로 같은 달을 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'lastMonth',
      dateRangeType: 'closeDate',
    });
    expect(match.closeDate).toEqual({ $ne: null, ...monthRange(2026, 9) });
    expect(match.createdAt).toBeUndefined();
  });

  it('시작일 기준으로 골라도 상단 기간 그대로가 아니라 그 달로 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepMonthly', {
      dateRange: 'customDate',
      startDate: '2026-03-10',
      endDate: '2026-03-20',
      dateRangeType: 'startDate',
    });
    expect(match.startDate).toEqual({ $ne: null, ...monthRange(2026, 2) });
  });

  it('한 사람이 두 묶음으로 나와도(달 경계 시각 차이) 더해서 보여 준다', async () => {
    const user = { details: { fullName: '담당자A' } };
    const { result } = await runChartFull(
      'TicketClosedTotalsByRepMonthly',
      { dateRange: 'lastMonth' },
      [
        { user, month: '09', year: '2026', count: 2 },
        { user, month: '10', year: '2026', count: 3 },
      ],
    );
    expect(result.labels).toEqual(['담당자A']);
    expect(result.data).toEqual([5]);
  });
});

describe('월별 티켓 수 — 상단 조회기간의 연도로 센다', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('지난 해를 고르면 2025년 1~12월만 센다', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      frequencyType: '%m',
      dateRange: 'lastYear',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...yearRange(2025) });
  });

  it('이번 달을 골라도 그 달 하나가 아니라 올해 1~12월을 센다', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      frequencyType: '%m',
      dateRange: 'thisMonth',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...yearRange(2026) });
  });

  it('직접 지정한 기간이면 그 기간 마지막 날의 연도로 센다', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      frequencyType: '%m',
      dateRange: 'customDate',
      startDate: '2024-11-01',
      endDate: '2025-02-28',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...yearRange(2025) });
  });

  it('전체를 고르면 올해로 센다(여러 해의 같은 달이 섞이지 않음)', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      frequencyType: '%m',
      dateRange: 'all',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...yearRange(2026) });
  });

  it('주기를 정하지 않으면 월별로 보므로 같은 규칙을 쓴다', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      dateRange: 'lastYear',
    });
    expect(match.createdAt).toEqual({ $ne: null, ...yearRange(2025) });
  });

  it('달은 연도 범위를 자른 시간대와 같은 시간대로 묶는다(1월 1일 새벽이 12월로 가지 않음)', async () => {
    const { pipeline } = await runChartFull('TicketTotalsByFrequency', {
      frequencyType: '%m',
      dateRange: 'thisYear',
    });
    expect(pipeline[1].$group._id.$dateToString.timezone).toBe(
      dayjs().format('Z'),
    );
  });

  it('연도가 들어간 다른 주기(연도별)는 지금처럼 전체 기간을 센다', async () => {
    const match = await runChart('TicketTotalsByFrequency', {
      frequencyType: '%Y',
      dateRange: 'thisMonth',
    });
    expect(match.createdAt).toEqual({ $ne: null });
  });
});

describe('전체 담당자별 티켓 수(All Time) — 상단 조회기간을 그대로 따른다', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('지난 달을 고르면 지난 달(10월) 티켓만 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepAllTime', {
      dateRange: 'lastMonth',
    });
    expect(match.createdAt).toEqual(monthRange(2026, 9));
  });

  it('직접 지정한 기간이면 그 기간의 티켓만 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepAllTime', {
      dateRange: 'customDate',
      startDate: '2025-12-10',
      endDate: '2025-12-20',
    });
    expect(match.createdAt).toEqual({
      $gte: new Date(2025, 11, 10),
      $lte: new Date(2025, 11, 20, 23, 59, 59, 999),
    });
  });

  it('전체를 고르면 지금처럼 전체 기간을 센다', async () => {
    const match = await runChart('TicketClosedTotalsByRepAllTime', {
      dateRange: 'all',
    });
    expect(match.createdAt).toBeUndefined();
  });
});
