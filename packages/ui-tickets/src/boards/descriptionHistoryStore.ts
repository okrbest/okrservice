// 티켓 설명 임시저장함 보관소 (브라우저 IndexedDB).
// 붙여넣은 사진까지 그대로 보관하므로, 용량이 작은 localStorage(임시 저장이 쓰는 곳) 대신 IndexedDB를 쓴다.
// 요약(meta)과 본문(content)을 나눠, 목록·정리는 요약만 읽고 본문은 고를 때만 읽는다.
// 보관에 실패해도 편집을 방해하지 않는다 — 모든 함수는 예외를 던지지 않는다.
import {
  DescriptionHistoryKind,
  DescriptionHistoryMeta,
  buildHistoryMeta,
  planHistoryUpdate,
} from './descriptionHistory';

const DB_NAME = 'erxes-ticket-description-history';
const DB_VERSION = 1;
const META_STORE = 'meta';
const CONTENT_STORE = 'content';

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(META_STORE, { keyPath: 'id' });
        db.createObjectStore(CONTENT_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

// saved: 남김 / same: 바로 앞 기록과 같은 글이라 건너뜀 / empty: 빈 글 / failed: 브라우저 저장소를 못 씀
export type RecordHistoryResult = 'saved' | 'same' | 'empty' | 'failed';

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** 쓰던 글을 기록으로 남기고, 한도를 넘은 오래된 기록을 정리한다. */
export async function recordDescriptionHistory(
  itemKey: string,
  content: string | null | undefined,
  kind: DescriptionHistoryKind,
): Promise<RecordHistoryResult> {
  const now = Date.now();
  const candidate = buildHistoryMeta({
    id: newId(),
    itemKey,
    content: content ?? '',
    kind,
    savedAt: now,
  });

  if (!candidate) {
    return 'empty';
  }

  const db = await openDb();

  if (!db) {
    return 'failed';
  }

  let transaction: IDBTransaction | null = null;

  try {
    transaction = db.transaction([META_STORE, CONTENT_STORE], 'readwrite');
    const metaStore = transaction.objectStore(META_STORE);
    const contentStore = transaction.objectStore(CONTENT_STORE);
    const existing: DescriptionHistoryMeta[] = await requestResult(
      metaStore.getAll(),
    );
    const { add, removeIds } = planHistoryUpdate(existing, candidate, now);

    removeIds.forEach((id) => {
      metaStore.delete(id);
      contentStore.delete(id);
    });

    if (add) {
      metaStore.put(add);
      contentStore.put({ id: add.id, content: content ?? '' });
    }

    await transactionDone(transaction);

    return add ? 'saved' : 'same';
  } catch (e) {
    // 저장 공간 부족 등 — 기록만 건너뛴다. 일부만 반영되지 않게 되돌린다.
    try {
      transaction?.abort();
    } catch (abortError) {
      // 이미 끝났거나 되돌려진 트랜잭션
    }

    return 'failed';
  } finally {
    db.close();
  }
}

/** 그 티켓의 기록 요약을 최신순으로 돌려준다(기한이 지난 것은 뺀다). */
export async function loadDescriptionHistory(
  itemKey: string,
): Promise<DescriptionHistoryMeta[]> {
  const db = await openDb();

  if (!db) {
    return [];
  }

  try {
    const all: DescriptionHistoryMeta[] = await requestResult(
      db.transaction(META_STORE, 'readonly').objectStore(META_STORE).getAll(),
    );
    const { removeIds } = planHistoryUpdate(all, null, Date.now());

    return all
      .filter((entry) => entry.itemKey === itemKey)
      .filter((entry) => !removeIds.includes(entry.id))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch (e) {
    return [];
  } finally {
    db.close();
  }
}

/** 고른 기록의 본문(사진 포함)을 읽는다. 없으면 null. */
export async function readDescriptionHistoryContent(
  id: string,
): Promise<string | null> {
  const db = await openDb();

  if (!db) {
    return null;
  }

  try {
    const row: { id: string; content: string } | undefined =
      await requestResult(
        db
          .transaction(CONTENT_STORE, 'readonly')
          .objectStore(CONTENT_STORE)
          .get(id),
      );

    return row ? row.content : null;
  } catch (e) {
    return null;
  } finally {
    db.close();
  }
}
