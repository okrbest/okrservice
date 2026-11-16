// 동시에 여러 티켓이 들어오면 같은 번호가 매겨져 저장이 실패할 수 있다.
// 겹치면 마지막 번호를 앞당긴 뒤 다음 번호로 다시 시도한다 — 끝없이 돌지 않도록 횟수를 제한한다.
export const MAX_NUMBER_RETRIES = 20;

/** 번호(number) 칸이 겹친 경우만 — 다른 값이 겹친 것은 다시 매겨도 해결되지 않는다 */
const isDuplicateNumberError = (error: any) => {
  if (
    error?.code !== 11000 &&
    !String(error?.message || '').includes('E11000')
  ) {
    return false;
  }

  if (error?.keyPattern) {
    return Boolean(error.keyPattern.number);
  }

  return /index: number/.test(String(error?.message || ''));
};

/** 동시에 다시 부딪히지 않도록 시도마다 조금씩 더 길게, 무작위로 기다린다 */
const defaultRetryDelayMs = (attempt: number) =>
  Math.floor(Math.random() * 20 * attempt);

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type Steps<T> = {
  /** 번호를 새로 매긴다 (doc.number 갱신) */
  generate: () => Promise<void>;
  create: () => Promise<T>;
  /** 겹친 번호 다음부터 매겨지도록 마지막 번호를 앞당긴다 */
  onDuplicate: () => Promise<void>;
  retryDelayMs?: (attempt: number) => number;
};

export const createWithUniqueNumber = async <T>({
  generate,
  create,
  onDuplicate,
  retryDelayMs = defaultRetryDelayMs,
}: Steps<T>): Promise<T> => {
  for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
    await generate();

    try {
      return await create();
    } catch (error) {
      if (!isDuplicateNumberError(error)) {
        throw error;
      }

      if (attempt < MAX_NUMBER_RETRIES) {
        await onDuplicate();
        await wait(retryDelayMs(attempt));
      }
    }
  }

  throw new Error('티켓 번호를 정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
};

const splitNumber = (value: string) => {
  const match = /^(.*?)(\d+)$/.exec(value);

  return match
    ? { prefix: match[1], seq: parseInt(match[2], 10) }
    : { prefix: value, seq: NaN };
};

/**
 * next가 current보다 앞선 번호인지 — 마지막 번호를 뒤로 되돌리지 않기 위해 쓴다.
 * 접두어(날짜 등)가 바뀌면 새 번호로 보고, 같으면 끝 숫자를 숫자로 비교한다(자릿수가 늘어도 맞게).
 */
export const isNumberAhead = (next: string, current?: string | null) => {
  if (!current) {
    return true;
  }

  const a = splitNumber(next);
  const b = splitNumber(current);

  if (a.prefix !== b.prefix) {
    return true;
  }

  return a.seq > b.seq;
};
