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
  requestType?: string;
  createdAt: string;
  priority?: string;
  widgetAlarm?: boolean;
};

type Props = {
  loading?: boolean;
};

const TicketListContainer = ({ loading: externalLoading }: Props = {}) => {
  const { setRoute } = useRouter();
  const { setTicketData, setUnreadTicketCount } = useTicket();
  const customerId = connection.data.customerId;
  const [includeCompanyTickets, setIncludeCompanyTickets] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchOption, setSearchOption] = React.useState<'all' | 'title' | 'number' | 'description'>('all');

  const { data, loading, error } = useQuery(TICKET_LIST, {
    variables: { customerId, includeCompanyTickets },
    skip: !customerId,
    fetchPolicy: "cache-and-network",
  });

  const [updateWidgetAlarm] = useMutation(UPDATE_WIDGET_ALARM);

  React.useEffect(() => {
    const tickets = data?.widgetsTicketList || [];
    const count = tickets.filter((t: TicketItem) => t.widgetAlarm === false).length;
    setUnreadTicketCount(count);
  }, [data, setUnreadTicketCount]);

  const handleTicketClick = async (ticket: TicketItem) => {
    // 티켓 데이터를 컨텍스트에 저장
    setTicketData(ticket);

    // widgetAlarm이 false인 경우 true로 업데이트
    if (ticket.widgetAlarm === false) {
      try {
        await updateWidgetAlarm({
          variables: { ticketId: ticket._id }
        });
        setUnreadTicketCount((prev: number) => Math.max(0, prev - 1));
      } catch (error) {
        throw new Error('위젯 알람 업데이트에 실패했습니다');
      }
    }

    // 티켓 상세 페이지로 이동
    setRoute("ticket-progress");
  };

  React.useEffect(() => {
    if (error) {
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

  return (
    <TicketList
      tickets={tickets}
      loading={loading || !!externalLoading}
      onTicketClick={handleTicketClick}
      includeCompanyTickets={includeCompanyTickets}
      onToggleCompanyTickets={() => setIncludeCompanyTickets(!includeCompanyTickets)}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchOption={searchOption}
      onSearchOptionChange={setSearchOption}
    />
  );
};

export default TicketListContainer; 