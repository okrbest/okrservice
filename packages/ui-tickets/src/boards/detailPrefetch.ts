// 카드에 마우스를 올렸을 때 상세 정보를 미리 받은 시각을 기억한다.
// 곧바로 상세 창을 열면 받아 둔 것을 그대로 쓰고 같은 요청을 다시 보내지 않는다.
const PREFETCH_FRESH_MS = 10000;

const prefetchedAt = new Map<string, number>();

export const markDetailPrefetched = (itemId: string, now = Date.now()) => {
  prefetchedAt.set(itemId, now);
};

export const isDetailPrefetchFresh = (itemId: string, now = Date.now()) => {
  const at = prefetchedAt.get(itemId);

  return at !== undefined && now - at < PREFETCH_FRESH_MS;
};
