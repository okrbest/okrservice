import { safeHref } from '../linkSafety';

// 답변 속 [텍스트](주소)는 주소를 검사해 안전한 것만 링크로 만든다 (teamplgpt specs/018 보안 리뷰 M1)
describe('safeHref', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['http://example.com', 'http://example.com'],
    ['mailto:hr@example.com', 'mailto:hr@example.com'],
    ['  https://example.com  ', 'https://example.com'],
  ])('허용: %p', (input, expected) => {
    expect(safeHref(input)).toBe(expected);
  });

  it.each([
    ['javascript:alert(1)'],
    ['JavaScript:alert(1)'],
    [' javascript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['//evil.example'],
    ['/relative/path'],
    [''],
  ])('거부: %p', (input) => {
    expect(safeHref(input)).toBeNull();
  });
});
