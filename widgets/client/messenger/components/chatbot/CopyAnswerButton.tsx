import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { chatbotTheme as T } from './chatbotTheme';
import { answerToPlainText, copyToClipboard } from './copyAnswer';

// 답변 말풍선 아래 작은 복사 버튼 — 누르면 평문으로 복사하고 1.5초 동안 결과를 보여준다.

type Status = 'idle' | 'copied' | 'failed';

const RESET_MS = 1500;

const CopyAnswerButton: React.FC<{ text: string }> = ({ text }) => {
  const [status, setStatus] = React.useState<Status>('idle');
  const [hovered, setHovered] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    const ok = await copyToClipboard(answerToPlainText(text));
    setStatus(ok ? 'copied' : 'failed');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), RESET_MS);
  };

  const label =
    status === 'copied' ? '복사됨' : status === 'failed' ? '복사 실패' : '복사';
  const color =
    status === 'copied'
      ? '#1a7f45'
      : status === 'failed'
        ? T.color.destructive
        : hovered
          ? T.color.foreground
          : T.color.mutedForeground;

  return (
    <button
      type="button"
      aria-label="답변 복사"
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCopy}
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '4px',
        padding: '3px 6px',
        border: 'none',
        borderRadius: T.radius.sm,
        background: hovered ? T.color.muted : 'transparent',
        color,
        fontSize: '11px',
        cursor: 'pointer',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
    >
      {status === 'copied' ? (
        <Check size={13} aria-hidden="true" />
      ) : (
        <Copy size={13} aria-hidden="true" />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
};

export default CopyAnswerButton;
