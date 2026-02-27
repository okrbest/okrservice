import * as React from "react";

import { TICKET_ACTIVITY_LOGS, TICKET_COMMENTS } from "../../graphql/queries";
import { useMutation, useQuery } from "@apollo/client";

import { ITicketComment } from "../../types";
import { TICKET_COMMENTS_ADD } from "../../graphql/mutations";
import TicketShowProgress from "../../components/ticket/TicketShowPropgress";
import { connection } from "../../connection";
import { useTicket } from "../../context/Ticket";

interface FileWithUrl extends File {
  url?: string;
}

type Props = {
  loading: boolean;
};

const TicketShowProgressContainer = (props: Props) => {
  const { ticketData } = useTicket();
  const { customerId } = connection.data;
  const [comment, setComment] = React.useState("");
  const [files, setFiles] = React.useState<FileWithUrl[]>([]);

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
      contentType: "tickets:ticket",
      contentId: ticketData._id,
    },
    fetchPolicy: "cache-and-network", // 캐시 활용으로 성능 개선
    skip: !ticketData._id, // ticketData가 없으면 쿼리 실행 안 함
  });

  const onComment = () => {
    const attachments =
      files.length > 0
        ? files.map((file) => ({
            // url에는 저장 키만 전달 (전체 URL이면 파이프라인에서 키가 이름처럼 노출될 수 있음)
            url: file.url || "",
            name: file.name || "",
            type: file.type || "file",
          }))
        : undefined;

    return commentsAdd({
      variables: {
        type: "ticket",
        typeId: ticketData._id,
        customerId: customerId,
        content: comment,
        userType: "client",
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
      activityLogs={activityData?.activityLogs || []}
      activityLoading={activityLoading}
      setComment={setComment}
      comment={comment}
      comments={comments}
      onComment={onComment}
      files={files}
      handleFiles={setFiles}
    />
  );
};

export default TicketShowProgressContainer;
