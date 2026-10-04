export type DescriptionDraftRecord = {
  content: string;
  timestamp: Date | null;
  serverDescription?: string;
};

export function normalizeDescriptionHtml(
  html: string | null | undefined,
): string {
  const value = (html ?? '').trim();
  if (!value) {
    return '';
  }

  return value
    .replace(/<p><\/p>/gi, '')
    .replace(/<p><br\s*\/?><\/p>/gi, '')
    .trim();
}

/**
 * 편집을 시작할 때의 설명 지문 — 저장할 때 서버에 보내 "그 사이 설명이 바뀌었는지"만 본다.
 * 서버(plugin-tickets-api descriptionConflict.descriptionFingerprint)와 같은 값: "길이-FNV1a(32비트)"
 */
export function descriptionFingerprint(
  html: string | null | undefined,
): string {
  const text = normalizeDescriptionHtml(html);
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${text.length.toString(36)}-${hash.toString(16).padStart(8, '0')}`;
}

export function parseDescriptionDraft(
  storedData: string,
): DescriptionDraftRecord | null {
  try {
    const parsed = JSON.parse(storedData);

    return {
      content: parsed.content ?? '',
      timestamp: parsed.timestamp ? new Date(parsed.timestamp) : null,
      serverDescription: parsed.serverDescription,
    };
  } catch {
    return {
      content: storedData,
      timestamp: null,
    };
  }
}

export function serializeDescriptionDraft(
  content: string,
  serverDescription?: string,
): string {
  return JSON.stringify({
    content,
    timestamp: new Date().toISOString(),
    serverDescription: serverDescription ?? '',
  });
}

type ResolveDraftOptions = {
  // 서버 설명이 그 사이 바뀌었어도 쓰던 글을 지우지 않는다.
  // 저장할 때 서버가 충돌을 확인해 주는 편집기(티켓 설명)에서만 켠다.
  keepWhenServerChanged?: boolean;
};

/**
 * Restores unsaved description drafts across modal reopen.
 * Date-only saves bump modifiedAt but should not discard a draft whose
 * server description baseline is unchanged.
 */
export function resolveDescriptionDraft(
  storedData: string | null | undefined,
  serverDescription: string | null | undefined,
  options: ResolveDraftOptions = {},
): { content: string; discardStorage: boolean } {
  const serverContent = serverDescription ?? '';
  const normalizedServer = normalizeDescriptionHtml(serverContent);

  if (!storedData) {
    return { content: serverContent, discardStorage: false };
  }

  const draft = parseDescriptionDraft(storedData);
  if (!draft) {
    return { content: serverContent, discardStorage: true };
  }

  const normalizedDraft = normalizeDescriptionHtml(draft.content);

  if (normalizedDraft === normalizedServer) {
    return { content: serverContent, discardStorage: true };
  }

  if (!options.keepWhenServerChanged && draft.serverDescription !== undefined) {
    const normalizedBaseline = normalizeDescriptionHtml(
      draft.serverDescription,
    );

    if (normalizedServer !== normalizedBaseline) {
      return { content: serverContent, discardStorage: true };
    }
  }

  return { content: draft.content, discardStorage: false };
}

/**
 * 편집창을 열기 전에도 "작성 중이던 글"을 알려 줄지 — 서버 내용과 다른 임시 저장이 있으면 true.
 * (티켓 설명은 편집창을 열 때 이 글이 그대로 채워진다: keepWhenServerChanged)
 */
export function hasPendingDescriptionDraft(
  storedData: string | null | undefined,
  serverDescription: string | null | undefined,
): boolean {
  const draft = storedData ? parseDescriptionDraft(storedData) : null;

  if (!draft) {
    return false;
  }

  return (
    normalizeDescriptionHtml(draft.content) !==
    normalizeDescriptionHtml(serverDescription)
  );
}

export function readDescriptionDraftFromStorage(
  storageKey: string,
  serverDescription: string | null | undefined,
  options: ResolveDraftOptions = {},
): { content: string; discardStorage: boolean } {
  if (typeof window === 'undefined') {
    return {
      content: serverDescription ?? '',
      discardStorage: false,
    };
  }

  const storedData = localStorage.getItem(storageKey);
  const resolved = resolveDescriptionDraft(
    storedData,
    serverDescription,
    options,
  );

  if (resolved.discardStorage && storedData) {
    localStorage.removeItem(storageKey);
  }

  return resolved;
}
