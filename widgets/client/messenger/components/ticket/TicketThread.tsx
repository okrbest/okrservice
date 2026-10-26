import * as React from 'react';
import dayjs from 'dayjs';
import xss from 'xss';
import { motion } from 'framer-motion';

import { ITicketActivityLog, ITicketComment } from '../../types';
import { __ } from '../../../utils';
import Attachment from '../common/Attachment';
import { renderUserFullName } from './TicketAcitvity';
import { ThreadEntry } from './progressHelpers';
import { useOriginalImageLinks } from './useOriginalImageLinks';

type Props = {
  thread: ThreadEntry[];
  loading?: boolean;
};

const appear = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

const commentAuthor = (comment: ITicketComment) => {
  const { firstName, lastName, email, emails, phone, phones } =
    comment.createdUser || ({} as any);

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  return email || emails?.[0] || phone || phones?.[0] || '';
};

const Comment = ({
  comment,
  mine,
}: {
  comment: ITicketComment;
  mine: boolean;
}) => {
  const author = commentAuthor(comment);
  const hasText = !!(comment.content && String(comment.content).trim());

  return (
    <motion.div
      className={`tp-msg ${mine ? 'is-mine' : 'is-staff'}`}
      {...appear}
    >
      {!mine && (
        <span className="tp-avatar" aria-hidden>
          {(author || '?').trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="tp-msg-body">
        {!mine && (
          <span className="tp-msg-author">
            {__('Support team')}
            {author ? ` · ${author}` : ''}
          </span>
        )}
        {hasText && (
          <div
            className="tp-bubble ticket-comment-content"
            dangerouslySetInnerHTML={{
              __html: xss(String(comment.content).replace(/\n/g, '<br />')),
            }}
          />
        )}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="tp-msg-files">
            {comment.attachments.map((file, index) => (
              <Attachment
                key={`${file.url}-${index}`}
                attachment={{ name: file.name || '', url: file.url || '' }}
              />
            ))}
          </div>
        )}
        <span className="tp-time">{dayjs(comment.createdAt).format('LT')}</span>
      </div>
    </motion.div>
  );
};

const eventText = (log: ITicketActivityLog) => {
  const action = log.action || (log.contentType || '').split(':')[1];

  if (action === 'create') {
    return __('Ticket submitted');
  }

  if (action === 'moved') {
    const to =
      log.content && (log.content.text || log.content.destinationStageName);
    return to ? `${__('Stage changed')} · ${to}` : __('Stage changed');
  }

  if (action === 'assignee') {
    const who =
      log.createdByDetail?.type === 'user' && log.createdByDetail.content
        ? renderUserFullName(log.createdByDetail.content)
        : '';
    return who && who !== 'Unknown'
      ? `${__('Assigned to support')} · ${who}`
      : __('Assigned to support');
  }

  return '';
};

const Event = ({ log }: { log: ITicketActivityLog }) => (
  <motion.div className="tp-event" {...appear}>
    <span className="tp-event-dot" aria-hidden />
    <span>{eventText(log)}</span>
    <span className="tp-time">{dayjs(log.createdAt).format('LT')}</span>
  </motion.div>
);

// 날짜별 대화: 담당자는 왼쪽, 고객 본인은 오른쪽, 단계 이동 등 기록은 작은 한 줄
const TicketThread: React.FC<Props> = ({ thread, loading }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);

  useOriginalImageLinks(rootRef, [thread]);

  if (!loading && thread.length === 0) {
    return (
      <div className="tp-empty">
        {__(
          'No replies yet. Leave a message and support will get back to you.',
        )}
      </div>
    );
  }

  return (
    <div className="tp-thread" ref={rootRef}>
      {thread.map((entry, index) => {
        if (entry.kind === 'day') {
          return (
            <span key={`day-${entry.date}`} className="tp-day">
              {dayjs(entry.date).format(__('MMM D'))}
            </span>
          );
        }

        if (entry.kind === 'event') {
          return (
            <Event key={`event-${entry.item._id || index}`} log={entry.item} />
          );
        }

        return (
          <Comment
            key={`comment-${entry.item._id}`}
            comment={entry.item}
            mine={entry.mine}
          />
        );
      })}
      {loading && <div className="tp-loading" aria-label={__('Loading')} />}
    </div>
  );
};

export default TicketThread;
