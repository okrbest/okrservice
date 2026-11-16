// 실행: specs/007-stage-scroll-window/quickstart.md 1절 (widgets의 jest로 rootDir 지정)
import {
  appendItems,
  createBuffer,
  fillWindow,
  getWindow,
  hasBelow,
  removeOutsideWindow,
  replaceOutsideWindow,
  slideDown,
  slideUp,
  syncWindow,
} from '../stageWindow';

const make = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => ({ _id: `t${from + i}` }));
const ids = (items: { _id: string }[]) => items.map((item) => item._id);

describe('createBuffer', () => {
  it('20개 이하면 전부 창에 넣는다', () => {
    const buffer = createBuffer(make(0, 10));
    expect(buffer.start).toBe(0);
    expect(getWindow(buffer)).toHaveLength(10);
  });

  it('20개를 넘으면 앞 20개만 창에 넣는다', () => {
    const buffer = createBuffer(make(0, 30));
    expect(ids(getWindow(buffer))).toEqual(ids(make(0, 20)));
    expect(buffer.loaded).toHaveLength(30);
  });
});

describe('slideDown', () => {
  it('창이 20개 미만이면 시작 위치는 그대로 두고 채운다', () => {
    const buffer = appendItems(createBuffer(make(0, 10)), make(10, 30));
    const next = slideDown(buffer);
    expect(next.start).toBe(0);
    expect(ids(getWindow(next))).toEqual(ids(make(0, 20)));
  });

  it('창이 가득 차 있으면 10개 민다', () => {
    const next = slideDown(createBuffer(make(0, 40)));
    expect(next.start).toBe(10);
    expect(ids(getWindow(next))).toEqual(ids(make(10, 30)));
  });

  it('뒤에 남은 게 10개 미만이면 남은 만큼만 민다', () => {
    const next = slideDown(createBuffer(make(0, 25)));
    expect(next.start).toBe(5);
    expect(getWindow(next)).toHaveLength(20);
  });

  it('끝이면 변화 없다', () => {
    const buffer = createBuffer(make(0, 20));
    expect(slideDown(buffer)).toEqual(buffer);
  });
});

describe('slideUp', () => {
  it('10개 앞으로 간다', () => {
    const buffer = slideDown(slideDown(createBuffer(make(0, 60))));
    const next = slideUp(buffer);
    expect(next.start).toBe(10);
    expect(ids(getWindow(next))).toEqual(ids(make(10, 30)));
  });

  it('맨 앞이면 변화 없다', () => {
    const buffer = createBuffer(make(0, 40));
    expect(slideUp(buffer)).toEqual(buffer);
  });
});

describe('fillWindow', () => {
  it('창이 덜 찼으면 시작 위치는 그대로 두고 뒤만 채운다', () => {
    const slid = slideDown(createBuffer(make(0, 40))); // start 10, 창 t10~t29
    const shrunk = syncWindow(slid, make(11, 30)); // t10 삭제 → 창 19개
    const next = fillWindow(shrunk);
    expect(next.start).toBe(10);
    expect(ids(getWindow(next))).toEqual([...ids(make(11, 30)), 't30']);
  });

  it('창이 가득 차 있으면 변화 없다', () => {
    const buffer = createBuffer(make(0, 40));
    expect(fillWindow(buffer)).toBe(buffer);
  });
});

describe('hasBelow', () => {
  it('창 뒤에 보관분이 있는지 알려준다', () => {
    expect(hasBelow(createBuffer(make(0, 30)))).toBe(true);
    expect(hasBelow(createBuffer(make(0, 20)))).toBe(false);
  });
});

describe('appendItems', () => {
  it('이미 있는 카드는 다시 붙이지 않는다', () => {
    const buffer = appendItems(createBuffer(make(0, 10)), make(5, 15));
    expect(ids(buffer.loaded)).toEqual(ids(make(0, 15)));
  });
});

describe('syncWindow', () => {
  it('창 안에서 삭제·추가된 카드를 보관 목록에 반영한다', () => {
    const buffer = slideDown(createBuffer(make(0, 40))); // 창: t10~t29
    const windowItems = [{ _id: 'new' }, ...make(11, 30)]; // t10 삭제, new 추가
    const next = syncWindow(buffer, windowItems);
    expect(ids(next.loaded)).toEqual([
      ...ids(make(0, 10)),
      'new',
      ...ids(make(11, 40)),
    ]);
    expect(ids(getWindow(next))).toEqual(ids(windowItems));
  });

  it('창 밖에 같은 카드가 있으면 창 쪽을 남기고 밖에서는 지운다', () => {
    const buffer = slideDown(createBuffer(make(0, 40))); // 창: t10~t29
    const windowItems = [{ _id: 't35' }, ...make(10, 30)];
    const next = syncWindow(buffer, windowItems);
    expect(next.loaded.filter((item) => item._id === 't35')).toHaveLength(1);
    expect(next.start).toBe(10);
    expect(ids(getWindow(next))).toEqual(ids(windowItems));
  });
});

describe('replaceOutsideWindow', () => {
  it('창 밖 카드를 새 내용으로 바꾼다', () => {
    const buffer = createBuffer(make(0, 30));
    const next = replaceOutsideWindow(buffer, { _id: 't25', name: '수정' });
    expect(next.loaded[25]).toEqual({ _id: 't25', name: '수정' });
  });

  it('창 안 카드나 없는 카드는 건드리지 않는다', () => {
    const buffer = createBuffer(make(0, 30));
    expect(replaceOutsideWindow(buffer, { _id: 't5' })).toBe(buffer);
    expect(replaceOutsideWindow(buffer, { _id: 'none' })).toBe(buffer);
  });
});

describe('removeOutsideWindow', () => {
  it('창 앞 카드를 지우면 시작 위치가 하나 당겨진다', () => {
    const buffer = slideDown(createBuffer(make(0, 40))); // start 10
    const next = removeOutsideWindow(buffer, 't3');
    expect(next.start).toBe(9);
    expect(ids(getWindow(next))).toEqual(ids(getWindow(buffer)));
  });

  it('창 뒤 카드를 지우면 시작 위치는 그대로다', () => {
    const buffer = createBuffer(make(0, 30));
    const next = removeOutsideWindow(buffer, 't25');
    expect(next.start).toBe(0);
    expect(next.loaded).toHaveLength(29);
  });

  it('창 안 카드는 지우지 않는다 (화면 쪽 처리에 맡긴다)', () => {
    const buffer = createBuffer(make(0, 30));
    expect(removeOutsideWindow(buffer, 't5')).toBe(buffer);
  });
});

describe('불변성', () => {
  it('입력 버퍼를 바꾸지 않는다', () => {
    const buffer = createBuffer(make(0, 40));
    const snapshot = JSON.stringify(buffer);
    slideDown(buffer);
    slideUp(buffer);
    fillWindow(buffer);
    syncWindow(buffer, make(0, 5));
    appendItems(buffer, make(40, 50));
    removeOutsideWindow(buffer, 't30');
    replaceOutsideWindow(buffer, { _id: 't30' });
    expect(JSON.stringify(buffer)).toBe(snapshot);
  });
});
