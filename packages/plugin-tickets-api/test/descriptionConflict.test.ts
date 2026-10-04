// tickets-api에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"}}]},"testMatch":["<rootDir>/test/descriptionConflict.test.ts"]}'
import {
  descriptionFingerprint,
  hasDescriptionConflict,
} from '../src/descriptionConflict';

describe('descriptionFingerprint', () => {
  // 화면(erxes-ui utils/descriptionDraft)과 같은 값이 나와야 한다 — 양쪽 테스트가 같은 예시를 쓴다
  it('같은 예시에 대해 화면 쪽과 같은 지문을 만든다', () => {
    expect(descriptionFingerprint('<p>안녕하세요</p>')).toBe('c-1f5b565d');
    expect(descriptionFingerprint('')).toBe('0-811c9dc5');
  });

  it('빈 문단·앞뒤 공백 차이는 같은 내용으로 본다', () => {
    expect(descriptionFingerprint(' <p>a</p><p></p><p><br></p> ')).toBe(
      descriptionFingerprint('<p>a</p>'),
    );
    expect(descriptionFingerprint(null)).toBe(descriptionFingerprint(''));
  });

  it('내용이 다르면 지문도 다르다', () => {
    expect(descriptionFingerprint('<p>a</p>')).not.toBe(
      descriptionFingerprint('<p>b</p>'),
    );
  });
});

describe('hasDescriptionConflict', () => {
  const now = new Date('2026-10-02T03:00:00Z');
  const later = new Date('2026-10-02T03:05:00Z');

  it('담당자·날짜 변경이나 자동화로 수정 시각만 바뀌고 설명이 그대로면 충돌이 아니다', () => {
    expect(
      hasDescriptionConflict({
        expectedDescriptionHash: descriptionFingerprint('<p>원래 내용</p>'),
        expectedModifiedAt: now,
        currentDescription: '<p>원래 내용</p>',
        currentModifiedAt: later,
      }),
    ).toBe(false);
  });

  it('그 사이 다른 사람이 설명을 바꿨으면 충돌이다', () => {
    expect(
      hasDescriptionConflict({
        expectedDescriptionHash: descriptionFingerprint('<p>원래 내용</p>'),
        expectedModifiedAt: now,
        currentDescription: '<p>다른 사람이 바꾼 내용</p>',
        currentModifiedAt: later,
      }),
    ).toBe(true);
  });

  it('같은 글이 이미 저장돼 있으면(응답이 늦어 다시 저장을 누른 경우) 충돌이 아니다', () => {
    expect(
      hasDescriptionConflict({
        expectedDescriptionHash: descriptionFingerprint('<p>원래 내용</p>'),
        expectedModifiedAt: now,
        currentDescription: '<p>내가 방금 저장한 답변</p>',
        currentModifiedAt: later,
        newDescription: '<p>내가 방금 저장한 답변</p>',
      }),
    ).toBe(false);
  });

  it('지문을 보내지 않는 예전 화면은 기존처럼 수정 시각(1초 넘게 차이)으로 판단한다', () => {
    expect(
      hasDescriptionConflict({
        expectedModifiedAt: now,
        currentDescription: 'x',
        currentModifiedAt: later,
      }),
    ).toBe(true);
    expect(
      hasDescriptionConflict({
        expectedModifiedAt: now,
        currentDescription: 'x',
        currentModifiedAt: new Date(now.getTime() + 500),
      }),
    ).toBe(false);
  });

  it('비교할 정보가 없으면 충돌로 보지 않는다', () => {
    expect(
      hasDescriptionConflict({
        currentDescription: 'x',
        currentModifiedAt: later,
      }),
    ).toBe(false);
    expect(
      hasDescriptionConflict({
        expectedModifiedAt: now,
        currentDescription: 'x',
      }),
    ).toBe(false);
  });
});
