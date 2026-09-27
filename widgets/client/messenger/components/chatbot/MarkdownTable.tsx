import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { chatbotTheme as T } from './chatbotTheme';
import {
  StatusKind,
  cellText,
  isNumericColumn,
  isTimeColumn,
  isTotalRow,
  parseAmount,
  statusKind,
} from './markdownTableUtils';

// 챗봇 답변 속 마크다운 표 — 카드 안에 표, 숫자 열 오른쪽 정렬·고정폭,
// 숫자 칸 뒤 값 막대, 상태 알약, 주말 칩, 합계 줄 강조, 7줄 넘으면 접기.
// 줄은 처음 나타날 때 차례로 올라온다(스트리밍 중엔 새로 도착한 줄만).

type Align = 'left' | 'center' | 'right';

type Props = {
  headers: string[];
  // 마크다운 구분줄의 정렬 — 명시(center/right)가 있으면 그대로 따른다
  aligns: Align[];
  rows: string[][];
  renderInline: (text: string, keyPrefix: string) => React.ReactNode;
};

const COLLAPSED_ROWS = 7;
const BAR_MAX_PX = 48;
const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_STYLE: Record<StatusKind, { background: string; color: string }> =
  {
    ok: { background: '#e8f6ee', color: '#1a7f45' },
    warn: { background: '#fff4e0', color: '#a15c07' },
    danger: { background: '#fdecea', color: '#b3261e' },
    off: { background: '#eef0f4', color: '#5b6070' },
  };

const WEEKEND_COLOR = { sat: '#2563eb', sun: T.color.destructive } as const;

const rowDelay = (index: number) =>
  index < COLLAPSED_ROWS
    ? index * 0.04
    : Math.min((index - COLLAPSED_ROWS) * 0.03, 0.4);

const MarkdownTable: React.FC<Props> = ({
  headers,
  aligns,
  rows,
  renderInline,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const bodyRows = rows.filter((row) => !isTotalRow(row));
  const totalRows = rows.filter((row) => isTotalRow(row));
  const hiddenCount = Math.max(bodyRows.length - COLLAPSED_ROWS, 0);
  const visibleBody = expanded ? bodyRows : bodyRows.slice(0, COLLAPSED_ROWS);

  const weekColIndex = headers.findIndex((h) => cellText(h) === '요일');

  // 열별 해석: 숫자 열 여부, 막대 최대값(시각 열·값 2개 미만이면 막대 없음)
  const columns = headers.map((_, ci) => {
    const values = rows.map((row) => row[ci] ?? '');
    const numeric = isNumericColumn(values);
    const amounts = bodyRows
      .map((row) => parseAmount(row[ci] ?? ''))
      .filter((n): n is number => n !== null);
    const max = Math.max(0, ...amounts);
    const hasBars =
      numeric && !isTimeColumn(values) && amounts.length >= 2 && max > 0;
    const explicit = aligns[ci];
    const align: Align =
      explicit && explicit !== 'left' ? explicit : numeric ? 'right' : 'left';
    return { numeric, hasBars, max, align };
  });

  const cellStyle = (ci: number): React.CSSProperties => ({
    padding: '8px 10px',
    textAlign: columns[ci].align,
    fontSize: '12px',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    fontVariantNumeric: columns[ci].numeric ? 'tabular-nums' : undefined,
  });

  const renderCell = (
    raw: string,
    ri: number,
    ci: number,
    isTotal: boolean,
  ) => {
    const key = `td-${ri}-${ci}`;
    const text = cellText(raw);

    if (ci === weekColIndex && (text === '토' || text === '일')) {
      const kind = text === '토' ? 'sat' : 'sun';
      return (
        <span
          data-weekend={kind}
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '11px',
            color: WEEKEND_COLOR[kind],
            background: `color-mix(in srgb, ${WEEKEND_COLOR[kind]} 12%, transparent)`,
          }}
        >
          {text}
        </span>
      );
    }

    const status = statusKind(raw);
    if (status) {
      return (
        <span
          data-status={status}
          style={{
            display: 'inline-block',
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 700,
            ...STATUS_STYLE[status],
          }}
        >
          {text}
        </span>
      );
    }

    const column = columns[ci];
    const amount = column.hasBars && !isTotal ? parseAmount(raw) : null;
    if (amount !== null) {
      const pct = Math.round((amount / column.max) * 100);
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <motion.span
            data-bar={String(pct)}
            aria-hidden="true"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: (pct / 100) * BAR_MAX_PX }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
            style={{
              display: 'block',
              height: '6px',
              borderRadius: '99px',
              background: `color-mix(in srgb, ${T.color.accent} 55%, transparent)`,
            }}
          />
          <span>{renderInline(raw, key)}</span>
        </span>
      );
    }

    return renderInline(raw, key);
  };

  const renderRow = (row: string[], ri: number, isTotal: boolean) => (
    <motion.tr
      key={isTotal ? `total-${ri}` : ri}
      data-total={isTotal ? 'true' : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: EASE,
        delay: isTotal ? 0 : rowDelay(ri),
      }}
      onMouseEnter={() => setHoveredRow(isTotal ? null : ri)}
      onMouseLeave={() => setHoveredRow(null)}
      style={{
        background: isTotal
          ? T.color.accentSoft
          : hoveredRow === ri
            ? '#f7f8fd'
            : 'transparent',
        fontWeight: isTotal ? 700 : undefined,
        transition: 'background 0.15s ease',
      }}
    >
      {headers.map((_, ci) => (
        <td
          key={ci}
          style={{
            ...cellStyle(ci),
            borderTop: isTotal ? `1px solid ${T.color.border}` : undefined,
            borderBottom:
              !isTotal && ri < visibleBody.length - 1
                ? `1px solid #eef0f5`
                : undefined,
          }}
        >
          {renderCell(row[ci] ?? '', ri, ci, isTotal)}
        </td>
      ))}
    </motion.tr>
  );

  return (
    <div style={{ margin: '8px 0' }}>
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.lg,
          background: T.color.card,
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '12px',
          }}
        >
          <thead>
            <tr style={{ background: '#f7f8fb' }}>
              {headers.map((h, ci) => (
                <th
                  key={ci}
                  style={{
                    ...cellStyle(ci),
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: T.color.mutedForeground,
                    borderBottom: `1px solid ${T.color.border}`,
                  }}
                >
                  {renderInline(h, `th-${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleBody.map((row, ri) => renderRow(row, ri, false))}
            {totalRows.map((row, ti) => renderRow(row, ti, true))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: '6px',
            padding: '4px 2px',
            border: 'none',
            background: 'transparent',
            color: T.color.accent,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {expanded ? '접기' : `나머지 ${hiddenCount}줄 더 보기`}
          <span aria-hidden="true" style={{ marginLeft: '4px' }}>
            {expanded ? '▴' : '▾'}
          </span>
        </button>
      )}
    </div>
  );
};

export default MarkdownTable;
