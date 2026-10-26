// 위젯 티켓 목록 줄 표시용 순수 도우미

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;

// 목록 미리보기: 태그·사진을 빼고 글만 한 줄(길면 말줄임)
export const previewText = (html?: string | null, max = 80): string => {
  const text = (html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;| /gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const DONE_NAME = /완료|종료|해결|닫힘|done|closed|resolved|complete/i;

// 끝난 티켓(초록 표시): 단계 이름이나 상태로 판단
export const isDoneStage = (stageName?: string, status?: string): boolean =>
  DONE_NAME.test(stageName || '') ||
  /^(closed|resolved|done)$/i.test(status || '');

// 7일 안이면 "3일 전"처럼, 그보다 오래되면 날짜로 보인다
export const isRecent = (
  date?: string | Date,
  now: Date = new Date(),
): boolean => {
  if (!date) {
    return false;
  }

  const diff = now.getTime() - new Date(date).getTime();

  return diff >= 0 && diff < RECENT_DAYS * DAY_MS;
};
