import * as React from 'react';
import { chatbotTheme } from './chatbotTheme';

/**
 * ```viz 코드블록(specs/014-hr-chatbot-viz/contracts/viz-block.schema.md) 소비자.
 *
 * teamplgpt hrSkillGuard.js의 [HR_VIZ_OUTPUT] 가드가 명시적 시각화 요청에만
 * 이 블록을 출력한다. 여기서는 JSON을 파싱·검증하고 Mermaid 문자열(조직도) 또는
 * Chart.js config(근무현황·급여추세)로 변환해 마운트한다. 신규 조회는 하지 않는다.
 */

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

export type VizType = 'orgchart' | 'workstatus' | 'salarytrend';

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

// Mermaid 노드 라벨 안전화 — flowchart 문법을 깨는 문자만 최소 치환한다.
function escapeMermaidLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
}

export function renderOrgChart(data: unknown): RenderResult<string> {
  if (data == null || typeof data !== 'object') return { status: 'invalid' };
  const { root, members } = data as Partial<OrgChartData>;
  if (!isNonEmptyString(root)) return { status: 'invalid' };
  if (!Array.isArray(members)) return { status: 'invalid' };
  if (members.some((m) => !m || !isNonEmptyString((m as any).name))) {
    return { status: 'invalid' };
  }
  if (members.length === 0) return { status: 'empty' };

  const rootId = 'root';
  const lines = ['graph TD', `  ${rootId}["${escapeMermaidLabel(root)}"]`];
  members.forEach((m, i) => {
    const memberId = `m${i}`;
    const label = m.title ? `${m.name} (${m.title})` : m.name;
    lines.push(`  ${memberId}["${escapeMermaidLabel(label)}"]`);
    lines.push(`  ${rootId} --> ${memberId}`);
  });
  return { status: 'ok', payload: lines.join('\n') };
}

export function renderWorkStatusChart(data: unknown): RenderResult<any> {
  if (data == null || typeof data !== 'object') return { status: 'invalid' };
  const { labels, values } = data as Partial<WorkStatusData>;
  if (!isStringArray(labels) || !isNumberArray(values))
    return { status: 'invalid' };
  if (labels.length !== values.length) return { status: 'invalid' };
  if (labels.length === 0) return { status: 'empty' };

  return {
    status: 'ok',
    payload: {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '근무현황',
            data: values,
            backgroundColor: chatbotTheme.chartAccent,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: chatbotTheme.color.mutedForeground },
            grid: { color: chatbotTheme.color.border },
          },
          x: {
            ticks: { color: chatbotTheme.color.mutedForeground },
            grid: { display: false },
          },
        },
      },
    },
  };
}

export function renderSalaryTrendChart(data: unknown): RenderResult<any> {
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
  return {
    status: 'ok',
    payload: {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.name,
          data: s.values,
          borderColor: palette[i % palette.length],
          backgroundColor: palette[i % palette.length],
          borderWidth: i === 0 ? 2.5 : 1.5,
          tension: 0.25,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: series.length > 1,
            labels: { color: chatbotTheme.color.mutedForeground },
          },
        },
        scales: {
          y: {
            ticks: { color: chatbotTheme.color.mutedForeground },
            grid: { color: chatbotTheme.color.border },
          },
          x: {
            ticks: { color: chatbotTheme.color.mutedForeground },
            grid: { display: false },
          },
        },
      },
    },
  };
}

export type VizDispatch =
  | { kind: 'orgchart'; result: RenderResult<string> }
  | { kind: 'workstatus'; result: RenderResult<any> }
  | { kind: 'salarytrend'; result: RenderResult<any> }
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

let chartJsPromise: Promise<any> | null = null;
function loadChartJs(): Promise<any> {
  if (!chartJsPromise)
    chartJsPromise = import(
      /* webpackChunkName: "viz-chartjs" */ 'chart.js/auto'
    );
  return chartJsPromise;
}

let mermaidPromise: Promise<any> | null = null;
function loadMermaid(): Promise<any> {
  if (!mermaidPromise) {
    mermaidPromise = import(
      /* webpackChunkName: "viz-mermaid" */ 'mermaid'
    ).then((m) => {
      const mermaid = m.default || m;
      // 조직도 노드도 무채색 팔레트로 통일(참고 UI에 맞춘 재스킨)
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: chatbotTheme.color.muted,
          primaryTextColor: chatbotTheme.color.foreground,
          primaryBorderColor: chatbotTheme.color.border,
          lineColor: chatbotTheme.color.mutedForeground,
          fontFamily: chatbotTheme.font.sans,
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

let vizMountSeq = 0;

/** dispatchViz() 결과를 실제 차트/다이어그램으로 마운트하는 React 노드. 3개 타입 공용. */
export function VizBlockRenderer({
  dispatch,
}: {
  dispatch: VizDispatch;
}): React.ReactElement | null {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<any>(null);
  const mountIdRef = React.useRef<string>(`viz-${++vizMountSeq}`);

  React.useEffect(() => {
    let cancelled = false;
    if (dispatch.kind === 'invalid' || dispatch.result.status !== 'ok')
      return undefined;

    if (dispatch.kind === 'orgchart') {
      loadMermaid()
        .then((mermaid) =>
          mermaid.render(
            mountIdRef.current,
            (dispatch.result as { status: 'ok'; payload: string }).payload,
          ),
        )
        .then(({ svg }: { svg: string }) => {
          if (!cancelled && containerRef.current)
            containerRef.current.innerHTML = svg;
        })
        .catch(() => {
          if (!cancelled && containerRef.current) {
            containerRef.current.textContent =
              '다이어그램을 표시할 수 없습니다.';
          }
        });
    } else {
      loadChartJs()
        .then((ChartModule) => {
          if (cancelled || !containerRef.current) return;
          const canvas = document.createElement('canvas');
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(canvas);
          const Chart = ChartModule.default || ChartModule;
          chartRef.current = new Chart(
            canvas,
            (dispatch.result as { status: 'ok'; payload: any }).payload,
          );
        })
        .catch(() => {
          if (!cancelled && containerRef.current) {
            containerRef.current.textContent = '그래프를 표시할 수 없습니다.';
          }
        });
    }

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // dispatch는 매 렌더 새 객체이므로 payload 동일성 대신 마운트 1회만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dispatch.kind === 'invalid' || dispatch.result.status === 'invalid')
    return null;

  if (dispatch.result.status === 'empty') {
    return React.createElement(
      'div',
      { style: { padding: '10px 4px', fontSize: '12px', color: '#6b7280' } },
      '표시할 데이터가 없습니다.',
    );
  }

  const height = dispatch.kind === 'orgchart' ? undefined : 220;
  return React.createElement('div', {
    ref: containerRef,
    style: { margin: '8px 0', minHeight: height, overflowX: 'auto' },
  });
}
