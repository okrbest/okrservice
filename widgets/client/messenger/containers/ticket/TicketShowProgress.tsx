import * as React from 'react';

import {
  TICKET_ACTIVITY_LOGS,
  TICKET_COMMENTS,
  TICKET_STAGES,
} from '../../graphql/queries';
import { useMutation, useQuery } from '@apollo/client';

import { ITicketComment } from '../../types';
import { TICKET_COMMENTS_ADD } from '../../graphql/mutations';
import { NewTabControl } from '../../components/ticket/TicketProgressHero';
import { __ } from '../../../utils';
import { useTicketViewLink } from './useTicketViewLink';
import TicketShowProgress from '../../components/ticket/TicketShowPropgress';
import { connection } from '../../connection';
import { useTicket } from '../../context/Ticket';

interface FileWithUrl extends File {
  url?: string;
}

type Props = {
  loading: boolean;
};

// 기록 조회 결과는 widgetsTicketActivityLogs에 온다(예전 activityLogs 키는 늘 비어 있었음)
const activityLogsFrom = (data: any) => {
  const logs = data && (data.widgetsTicketActivityLogs || data.activityLogs);
  return Array.isArray(logs) ? logs : [];
};

const TicketShowProgressContainer = (props: Props) => {
  const { ticketData } = useTicket();
  const { customerId } = connection.data;
  const [comment, setComment] = React.useState('');
  const [files, setFiles] = React.useState<FileWithUrl[]>([]);

  const {
    data,
    loading: commentsLoading,
    error,
    refetch: commentQueryRefetch,
  } = useQuery(TICKET_COMMENTS, {
    variables: {
      typeId: ticketData._id,
      type: 'ticket',
    },
    fetchPolicy: 'cache-and-network', // 캐시 활용으로 성능 개선
    skip: !ticketData._id, // ticketData가 없으면 쿼리 실행 안 함
  });

  const [commentsAdd, { loading }] = useMutation(TICKET_COMMENTS_ADD, {
    onCompleted() {
      setComment('');
      setFiles([]);
      commentQueryRefetch();
    },
    onError(error) {
      return alert(error.message);
    },
  });

  const {
    data: activityData,
    loading: activityLoading,
    error: activityError,
  } = useQuery(TICKET_ACTIVITY_LOGS, {
    variables: {
      contentType: 'tickets:ticket',
      contentId: ticketData._id,
    },
    fetchPolicy: 'cache-and-network', // 캐시 활용으로 성능 개선
    skip: !ticketData._id, // ticketData가 없으면 쿼리 실행 안 함
  });

  // 단계 막대용 단계 목록(파이프라인 단계는 자주 안 바뀌어 캐시 우선)
  const stageId = ticketData.stage && ticketData.stage._id;
  const { data: stagesData } = useQuery(TICKET_STAGES, {
    variables: { stageId },
    fetchPolicy: 'cache-first',
    skip: !stageId,
  });

  // "새 탭에서 보기" 링크를 화면을 열 때 미리 받아 둔다(누르면 바로 열림)
  const viewLink = useTicketViewLink(ticketData._id, customerId);
  // 방문자이거나 이 고객이 볼 수 없는 티켓(번호로 조회한 남의 티켓 등)이면 버튼을 그리지 않는다
  const newTab: NewTabControl | undefined = viewLink.unavailable
    ? undefined
    : {
        url: viewLink.url,
        onRetry: viewLink.failed ? viewLink.retry : undefined,
        notice: viewLink.failed
          ? __('Please try again in a moment.')
          : undefined,
      };

  const onComment = () => {
    const attachments =
      files.length > 0
        ? files.map((file) => ({
            // url에는 저장 키만 전달 (전체 URL이면 파이프라인에서 키가 이름처럼 노출될 수 있음)
            url: file.url || '',
            name: file.name || '',
            type: file.type || 'file',
          }))
        : undefined;

    return commentsAdd({
      variables: {
        type: 'ticket',
        typeId: ticketData._id,
        customerId: customerId,
        content: comment,
        userType: 'client',
        attachments,
      },
    });
  };

  // 댓글 로딩 중일 때만 전체 로더 표시, 액티비티는 별도 처리
  if (loading || commentsLoading) {
    return <div className="loader" />;
  }

  const comments = data?.widgetsTicketComments || ([] as ITicketComment[]);

  return (
    <TicketShowProgress
      activityLogs={activityLogsFrom(activityData)}
      activityLoading={activityLoading}
      setComment={setComment}
      comment={comment}
      comments={comments}
      onComment={onComment}
      files={files}
      handleFiles={setFiles}
      stages={stagesData?.widgetsTicketStages || []}
      newTab={newTab}
    />
  );
};

export default TicketShowProgressContainer;
