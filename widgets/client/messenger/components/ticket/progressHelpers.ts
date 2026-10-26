import dayjs from 'dayjs';

import { ITicketActivityLog, ITicketComment } from '../../types';
import { StageTone, stageTone } from './listHelpers';

// 위젯 "티켓 진행 상황" 화면용 순수 도우미 — 단계 막대와 대화 타임라인

export type WidgetStage = {
  _id: string;
  name: string;
  order?: number;
  status?: string;
};

export type ProgressStep = {
  _id: string;
  name: string;
  state: 'done' | 'now' | 'todo';
};

// 파이프라인 단계를 순서대로 늘어놓고 현재 단계를 기준으로 끝남/진행/예정을 매긴다.
// 마지막 단계에 도착하면 끝까지 채운다. 현재 단계를 못 찾거나 단계가 하나뿐이면 막대를 그리지 않는다.
export const progressSteps = (
  stages: WidgetStage[] | undefined,
  currentStageId?: string,
): ProgressStep[] => {
  const visible = (stages || [])
    .filter((stage) => stage.status !== 'archived')
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentIndex = visible.findIndex(
    (stage) => stage._id === currentStageId,
  );

  if (currentIndex === -1 || visible.length < 2) {
    return [];
  }

  const reachedEnd = currentIndex === visible.length - 1;

  return visible.map((stage, index) => ({
    _id: stage._id,
    name: stage.name,
    state:
      index < currentIndex || (reachedEnd && index === currentIndex)
        ? 'done'
        : index === currentIndex
          ? 'now'
          : 'todo',
  }));
};

// 진행 상황 카드의 단계 색 — 목록 뱃지(listHelpers.stageTone)와 같은 색.
// 단계 막대는 이미 순서대로 놓여 있으므로 그 순서를 그대로 넘긴다.
export const progressTone = (
  steps: ProgressStep[],
  stage?: { _id?: string; name?: string } | null,
): StageTone =>
  stageTone(
    stage?._id,
    stage?.name,
    steps.map((step, order) => ({ _id: step._id, order })),
  );

// 고객에게 보여줄 만한 기록만(티켓 생성·단계 이동·담당자 지정)
const SHOWN_EVENTS = ['create', 'moved', 'assignee'];

const eventAction = (log: ITicketActivityLog) =>
  log.action || (log.contentType || '').split(':')[1];

export type ThreadEntry =
  | { kind: 'day'; date: string }
  | { kind: 'comment'; item: ITicketComment; mine: boolean }
  | { kind: 'event'; item: ITicketActivityLog };

// 댓글과 기록을 시간순으로 섞고, 날짜가 바뀔 때마다 날짜 구분선을 넣는다
export const buildThread = (
  comments: ITicketComment[] = [],
  logs: ITicketActivityLog[] = [],
): ThreadEntry[] => {
  const items = [
    ...comments.map((item) => ({
      at: item.createdAt,
      entry: {
        kind: 'comment',
        item,
        mine: item.userType === 'client',
      } as ThreadEntry,
    })),
    ...logs
      .filter((log) => SHOWN_EVENTS.includes(eventAction(log)))
      .map((item) => ({
        at: item.createdAt,
        entry: { kind: 'event', item } as ThreadEntry,
      })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const thread: ThreadEntry[] = [];
  let lastDate = '';

  items.forEach(({ at, entry }) => {
    const date = dayjs(at).format('YYYY-MM-DD');

    if (date !== lastDate) {
      thread.push({ kind: 'day', date });
      lastDate = date;
    }

    thread.push(entry);
  });

  return thread;
};
