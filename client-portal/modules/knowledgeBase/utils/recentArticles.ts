const RECENT_KEY = 'kb_recent_articles';
const MAX_RECENT = 5;

export interface RecentArticle {
  _id: string;
  title: string;
  categoryId?: string;
}

export function trackRecentArticle(article: RecentArticle): void {
  if (typeof window === 'undefined') return;
  try {
    const stored: RecentArticle[] = JSON.parse(
      localStorage.getItem(RECENT_KEY) || '[]',
    );
    const filtered = stored.filter((a) => a._id !== article._id);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([article, ...filtered].slice(0, MAX_RECENT)),
    );
  } catch {
    // localStorage unavailable — ignore
  }
}

export function getRecentArticles(): RecentArticle[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
