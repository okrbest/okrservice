// 실행: specs/007-stage-scroll-window/quickstart.md 1절 (testMatch만 이 파일로)
import { applyItemAdds } from '../itemAdds';

const item = (_id: string) => ({ _id });
const ids = (items: { _id: string }[] = []) => items.map((i) => i._id);

describe('applyItemAdds', () => {
  it('위치 지정이 없으면 단계 맨 위에 넣는다 — 나중에 온 것이 더 위', () => {
    const { itemMap, addedIds } = applyItemAdds({ s1: [item('a')] }, [
      { stageId: 's1', item: item('n1') },
      { stageId: 's1', item: item('n2') },
    ]);

    expect(ids(itemMap.s1)).toEqual(['n2', 'n1', 'a']);
    expect(addedIds).toEqual(['n1', 'n2']);
  });

  it('위 카드가 있으면 그 바로 아래에 넣는다', () => {
    const { itemMap } = applyItemAdds({ s1: [item('a'), item('b')] }, [
      { stageId: 's1', item: item('n'), aboveItemId: 'a' },
    ]);

    expect(ids(itemMap.s1)).toEqual(['a', 'n', 'b']);
  });

  it('위 카드가 화면에 없으면 넣지 않는다 (기존 동작과 같음)', () => {
    const { itemMap, addedIds } = applyItemAdds({ s1: [item('a')] }, [
      { stageId: 's1', item: item('n'), aboveItemId: 'zzz' },
    ]);

    expect(ids(itemMap.s1)).toEqual(['a']);
    expect(addedIds).toEqual([]);
  });

  it('처음 보는 단계에도 넣고, 다른 단계는 그대로 둔다', () => {
    const before = { s1: [item('a')] };
    const { itemMap } = applyItemAdds(before, [
      { stageId: 's2', item: item('n') },
    ]);

    expect(ids(itemMap.s2)).toEqual(['n']);
    expect(itemMap.s1).toBe(before.s1);
  });

  it('이미 단계에 있는 카드(그 사이 다시 불러온 경우)는 또 넣지 않는다', () => {
    const { itemMap, addedIds } = applyItemAdds(
      { s1: [item('n'), item('a')] },
      [{ stageId: 's1', item: item('n') }],
    );

    expect(ids(itemMap.s1)).toEqual(['n', 'a']);
    expect(addedIds).toEqual([]);
  });

  it('원래 목록은 바꾸지 않는다', () => {
    const before = { s1: [item('a')] };
    applyItemAdds(before, [{ stageId: 's1', item: item('n') }]);

    expect(ids(before.s1)).toEqual(['a']);
  });
});
