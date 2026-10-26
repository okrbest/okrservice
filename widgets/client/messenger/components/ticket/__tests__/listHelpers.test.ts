import { isDoneStage, isRecent, previewText, stageTone } from '../listHelpers';

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

describe('stageTone', () => {
  const pipeline = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      _id: `s${i + 1}`,
      name: `${i + 1}단계`,
      order: i + 1,
    }));
  const tones = (n: number) =>
    pipeline(n).map((stage) => stageTone(stage._id, stage.name, pipeline(n)));

  it('5단계: 회색 → 파랑 → 보라 → 주황 → 초록', () => {
    expect(tones(5)).toEqual(['gray', 'blue', 'purple', 'orange', 'green']);
  });

  it('4단계: 보라가 빠진다', () => {
    expect(tones(4)).toEqual(['gray', 'blue', 'orange', 'green']);
  });

  it('3단계·2단계', () => {
    expect(tones(3)).toEqual(['gray', 'blue', 'green']);
    expect(tones(2)).toEqual(['gray', 'green']);
  });

  it('6단계 이상이면 가운데를 파랑·보라·청록 순으로 채운다', () => {
    expect(tones(6)).toEqual([
      'gray',
      'blue',
      'purple',
      'teal',
      'orange',
      'green',
    ]);
  });

  it('순서 값으로 정렬하고 보관된 단계는 세지 않는다', () => {
    const stages = [
      { _id: 'c', name: '완료', order: 9 },
      { _id: 'old', name: '예전', order: 2, status: 'archived' },
      { _id: 'a', name: '요청', order: 1 },
      { _id: 'b', name: '접수', order: 5 },
    ];
    expect(['a', 'b', 'c'].map((id) => stageTone(id, '', stages))).toEqual([
      'gray',
      'blue',
      'green',
    ]);
  });

  it('단계 목록을 아직 모르거나 목록에 없는 단계는 기본색, 단 이름이 완료면 초록', () => {
    expect(stageTone('x', '접수', undefined)).toBe('default');
    expect(stageTone('x', '접수', pipeline(4))).toBe('default');
    expect(stageTone('x', '처리 완료', undefined)).toBe('green');
  });
});
