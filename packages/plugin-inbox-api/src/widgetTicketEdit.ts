// 위젯 고객의 접수 후 티켓 수정 — inbox-api 쪽 입력 형식 검증.
// 본인·단계·보관 판단과 저장은 tickets-api(widgets.ticketEdit.*)가 한다.
import {
  TICKET_VIEW_COMMENT_MAX_ATTACHMENTS,
  TICKET_VIEW_COMMENT_MAX_LENGTH,
} from './ticketViewWidget';

export const TICKET_EDIT_INVALID_INPUT = 'TICKET_EDIT_INVALID_INPUT';

// 위젯 접수 화면의 요청 구분(TicketSubmitForm REQUEST_TYPES)
const REQUEST_TYPES = [
  'inquiry',
  'error',
  'improvement',
  'usage_guide',
  'config',
  'data_work',
  'additional_development',
  'widget',
];

const VISIBILITIES = ['public', 'private'];

type Input = {
  customerId?: string;
  ticketId?: string;
  type?: string | null;
  description?: string | null;
  attachments?: Array<{ url?: string; name?: string }> | null;
  visibility?: string | null;
};

const isText = (value: unknown) => typeof value === 'string';

/** 실패하면 TICKET_EDIT_INVALID_INPUT. 보내지 않은 항목은 검사하지 않는다 */
export const validateWidgetTicketEdit = ({
  customerId,
  ticketId,
  type,
  description,
  attachments,
  visibility,
}: Input) => {
  const invalid =
    !customerId ||
    !ticketId ||
    (type != null && !REQUEST_TYPES.includes(type)) ||
    (visibility != null && !VISIBILITIES.includes(visibility)) ||
    (description != null &&
      (!isText(description) ||
        !description.trim() ||
        description.length > TICKET_VIEW_COMMENT_MAX_LENGTH)) ||
    (attachments != null &&
      (attachments.length > TICKET_VIEW_COMMENT_MAX_ATTACHMENTS ||
        attachments.some(
          (file) =>
            !file ||
            !isText(file.url) ||
            !(file.url as string).trim() ||
            (file.name != null && !isText(file.name)),
        )));

  if (invalid) {
    throw new Error(TICKET_EDIT_INVALID_INPUT);
  }
};
