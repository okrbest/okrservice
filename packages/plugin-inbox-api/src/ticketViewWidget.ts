// 위젯 티켓 "새 탭에서 보기" — inbox-api 쪽 순수 도우미
import * as crypto from 'crypto';

export const TICKET_VIEW_INVALID_INPUT = 'TICKET_VIEW_INVALID_INPUT';
export const TICKET_VIEW_COMMENT_MAX_LENGTH = 10000;
export const TICKET_VIEW_COMMENT_MAX_ATTACHMENTS = 10;

/**
 * 열쇠 원문을 지문으로 바꾼다. tickets-api에는 지문만 보내서
 * 서버 사이 메시지·오류 기록에 열쇠 원문이 남지 않게 한다(tickets-api ticketViewLink.hashToken과 같은 값).
 */
export const hashTicketViewToken = (token: string): string =>
  typeof token === 'string' && token
    ? crypto.createHash('sha256').update(token).digest('hex')
    : '';

// 업로드가 돌려주는 저장소 키만 받는다: 스킴(javascript:, https: …)·외부 주소(//…)는 거부
const isStorageKey = (url: unknown) =>
  typeof url === 'string' &&
  url.trim().length > 0 &&
  !/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) &&
  !url.trim().startsWith('//') &&
  !/http/i.test(url);

/** 새 탭 댓글 입력 검증 — 실패하면 TICKET_VIEW_INVALID_INPUT */
export const validateTicketViewComment = ({
  content,
  attachments,
}: {
  content?: string;
  attachments?: Array<{ url?: string }>;
}) => {
  const files = attachments || [];
  const text = content || '';

  if (
    text.length > TICKET_VIEW_COMMENT_MAX_LENGTH ||
    files.length > TICKET_VIEW_COMMENT_MAX_ATTACHMENTS ||
    files.some((file) => !isStorageKey(file && file.url)) ||
    (!text.trim() && files.length === 0)
  ) {
    throw new Error(TICKET_VIEW_INVALID_INPUT);
  }
};

/** WIDGETS_UPLOAD_FILE_TYPES 설정을 위젯 연결(widgetsMessengerConnect)과 같은 방식으로 나눈다 */
export const parseAllowedFileTypes = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((type) => type.trim())
      .filter((type) => type);
  }

  return Array.isArray(value) ? value : [];
};
