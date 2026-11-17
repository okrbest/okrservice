// 고객에게 보이는 단계 색 — 위젯(widgets/client/messenger/components/ticket/listHelpers.ts stageTone)과 같은 규칙.
// 첫 단계 회색, 마지막 단계 초록, 단계가 4개 이상이면 마지막 직전 주황, 그 사이는 파랑·보라·청록 순.
// 위젯 규칙을 바꾸면 여기도 함께 바꾼다(자동화 메일의 티켓 카드가 쓴다).

export type StageTone =
  | 'gray'
  | 'blue'
  | 'purple'
  | 'teal'
  | 'orange'
  | 'green'
  | 'default';

type ToneStage = { _id: string; order?: number; status?: string };

const MIDDLE_TONES: StageTone[] = ['blue', 'purple', 'teal'];

const DONE_NAME = /완료|종료|해결|닫힘|done|closed|resolved|complete/i;

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
    return DONE_NAME.test(stageName || '') ? 'green' : 'default';
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
