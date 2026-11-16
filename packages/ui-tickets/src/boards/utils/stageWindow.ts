// 단계 컬럼 스크롤 창 계산 — 서버에서 받은 카드는 전부 보관하고, 화면에는 최대 WINDOW_SIZE개만 그린다.
// 위로 돌아갈 때는 보관분을 쓰므로 서버 요청이 없다. 모든 함수는 입력을 바꾸지 않는다.

export const WINDOW_SIZE = 20;
export const SLIDE_STEP = 10;

type Identified = { _id: string };

export type StageBuffer<T extends Identified> = {
  /** 서버에서 받은 카드 전체, 서버 순서 */
  loaded: T[];
  /** 화면 첫 카드의 loaded 인덱스 */
  start: number;
  /** 화면 카드 수 */
  windowLength: number;
};

const withoutIds = <T extends Identified>(items: T[], idSet: Set<string>) =>
  items.filter((item) => !idSet.has(item._id));

const dedupe = <T extends Identified>(items: T[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item._id)) {
      return false;
    }

    seen.add(item._id);
    return true;
  });
};

const isInWindow = <T extends Identified>(
  buffer: StageBuffer<T>,
  index: number,
) => index >= buffer.start && index < buffer.start + buffer.windowLength;

export const getWindow = <T extends Identified>(buffer: StageBuffer<T>): T[] =>
  buffer.loaded.slice(buffer.start, buffer.start + buffer.windowLength);

export const createBuffer = <T extends Identified>(
  items: T[],
): StageBuffer<T> => {
  const loaded = dedupe(items);

  return {
    loaded,
    start: 0,
    windowLength: Math.min(loaded.length, WINDOW_SIZE),
  };
};

export const hasBelow = <T extends Identified>(buffer: StageBuffer<T>) =>
  buffer.start + buffer.windowLength < buffer.loaded.length;

/** 화면 카드(드래그·추가·삭제 반영된 itemMap)로 보관 목록의 창 구간을 교체 */
export const syncWindow = <T extends Identified>(
  buffer: StageBuffer<T>,
  windowItems: T[],
): StageBuffer<T> => {
  const windowIds = new Set(windowItems.map((item) => item._id));
  const before = withoutIds(buffer.loaded.slice(0, buffer.start), windowIds);
  const after = withoutIds(
    buffer.loaded.slice(buffer.start + buffer.windowLength),
    windowIds,
  );

  return {
    loaded: [...before, ...windowItems, ...after],
    start: before.length,
    windowLength: windowItems.length,
  };
};

export const appendItems = <T extends Identified>(
  buffer: StageBuffer<T>,
  items: T[],
): StageBuffer<T> => {
  const loadedIds = new Set(buffer.loaded.map((item) => item._id));

  return {
    ...buffer,
    loaded: [...buffer.loaded, ...dedupe(withoutIds(items, loadedIds))],
  };
};

/** 창이 덜 찼으면 채우고, 가득 찼으면 SLIDE_STEP만큼 뒤로 민다 */
export const slideDown = <T extends Identified>(
  buffer: StageBuffer<T>,
): StageBuffer<T> => {
  if (!hasBelow(buffer)) {
    return buffer;
  }

  const end = Math.min(
    buffer.loaded.length,
    buffer.start + buffer.windowLength + SLIDE_STEP,
  );
  const start = Math.max(buffer.start, end - WINDOW_SIZE);

  return { ...buffer, start, windowLength: end - start };
};

/** 창이 덜 찼을 때 뒤만 채운다 — 시작 위치는 그대로라 보던 카드가 밀리지 않는다 */
export const fillWindow = <T extends Identified>(
  buffer: StageBuffer<T>,
): StageBuffer<T> => {
  const windowLength = Math.min(
    WINDOW_SIZE,
    buffer.loaded.length - buffer.start,
  );

  if (windowLength <= buffer.windowLength) {
    return buffer;
  }

  return { ...buffer, windowLength };
};

export const slideUp = <T extends Identified>(
  buffer: StageBuffer<T>,
): StageBuffer<T> => {
  if (buffer.start <= 0) {
    return buffer;
  }

  const start = Math.max(0, buffer.start - SLIDE_STEP);
  const end = Math.min(buffer.loaded.length, start + WINDOW_SIZE);

  return { ...buffer, start, windowLength: end - start };
};

/** 화면 밖 보관 카드만 교체 — 화면 안 카드는 itemMap 쪽에서 처리 */
export const replaceOutsideWindow = <T extends Identified>(
  buffer: StageBuffer<T>,
  item: T,
): StageBuffer<T> => {
  const index = buffer.loaded.findIndex((loaded) => loaded._id === item._id);

  if (index < 0 || isInWindow(buffer, index)) {
    return buffer;
  }

  return {
    ...buffer,
    loaded: buffer.loaded.map((loaded, i) => (i === index ? item : loaded)),
  };
};

/** 화면 밖 보관 카드만 제거 — 창 앞에서 지우면 시작 위치를 당긴다 */
export const removeOutsideWindow = <T extends Identified>(
  buffer: StageBuffer<T>,
  itemId: string,
): StageBuffer<T> => {
  const index = buffer.loaded.findIndex((loaded) => loaded._id === itemId);

  if (index < 0 || isInWindow(buffer, index)) {
    return buffer;
  }

  return {
    ...buffer,
    loaded: buffer.loaded.filter((_, i) => i !== index),
    start: index < buffer.start ? buffer.start - 1 : buffer.start,
  };
};
