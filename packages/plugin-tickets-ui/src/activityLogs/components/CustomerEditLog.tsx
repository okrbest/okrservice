import {
  ActivityDate,
  FlexBody,
  FlexCenterContent,
} from '@erxes/ui-log/src/activityLogs/styles';

import { IActivityLogItemProps } from '@erxes/ui-log/src/activityLogs/types';
import React from 'react';
import Tip from '@erxes/ui/src/components/Tip';
import dayjs from 'dayjs';

// 위젯 고객이 접수 후 티켓을 고친 기록(tickets-api widgetTicketEdit의 changedFields)
const FIELD_LABELS: Record<string, string> = {
  type: '요청 구분',
  description: '설명',
  attachments: '첨부파일',
  visibility: '공개 설정',
};

const customerName = (createdByDetail: any) => {
  const customer =
    createdByDetail && createdByDetail.type === 'customer'
      ? createdByDetail.content || {}
      : {};
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ');

  return name || customer.primaryEmail || '고객';
};

class CustomerEditLog extends React.Component<IActivityLogItemProps> {
  render() {
    const { createdAt, createdByDetail, content } = this.props.activity;
    const fields: string[] = (content && content.changedFields) || [];
    const labels = fields.map((field) => FIELD_LABELS[field] || field);

    return (
      <FlexCenterContent>
        <FlexBody>
          <span>
            <strong>{customerName(createdByDetail)}</strong> 님이 위젯에서
            티켓을 수정했습니다
            {labels.length > 0 && ` — 바뀐 항목: ${labels.join(', ')}`}
          </span>
        </FlexBody>
        <Tip text={dayjs(createdAt).format('llll')}>
          <ActivityDate>
            {dayjs(createdAt).format('MMM D, h:mm A')}
          </ActivityDate>
        </Tip>
      </FlexCenterContent>
    );
  }
}

export default CustomerEditLog;
