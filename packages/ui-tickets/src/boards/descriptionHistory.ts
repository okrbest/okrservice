// 티켓 설명 임시저장함 기록의 보관 규칙 (순수 함수 — 저장소는 descriptionHistoryStore.ts)
// 저장·취소를 누를 때와 쓰는 동안 주기적으로 쓰던 글을 남겨, 저장이 안 되거나 실수로 취소해도 되찾게 한다.
import {
  descriptionFingerprint,
  normalizeDescriptionHtml,
} from '@erxes/ui/src/utils/descriptionDraft';

// save: 저장 누름 / cancel: 취소 누름 / auto: 쓰는 중 자동 / restore: 임시저장함에서 글을 불러오기 직전의 글
// manual: 임시저장함에서 직접 저장
export type DescriptionHistoryKind =
  | 'save'
  | 'cancel'
  | 'auto'
  | 'restore'
  | 'manual';

// 기록 한 건의 요약. 본문(사진 포함, 클 수 있음)은 따로 보관하고 고를 때만 읽는다.
export type DescriptionHistoryMeta = {
  id: string;
  // 편집기 임시 저장과 같은 키: `${contentType}_description_${itemId}`
  itemKey: string;
  kind: DescriptionHistoryKind;
  savedAt: number;
  // 본문 글자 수(사진 포함)
  size: number;
  // 같은 글인지 비교용
  fingerprint: string;
  preview: string;
  imageCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const HISTORY_LIMITS = {
  perItem: 10,
  total: 50,
  maxAgeMs: 7 * DAY_MS,
  // 붙여넣은 사진은 글 안에 통째로 들어간다 — 전체 합계를 글자 수로 제한(약 30MB)
  totalChars: 15_000_000,
};

// 쓰는 동안 이 간격으로 한 번씩 기록한다(그 사이 글이 바뀐 경우에만)
export const HISTORY_AUTO_INTERVAL_MS = 60 * 1000;

const PREVIEW_LENGTH = 60;

type HistoryPlan = {
  add: DescriptionHistoryMeta | null;
  removeIds: string[];
};

const byNewest = (a: DescriptionHistoryMeta, b: DescriptionHistoryMeta) =>
  b.savedAt - a.savedAt;

/** 남길 글의 요약을 만든다. 빈 글이면 null(남기지 않음). */
export function buildHistoryMeta(input: {
  id: string;
  itemKey: string;
  content: string;
  kind: DescriptionHistoryKind;
  savedAt: number;
}): DescriptionHistoryMeta | null {
  const { content, ...rest } = input;

  if (!normalizeDescriptionHtml(content)) {
    return null;
  }

  return {
    ...rest,
    size: content.length,
    fingerprint: descriptionFingerprint(content),
    ...describeHistoryEntry(content),
  };
}

const shouldAdd = (
  kept: DescriptionHistoryMeta[],
  candidate: DescriptionHistoryMeta,
): boolean => {
  if (candidate.size > HISTORY_LIMITS.totalChars) {
    return false;
  }

  const latest = kept
    .filter((entry) => entry.itemKey === candidate.itemKey)
    .sort(byNewest)[0];

  return !latest || latest.fingerprint !== candidate.fingerprint;
};

/**
 * 지금 보관 중인 기록과 새로 남길 글을 받아, 무엇을 추가하고 무엇을 지울지 정한다.
 * candidate가 null이면 정리만 한다.
 */
export function planHistoryUpdate(
  existing: DescriptionHistoryMeta[],
  candidate: DescriptionHistoryMeta | null,
  now: number,
): HistoryPlan {
  const isFresh = (entry: DescriptionHistoryMeta) =>
    now - entry.savedAt <= HISTORY_LIMITS.maxAgeMs;
  const expiredIds = existing.filter((e) => !isFresh(e)).map((e) => e.id);

  // 최신순 — 한도를 넘으면 뒤(오래된 것)부터 지운다
  const fresh = existing.filter(isFresh).sort(byNewest);
  const add = candidate && shouldAdd(fresh, candidate) ? candidate : null;

  if (!add) {
    return { add: null, removeIds: expiredIds };
  }

  const overPerItem = fresh
    .filter((entry) => entry.itemKey === add.itemKey)
    .slice(HISTORY_LIMITS.perItem - 1);
  const afterPerItem = fresh.filter((e) => !overPerItem.includes(e));
  const overTotal = afterPerItem.slice(HISTORY_LIMITS.total - 1);
  const afterTotal = afterPerItem.filter((e) => !overTotal.includes(e));

  // 용량: 새 글부터 최신순으로 더해 가다 한도를 넘는 지점부터 오래된 쪽을 지운다
  let chars = add.size;
  const overSize = afterTotal.filter((entry) => {
    chars += entry.size;
    return chars > HISTORY_LIMITS.totalChars;
  });

  return {
    add,
    removeIds: [...expiredIds, ...overPerItem, ...overTotal, ...overSize].map(
      (entry) => (typeof entry === 'string' ? entry : entry.id),
    ),
  };
}

/** 목록에 보여 줄 앞부분 글과 사진 개수 */
export function describeHistoryEntry(html: string): {
  preview: string;
  imageCount: number;
} {
  const imageCount = (html.match(/<img\b/gi) || []).length;
  const text = html
    // 문단·줄바꿈은 띄어 쓰고, 굵게 같은 글자 꾸밈 태그는 그냥 뺀다
    .replace(/<\/(p|div|li|h[1-6]|tr|td|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    preview:
      text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text,
    imageCount,
  };
}
