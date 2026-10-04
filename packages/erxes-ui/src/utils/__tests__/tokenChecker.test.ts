// 실행: descriptionDraft.test.ts 머리 주석과 같은 방식(testMatch만 이 파일로)
import { isLoggedOutResponse } from '../tokenChecker';

describe('isLoggedOutResponse', () => {
  // 로그인 토큰(1일)이 만료되면 currentUser는 오류 없이 null을 돌려준다.
  // 이걸 만료로 보지 않으면 갱신 토큰(7일)을 쓰지 않고 로그인 화면으로 간다.
  it('currentUser가 null이면 로그인이 끊긴 것으로 본다', () => {
    expect(isLoggedOutResponse({ data: { currentUser: null } })).toBe(true);
  });

  it('"Login required" 오류도 로그인이 끊긴 것으로 본다', () => {
    expect(
      isLoggedOutResponse({
        data: { currentUser: null },
        errors: [{ message: 'Login required' }],
      }),
    ).toBe(true);
    expect(
      isLoggedOutResponse({ errors: [{ message: 'Login required' }] }),
    ).toBe(true);
  });

  it('사용자 정보가 있으면 로그인 상태다', () => {
    expect(isLoggedOutResponse({ data: { currentUser: { _id: 'u1' } } })).toBe(
      false,
    );
  });

  it('응답 모양을 알 수 없으면(서버 오류 등) 끊긴 것으로 단정하지 않는다', () => {
    expect(isLoggedOutResponse(null)).toBe(false);
    expect(isLoggedOutResponse({})).toBe(false);
    expect(
      isLoggedOutResponse({ errors: [{ message: 'Internal error' }] }),
    ).toBe(false);
  });
});
