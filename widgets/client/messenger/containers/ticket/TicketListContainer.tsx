import * as React from "react";
import { useQuery, useMutation, gql } from "@apollo/client";

import { TICKET_LIST } from "../../graphql/queries";
import TicketList from "../../components/ticket/TicketList";
import { connection } from "../../connection";
import { useRouter } from "../../context/Router";
import { useTicket } from "../../context/Ticket";

const UPDATE_WIDGET_ALARM = gql`
  mutation UpdateWidgetAlarm($ticketId: String!) {
    updateWidgetAlarm(ticketId: $ticketId) {
      success
      message
    }
  }
`;

type TicketStage = {
  _id: string;
  name: string;
};

type TicketItem = {
  _id: string;
  name: string;
  number: string;
  status: string;
  stage: TicketStage;
  description: string;
  type: string;
  createdAt: string;
  priority?: string;
  widgetAlarm?: boolean;
};

type Props = {
  loading?: boolean;
};

const TicketListContainer = ({ loading: externalLoading }: Props = {}) => {
  const { setRoute } = useRouter();
  const { setTicketData } = useTicket();
  const customerId = connection.data.customerId;

  const { data, loading, error } = useQuery(TICKET_LIST, {
    variables: { customerId },
    skip: !customerId,
    fetchPolicy: "cache-and-network",
  });

  const [updateWidgetAlarm] = useMutation(UPDATE_WIDGET_ALARM);

  const handleTicketClick = async (ticket: TicketItem) => {
    // 티켓 데이터를 컨텍스트에 저장
    setTicketData(ticket);
    
    // widgetAlarm이 false인 경우 true로 업데이트
    if (ticket.widgetAlarm === false) {
      try {
        // GraphQL mutation을 통해 widgetAlarm을 true로 업데이트
        await updateWidgetAlarm({
          variables: { ticketId: ticket._id }
        });
        
        console.log('🔔 Widget alarm updated to true for ticket:', ticket._id);
      } catch (error) {
        console.error('🔔 Failed to update widget alarm:', error);
      }
    }
    
    // 티켓 상세 페이지로 이동
    setRoute("ticket-progress");
  };

  React.useEffect(() => {
    if (error) {
      console.error("Failed to fetch tickets:", error);
      alert("Failed to load tickets. Please try again.");
    }
  }, [error]);

  // 고객 ID가 없으면 로그인 필요 메시지
  if (!customerId) {
    return (
      <TicketList
        tickets={[]}
        loading={false}
        onTicketClick={handleTicketClick}
      />
    );
  }

  const tickets = data?.widgetsTicketList || [];
  
  // 디버깅 로그 추가
        console.log('🔔 TicketListContainer tickets:', tickets.map((t: TicketItem) => ({ _id: t._id, widgetAlarm: t.widgetAlarm })));

  return (
    <TicketList
      tickets={tickets}
      loading={loading || !!externalLoading}
      onTicketClick={handleTicketClick}
    />
  );
};

export default TicketListContainer; 