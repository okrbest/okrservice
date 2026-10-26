import { buildThread, progressSteps } from '../progressHelpers';

describe('progressSteps', () => {
  const stages = [
    { _id: 's3', name: '처리 중', order: 2 },
    { _id: 's1', name: '접수', order: 0 },
    { _id: 's2', name: '확인 중', order: 1 },
    { _id: 'sx', name: '보관됨', order: 3, status: 'archived' },
    { _id: 's4', name: '완료', order: 4 },
  ];

  it('순서대로 늘어놓고 현재 단계 앞은 끝남, 현재는 진행, 뒤는 예정', () => {
    expect(progressSteps(stages, 's2')).toEqual([
      { _id: 's1', name: '접수', state: 'done' },
      { _id: 's2', name: '확인 중', state: 'now' },
      { _id: 's3', name: '처리 중', state: 'todo' },
      { _id: 's4', name: '완료', state: 'todo' },
    ]);
  });

  it('마지막 단계에 있으면 마지막도 끝남으로 보인다', () => {
    const steps = progressSteps(stages, 's4');
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('현재 단계를 못 찾거나 단계가 하나뿐이면 막대를 그리지 않는다', () => {
    expect(progressSteps(stages, 'nope')).toEqual([]);
    expect(
      progressSteps([{ _id: 's1', name: '접수', order: 0 }], 's1'),
    ).toEqual([]);
    expect(progressSteps(undefined, 's1')).toEqual([]);
  });
});

describe('buildThread', () => {
  const comment = (id: string, at: string, userType = 'team') =>
    ({ _id: id, createdAt: at, userType }) as any;
  const log = (id: string, at: string, action = 'moved') =>
    ({ _id: id, createdAt: at, action, contentType: 'tickets:ticket' }) as any;

  it('댓글과 기록을 시간순으로 섞고 날짜가 바뀔 때마다 구분선을 넣는다', () => {
    const thread = buildThread(
      [
        comment('c1', '2026-09-10T10:00:00Z'),
        comment('c2', '2026-09-25T12:50:00Z', 'client'),
      ],
      [log('l1', '2026-09-10T11:00:00Z')],
    );

    expect(
      thread.map((e) =>
        e.kind === 'day' ? `day:${e.date}` : `${e.kind}:${e.item._id}`,
      ),
    ).toEqual([
      'day:2026-09-10',
      'comment:c1',
      'event:l1',
      'day:2026-09-25',
      'comment:c2',
    ]);
  });

  it('고객이 쓴 댓글은 mine으로 표시한다', () => {
    const thread = buildThread(
      [comment('c1', '2026-09-10T10:00:00Z', 'client')],
      [],
    );
    const entry = thread.find((e) => e.kind === 'comment') as any;
    expect(entry.mine).toBe(true);
  });

  it('화면에 보일 내용이 없는 기록(알 수 없는 종류)은 뺀다', () => {
    const thread = buildThread(
      [],
      [log('l1', '2026-09-10T11:00:00Z', 'weird')],
    );
    expect(thread).toEqual([]);
  });
});
