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

// 콜론 없는 4자리 시각(0900, 1805) — 머리글이 시각 열일 때만 시각으로 본다(1500원 같은 숫자 오인 방지)
const HHMM_RE = /^([01]\d|2[0-3])[0-5]\d$/;
const TIME_HEADER_RE = /출근|퇴근|시각|기준시간|시작시간|종료시간/;

// 시각 열은 크기 비교가 의미 없어 막대를 그리지 않는다
export const isTimeColumn = (values: string[], header = ''): boolean => {
  const cells = filled(values).map(cellText);
  if (cells.length === 0) return false;
  if (cells.every((v) => TIME_RE.test(v))) return true;
  return (
    TIME_HEADER_RE.test(cellText(header)) &&
    cells.every((v) => TIME_RE.test(v) || HHMM_RE.test(v))
  );
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

// 같은 행의 지각·조퇴 여부 — 상태 칸이 "정상"이어도 지각 칸(Y)·지각(분)>0이면 지각으로 본다
// (HR 데이터에 지각한 날 상태가 "정상"으로 오는 경우가 있다)
const YES_RE = /^(Y|예|O|true|지각|조퇴)$/i;

const flagFor = (
  headers: string[],
  row: string[],
  word: '지각' | '조퇴',
): boolean =>
  headers.some((h, i) => {
    const head = cellText(h);
    const value = cellText(row[i] ?? '');
    if (head === '상태') return value.includes(word);
    if (head === word) return YES_RE.test(value);
    if (head.startsWith(word) && /\(분\)$/.test(head)) {
      const n = parseFloat(value);
      return Number.isFinite(n) && n > 0;
    }
    return false;
  });

export const rowIssues = (
  headers: string[],
  row: string[],
): { late: boolean; early: boolean } => ({
  late: flagFor(headers, row, '지각'),
  early: flagFor(headers, row, '조퇴'),
});

// 지각이면 출근 칸, 조퇴면 퇴근 칸을 강조한다 — 기준출근·기준퇴근 칸은 제외
export const issueTarget = (header: string): 'late' | 'early' | null => {
  const head = cellText(header);
  if (head.includes('기준')) return null;
  if (head === '출근' || head === '출근시각') return 'late';
  if (head === '퇴근' || head === '퇴근시각') return 'early';
  return null;
};

// 한도·사용·잔여 표(teamplgpt specs/018 D11) — 열마다 막대를 그리면 기간이 다른 한도끼리 비교하게 돼
// 뜻이 없다. 'gauge'는 줄마다 잔여 중심 게이지, 'monthly'는 사용 칸에 그 달 한도 기준 막대.
export type LimitTableKind = 'gauge' | 'monthly';

export const limitTableKind = (headers: string[]): LimitTableKind | null => {
  const heads = headers.map(cellText);
  const has = (h: string) => heads.indexOf(h) !== -1;
  if (!has('한도') || !has('사용') || !has('잔여')) return null;
  if (heads[0] === '구분') return 'gauge';
  if (heads[0] === '월') return 'monthly';
  return null;
};

// 소수까지의 십진수만 숫자로 본다("—", "조회 실패"는 null)
export const plainNumber = (raw: string): number | null => {
  const v = cellText(raw).replace(/,/g, '');
  return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
};
