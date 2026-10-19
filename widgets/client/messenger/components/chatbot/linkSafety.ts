// 답변 속 [텍스트](주소) 링크의 주소 검사 (teamplgpt specs/018 보안 리뷰 M1).
// 주소를 검사하지 않으면 "[공지](javascript:…)"가 클릭하면 실행되는 링크가 된다(React 18은 경고만 한다).
// 허용: http(s), mailto. 그 밖(javascript:, data:, 상대·프로토콜 상대 주소 등)은 링크로 만들지 않는다.

const SAFE_SCHEME_RE = /^(https?:\/\/|mailto:)/i;

/**
 * @param raw - 마크다운 링크의 주소 부분
 * @returns 안전한 주소(앞뒤 공백 제거) 또는 null(링크로 만들지 말 것)
 */
export const safeHref = (raw: string): string | null => {
  const url = (raw || '').trim();
  // 제어 문자·공백이 섞인 주소("java\tscript:")는 브라우저가 지워 해석하므로 통째로 거부한다
  if (/[\u0000-\u001f\u007f\s]/.test(url)) return null;
  return SAFE_SCHEME_RE.test(url) ? url : null;
};
