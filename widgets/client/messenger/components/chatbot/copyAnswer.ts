// 챗봇 답변 복사 — 마크다운 답변을 붙여넣기 좋은 평문으로 바꾸고 클립보드에 쓴다.

const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const stripInline = (line: string): string =>
  line
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [글자](주소) → 글자
    .replace(/\*\*|__/g, '')
    .replace(/`/g, '');

// 표는 탭 구분(엑셀·시트에 표로 붙음), 구분줄 제거.
// ```viz 그래프 블록은 글자로 의미가 없어 빼고, 일반 코드 블록은 내용만 남긴다.
export const answerToPlainText = (markdown: string): string => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let skipCode = false;

  for (const line of lines) {
    const fence = line.trim().match(/^```(\w*)/);
    if (fence) {
      if (!inCode) {
        inCode = true;
        const lang = fence[1].toLowerCase();
        skipCode = lang === 'viz';
      } else {
        inCode = false;
        skipCode = false;
      }
      continue;
    }

    if (inCode) {
      if (!skipCode) out.push(line);
      continue;
    }

    if (TABLE_SEPARATOR_RE.test(line) && line.includes('-')) {
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => stripInline(cell.trim()));
      out.push(cells.join('\t'));
      continue;
    }

    out.push(stripInline(line.replace(/^\s{0,3}#{1,6}\s+/, '')));
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Clipboard API가 안 되는 환경(권한 없는 iframe, 오래된 앱 웹뷰)은 execCommand로 대신한다
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // 아래 대체 방법으로 넘어간다
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
};
