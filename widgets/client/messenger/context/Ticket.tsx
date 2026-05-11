// TicketContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, gql } from "@apollo/client";
import { connection } from "../connection";

const TICKET_UNREAD_COUNT_QUERY = gql`
  query widgetsTicketUnreadCount($customerId: String!) {
    widgetsTicketList(customerId: $customerId) {
      _id
      widgetAlarm
    }
  }
`;

const POLL_INTERVAL_MS = 30_000;

interface TicketContextProps {
  ticketData: any;
  setTicketData: (data: any) => void;
  unreadTicketCount: number;
  setUnreadTicketCount: React.Dispatch<React.SetStateAction<number>>;
  refetchUnreadCount: () => void;
}

const TicketContext = createContext<TicketContextProps | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ticketData, setTicketData] = useState<any>(null);
  const [unreadTicketCount, setUnreadTicketCount] = useState<number>(0);

  const customerId = connection.data?.customerId;

  const { data, refetch } = useQuery(TICKET_UNREAD_COUNT_QUERY, {
    variables: { customerId },
    skip: !customerId,
    pollInterval: POLL_INTERVAL_MS,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const tickets = data?.widgetsTicketList || [];
    const count = tickets.filter((t: any) => t.widgetAlarm === false).length;
    setUnreadTicketCount(count);
  }, [data]);

  const refetchUnreadCount = () => {
    if (customerId) {
      refetch();
    }
  };

  return (
    <TicketContext.Provider value={{ ticketData, setTicketData, unreadTicketCount, setUnreadTicketCount, refetchUnreadCount }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicket = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTicket must be used within a TicketProvider");
  }
  return context;
};
