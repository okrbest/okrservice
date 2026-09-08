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

/**
 * Restores unsaved description drafts across modal reopen.
 * Date-only saves bump modifiedAt but should not discard a draft whose
 * server description baseline is unchanged.
 */
export function resolveDescriptionDraft(
  storedData: string | null | undefined,
  serverDescription: string | null | undefined,
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

  if (draft.serverDescription !== undefined) {
    const normalizedBaseline = normalizeDescriptionHtml(
      draft.serverDescription,
    );

    if (normalizedServer !== normalizedBaseline) {
      return { content: serverContent, discardStorage: true };
    }
  }

  return { content: draft.content, discardStorage: false };
}

export function readDescriptionDraftFromStorage(
  storageKey: string,
  serverDescription: string | null | undefined,
): { content: string; discardStorage: boolean } {
  if (typeof window === 'undefined') {
    return {
      content: serverDescription ?? '',
      discardStorage: false,
    };
  }

  const storedData = localStorage.getItem(storageKey);
  const resolved = resolveDescriptionDraft(storedData, serverDescription);

  if (resolved.discardStorage && storedData) {
    localStorage.removeItem(storageKey);
  }

  return resolved;
}
