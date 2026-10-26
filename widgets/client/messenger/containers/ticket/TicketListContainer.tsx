import * as React from 'react';
import { useQuery, useMutation, useApolloClient, gql } from '@apollo/client';

import { TICKET_LIST, TICKET_STAGES } from '../../graphql/queries';
import { StageTone, stageTone } from '../../components/ticket/listHelpers';
import { WidgetStage } from '../../components/ticket/progressHelpers';
import TicketList from '../../components/ticket/TicketList';
import { connection } from '../../connection';
import { useRouter } from '../../context/Router';
import { useTicket } from '../../context/Ticket';

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

// 목록에 나온 단계들의 파이프라인 단계 목록을 모아 단계별 뱃지 색을 정한다.
// 진행 상황 화면의 단계 막대와 같은 조회라 캐시를 같이 쓰고, 파이프라인마다 한 번만 부른다.
const useStageTones = (tickets: TicketItem[]): Record<string, StageTone> => {
  const client = useApolloClient();
  const [pipelines, setPipelines] = React.useState<WidgetStage[][]>([]);
  const stageKey = Array.from(
    new Set(tickets.map((ticket) => ticket.stage?._id).filter(Boolean)),
  ).join(',');

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loaded: WidgetStage[][] = [];
      const known = (id: string) =>
        loaded.some((stages) => stages.some((stage) => stage._id === id));

      for (const stageId of stageKey.split(',').filter(Boolean)) {
        if (known(stageId)) {
          continue;
        }

        try {
          const { data } = await client.query({
            query: TICKET_STAGES,
            variables: { stageId },
            fetchPolicy: 'cache-first',
          });
          loaded.push(data?.widgetsTicketStages || []);
        } catch (e) {
          // 단계 목록을 못 받으면 그 단계는 기본 색으로 둔다
        }
      }

      if (!cancelled) {
        setPipelines(loaded);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [client, stageKey]);

  return React.useMemo(() => {
    const tones: Record<string, StageTone> = {};

    tickets.forEach((ticket) => {
      const stage = ticket.stage;

      if (!stage?._id || tones[stage._id]) {
        return;
      }

      const stages = pipelines.find((list) =>
        list.some((item) => item._id === stage._id),
      );
      tones[stage._id] = stageTone(stage._id, stage.name, stages);
    });

    return tones;
  }, [tickets, pipelines]);
};

type Props = {
  loading?: boolean;
};

const TicketListContainer = ({ loading: externalLoading }: Props = {}) => {
  const { setRoute } = useRouter();
  const { setTicketData, setUnreadTicketCount } = useTicket();
  const customerId = connection.data.customerId;
  const [includeCompanyTickets, setIncludeCompanyTickets] =
    React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchOption, setSearchOption] = React.useState<
    'all' | 'title' | 'number' | 'description'
  >('all');

  const { data, loading, error } = useQuery(TICKET_LIST, {
    variables: { customerId, includeCompanyTickets },
    skip: !customerId,
    fetchPolicy: 'cache-and-network',
  });

  const [updateWidgetAlarm] = useMutation(UPDATE_WIDGET_ALARM);

  const handleTicketClick = async (ticket: TicketItem) => {
    // 티켓 데이터를 컨텍스트에 저장
    setTicketData(ticket);

    // widgetAlarm이 false인 경우 true로 업데이트
    if (ticket.widgetAlarm === false) {
      try {
        await updateWidgetAlarm({
          variables: { ticketId: ticket._id },
        });
        setUnreadTicketCount((prev: number) => Math.max(0, prev - 1));
      } catch (error) {
        throw new Error('위젯 알람 업데이트에 실패했습니다');
      }
    }

    // 티켓 상세 페이지로 이동
    setRoute('ticket-progress');
  };

  React.useEffect(() => {
    if (error) {
      alert('Failed to load tickets. Please try again.');
    }
  }, [error]);

  const tickets: TicketItem[] = data?.widgetsTicketList || [];
  const stageTones = useStageTones(tickets);

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

  return (
    <TicketList
      tickets={tickets}
      stageTones={stageTones}
      loading={loading || !!externalLoading}
      onTicketClick={handleTicketClick}
      includeCompanyTickets={includeCompanyTickets}
      onToggleCompanyTickets={() =>
        setIncludeCompanyTickets(!includeCompanyTickets)
      }
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchOption={searchOption}
      onSearchOptionChange={setSearchOption}
    />
  );
};

export default TicketListContainer;
