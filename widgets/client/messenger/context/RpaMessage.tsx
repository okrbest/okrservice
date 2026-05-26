import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import gql from 'graphql-tag';
import client from '../../apollo-client';
import { connection } from '../connection';
import { rpaMessageReceived } from '../graphql/subscriptions';
import { rpaMessagesQuery } from '../graphql/queries';

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

export const RpaMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rpaMessages, setRpaMessages] = useState<RpaMessageItem[]>([]);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const resolveLoginId = () => {
      const loginId = (connection.data?.email || connection.setting?.email || '').trim();
      return loginId || null;
    };

    const loadHistory = async (loginId: string) => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      try {
        const result = await client.query({
          query: gql(rpaMessagesQuery),
          variables: { loginId, limit: 20 },
          fetchPolicy: 'network-only',
        });
        const msgs: RpaMessageItem[] = result.data?.rpaMessages || [];
        if (msgs.length > 0) {
          setRpaMessages(msgs);
        }
      } catch (err) {
        console.error('[RPA] History load error:', err);
      }
    };

    const trySubscribe = (loginId: string) => {
      if (subscriptionRef.current) return;

      subscriptionRef.current = client
        .subscribe({
          query: gql(rpaMessageReceived),
          variables: { loginId },
        })
        .subscribe({
          next({ data }: { data: { rpaMessageReceived: RpaMessageItem } }) {
            const msg = data?.rpaMessageReceived;
            if (msg) {
              setRpaMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
              });
            }
          },
          error(err: Error) {
            console.error('[RPA] Subscription error:', err);
          },
        });
    };

    const init = (loginId: string) => {
      loadHistory(loginId);
      trySubscribe(loginId);
    };

    const loginId = resolveLoginId();
    if (loginId) {
      init(loginId);
    }

    // connection.data 가 늦게 세팅될 경우 대비해 짧은 폴링
    const interval = setInterval(() => {
      const id = resolveLoginId();
      if (id && !subscriptionRef.current) {
        init(id);
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  return (
    <RpaMessageContext.Provider value={{ rpaMessages }}>
      {children}
    </RpaMessageContext.Provider>
  );
};

export const useRpaMessages = () => useContext(RpaMessageContext);
