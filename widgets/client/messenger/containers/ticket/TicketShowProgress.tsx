import * as React from "react";

import { TICKET_ACTIVITY_LOGS, TICKET_COMMENTS } from "../../graphql/queries";
import { useMutation, useQuery } from "@apollo/client";

import { ITicketComment } from "../../types";
import { TICKET_COMMENTS_ADD } from "../../graphql/mutations";
import TicketShowProgress from "../../components/ticket/TicketShowPropgress";
import { connection } from "../../connection";
import { useTicket } from "../../context/Ticket";

type Props = {
  loading: boolean;
};

const TicketShowProgressContainer = (props: Props) => {
  const { ticketData } = useTicket();
  const { customerId } = connection.data;
  const [comment, setComment] = React.useState("");

  const {
    data,
    loading: commentsLoading,
    error,
    refetch: commentQueryRefetch,
  } = useQuery(TICKET_COMMENTS, {
    variables: {
      typeId: ticketData._id,
      type: "ticket",
    },
    fetchPolicy: "cache-and-network", // 캐시 활용으로 성능 개선
    skip: !ticketData._id, // ticketData가 없으면 쿼리 실행 안 함
  });

  const [commentsAdd, { loading }] = useMutation(TICKET_COMMENTS_ADD, {
    onCompleted() {
      setComment("");
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
      contentType: "tickets:ticket",
      contentId: ticketData._id,
    },
    fetchPolicy: "cache-and-network", // 캐시 활용으로 성능 개선
    skip: !ticketData._id, // ticketData가 없으면 쿼리 실행 안 함
  });

  const onComment = () => {
    return commentsAdd({
      variables: {
        type: "ticket",
        typeId: ticketData._id,
        customerId: customerId,
        content: comment,
        userType: "client",
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
      activityLogs={activityData?.activityLogs || []}
      activityLoading={activityLoading}
      setComment={setComment}
      comment={comment}
      comments={comments}
      onComment={onComment}
    />
  );
};

export default TicketShowProgressContainer;
