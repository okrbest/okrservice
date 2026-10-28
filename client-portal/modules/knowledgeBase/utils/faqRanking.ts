// "많이 본 질문"·대표 질문을 고르는 순수 함수

export type RandomFn = () => number;

// 시드가 같으면 같은 수열을 내는 난수(mulberry32)
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: RandomFn): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

type Rankable = { _id: string; viewCount?: number | null };

// 조회수 있는 글을 많은 순서로 먼저, 모자라면 나머지에서 무작위로 채운다
export function pickTopArticles<T extends Rankable>(
  articles: T[],
  count: number,
  random: RandomFn,
  excludeIds: string[] = [],
): T[] {
  const candidates = articles.filter((a) => !excludeIds.includes(a._id));

  const viewed = candidates
    .map((article, index) => ({ article, index }))
    .filter(({ article }) => (article.viewCount || 0) > 0)
    .sort(
      (x, y) =>
        (y.article.viewCount || 0) - (x.article.viewCount || 0) ||
        x.index - y.index,
    )
    .map(({ article }) => article);

  const rest = candidates.filter((a) => !((a.viewCount || 0) > 0));

  return [...viewed, ...shuffled(rest, random)].slice(0, Math.max(0, count));
}
