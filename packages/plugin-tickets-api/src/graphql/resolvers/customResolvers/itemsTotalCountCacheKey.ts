// 단계별 티켓 수 캐시 키 — 개수를 바꾸는 필터는 모두 키에 넣는다.
// 일부 필터만 넣으면 필터를 바꾼 직후 이전 개수가 재사용돼 "Load more (20 / 150)"처럼
// 실제보다 많은 개수가 보이고, 눌러도 더 불러올 티켓이 없다.

const isEmpty = (value: any) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

// 객체 키는 정렬하고, 값만 담긴 배열(id 목록 등)은 순서와 무관하게 같은 키가 되도록 정렬
const normalize = (value: any): any => {
  if (Array.isArray(value)) {
    const items = value.map(normalize);
    const isPrimitiveList = items.every((item) => typeof item !== 'object');

    return isPrimitiveList ? [...items].sort() : items;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .filter((name) => !isEmpty(value[name]))
      .reduce(
        (acc, name) => ({ ...acc, [name]: normalize(value[name]) }),
        {} as Record<string, any>,
      );
  }

  return value;
};

export const getItemsTotalCountCacheKey = (
  stageId: string,
  userId: string,
  args: any,
): string => `${stageId}:${userId}:${JSON.stringify(normalize(args || {}))}`;
