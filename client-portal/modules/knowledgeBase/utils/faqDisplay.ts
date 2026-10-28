// FAQ 화면에 보여 줄 글자·색을 다듬는 순수 함수 모음

export const FAQ_SUGGESTED_KEYWORDS = [
  '연차',
  '근무유형',
  '급여명세서',
  '증명서',
  '결재라인',
];

export type TitleParts = { tag?: string; text: string };

const TITLE_TAG = /^\s*\[([^\]]{1,20})\]\s*(.*)$/;

// "[휴가] 휴가종류를…" → { tag: '휴가', text: '휴가종류를…' }
export function splitTitleTag(title: string): TitleParts {
  const source = (title || '').trim();
  const match = source.match(TITLE_TAG);

  if (!match || !match[1].trim() || !match[2].trim()) {
    return { text: source };
  }

  return { tag: match[1].trim(), text: match[2].trim() };
}

// "1. 인사/조직" → "인사/조직"
export function stripCategoryNumber(title: string): string {
  const source = (title || '').trim();
  const stripped = source.replace(/^\d+\.\s*/, '');

  return stripped || source;
}

const CATEGORY_TONES = [
  { bg: '#e8f3ff', fg: '#1b64da' },
  { bg: '#e5f8ee', fg: '#0f9d58' },
  { bg: '#fff4e0', fg: '#d97706' },
  { bg: '#fdeef3', fg: '#d6336c' },
  { bg: '#f0ecfe', fg: '#673fbd' },
  { bg: '#eef1f5', fg: '#4e5968' },
  { bg: '#feeeee', fg: '#e03131' },
];

export function categoryTone(index: number) {
  return CATEGORY_TONES[Math.abs(index) % CATEGORY_TONES.length];
}

export type ManualLink = { label: string; url: string };

const isHttpUrl = (url: unknown) =>
  typeof url === 'string' && /^https?:\/\/\S+/i.test(url.trim());

// 포털 위쪽 바 링크 중 매뉴얼로 보낼 링크를 고른다
export function pickManualLink(
  externalLinks?: Record<string, string> | null,
): ManualLink | null {
  const entries = Object.entries(externalLinks || {})
    .filter(([, url]) => isHttpUrl(url))
    .map(([label, url]) => ({ label, url: url.trim() }));

  const manual = entries.find(({ label }) => /매뉴얼|manual/i.test(label));

  return manual || entries[0] || null;
}

type CategoryLike = { _id: string; childrens?: CategoryLike[] };

// 상위 분류 → 그 하위 분류 순서로 펼친다(메뉴·카드·묶음 공통 순서)
export function flattenCategories<T extends CategoryLike>(
  parents?: T[] | null,
): { category: T; isChild: boolean }[] {
  return (parents || []).flatMap((parent) => [
    { category: parent, isChild: false },
    ...((parent.childrens || []) as T[]).map((child) => ({
      category: child,
      isChild: true,
    })),
  ]);
}

// 질문 본문 주소
export function articleHref(article: { _id: string; categoryId?: string }) {
  const catId = article.categoryId ? `&catId=${article.categoryId}` : '';

  return `/knowledge-base/article?id=${article._id}${catId}`;
}

// 주소 값(?searchValue=…)이 여러 개 와도 첫 값만 쓴다
export function firstQueryValue(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || '';

  return value || '';
}
