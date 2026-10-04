// ui-tickets에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/ui-tickets","testEnvironment":"node","moduleNameMapper":{"^@erxes/ui/(.*)$":"<rootDir>/../erxes-ui/$1"},"transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/src/boards/__tests__/descriptionHistory.test.ts"]}'
import {
  DescriptionHistoryKind,
  DescriptionHistoryMeta,
  HISTORY_LIMITS,
  buildHistoryMeta,
  describeHistoryEntry,
  planHistoryUpdate,
} from '../descriptionHistory';

const NOW = new Date('2026-10-02T09:00:00Z').getTime();
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

type Input = {
  id?: string;
  itemKey?: string;
  content?: string;
  kind?: DescriptionHistoryKind;
  savedAt?: number;
};

// 보관소에는 글 본문 대신 요약(크기·지문·미리보기)만 두고 규칙을 판단한다
const meta = (over: Input = {}) =>
  buildHistoryMeta({
    id: over.id || `e-${Math.random()}`,
    itemKey: over.itemKey || 'ticket_description_A',
    content: over.content ?? '<p>쓰던 답변</p>',
    kind: over.kind || 'auto',
    savedAt: over.savedAt ?? NOW - MINUTE,
  });

const entry = (over: Input = {}) => meta(over) as DescriptionHistoryMeta;

const add = (existing: DescriptionHistoryMeta[], over: Input = {}) =>
  planHistoryUpdate(existing, meta({ id: 'new', savedAt: NOW, ...over }), NOW);

describe('planHistoryUpdate', () => {
  it('새 글을 기록으로 추가한다', () => {
    const plan = add([], { content: '<p>첫 글</p>', kind: 'save' });

    expect(plan.add).toMatchObject({
      id: 'new',
      kind: 'save',
      preview: '첫 글',
      imageCount: 0,
      size: '<p>첫 글</p>'.length,
    });
    expect(plan.removeIds).toEqual([]);
  });

  it('빈 글은 남기지 않는다', () => {
    expect(add([], { content: '' }).add).toBeNull();
    expect(add([], { content: '<p></p><p><br></p>' }).add).toBeNull();
  });

  it('그 티켓의 바로 앞 기록과 글이 같으면 새로 남기지 않는다', () => {
    const existing = [
      entry({
        id: 'old',
        content: '<p>같은 글</p>',
        savedAt: NOW - 5 * MINUTE,
      }),
    ];

    expect(add(existing, { content: '<p>같은 글</p>' }).add).toBeNull();
    // 빈 문단 차이는 같은 글로 본다
    expect(add(existing, { content: '<p>같은 글</p><p></p>' }).add).toBeNull();
    expect(add(existing, { content: '<p>다른 글</p>' }).add).not.toBeNull();
  });

  it('다른 티켓의 기록과 글이 같은 것은 상관없이 남긴다', () => {
    const existing = [
      entry({ itemKey: 'ticket_description_B', content: '<p>같은 글</p>' }),
    ];

    expect(add(existing, { content: '<p>같은 글</p>' }).add).not.toBeNull();
  });

  it('7일 지난 기록은 지운다', () => {
    const existing = [
      entry({ id: 'fresh', content: '<p>1</p>', savedAt: NOW - 6 * DAY }),
      entry({ id: 'stale', content: '<p>2</p>', savedAt: NOW - 8 * DAY }),
    ];

    expect(planHistoryUpdate(existing, null, NOW).removeIds).toEqual(['stale']);
  });

  it('티켓당 최근 10개만 남기고 오래된 것부터 지운다', () => {
    const existing = Array.from({ length: HISTORY_LIMITS.perItem }, (_, i) =>
      entry({
        id: `a${i}`,
        content: `<p>${i}</p>`,
        savedAt: NOW - (i + 1) * MINUTE,
      }),
    );
    const plan = add(existing, { content: '<p>새 글</p>' });

    expect(plan.add).not.toBeNull();
    expect(plan.removeIds).toEqual([`a${HISTORY_LIMITS.perItem - 1}`]);
  });

  it('전체 50개를 넘으면 티켓에 상관없이 가장 오래된 것부터 지운다', () => {
    const existing = Array.from({ length: HISTORY_LIMITS.total }, (_, i) =>
      entry({
        id: `t${i}`,
        itemKey: `ticket_description_${i % 10}`,
        content: `<p>${i}</p>`,
        savedAt: NOW - (i + 1) * MINUTE,
      }),
    );
    const plan = add(existing, {
      itemKey: 'ticket_description_new',
      content: '<p>새 글</p>',
    });

    expect(plan.removeIds).toEqual([`t${HISTORY_LIMITS.total - 1}`]);
  });

  it('사진 때문에 전체 용량 한도를 넘으면 오래된 것부터 지운다(새 글은 남긴다)', () => {
    const big = 'x'.repeat(HISTORY_LIMITS.totalChars / 2);
    const existing = [
      entry({
        id: 'older',
        content: `<p>${big}1</p>`,
        savedAt: NOW - 3 * MINUTE,
      }),
      entry({
        id: 'newer',
        itemKey: 'ticket_description_B',
        content: `<p>${big}2</p>`,
        savedAt: NOW - 2 * MINUTE,
      }),
    ];
    const plan = add(existing, { content: '<p>새 글</p>' });

    expect(plan.add).not.toBeNull();
    expect(plan.removeIds).toEqual(['older']);
  });

  it('한 건이 전체 용량 한도보다 크면 남기지 않는다', () => {
    const tooBig = `<p>${'x'.repeat(HISTORY_LIMITS.totalChars + 1)}</p>`;

    expect(add([], { content: tooBig }).add).toBeNull();
  });
});

describe('describeHistoryEntry', () => {
  it('목록에 보여 줄 앞부분 글만 뽑는다(태그 제거, 공백 정리)', () => {
    expect(
      describeHistoryEntry(
        '<p>안녕하세요&nbsp;고객님</p><p>확인  후 <b>답변</b>드리겠습니다</p>',
      ),
    ).toEqual({
      preview: '안녕하세요 고객님 확인 후 답변드리겠습니다',
      imageCount: 0,
    });
  });

  it('사진은 글 대신 개수로 알려 준다', () => {
    expect(
      describeHistoryEntry(
        '<p>화면 첨부</p><img src="data:image/png;base64,AAAA"><p><img src="https://a/b.png"></p>',
      ),
    ).toEqual({ preview: '화면 첨부', imageCount: 2 });
  });

  it('긴 글은 60자에서 자른다', () => {
    const { preview } = describeHistoryEntry(`<p>${'가'.repeat(100)}</p>`);

    expect(preview).toBe(`${'가'.repeat(60)}…`);
  });
});
