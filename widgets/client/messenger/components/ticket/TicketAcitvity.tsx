import * as React from 'react';
import * as dayjs from 'dayjs';
import { motion } from 'framer-motion';

import { __ } from '../../../utils';

import { ITicketActivityLog } from '../../types';

type Props = {
  activity: ITicketActivityLog;
};

export const renderUserFullName = (data: any) => {
  const { details } = data;
  if (details && details.fullName) {
    return details.fullName;
  }

  if (details && (details.firstName || details.lastName)) {
    return (data.firstName || '') + ' ' + (data.lastName || '');
  }

  if (data.email || data.username) {
    return data.email || data.username;
  }

  return 'Unknown';
};

const TicketActivity: React.FC<Props> = ({ activity }) => {
  const { contentType, action, createdByDetail, content, createdAt } = activity;
  const type = contentType.split(':')[1];

  const renderDetail = (_contentType: string, children: React.ReactNode) =>
    children;

  const renderContent = () => {
    let userName = 'Unknown';

    if (createdByDetail && createdByDetail.type === 'user') {
      const { content } = createdByDetail;

      if (content && content.details) {
        userName = renderUserFullName(createdByDetail.content);
      }
    }

    switch ((action && action) || type) {
      case 'create':
        return renderDetail(
          activity.contentType,
          <span>
            <strong>{userName}</strong> {__('created')} <b>{__('ticket')}</b>
            <div className="date">
              {dayjs(createdAt).format('YYYY-MM-DD, LT')}
            </div>
          </span>,
        );

      case 'assignee':
        return renderDetail(
          'assignee',
          <span>
            <strong>{userName}</strong> {__('assigned')}{' '}
            <b>{__('team member')}</b>
          </span>,
        );

      case 'archive':
        return renderDetail(
          'archive',
          <span>
            <strong>{userName}</strong> {content} this {type}
          </span>,
        );

      case 'moved':
        return renderDetail(
          activity.contentType,
          <span>
            <strong>{userName}</strong>
            {__('moved')} <b>{content.text || ''}</b>
          </span>,
        );

      case 'convert':
        return renderDetail(
          activity.contentType,
          <span>
            <strong>{userName}</strong> {__('converted')}
          </span>,
        );

      case 'delete':
        return renderDetail(
          activity.contentType,
          <span>
            <strong>{userName}</strong> {__('deleted')}
          </span>,
        );

      default:
        return <div />;
    }
  };

  return (
    <motion.div
      className="ticket-progress-log"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {renderContent()}
    </motion.div>
  );
};

export default TicketActivity;
