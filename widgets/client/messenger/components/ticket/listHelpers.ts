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

export type StageTone =
  | 'gray'
  | 'blue'
  | 'purple'
  | 'teal'
  | 'orange'
  | 'green'
  | 'default';

type ToneStage = { _id: string; order?: number; status?: string };

// 가운데 단계에 차례로 쓰는 색(첫 단계 회색, 마지막 직전 주황, 마지막 초록 사이)
const MIDDLE_TONES: StageTone[] = ['blue', 'purple', 'teal'];

// 목록 뱃지 색: 파이프라인에서 몇 번째 단계인지로 정한다(단계 이름은 회사마다 달라 이름으로 정하지 않음).
// 첫 단계 회색, 마지막 단계 초록, 단계가 4개 이상이면 마지막 직전 주황, 그 사이는 파랑·보라·청록 순.
// 5단계: 회색·파랑·보라·주황·초록 / 4단계: 회색·파랑·주황·초록
export const stageTone = (
  stageId: string | undefined,
  stageName: string | undefined,
  stages: ToneStage[] | undefined,
): StageTone => {
  const visible = (stages || [])
    .filter((stage) => stage.status !== 'archived')
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const index = visible.findIndex((stage) => stage._id === stageId);

  if (index === -1) {
    return isDoneStage(stageName) ? 'green' : 'default';
  }

  const last = visible.length - 1;

  if (index === last) {
    return 'green';
  }

  if (index === 0) {
    return 'gray';
  }

  if (last >= 3 && index === last - 1) {
    return 'orange';
  }

  return MIDDLE_TONES[(index - 1) % MIDDLE_TONES.length];
};
