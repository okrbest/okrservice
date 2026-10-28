import { createSeededRandom, pickTopArticles } from '../faqRanking';

const make = (id: string, viewCount = 0) => ({ _id: id, viewCount });
const ids = (list: { _id: string }[]) => list.map((a) => a._id);
const many = (n: number) => Array.from({ length: n }, (_, i) => make(`a${i}`));

describe('createSeededRandom', () => {
  it('같은 시드면 같은 수열을 낸다', () => {
    const r1 = createSeededRandom(42);
    const r2 = createSeededRandom(42);
    const s1 = [r1(), r1(), r1()];
    const s2 = [r2(), r2(), r2()];
    expect(s1).toEqual(s2);
  });

  it('0 이상 1 미만의 수를 낸다', () => {
    const r = createSeededRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pickTopArticles', () => {
  it('조회수가 있는 글을 많은 순서로 먼저 놓는다', () => {
    const list = [make('a', 3), make('b', 0), make('c', 9), make('d', 5)];
    const picked = pickTopArticles(list, 3, createSeededRandom(1));
    expect(ids(picked)).toEqual(['c', 'd', 'a']);
  });

  it('조회수가 같으면 원래 순서를 따른다', () => {
    const list = [make('a', 2), make('b', 2), make('c', 2)];
    expect(ids(pickTopArticles(list, 3, createSeededRandom(1)))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('모자라는 자리는 나머지 글로 채우고 중복이 없다', () => {
    const list = [make('a', 0), make('b', 4), make('c', 0), make('d', 0)];
    const picked = pickTopArticles(list, 3, createSeededRandom(5));
    expect(picked).toHaveLength(3);
    expect(picked[0]._id).toBe('b');
    expect(new Set(ids(picked)).size).toBe(3);
    picked.slice(1).forEach((a) => expect(['a', 'c', 'd']).toContain(a._id));
  });

  it('같은 시드면 같은 결과를 낸다', () => {
    const list = many(68);
    const first = ids(pickTopArticles(list, 6, createSeededRandom(123)));
    const second = ids(pickTopArticles(list, 6, createSeededRandom(123)));
    expect(first).toEqual(second);
  });

  it('시드가 다르면 무작위로 다른 글이 뽑힌다', () => {
    const list = many(68);
    const results = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        ids(pickTopArticles(list, 6, createSeededRandom(seed))).join(','),
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('조회수가 모두 0이면 등록 순서 그대로가 아니라 섞인다', () => {
    const list = many(68);
    const picked = ids(pickTopArticles(list, 6, createSeededRandom(99)));
    expect(picked).not.toEqual(['a0', 'a1', 'a2', 'a3', 'a4', 'a5']);
  });

  it('후보보다 많이 달라고 하면 후보 수만큼만 준다', () => {
    const list = [make('a'), make('b')];
    expect(pickTopArticles(list, 5, createSeededRandom(1))).toHaveLength(2);
  });

  it('제외할 글은 고르지 않는다', () => {
    const list = [make('a', 9), make('b', 1), make('c')];
    const picked = pickTopArticles(list, 3, createSeededRandom(1), ['a']);
    expect(ids(picked)).not.toContain('a');
    expect(picked).toHaveLength(2);
  });

  it('빈 목록이면 빈 배열', () => {
    expect(pickTopArticles([], 3, createSeededRandom(1))).toEqual([]);
  });

  it('입력 배열을 바꾸지 않는다', () => {
    const list = [make('a', 1), make('b', 0), make('c', 3)];
    const copy = list.map((a) => ({ ...a }));
    pickTopArticles(list, 3, createSeededRandom(1));
    expect(list).toEqual(copy);
  });

  it('조회수 값이 없는 글은 0으로 본다', () => {
    const list = [{ _id: 'a' }, { _id: 'b', viewCount: 2 }];
    expect(pickTopArticles(list, 1, createSeededRandom(1))[0]._id).toBe('b');
  });
});
