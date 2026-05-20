import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import gql from 'graphql-tag';
import client from '../../apollo-client';
import { connection } from '../connection';
import { rpaMessageReceived } from '../graphql/subscriptions';

export interface RpaMessageItem {
  _id: string;
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: string;
}

interface RpaMessageContextProps {
  rpaMessages: RpaMessageItem[];
}

const RpaMessageContext = createContext<RpaMessageContextProps>({ rpaMessages: [] });

export const RpaMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rpaMessages, setRpaMessages] = useState<RpaMessageItem[]>([]);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // customerId 가 생길 때까지 대기 — connection.data 는 비동기로 채워짐
    const trySubscribe = () => {
      const loginId = connection.data?.email;
      if (!loginId) return;

      if (subscriptionRef.current) return; // 이미 구독 중

      subscriptionRef.current = client
        .subscribe({
          query: gql(rpaMessageReceived),
          variables: { loginId },
        })
        .subscribe({
          next({ data }: { data: { rpaMessageReceived: RpaMessageItem } }) {
            const msg = data?.rpaMessageReceived;
            if (msg) {
              setRpaMessages((prev) => [...prev, msg]);
            }
          },
          error(err: Error) {
            console.error('[RPA] Subscription error:', err);
          },
        });
    };

    trySubscribe();

    // connection.data 가 늦게 세팅될 경우 대비해 짧은 폴링
    const interval = setInterval(() => {
      if (connection.data?.email && !subscriptionRef.current) {
        trySubscribe();
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
