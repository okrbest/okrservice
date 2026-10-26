import * as React from 'react';

import { ITicketActivityLog, ITicketComment } from '../../types';
import { __ } from '../../../utils';

import Container from '../common/Container';
import { useTicket } from '../../context/Ticket';
import TicketProgressHero from './TicketProgressHero';
import TicketThread from './TicketThread';
import TicketComposer from './TicketComposer';
import { WidgetStage, buildThread, progressSteps } from './progressHelpers';

interface FileWithUrl extends File {
  url?: string;
}

type Props = {
  activityLogs: ITicketActivityLog[];
  activityLoading?: boolean;
  comment: string;
  comments: ITicketComment[];
  setComment: (comment: string) => void;
  onComment: () => void;
  files?: FileWithUrl[];
  handleFiles?: (files: FileWithUrl[]) => void;
  stages?: WidgetStage[];
};

// 고객이 보는 티켓 진행 상황: 위 요약 카드(단계 막대), 가운데 대화, 아래 한 줄 입력
const TicketShowProgress: React.FC<Props> = ({
  onComment,
  setComment,
  comment,
  comments,
  activityLogs,
  activityLoading = false,
  files = [],
  handleFiles,
  stages,
}) => {
  const { ticketData = {} } = useTicket();

  const steps = React.useMemo(
    () => progressSteps(stages, ticketData.stage?._id),
    [stages, ticketData.stage?._id],
  );

  const thread = React.useMemo(
    () => buildThread(comments, activityLogs),
    [comments, activityLogs],
  );

  return (
    <Container
      withBottomNavBar={true}
      title={__('Ticket progress')}
      backRoute="ticket"
      persistentFooter={
        <TicketComposer
          comment={comment}
          setComment={setComment}
          onSend={onComment}
          files={files}
          handleFiles={handleFiles}
        />
      }
    >
      <div className="tp-screen">
        <TicketProgressHero ticket={ticketData} steps={steps} />
        <TicketThread thread={thread} loading={activityLoading} />
      </div>
    </Container>
  );
};

export default TicketShowProgress;
