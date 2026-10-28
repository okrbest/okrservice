import {
  categoryScopeIds,
  countArticlesByCategory,
  findCategoryPath,
  topicCategoryIds,
} from '../faqCategories';

const topic = {
  parentCategories: [
    { _id: 'p1', title: '1. 인사', childrens: [{ _id: 'c1', title: '발령' }] },
    { _id: 'p2', title: '2. 근태', childrens: [] },
  ],
  categories: [
    { _id: 'p1' },
    { _id: 'c1' },
    { _id: 'p2' },
    { _id: 'g1', title: '3단계 분류' },
  ],
} as any;

describe('categoryScopeIds', () => {
  it('상위 분류는 자기와 하위 분류 id를 함께 돌려준다', () => {
    expect(categoryScopeIds(topic.parentCategories[0])).toEqual(['p1', 'c1']);
  });

  it('하위가 없으면 자기 id만', () => {
    expect(categoryScopeIds(topic.parentCategories[1])).toEqual(['p2']);
    expect(categoryScopeIds({ _id: 'x' } as any)).toEqual(['x']);
  });
});

describe('findCategoryPath', () => {
  it('상위 분류를 찾는다', () => {
    const path = findCategoryPath(topic, 'p2');
    expect(path?.category._id).toBe('p2');
    expect(path?.parent).toBeUndefined();
  });

  it('하위 분류는 상위 분류와 함께 찾는다', () => {
    const path = findCategoryPath(topic, 'c1');
    expect(path?.category._id).toBe('c1');
    expect(path?.parent?._id).toBe('p1');
  });

  it('펼친 목록에 없으면 주제의 전체 분류 목록에서 찾는다', () => {
    expect(findCategoryPath(topic, 'g1')?.category._id).toBe('g1');
  });

  it('없는 분류면 null', () => {
    expect(findCategoryPath(topic, 'nope')).toBeNull();
    expect(findCategoryPath(topic, '')).toBeNull();
  });
});

describe('topicCategoryIds', () => {
  it('주제의 모든 분류 id를 정렬해 돌려준다', () => {
    expect(topicCategoryIds(topic)).toEqual(['c1', 'g1', 'p1', 'p2']);
  });

  it('분류가 없으면 빈 배열', () => {
    expect(topicCategoryIds({} as any)).toEqual([]);
  });
});

describe('countArticlesByCategory', () => {
  const articles = [
    { categoryId: 'p1' },
    { categoryId: 'c1' },
    { categoryId: 'c1' },
    { categoryId: 'p2' },
    { categoryId: 'zz' },
  ] as any;

  it('분류마다 질문 수를 세고, 상위 분류에는 하위 분류 수를 더한다', () => {
    const counts = countArticlesByCategory(articles, topic.parentCategories);
    expect(counts.p1).toBe(3);
    expect(counts.c1).toBe(2);
    expect(counts.p2).toBe(1);
  });

  it('글이 없는 분류는 0', () => {
    expect(countArticlesByCategory([], topic.parentCategories).p2).toBe(0);
  });
});
