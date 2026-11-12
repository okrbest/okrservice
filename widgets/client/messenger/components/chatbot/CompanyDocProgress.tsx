import * as React from 'react';
import { __ } from '../../../utils';
import { getColor } from '../../utils/util';
import { chatbotTheme } from './chatbotTheme';

const T = chatbotTheme;

// 서버가 진행률을 주지 않아 올린 뒤 지난 시간으로 대략 보여준다.
// 90%에서 멈춘다 — 끝까지 차는 건 서버가 "사용 가능"을 확인한 뒤(행이 바뀔 때)
const MAX_FRACTION = 0.9;
// 이 값만큼 지나면 최대치의 약 63% (1분이면 약 85%)
const FILL_TIME_CONSTANT_MS = 20_000;
const TICK_MS = 1_000;
export const LONG_PROCESSING_MS = 3 * 60_000;

export function progressFraction(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return MAX_FRACTION * (1 - Math.exp(-elapsedMs / FILL_TIME_CONSTANT_MS));
}

function elapsedSince(createdAt: string): number {
  const start = new Date(createdAt).getTime();
  return Number.isNaN(start) ? 0 : Date.now() - start;
}

interface Props {
  createdAt: string;
}

const CompanyDocProgress: React.FC<Props> = ({ createdAt }) => {
  const [elapsed, setElapsed] = React.useState(() => elapsedSince(createdAt));

  React.useEffect(() => {
    const timer = setInterval(
      () => setElapsed(elapsedSince(createdAt)),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <div style={{ marginTop: '6px' }}>
      <div
        role="progressbar"
        aria-label={__('Processing')}
        style={{
          height: '4px',
          borderRadius: '999px',
          background: T.color.border,
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="company-doc-progress-fill"
          style={{
            width: `${(progressFraction(elapsed) * 100).toFixed(1)}%`,
            height: '100%',
            borderRadius: '999px',
            background: getColor() || T.color.accent,
            transition: `width ${TICK_MS}ms linear`,
          }}
        />
      </div>
      {elapsed > LONG_PROCESSING_MS && (
        <div
          style={{
            fontSize: '11px',
            color: T.color.mutedForeground,
            marginTop: '4px',
          }}
        >
          {__('Taking longer than usual. Large files can take a few minutes.')}
        </div>
      )}
    </div>
  );
};

export default CompanyDocProgress;
