import * as React from 'react';
import { chatbotTheme as T } from './chatbotTheme';
import { cellText, plainNumber } from './markdownTableUtils';

// 한도·사용·잔여 표(구분|한도|사용|잔여)를 줄마다 "잔여가 주인공"인 게이지로 그린다
// (teamplgpt specs/018 D11). 큰 숫자 = 잔여, 게이지 = 남은 양(쓸수록 줄어듦),
// 그 아래 "한도 N시간 중 M시간 사용". 잔여가 0 이하면 게이지가 비고 숫자가 경고색 — 판단 문구는 없다.

const WARN = { color: '#a15c07', background: '#fff4e0' } as const;

type Props = {
  headers: string[];
  rows: string[][];
};

const LimitGauge: React.FC<Props> = ({ headers, rows }) => {
  const heads = headers.map(cellText);
  const at = (name: string) => heads.indexOf(name);
  const [iLimit, iUsed, iRem] = [at('한도'), at('사용'), at('잔여')];

  return (
    <div
      style={{
        margin: '8px 0',
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg,
        background: T.color.card,
      }}
    >
      {rows.map((row, ri) => {
        const label = cellText(row[0] ?? '');
        const raw = {
          limit: cellText(row[iLimit] ?? ''),
          used: cellText(row[iUsed] ?? ''),
          rem: cellText(row[iRem] ?? ''),
        };
        const limit = plainNumber(raw.limit);
        const used = plainNumber(raw.used);
        const rem = plainNumber(raw.rem);
        const divider = ri > 0 ? { borderTop: '1px solid #eef0f5' } : {};

        if (limit === null || used === null || rem === null) {
          return (
            <div
              key={ri}
              data-gauge="text"
              style={{ padding: '10px 12px', fontSize: '12px', ...divider }}
            >
              {`${label}: 한도 ${raw.limit} · 사용 ${raw.used} · 잔여 ${raw.rem}`}
            </div>
          );
        }

        const over = rem <= 0;
        const left =
          limit > 0 ? Math.round((Math.max(rem, 0) / limit) * 100) : 0;
        return (
          <div
            key={ri}
            data-gauge="row"
            data-over={over ? 'true' : undefined}
            style={{
              display: 'grid',
              gap: '6px',
              padding: '12px 12px 11px',
              ...divider,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: T.color.mutedForeground,
                letterSpacing: '0.02em',
              }}
            >
              {label}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span
                style={{
                  fontSize: '26px',
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: over ? WARN.color : T.color.accent,
                }}
              >
                {raw.rem}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: T.color.foreground,
                }}
              >
                시간 남음
              </span>
            </div>
            <div
              role="img"
              aria-label={`${label} 잔여 ${raw.rem}시간, 한도 ${raw.limit}시간 중 ${raw.used}시간 사용`}
              data-left={String(left)}
              style={{
                height: '8px',
                borderRadius: '99px',
                overflow: 'hidden',
                background: over ? WARN.background : T.color.accentSoft,
              }}
            >
              <div
                style={{
                  width: `${left}%`,
                  height: '100%',
                  borderRadius: '99px',
                  background: T.color.accent,
                }}
              />
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: T.color.mutedForeground,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {`한도 ${raw.limit}시간 중 ${raw.used}시간 사용`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LimitGauge;
