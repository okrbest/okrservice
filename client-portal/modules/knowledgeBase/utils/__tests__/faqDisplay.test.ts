import {
  FAQ_SUGGESTED_KEYWORDS,
  articleHref,
  firstQueryValue,
  categoryTone,
  flattenCategories,
  pickManualLink,
  splitTitleTag,
  stripCategoryNumber,
} from '../faqDisplay';

describe('splitTitleTag', () => {
  it('제목 앞 [태그]를 떼어 낸다', () => {
    expect(splitTitleTag('[휴가] 휴가종류를 추가하고 싶어요.')).toEqual({
      tag: '휴가',
      text: '휴가종류를 추가하고 싶어요.',
    });
  });

  it('태그 뒤 띄어쓰기가 없어도 나눈다', () => {
    expect(splitTitleTag('[인사]실근속 연수와 근속연수의 차이')).toEqual({
      tag: '인사',
      text: '실근속 연수와 근속연수의 차이',
    });
  });

  it('태그가 없으면 제목만 돌려준다', () => {
    expect(splitTitleTag('저장할 때 자주 나오는 메시지')).toEqual({
      text: '저장할 때 자주 나오는 메시지',
    });
  });

  it('빈 태그 "[]"는 태그로 보지 않는다', () => {
    expect(splitTitleTag('[] 제목')).toEqual({ text: '[] 제목' });
  });

  it('태그만 있고 나머지가 비면 원문을 그대로 쓴다', () => {
    expect(splitTitleTag('[공지]')).toEqual({ text: '[공지]' });
    expect(splitTitleTag('[공지]   ')).toEqual({ text: '[공지]' });
  });

  it('빈 값이면 빈 제목을 돌려준다', () => {
    expect(splitTitleTag('')).toEqual({ text: '' });
    expect(splitTitleTag(undefined as any)).toEqual({ text: '' });
  });
});

describe('stripCategoryNumber', () => {
  it('분류 이름 앞 번호를 뗀다', () => {
    expect(stripCategoryNumber('1. 인사/조직')).toBe('인사/조직');
    expect(stripCategoryNumber('12.근태관리')).toBe('근태관리');
  });

  it('번호가 없으면 그대로 둔다', () => {
    expect(stripCategoryNumber('이런 메시지는?')).toBe('이런 메시지는?');
    expect(stripCategoryNumber('2024 연말정산')).toBe('2024 연말정산');
  });

  it('번호만 있으면 원문을 그대로 쓴다', () => {
    expect(stripCategoryNumber('1.')).toBe('1.');
  });
});

describe('categoryTone', () => {
  it('7가지 색을 순서대로 돌려 쓴다', () => {
    const tones = [0, 1, 2, 3, 4, 5, 6].map((i) => categoryTone(i).bg);
    expect(new Set(tones).size).toBe(7);
    expect(categoryTone(7)).toEqual(categoryTone(0));
  });

  it('바탕색과 아이콘색을 함께 준다', () => {
    const tone = categoryTone(0);
    expect(tone.bg).toMatch(/^#/);
    expect(tone.fg).toMatch(/^#/);
  });
});

describe('pickManualLink', () => {
  it('라벨에 "매뉴얼"이 든 링크를 고른다', () => {
    expect(
      pickManualLink({
        홈페이지: 'https://5240.cloud',
        '5240 매뉴얼': 'https://guide.5240.cloud/user',
      }),
    ).toEqual({ label: '5240 매뉴얼', url: 'https://guide.5240.cloud/user' });
  });

  it('"manual"은 대소문자를 가리지 않는다', () => {
    expect(
      pickManualLink({ Blog: 'https://a.com', 'User MANUAL': 'https://b.com' }),
    ).toEqual({ label: 'User MANUAL', url: 'https://b.com' });
  });

  it('http(s)가 아닌 주소는 건너뛴다', () => {
    expect(
      pickManualLink({ 매뉴얼: '/manual', 안내: 'https://c.com' }),
    ).toEqual({ label: '안내', url: 'https://c.com' });
  });

  it('매뉴얼 링크가 없으면 첫 http(s) 링크를 쓴다', () => {
    expect(
      pickManualLink({ 블로그: 'https://blog.com', 소개: 'https://x.com' }),
    ).toEqual({
      label: '블로그',
      url: 'https://blog.com',
    });
  });

  it('쓸 링크가 없으면 null', () => {
    expect(pickManualLink({})).toBeNull();
    expect(pickManualLink(undefined)).toBeNull();
    expect(pickManualLink({ 빈칸: '  ' })).toBeNull();
  });
});

describe('FAQ_SUGGESTED_KEYWORDS', () => {
  it('추천 검색어 5개가 정해진 순서로 있다', () => {
    expect(FAQ_SUGGESTED_KEYWORDS).toEqual([
      '연차',
      '근무유형',
      '급여명세서',
      '증명서',
      '결재라인',
    ]);
  });
});

describe('flattenCategories', () => {
  it('상위 분류 뒤에 하위 분류를 순서대로 붙이고 하위 여부를 표시한다', () => {
    const parents = [
      {
        _id: 'p1',
        title: '1. 인사',
        childrens: [{ _id: 'c1', title: '발령' }],
      },
      { _id: 'p2', title: '2. 근태', childrens: [] },
      { _id: 'p3', title: '이런 메시지는?' },
    ] as any;

    expect(
      flattenCategories(parents).map((x) => [x.category._id, x.isChild]),
    ).toEqual([
      ['p1', false],
      ['c1', true],
      ['p2', false],
      ['p3', false],
    ]);
  });

  it('값이 없으면 빈 배열', () => {
    expect(flattenCategories(undefined)).toEqual([]);
  });
});

describe('articleHref', () => {
  it('분류가 있으면 catId를 붙인다', () => {
    expect(articleHref({ _id: 'a1', categoryId: 'c1' })).toBe(
      '/knowledge-base/article?id=a1&catId=c1',
    );
  });

  it('분류가 없으면 id만', () => {
    expect(articleHref({ _id: 'a1' })).toBe('/knowledge-base/article?id=a1');
  });
});

describe('firstQueryValue', () => {
  it('주소 값이 여러 개면 첫 값을 쓴다', () => {
    expect(firstQueryValue(['연차', '급여'])).toBe('연차');
  });

  it('문자열은 그대로, 없으면 빈 문자열', () => {
    expect(firstQueryValue('연차')).toBe('연차');
    expect(firstQueryValue(undefined)).toBe('');
    expect(firstQueryValue([])).toBe('');
  });
});
