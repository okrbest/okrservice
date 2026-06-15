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
        const msgs: RpaMessageItem[] = (result.data?.rpaMessages || []).map(
          (m: RpaMessageItem) => normalizeRpaMessage({
            ...m,
            receivedAt: m.receivedAt || new Date().toISOString(),
          })
        );
        loadedLoginIdRef.current = loginId;
        setRpaMessages(msgs);
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

            // 구독으로 실시간 수신 → 항상 클라이언트 수신 시각 사용
            const normalized = normalizeRpaMessage({
              ...msg,
              receivedAt: new Date().toISOString(),
            });
            setRpaMessages((prev) => {
              if (prev.some((m) => m._id === normalized._id)) {
                return prev;
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
