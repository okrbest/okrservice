// 챗봇 답변 표(MarkdownTable)의 칸 해석 규칙 — 숫자 열 정렬, 값 막대, 상태 알약, 합계 줄.
// AI가 쓴 마크다운 표 글자만 보고 판단하므로, 확신할 수 있는 경우에만 꾸민다.

export type StatusKind = 'ok' | 'warn' | 'danger' | 'off';

const EMPTY_VALUES = new Set(['', '-', '–', '—', 'N/A', 'n/a']);

// 금액·시간·일수·비율: 3,200,000 / 412,500원 / 10.3h / 8.5시간 / 15일 / 30분 / 12%
const AMOUNT_RE =
  /^[-+]?\d{1,3}(,\d{3})*(\.\d+)?\s*(원|시간|h|H|일|분|%|회|건|명)?$|^[-+]?\d+(\.\d+)?\s*(원|시간|h|H|일|분|%|회|건|명)?$/;
// 시각: 08:52, 18:10
const TIME_RE = /^\d{1,2}:\d{2}$/;

const STATUS_MAP: Record<string, StatusKind> = {
  정상: 'ok',
  완료: 'ok',
  승인: 'ok',
  출근: 'ok',
  지각: 'warn',
  조퇴: 'warn',
  외출: 'warn',
  대기: 'warn',
  진행중: 'warn',
  미승인: 'warn',
  결근: 'danger',
  반려: 'danger',
  미출근: 'danger',
  휴무: 'off',
  휴가: 'off',
  연차: 'off',
  반차: 'off',
  휴일: 'off',
  공휴일: 'off',
  출장: 'off',
};

// 마크다운 강조(**, `, _)를 걷어낸 칸 글자
export const cellText = (raw: string): string =>
  (raw || '').replace(/\*\*|__|`/g, '').trim();

const isEmpty = (raw: string) => EMPTY_VALUES.has(cellText(raw));

const filled = (values: string[]) => values.filter((v) => !isEmpty(v));

// 값이 있는 칸이 모두 숫자(금액·시간·일수) 또는 시각이면 숫자 열
export const isNumericColumn = (values: string[]): boolean => {
  const cells = filled(values).map(cellText);
  return (
    cells.length > 0 && cells.every((v) => AMOUNT_RE.test(v) || TIME_RE.test(v))
  );
};

// 시각 열은 크기 비교가 의미 없어 막대를 그리지 않는다
export const isTimeColumn = (values: string[]): boolean => {
  const cells = filled(values).map(cellText);
  return cells.length > 0 && cells.every((v) => TIME_RE.test(v));
};

export const parseAmount = (raw: string): number | null => {
  const v = cellText(raw);
  if (!AMOUNT_RE.test(v)) return null;
  const n = parseFloat(v.replace(/,/g, '').replace(/[^\d.+-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const statusKind = (raw: string): StatusKind | null =>
  STATUS_MAP[cellText(raw)] ?? null;

// 첫 칸이 합계 성격인 줄 — "합계", "총계", "소계", "계", "총 지급액"·"총근무시간" 등.
// "계약직", "총무팀"처럼 우연히 같은 글자로 시작하는 이름은 제외한다.
export const isTotalRow = (row: string[]): boolean => {
  const first = cellText(row[0] ?? '');
  return (
    /^(합계|총계|총합|소계|계)$/.test(first) ||
    /^(합계|총계|소계)\s/.test(first) ||
    /^총\s*(지급|공제|근무|금액|합계|액|시간|일수|연장)/.test(first)
  );
};
