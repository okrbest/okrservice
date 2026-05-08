// TicketContext.tsx
import React, { createContext, useContext, useState } from "react";

interface TicketContextProps {
  ticketData: any;
  setTicketData: (data: any) => void;
  unreadTicketCount: number;
  setUnreadTicketCount: (count: number) => void;
}

const TicketContext = createContext<TicketContextProps | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ticketData, setTicketData] = useState<any>(null);
  const [unreadTicketCount, setUnreadTicketCount] = useState<number>(0);
  return (
    <TicketContext.Provider value={{ ticketData, setTicketData, unreadTicketCount, setUnreadTicketCount }}>
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
