import * as React from 'react';

import { ITicketActivityLog, ITicketComment } from '../../types';
import { __ } from '../../../utils';
// 안내를 처음 1회만 띄울 때 되살린다(아래 showGuide 주석 참고)
// import { getLocalStorageItem, setLocalStorageItem } from '../../../common';

import Container from '../common/Container';
import { useTicket } from '../../context/Ticket';
import TicketProgressHero, { NewTabControl } from './TicketProgressHero';
import TicketThread from './TicketThread';
import TicketComposer from './TicketComposer';
import TicketGuide from './TicketGuide';
// import { TICKET_GUIDE_SEEN_KEY, isTicketGuideSeen } from './ticketGuideRules';
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
  newTab?: NewTabControl;
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
  newTab,
}) => {
  const { ticketData = {} } = useTicket();
  // 지금은 진행 상황을 열 때마다 크게 보는 방법을 알려 준다("확인"은 이번 화면에서만 닫음).
  // 처음 온 고객에게만 띄우려면 아래 주석과 위 import 주석을 되살리고 useState(true) 줄을 지운다
  // ("확인"을 누르면 위젯 저장소에 남겨 다시 안 뜸).
  // const [showGuide, setShowGuide] = React.useState(
  //   () => !isTicketGuideSeen(getLocalStorageItem(TICKET_GUIDE_SEEN_KEY)),
  // );
  const [showGuide, setShowGuide] = React.useState(true);

  const closeGuide = () => {
    // setLocalStorageItem(TICKET_GUIDE_SEEN_KEY, 'true');
    setShowGuide(false);
  };

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
      // 진행 상황은 티켓 목록에서만 열린다(티켓 번호 조회 메뉴는 첫 화면에서 빠짐) — 뒤로 가면 목록
      backRoute="ticket-list"
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
        {showGuide && (
          <TicketGuide canOpenNewTab={Boolean(newTab)} onClose={closeGuide} />
        )}
        <TicketProgressHero ticket={ticketData} steps={steps} newTab={newTab} />
        <TicketThread thread={thread} loading={activityLoading} />
      </div>
    </Container>
  );
};

export default TicketShowProgress;
