import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { chatbotTheme as T } from './chatbotTheme';
import {
  cellText,
  plainNumber,
  workHoursGeometry,
  workHoursTable,
  WorkHoursCols,
  WorkHoursGeometry,
} from './markdownTableUtils';

// 월 근무시간 표(구분|누적 근로|월간 소정|최대 가능|소정까지)를 줄마다 막대 하나로 그린다
// (teamplgpt specs/019 A안, contracts/widget-work-hours-gauge.md).
// 막대 전체 = 최대 가능, 채움 = 누적 근로, 세로선 = 월간 소정, 소정 뒤 빈 구간 = 연장 가능(빗금),
// 소정을 넘은 누적은 주황. 숫자는 표에 적힌 문자열을 그대로 보여준다(위치 계산에만 숫자로 읽음).

const EASE = [0.22, 1, 0.36, 1] as const;
const OVER = T.status.warning;
const OVER_SOFT = '#fdf0d8';
const MUTED = T.color.mutedForeground;

type RowText = {
  label: string;
  worked: string;
  normal: string;
  max: string;
  toNormal: string;
};

const rowText = (row: string[], cols: WorkHoursCols): RowText => {
  const at = (i: number) => (i === -1 ? '' : cellText(row[i] ?? ''));
  return {
    label: at(cols.label),
    worked: at(cols.worked),
    normal: at(cols.normal),
    max: at(cols.max),
    toNormal: at(cols.toNormal),
  };
};

const rowStyle = (ri: number): React.CSSProperties => ({
  padding: '10px 12px',
  display: 'grid',
  gap: '8px',
  ...(ri > 0 ? { borderTop: '1px solid #eef0f5' } : {}),
});

const Title: React.FC<{ label: string }> = ({ label }) => (
  <span style={{ fontSize: '12px', fontWeight: 600, color: MUTED }}>
    {`${label} 근무시간`}
  </span>
);

const EmptyRow: React.FC<{ text: RowText; ri: number }> = ({ text, ri }) => (
  <div data-work-hours="empty" style={{ ...rowStyle(ri), gap: '4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Title label={text.label} />
      <span style={{ fontSize: '18px', fontWeight: 700 }}>—</span>
    </div>
    <span style={{ fontSize: '12px', color: MUTED }}>
      근무시간을 조회하지 못했습니다.
    </span>
  </div>
);

const Headline: React.FC<{ text: RowText }> = ({ text }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '8px',
      flexWrap: 'wrap',
    }}
  >
    <Title label={text.label} />
    <span
      style={{
        fontSize: '20px',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {text.worked}
      <small
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: MUTED,
          marginLeft: '2px',
        }}
      >
        시간 근로
      </small>
    </span>
  </div>
);

const layer = (style: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  ...style,
});

const Bar: React.FC<{ text: RowText; g: WorkHoursGeometry }> = ({
  text,
  g,
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="img"
      data-track="true"
      data-fill={String(g.fill)}
      data-normal={String(g.normalAt)}
      data-split={String(g.split)}
      data-over={g.over ? 'true' : undefined}
      aria-label={`${text.label} 누적 근로 ${text.worked}시간, 월간 소정 ${text.normal}시간, 최대 가능 ${text.max}시간`}
      style={{
        position: 'relative',
        width: '100%',
        height: '10px',
        borderRadius: '99px',
        background: T.color.accentSoft,
      }}
    >
      <span
        aria-hidden="true"
        style={layer({
          left: `${g.normalAt}%`,
          right: 0,
          borderRadius: '0 99px 99px 0',
          background: `repeating-linear-gradient(135deg, ${OVER_SOFT} 0 4px, transparent 4px 8px)`,
        })}
      />
      <motion.span
        aria-hidden="true"
        initial={reduceMotion ? false : { width: 0 }}
        animate={{ width: `${g.fill}%` }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        style={layer({
          left: 0,
          borderRadius: '99px',
          background: g.over
            ? `linear-gradient(90deg, ${T.color.accent} ${g.split}%, ${OVER} ${g.split}%)`
            : T.color.accent,
        })}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-4px',
          bottom: '-4px',
          left: `${g.normalAt}%`,
          width: '2px',
          borderRadius: '2px',
          background: T.color.foreground,
        }}
      />
    </div>
  );
};

const Ticks: React.FC<{ text: RowText; normalAt: number }> = ({
  text,
  normalAt,
}) => (
  <div
    aria-hidden="true"
    style={{
      position: 'relative',
      height: '16px',
      fontSize: '11px',
      color: MUTED,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ position: 'absolute', left: 0 }}>0</span>
    <span
      style={{
        position: 'absolute',
        left: `${normalAt}%`,
        transform: 'translateX(-50%)',
        color: T.color.foreground,
        fontWeight: 600,
      }}
    >
      {`소정 ${text.normal}`}
    </span>
    <span style={{ position: 'absolute', right: 0 }}>{`최대 ${text.max}`}</span>
  </div>
);

const Swatch: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <span>
    <i
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '3px',
        marginRight: '4px',
        background: color,
      }}
    />
    {label}
  </span>
);

const OverLegend: React.FC = () => (
  <span
    style={{ display: 'flex', gap: '12px', fontSize: '11px', color: MUTED }}
  >
    <Swatch color={T.color.accent} label="소정 근로" />
    <Swatch color={OVER} label="소정 초과" />
  </span>
);

const subLine = (text: RowText, hasMax: boolean, hasToNormal: boolean) => {
  if (hasToNormal)
    return `월간 소정 ${text.normal}시간 중 ${text.worked}시간 · 소정까지 ${text.toNormal}시간`;
  if (hasMax) return `월간 소정 ${text.normal}시간 · 최대 가능 ${text.max}시간`;
  return `월간 소정 ${text.normal}시간`;
};

const WorkHoursRow: React.FC<{ text: RowText; ri: number }> = ({
  text,
  ri,
}) => {
  const worked = plainNumber(text.worked);
  const normal = plainNumber(text.normal);
  const max = plainNumber(text.max);
  if (worked === null || normal === null)
    return <EmptyRow text={text} ri={ri} />;

  const g =
    max !== null && max > 0 ? workHoursGeometry(worked, normal, max) : null;
  return (
    <div data-work-hours="row" style={rowStyle(ri)}>
      <Headline text={text} />
      {g && (
        <div style={{ display: 'grid', gap: '4px' }}>
          <Bar text={text} g={g} />
          <Ticks text={text} normalAt={g.normalAt} />
        </div>
      )}
      <span
        style={{
          fontSize: '12px',
          color: MUTED,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {subLine(text, max !== null, plainNumber(text.toNormal) !== null)}
      </span>
      {g && g.over && <OverLegend />}
    </div>
  );
};

const WorkHoursGauge: React.FC<{ headers: string[]; rows: string[][] }> = ({
  headers,
  rows,
}) => {
  const cols = workHoursTable(headers);
  if (!cols) return null;
  return (
    <div
      style={{
        margin: '8px 0',
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        background: T.color.card,
      }}
    >
      {rows.map((row, ri) => (
        <WorkHoursRow key={ri} text={rowText(row, cols)} ri={ri} />
      ))}
    </div>
  );
};

export default WorkHoursGauge;
