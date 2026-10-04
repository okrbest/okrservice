// 실행: richTextEditor/__tests__ 머리 주석과 같은 방식(testMatch만 이 파일로)
import {
  descriptionFingerprint,
  hasPendingDescriptionDraft,
  resolveDescriptionDraft,
  serializeDescriptionDraft,
} from '../descriptionDraft';

describe('descriptionFingerprint', () => {
  // 서버(plugin-tickets-api descriptionConflict)와 같은 값이 나와야 한다
  it('같은 예시에 대해 서버 쪽과 같은 지문을 만든다', () => {
    expect(descriptionFingerprint('<p>안녕하세요</p>')).toBe('c-1f5b565d');
    expect(descriptionFingerprint('')).toBe('0-811c9dc5');
  });

  it('빈 문단·앞뒤 공백 차이는 같은 내용으로 본다', () => {
    expect(descriptionFingerprint(' <p>a</p><p></p><p><br></p> ')).toBe(
      descriptionFingerprint('<p>a</p>'),
    );
  });
});

describe('resolveDescriptionDraft', () => {
  it('쓰던 글이 있으면 다시 열 때 복원한다', () => {
    const stored = serializeDescriptionDraft('<p>쓰던 답변</p>', '<p>원래</p>');
    expect(resolveDescriptionDraft(stored, '<p>원래</p>')).toEqual({
      content: '<p>쓰던 답변</p>',
      discardStorage: false,
    });
  });

  it('기본 규칙: 그 사이 서버 내용이 바뀌었으면 오래된 임시 저장은 버린다(충돌 확인이 없는 다른 편집기 보호)', () => {
    const stored = serializeDescriptionDraft('<p>쓰던 답변</p>', '<p>원래</p>');
    expect(resolveDescriptionDraft(stored, '<p>다른 사람이 바꿈</p>')).toEqual({
      content: '<p>다른 사람이 바꿈</p>',
      discardStorage: true,
    });
  });

  it('keepWhenServerChanged: 서버 내용이 바뀌었어도 쓰던 글을 지우지 않는다(티켓 설명 — 저장할 때 충돌 안내가 뜬다)', () => {
    const stored = serializeDescriptionDraft('<p>쓰던 답변</p>', '<p>원래</p>');
    expect(
      resolveDescriptionDraft(stored, '<p>다른 사람이 바꿈</p>', {
        keepWhenServerChanged: true,
      }),
    ).toEqual({
      content: '<p>쓰던 답변</p>',
      discardStorage: false,
    });
  });

  it('쓰던 글이 서버 내용과 같으면 임시 저장은 정리한다', () => {
    const stored = serializeDescriptionDraft('<p>같음</p>', '<p>원래</p>');
    expect(resolveDescriptionDraft(stored, '<p>같음</p>')).toEqual({
      content: '<p>같음</p>',
      discardStorage: true,
    });
  });

  it('임시 저장이 없으면 서버 내용', () => {
    expect(resolveDescriptionDraft(null, '<p>서버</p>')).toEqual({
      content: '<p>서버</p>',
      discardStorage: false,
    });
  });
});

describe('hasPendingDescriptionDraft', () => {
  // 편집창을 열기 전 화면에 "작성 중이던 글이 있어요" 안내를 띄울지
  it('서버 내용과 다른 임시 저장이 있으면 true', () => {
    const stored = serializeDescriptionDraft('<p>쓰던 답변</p>', '<p>원래</p>');
    expect(hasPendingDescriptionDraft(stored, '<p>원래</p>')).toBe(true);
    // 그 사이 서버 내용이 바뀌어도 편집창을 열면 쓰던 글이 채워지므로 안내한다
    expect(hasPendingDescriptionDraft(stored, '<p>다른 사람이 바꿈</p>')).toBe(
      true,
    );
  });

  it('임시 저장이 서버 내용과 같거나(빈 문단 차이 포함) 없으면 false', () => {
    expect(
      hasPendingDescriptionDraft(
        serializeDescriptionDraft('<p>같음</p><p></p>', ''),
        '<p>같음</p>',
      ),
    ).toBe(false);
    expect(hasPendingDescriptionDraft(null, '<p>서버</p>')).toBe(false);
  });

  it('예전 형식(글만 저장된 것)도 편집창이 채워 넣으므로 안내한다', () => {
    expect(
      hasPendingDescriptionDraft('<p>예전 형식 글</p>', '<p>서버</p>'),
    ).toBe(true);
  });
});
