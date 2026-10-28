// 주제의 분류 구조(상위·하위)를 다루는 순수 함수

type CategoryLike = { _id: string; title?: string; childrens?: CategoryLike[] };

type TopicLike<C extends CategoryLike> = {
  parentCategories?: C[] | null;
  categories?: C[] | null;
};

// 분류 화면에 보일 분류 범위: 자기 + 하위 분류
export function categoryScopeIds(category: CategoryLike): string[] {
  return [category._id, ...(category.childrens || []).map((c) => c._id)];
}

export type CategoryPath<C> = { category: C; parent?: C };

// 분류 id로 분류와 (있으면) 상위 분류를 찾는다
export function findCategoryPath<C extends CategoryLike>(
  topic: TopicLike<C>,
  categoryId: string,
): CategoryPath<C> | null {
  if (!categoryId) return null;

  for (const parent of topic.parentCategories || []) {
    if (parent._id === categoryId) return { category: parent };

    const child = (parent.childrens || []).find((c) => c._id === categoryId);
    if (child) return { category: child as C, parent };
  }

  // 3단계 이상 분류는 parentCategories에 펼쳐지지 않으므로 전체 목록에서 찾는다
  const deep = (topic.categories || []).find((c) => c._id === categoryId);

  return deep ? { category: deep } : null;
}

// 목록 질의를 이 주제 분류로 한정할 때 쓰는 id 목록(정렬해 캐시 변수를 고정)
export function topicCategoryIds(topic: TopicLike<CategoryLike>): string[] {
  return (topic.categories || []).map((c) => c._id).sort();
}

// 분류별 질문 수. 상위 분류에는 하위 분류 질문 수를 더한다
export function countArticlesByCategory(
  articles: { categoryId?: string }[],
  parentCategories?: CategoryLike[] | null,
): Record<string, number> {
  const direct: Record<string, number> = {};

  articles.forEach(({ categoryId }) => {
    if (categoryId) direct[categoryId] = (direct[categoryId] || 0) + 1;
  });

  const counts: Record<string, number> = { ...direct };

  (parentCategories || []).forEach((parent) => {
    counts[parent._id] = categoryScopeIds(parent).reduce(
      (sum, id) => sum + (direct[id] || 0),
      0,
    );
    (parent.childrens || []).forEach((child) => {
      counts[child._id] = direct[child._id] || 0;
    });
  });

  return counts;
}
