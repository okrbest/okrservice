import { findKeywordMatch, getMenusForText } from '../chatbotMenuMatch';

describe('chatbotMenuMatch', () => {
  it('키워드가 없으면 매칭 없음', () => {
    expect(findKeywordMatch('안녕하세요')).toBeNull();
    expect(getMenusForText('안녕하세요')).toEqual([]);
  });

  it('두 글자 미만이면 매칭 없음', () => {
    expect(findKeywordMatch('급')).toBeNull();
  });

  it('문장 속 키워드로 메뉴를 찾는다', () => {
    expect(getMenusForText('급여명세서 보고 싶어요').map((m) => m.id)).toEqual([
      'salary',
    ]);
  });

  it('메뉴가 연결되지 않은 조회 전용 키워드는 질문만 있고 메뉴는 없다', () => {
    const match = findKeywordMatch('대출금 현황 알려줘');
    expect(match).not.toBeNull();
    expect(getMenusForText('대출금 현황 알려줘')).toEqual([]);
  });

  it('메뉴 순서는 연결표에 적힌 순서를 따른다', () => {
    expect(getMenusForText('탄력근무 신청할래요').map((m) => m.id)).toEqual([
      'worktype',
      'flex2w',
      'flex3w',
      'flexmonth',
    ]);
  });
});
