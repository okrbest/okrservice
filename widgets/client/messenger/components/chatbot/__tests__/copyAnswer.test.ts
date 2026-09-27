import { answerToPlainText, copyToClipboard } from '../copyAnswer';

describe('answerToPlainText', () => {
  it('강조·제목·코드 기호를 걷어낸다', () => {
    expect(
      answerToPlainText('## 9월 급여\n**기본급**은 `3,200,000원`이에요.'),
    ).toBe('9월 급여\n기본급은 3,200,000원이에요.');
  });

  it('링크는 글자만 남긴다', () => {
    expect(
      answerToPlainText('[급여명세서](https://hr.example.com/a) 참고'),
    ).toBe('급여명세서 참고');
  });

  it('표는 탭으로 구분한 줄로 바꾸고 구분줄은 뺀다', () => {
    const md =
      '| 항목 | 금액 |\n|---|---:|\n| 기본급 | 3,200,000 |\n| **합계** | 3,400,000 |';
    expect(answerToPlainText(md)).toBe(
      '항목\t금액\n기본급\t3,200,000\n합계\t3,400,000',
    );
  });

  it('viz 그래프 블록은 빼고 일반 코드 블록은 내용만 남긴다', () => {
    const md = '근무시간이에요.\n```viz\n{"type":"bar"}\n```\n```\nabc\n```';
    expect(answerToPlainText(md)).toBe('근무시간이에요.\nabc');
  });

  it('목록 기호는 유지한다', () => {
    expect(answerToPlainText('- 연차\n- 반차')).toBe('- 연차\n- 반차');
  });
});

describe('copyToClipboard', () => {
  const original = navigator.clipboard;
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      configurable: true,
    });
  });

  it('Clipboard API가 있으면 그것으로 복사한다', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('Clipboard API가 거부되면 execCommand로 대신 복사한다', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    (document as any).execCommand = jest.fn().mockReturnValue(true);
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('둘 다 안 되면 false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    (document as any).execCommand = jest.fn().mockReturnValue(false);
    await expect(copyToClipboard('abc')).resolves.toBe(false);
  });
});
