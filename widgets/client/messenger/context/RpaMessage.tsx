import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import gql from 'graphql-tag';
import client from '../../apollo-client';
import { getLocalStorageItem } from '../../common';
import { connection } from '../connection';
import { rpaMessageReceived } from '../graphql/subscriptions';
import { customerDetail, rpaMessagesQuery } from '../graphql/queries';
import { resolveRpaButtons } from '../components/chatbot/rpaButtons';

export interface RpaMessageItem {
  _id: string;
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: string;
  buttons: Array<{ label: string; path: string }>;
  isNew?: boolean; // 현재 세션에서 구독으로 수신된 메시지
  clientReceivedAt?: number; // 클라이언트가 실제로 수신한 시각 (ms) - 정렬 기준
}

interface RpaMessageContextProps {
  rpaMessages: RpaMessageItem[];
}

const RpaMessageContext = createContext<RpaMessageContextProps>({ rpaMessages: [] });

function resolveLoginIdFromStorage(): string | null {
  const fromSetting = String(connection.setting?.email || '').trim();
  if (fromSetting) {
    return fromSetting;
  }

  const fromData = String(connection.data?.email || '').trim();
  if (fromData) {
    return fromData;
  }

  const notifiedType = getLocalStorageItem('getNotifiedType');
  const notifiedValue = getLocalStorageItem('getNotifiedValue');
  if (notifiedType === 'email' && notifiedValue) {
    return String(notifiedValue).trim();
  }

  return null;
}

async function fetchCustomerLoginId(): Promise<string | null> {
  const customerId =
    connection.data?.customerId || getLocalStorageItem('customerId');
  if (!customerId) {
    return null;
  }

  try {
    const result = await client.query({
      query: gql(customerDetail),
      variables: { customerId },
      fetchPolicy: 'network-only',
    });
    const customer = result.data?.widgetsTicketCustomerDetail;
    const email = customer?.email || customer?.emails?.[0];
    return email ? String(email).trim() : null;
  } catch (err) {
    console.error('[RPA] Customer email lookup error:', err);
    return null;
  }
}

async function resolveLoginId(): Promise<string | null> {
  const fromStorage = resolveLoginIdFromStorage();
  if (fromStorage) {
    return fromStorage;
  }

  return fetchCustomerLoginId();
}

function normalizeRpaMessage(msg: RpaMessageItem): RpaMessageItem {
  return {
    ...msg,
    buttons: resolveRpaButtons(msg.rpaCode, msg.buttons),
  };
}

const RPA_TIMESTAMPS_STORAGE_KEY = 'erxes_rpa_client_times';

function loadRpaTimestamps(): Map<string, number> {
  try {
    const saved = localStorage.getItem(RPA_TIMESTAMPS_STORAGE_KEY);
    if (!saved) return new Map();
    return new Map(JSON.parse(saved) as [string, number][]);
  } catch {
    return new Map();
  }
}

function saveRpaTimestamps(map: Map<string, number>): void {
  try {
    localStorage.setItem(RPA_TIMESTAMPS_STORAGE_KEY, JSON.stringify([...map.entries()]));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

function toReceivedAtMs(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function mergeRpaMessages(
  fromHistory: RpaMessageItem[],
  fromState: RpaMessageItem[],
): RpaMessageItem[] {
  const stateById = new Map(fromState.map((m) => [m._id, m]));
  const merged = fromHistory.map((historyMsg) => {
    const liveMsg = stateById.get(historyMsg._id);
    if (!liveMsg?.clientReceivedAt) {
      return historyMsg;
    }
    if (!historyMsg.clientReceivedAt || liveMsg.clientReceivedAt > historyMsg.clientReceivedAt) {
      return {
        ...historyMsg,
        clientReceivedAt: liveMsg.clientReceivedAt,
        isNew: liveMsg.isNew ?? historyMsg.isNew,
      };
    }
    return historyMsg;
  });

  const mergedIds = new Set(merged.map((m) => m._id));
  const onlyLive = fromState.filter((m) => !mergedIds.has(m._id));

  return [...merged, ...onlyLive];
}

export const RpaMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rpaMessages, setRpaMessages] = useState<RpaMessageItem[]>([]);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const loadedLoginIdRef = useRef<string | null>(null);
  const activeLoginIdRef = useRef<string | null>(null);
  const resolvingRef = useRef(false);

  useEffect(() => {
    const teardownSubscription = () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };

    const loadHistory = async (loginId: string) => {
      if (loadedLoginIdRef.current === loginId) {
        return;
      }

      try {
        const result = await client.query({
          query: gql(rpaMessagesQuery),
          variables: { loginId, limit: 20 },
          fetchPolicy: 'network-only',
        });
        const rawMsgs: RpaMessageItem[] = (result.data?.rpaMessages || []).map(
          (m: RpaMessageItem) => normalizeRpaMessage({
            ...m,
            receivedAt: m.receivedAt || new Date().toISOString(),
          })
        );
        // localStorage에서 이전 clientReceivedAt 복원.
        // 캐시가 없으면 서버 receivedAt 사용 (히스토리는 receivedAt DESC 정렬).
        const timestamps = loadRpaTimestamps();
        const msgs = rawMsgs.map((m) => {
          const cached = timestamps.get(m._id);
          const clientReceivedAt = cached ?? toReceivedAtMs(m.receivedAt);
          if (cached === undefined && clientReceivedAt > 0) {
            timestamps.set(m._id, clientReceivedAt);
          }
          return { ...m, clientReceivedAt };
        });
        saveRpaTimestamps(timestamps);
        loadedLoginIdRef.current = loginId;
        setRpaMessages((prev) => mergeRpaMessages(msgs, prev));
      } catch (err) {
        console.error('[RPA] History load error:', err);
      }
    };

    const trySubscribe = (loginId: string) => {
      if (subscriptionRef.current && activeLoginIdRef.current === loginId) {
        return;
      }

      teardownSubscription();
      activeLoginIdRef.current = loginId;

      subscriptionRef.current = client
        .subscribe({
          query: gql(rpaMessageReceived),
          variables: { loginId },
        })
        .subscribe({
          next({ data }: { data: { rpaMessageReceived: RpaMessageItem } }) {
            const msg = data?.rpaMessageReceived;
            if (!msg) {
              return;
            }

            // 구독으로 실시간 수신 → 클라이언트 수신 시각 저장 + isNew 플래그
            const clientReceivedAt = Date.now();
            const timestamps = loadRpaTimestamps();
            timestamps.set(msg._id, clientReceivedAt);
            saveRpaTimestamps(timestamps);
            const normalized = normalizeRpaMessage({
              ...msg,
              receivedAt: msg.receivedAt || new Date().toISOString(),
              isNew: true,
              clientReceivedAt,
            });
            setRpaMessages((prev) => {
              const exists = prev.find((m) => m._id === normalized._id);
              if (exists) {
                // 중복 구독은 최초 화면 표시 시각을 유지
                return prev.map((m) =>
                  m._id === normalized._id
                    ? {
                        ...normalized,
                        clientReceivedAt: m.clientReceivedAt ?? normalized.clientReceivedAt,
                        isNew: m.isNew ?? normalized.isNew,
                      }
                    : m
                );
              }
              return [...prev, normalized];
            });
          },
          error(err: Error) {
            console.error('[RPA] Subscription error:', err);
            teardownSubscription();
          },
        });
    };

    const init = async (loginId: string) => {
      if (activeLoginIdRef.current && activeLoginIdRef.current !== loginId) {
        teardownSubscription();
        loadedLoginIdRef.current = null;
        setRpaMessages([]);
      }

      await loadHistory(loginId);
      trySubscribe(loginId);
    };

    const bootstrap = async () => {
      if (resolvingRef.current) {
        return false;
      }

      resolvingRef.current = true;
      try {
        const loginId = await resolveLoginId();
        if (loginId) {
          await init(loginId);
          return true;
        }
        return false;
      } finally {
        resolvingRef.current = false;
      }
    };

    bootstrap();

    const interval = setInterval(async () => {
      const loginId = await resolveLoginId();
      if (!loginId) {
        return;
      }

      if (
        loadedLoginIdRef.current === loginId &&
        subscriptionRef.current
      ) {
        clearInterval(interval);
        return;
      }

      await init(loginId);
    }, 2000);

    return () => {
      clearInterval(interval);
      teardownSubscription();
      activeLoginIdRef.current = null;
    };
  }, []);

  return (
    <RpaMessageContext.Provider value={{ rpaMessages }}>
      {children}
    </RpaMessageContext.Provider>
  );
};

export const useRpaMessages = () => useContext(RpaMessageContext);
