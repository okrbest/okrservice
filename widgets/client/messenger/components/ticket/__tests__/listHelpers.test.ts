import { isDoneStage, isRecent, previewText } from '../listHelpers';

describe('previewText', () => {
  it('태그·사진을 빼고 글만 한 줄로', () => {
    expect(
      previewText(
        '<p>6월 명세서가</p><p><img src="x.png">열리지&nbsp;않아요</p>',
      ),
    ).toBe('6월 명세서가 열리지 않아요');
  });

  it('길면 자르고 말줄임', () => {
    expect(previewText('가'.repeat(150), 10)).toBe(`${'가'.repeat(10)}…`);
  });

  it('비어 있으면 빈 문자열', () => {
    expect(previewText(undefined)).toBe('');
    expect(previewText('<p><br></p>')).toBe('');
  });
});

describe('isDoneStage', () => {
  it('완료·종료·해결 같은 이름이나 닫힌 상태는 끝난 티켓', () => {
    expect(isDoneStage('완료')).toBe(true);
    expect(isDoneStage('처리 완료')).toBe(true);
    expect(isDoneStage('종료')).toBe(true);
    expect(isDoneStage('Resolved')).toBe(true);
    expect(isDoneStage('접수', 'closed')).toBe(true);
  });

  it('진행 중 단계는 아니다', () => {
    expect(isDoneStage('접수')).toBe(false);
    expect(isDoneStage('처리 중', 'active')).toBe(false);
    expect(isDoneStage(undefined)).toBe(false);
  });
});

describe('isRecent', () => {
  const now = new Date('2026-09-28T12:00:00Z');

  it('7일 안이면 "3일 전"처럼, 그보다 오래되면 날짜로', () => {
    expect(isRecent('2026-09-25T12:00:00Z', now)).toBe(true);
    expect(isRecent('2026-09-20T12:00:00Z', now)).toBe(false);
    expect(isRecent(undefined, now)).toBe(false);
  });
});
