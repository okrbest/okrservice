import * as React from 'react';
import { useMutation, useQuery } from '@apollo/client';

import { __ } from '../utils';
import TicketProgressHero from '../messenger/components/ticket/TicketProgressHero';
import TicketThread from '../messenger/components/ticket/TicketThread';
import TicketComposer from '../messenger/components/ticket/TicketComposer';
import { FileWithUrl } from '../messenger/components/ticket/useAttachUpload';
import {
  buildThread,
  progressSteps,
} from '../messenger/components/ticket/progressHelpers';
import { TICKET_VIEW, TICKET_VIEW_COMMENT_ADD } from './graphql';
import { ViewErrorState, viewStateFromError } from './viewState';

// 상태별 안내 문구(번역 키)
const NOTICES: Record<ViewErrorState, string> = {
  expired:
    "The link has expired. Please press 'Open in new tab' again in the widget.",
  notFound: "We couldn't find this ticket.",
  error: 'Please try again in a moment.',
};

type Props = {
  token: string;
};

// 위젯 티켓 "새 탭에서 보기" 화면: 위젯 진행 상황과 같은 부품을 넓은 한 열로 보여 준다
const TicketViewPage: React.FC<Props> = ({ token }) => {
  const { data, loading, error, refetch } = useQuery(TICKET_VIEW, {
    variables: { token },
    // 새 탭은 늘 최신 내용으로(새로 고침 = 다시 조회). 조회에 성공하면 링크 만료가 연장된다
    fetchPolicy: 'network-only',
    skip: !token,
  });

  const view = data?.widgetsTicketView;

  // 댓글 입력: 위젯 진행 상황 입력창과 같은 부품. 실패해도 쓴 글과 첨부는 그대로 둔다.
  const [comment, setComment] = React.useState('');
  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const [sendNotice, setSendNotice] = React.useState('');
  const [addComment, { loading: sending }] = useMutation(
    TICKET_VIEW_COMMENT_ADD,
  );

  const onSend = async () => {
    if (sending) {
      return;
    }

    setSendNotice('');

    try {
      await addComment({
        variables: {
          token,
          content: comment,
          attachments: files.length
            ? files.map((file) => ({
                // url에는 저장 키만 전달(위젯과 같은 규칙)
                url: file.url || '',
                name: file.name || '',
                type: file.type || 'file',
              }))
            : undefined,
        },
      });
      setComment('');
      setFiles([]);
      // 다시 불러오다 실패하면(만료 등) 화면 상태가 오류 안내로 바뀐다
      refetch().catch(() => undefined);
    } catch (e) {
      // 만료돼도 화면은 그대로 두고 안내만 — 쓰던 글과 첨부는 지우지 않는다(FR-014)
      setSendNotice(__(NOTICES[viewStateFromError(e)]));
    }
  };

  const steps = React.useMemo(
    () => progressSteps(view?.stages, view?.ticket?.stage?._id),
    [view],
  );

  const thread = React.useMemo(
    () => buildThread(view?.comments || [], view?.activityLogs || []),
    [view],
  );

  const renderBody = () => {
    if (loading) {
      return <div className="loader" />;
    }

    // 열쇠가 없거나 만료·없는 티켓이면 티켓 내용 없이 안내만 보여 준다
    if (!token || error || !view || !view.ticket) {
      const state: ViewErrorState = !token
        ? 'expired'
        : error
          ? viewStateFromError(error)
          : 'error';

      return (
        <div className="tv-message" role="status">
          <p>{__(NOTICES[state])}</p>
          {state === 'error' && (
            <button
              type="button"
              className="tv-retry"
              onClick={() => refetch().catch(() => undefined)}
            >
              {__('Try again')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="tp-screen tv-content">
        <TicketProgressHero ticket={view.ticket} steps={steps} />
        <TicketThread thread={thread} loading={false} />
      </div>
    );
  };

  return (
    <div className="tv-page">
      <header className="tv-header">
        <h1 className="tv-title">{__('Ticket progress')}</h1>
      </header>
      <main className="tv-main">{renderBody()}</main>
      {view && view.ticket && (
        <footer className="tv-composer">
          <div className="tv-composer-inner">
            {sendNotice && (
              <div className="tv-send-notice" role="status">
                {sendNotice}
              </div>
            )}
            <TicketComposer
              comment={comment}
              setComment={setComment}
              onSend={onSend}
              files={files}
              handleFiles={setFiles}
              allowedFileTypes={view.allowedFileTypes || []}
            />
          </div>
        </footer>
      )}
    </div>
  );
};

export default TicketViewPage;
