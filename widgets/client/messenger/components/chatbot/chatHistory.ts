import { connection } from '../../connection';

export interface AiMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt: number;
  streaming?: boolean;
}

export interface ChatHistoryEntry {
  id: string;
  firstMessage: string;
  updatedAt: number;
}

const MAX_HISTORY_ENTRIES = 50;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getPointerKey(): string {
  const customerId = connection.data?.customerId;
  return customerId ? `erxes_ai_sid_${customerId}` : 'erxes_ai_anon_sid';
}

function getIndexKey(): string {
  const customerId = connection.data?.customerId;
  return `erxes_ai_chat_index_${customerId || 'anon'}`;
}

function getMessagesKey(sessionId: string): string {
  return `erxes_ai_chat_${sessionId}`;
}

export function getActiveSessionId(): string {
  const key = getPointerKey();
  try {
    let sid = localStorage.getItem(key);
    if (!sid || !UUID_RE.test(sid)) {
      sid = randomUuid();
      localStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return randomUuid();
  }
}

export function startNewSession(): string {
  const id = randomUuid();
  try {
    localStorage.setItem(getPointerKey(), id);
  } catch {
    // localStorage 접근 실패 무시
  }
  return id;
}

export function setActiveSessionId(id: string): void {
  try {
    localStorage.setItem(getPointerKey(), id);
  } catch {
    // localStorage 접근 실패 무시
  }
}

export function loadMessages(sessionId: string): AiMessage[] {
  try {
    const saved = localStorage.getItem(getMessagesKey(sessionId));
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return (parsed as AiMessage[]).map((m) => ({
      ...m,
      text: (m.text ?? '').replace(/^undefined/, ''),
    }));
  } catch {
    return [];
  }
}

export function saveMessages(sessionId: string, messages: AiMessage[]): void {
  try {
    const toSave = messages.map((m) => ({ ...m, streaming: false }));
    localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(toSave));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

export function loadIndex(): ChatHistoryEntry[] {
  try {
    const raw = localStorage.getItem(getIndexKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ChatHistoryEntry[])
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveIndex(entries: ChatHistoryEntry[]): void {
  try {
    localStorage.setItem(getIndexKey(), JSON.stringify(entries));
  } catch {
    // localStorage 접근 실패 무시
  }
}

export function upsertIndexEntry(entry: ChatHistoryEntry): void {
  const withoutExisting = loadIndex().filter((e) => e.id !== entry.id);
  const next = [entry, ...withoutExisting]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ENTRIES);
  saveIndex(next);
}

export function deleteIndexEntry(id: string): void {
  saveIndex(loadIndex().filter((e) => e.id !== id));
  try {
    localStorage.removeItem(getMessagesKey(id));
  } catch {
    // localStorage 접근 실패 무시
  }
}
