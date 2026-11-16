// 실시간으로 들어온 새 카드를 모아 한 번에 단계 목록에 넣는다.
// 카드마다 따로 넣으면 들어올 때마다 보드와 열린 상세 창이 다시 그려진다.
export type PendingItemAdd<T> = {
  stageId: string;
  item: T;
  aboveItemId?: string;
};

const insertItem = <T extends { _id: string }>(
  items: T[],
  { item, aboveItemId }: PendingItemAdd<T>,
): T[] | null => {
  // 기다리는 사이 단계를 다시 불러와 이미 들어와 있으면 또 넣지 않는다
  if (items.some((i) => i._id === item._id)) {
    return null;
  }

  if (!aboveItemId) {
    return [item, ...items];
  }

  const aboveIndex = items.findIndex((i) => i._id === aboveItemId);

  if (aboveIndex === -1) {
    return null;
  }

  return [
    ...items.slice(0, aboveIndex + 1),
    item,
    ...items.slice(aboveIndex + 1),
  ];
};

export const applyItemAdds = <T extends { _id: string }>(
  itemMap: Record<string, T[]>,
  adds: PendingItemAdd<T>[],
) =>
  adds.reduce(
    (result, add) => {
      const next = insertItem(result.itemMap[add.stageId] || [], add);

      if (!next) {
        return result;
      }

      return {
        itemMap: { ...result.itemMap, [add.stageId]: next },
        addedIds: [...result.addedIds, add.item._id],
      };
    },
    { itemMap, addedIds: [] as string[] },
  );
