import * as React from 'react';
import { chatbotTheme } from './chatbotTheme';
import type { WorkStatusChartData } from './charts/WorkStatusBarChart';
import type {
  SalaryTrendChartData,
  SalaryTrendSeriesMeta,
} from './charts/SalaryTrendLineChart';

/**
 * ```viz 코드블록(specs/014-hr-chatbot-viz/contracts/viz-block.schema.md) 소비자.
 *
 * teamplgpt hrSkillGuard.js의 [HR_VIZ_OUTPUT] 가드가 명시적 시각화 요청에만
 * 이 블록을 출력한다. 여기서는 JSON을 파싱·검증하고 각 타입별 React 컴포넌트용
 * 데이터(조직도·트리, 근무현황·막대, 급여추세·선)로 변환해 렌더한다. 신규 조회는 하지 않는다.
 */

// OrgChartTree는 recharts를 쓰지 않으므로 별도 청크로 분리한다
// (같은 청크명을 쓰면 조직도만 요청해도 recharts 번들이 딸려온다).
const OrgChartTree = React.lazy(
  () => import(/* webpackChunkName: "viz-orgchart" */ './charts/OrgChartTree'),
);
const WorkStatusBarChart = React.lazy(
  () =>
    import(
      /* webpackChunkName: "viz-recharts" */ './charts/WorkStatusBarChart'
    ),
);
const SalaryTrendLineChart = React.lazy(
  () =>
    import(
      /* webpackChunkName: "viz-recharts" */ './charts/SalaryTrendLineChart'
    ),
);

export type OrgChartData = {
  root: string;
  members: { name: string; title?: string }[];
};

export type WorkStatusData = {
  labels: string[];
  values: number[];
};

export type SalaryTrendData = {
  labels: string[];
  series: { name: string; values: number[] }[];
};

/** 렌더 함수 공통 결과: ok(정상 변환) / empty(정상 파싱됐으나 값 0건) / invalid(스키마 위반). */
export type RenderResult<T> =
  | { status: 'ok'; payload: T }
  | { status: 'empty' }
  | { status: 'invalid' };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number');
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

// 근무현황 라벨(handler.js `summarizeWorkStatus`가 생성하는 한국어 문자열) → 상태색.
// LLM이 의역하거나 목록에 없는 라벨(휴가/출장/교육 등 정보성 항목 포함)은 accent로 폴백.
function workStatusColor(label: string): string {
  if (label === '정상') return chatbotTheme.status.good;
  if (label === '지각' || label === '조퇴' || label === '출퇴근누락')
    return chatbotTheme.status.warning;
  if (label === '결근') return chatbotTheme.status.critical;
  return chatbotTheme.chartAccent;
}

export function renderOrgChart(data: unknown): RenderResult<OrgChartData> {
  if (data == null || typeof data !== 'object') return { status: 'invalid' };
  const { root, members } = data as Partial<OrgChartData>;
  if (!isNonEmptyString(root)) return { status: 'invalid' };
  if (!Array.isArray(members)) return { status: 'invalid' };
  if (members.some((m) => !m || !isNonEmptyString((m as any).name))) {
    return { status: 'invalid' };
  }
  if (members.length === 0) return { status: 'empty' };

  return { status: 'ok', payload: { root, members } };
}

export type WorkStatusChartPayload = { data: WorkStatusChartData };

export function renderWorkStatusChart(
  data: unknown,
): RenderResult<WorkStatusChartPayload> {
  if (data == null || typeof data !== 'object') return { status: 'invalid' };
  const { labels, values } = data as Partial<WorkStatusData>;
  if (!isStringArray(labels) || !isNumberArray(values))
    return { status: 'invalid' };
  if (labels.length !== values.length) return { status: 'invalid' };
  if (labels.length === 0) return { status: 'empty' };

  return {
    status: 'ok',
    payload: {
      data: labels.map((label, i) => ({
        label,
        value: values[i],
        color: workStatusColor(label),
      })),
    },
  };
}

export type SalaryTrendChartPayload = {
  data: SalaryTrendChartData;
  series: SalaryTrendSeriesMeta;
};

export function renderSalaryTrendChart(
  data: unknown,
): RenderResult<SalaryTrendChartPayload> {
  if (data == null || typeof data !== 'object') return { status: 'invalid' };
  const { labels, series } = data as Partial<SalaryTrendData>;
  if (!isStringArray(labels)) return { status: 'invalid' };
  if (!Array.isArray(series) || series.length === 0)
    return { status: 'invalid' };
  const seriesValid = series.every(
    (s) =>
      s &&
      isNonEmptyString(s.name) &&
      isNumberArray(s.values) &&
      s.values.length === labels.length,
  );
  if (!seriesValid) return { status: 'invalid' };
  if (labels.length === 0) return { status: 'empty' };

  const palette = chatbotTheme.chartPalette;
  const seriesMeta = series.map((s, i) => ({
    key: `s${i}`,
    name: s.name,
    color: palette[i % palette.length],
  }));
  const rows = labels.map((label, i) => {
    const row: Record<string, string | number> = { __x: label };
    series.forEach((s, si) => {
      row[`s${si}`] = s.values[i];
    });
    return row;
  });

  return { status: 'ok', payload: { data: rows, series: seriesMeta } };
}

export type VizDispatch =
  | { kind: 'orgchart'; result: RenderResult<OrgChartData> }
  | { kind: 'workstatus'; result: RenderResult<WorkStatusChartPayload> }
  | { kind: 'salarytrend'; result: RenderResult<SalaryTrendChartPayload> }
  | { kind: 'invalid' };

/** raw ```viz 블록 본문(JSON 문자열)을 파싱해 타입별 렌더 함수로 위임한다. */
export function dispatchViz(raw: string): VizDispatch {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid' };
  }
  if (!parsed || typeof parsed !== 'object') return { kind: 'invalid' };
  const { type, data } = parsed;
  if (type === 'orgchart')
    return { kind: 'orgchart', result: renderOrgChart(data) };
  if (type === 'workstatus')
    return { kind: 'workstatus', result: renderWorkStatusChart(data) };
  if (type === 'salarytrend')
    return { kind: 'salarytrend', result: renderSalaryTrendChart(data) };
  return { kind: 'invalid' };
}

// ─── 지연 로딩 ────────────────────────────────────────────────────────────
// viz 블록이 실제로 감지된 대화에서만 번들을 내려받는다(초기 위젯 로드 크기 영향 없음).
// React.lazy + Suspense로 3개 타입 모두 동일하게 처리한다.

/**
 * lazy 청크 로드 실패(배포 후 구 세션의 404 등)나 recharts 렌더 중 예외를
 * viz 블록 안내문으로 가둔다 — 없으면 챗봇 트리 전체가 언마운트된다.
 */
class VizErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            padding: '10px 4px',
            fontSize: '12px',
            color: chatbotTheme.color.mutedForeground,
          }}
        >
          그래프를 표시할 수 없습니다.
        </div>
      );
    }
    return this.props.children;
  }
}

/** dispatchViz() 결과를 실제 차트로 렌더하는 React 노드. 3개 타입 공용. */
export function VizBlockRenderer({
  dispatch,
}: {
  dispatch: VizDispatch;
}): React.ReactElement | null {
  if (dispatch.kind === 'invalid' || dispatch.result.status === 'invalid')
    return null;

  if (dispatch.result.status === 'empty') {
    return (
      <div
        style={{
          padding: '10px 4px',
          fontSize: '12px',
          color: chatbotTheme.color.mutedForeground,
        }}
      >
        표시할 데이터가 없습니다.
      </div>
    );
  }

  // 참고 UI(.cmm-ai-chart-wrap)와 동일 — 그래프를 흰 카드로 한 번 더 감싼다.
  const wrapperStyle: React.CSSProperties = {
    margin: '8px 0',
    minHeight: dispatch.kind === 'orgchart' ? undefined : 220,
    overflowX: 'auto',
    padding: '6px',
    background: chatbotTheme.color.card,
    border: `1px solid ${chatbotTheme.color.border}`,
    borderRadius: chatbotTheme.radius.md,
    boxSizing: 'border-box',
  };

  return (
    <div style={wrapperStyle}>
      <VizErrorBoundary>
        <React.Suspense fallback={null}>
          {dispatch.kind === 'orgchart' ? (
            <OrgChartTree data={dispatch.result.payload} />
          ) : dispatch.kind === 'workstatus' ? (
            <WorkStatusBarChart data={dispatch.result.payload.data} />
          ) : (
            <SalaryTrendLineChart
              data={dispatch.result.payload.data}
              series={dispatch.result.payload.series}
            />
          )}
        </React.Suspense>
      </VizErrorBoundary>
    </div>
  );
}
