// 위젯 "티켓 수정" 화면용 순수 도우미

type Attachment = { url?: string; name?: string; type?: string; size?: number };

export type EditDraft = {
  ticketType: string;
  description: string;
  visibility: string;
  attachments: Attachment[];
};

export const EDIT_STAGE_LOCKED = 'TICKET_EDIT_STAGE_LOCKED';
const EDIT_NOT_ALLOWED = 'TICKET_EDIT_NOT_ALLOWED';
const EDIT_INVALID_INPUT = 'TICKET_EDIT_INVALID_INPUT';

export const LOCKED_NOTICE = '처리가 시작되어 공개 설정만 바꿀 수 있어요.';

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** 저장된 설명(HTML)을 입력칸 글로: 문단·줄바꿈 태그는 줄바꿈, 나머지 태그는 지운다 */
export const descriptionToText = (html?: string | null): string =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\n+$/, '');

const urlsOf = (attachments: Attachment[]) =>
  attachments.map((file) => file.url || '').join('\n');

/**
 * 처음 채운 값과 비교해 바뀐 항목만 보낸다. 설명을 건드리지 않으면 보내지 않아
 * 직원이 넣은 서식이 그대로 남는다. 내용을 고칠 수 없으면 공개 설정만 본다.
 */
export const buildEditVariables = ({
  customerId,
  ticketId,
  canEditContent,
  initial,
  form,
}: {
  customerId: string;
  ticketId: string;
  canEditContent: boolean;
  initial: EditDraft;
  form: EditDraft;
}) => {
  const variables: Record<string, any> = { customerId, ticketId };

  if (form.visibility !== initial.visibility) {
    variables.visibility = form.visibility;
  }

  if (!canEditContent) {
    return variables;
  }

  if (form.ticketType !== initial.ticketType) {
    variables.type = form.ticketType;
  }

  if (form.description !== initial.description) {
    variables.description = form.description;
  }

  if (urlsOf(form.attachments) !== urlsOf(initial.attachments)) {
    // url에는 기존 첨부는 저장된 값 그대로, 새 파일은 저장 키만(댓글과 같은 규칙)
    variables.attachments = form.attachments.map(
      ({ url, name, type, size }) => ({
        url: url || '',
        name: name || '',
        type: type || 'file',
        ...(typeof size === 'number' ? { size } : {}),
      }),
    );
  }

  return variables;
};

const messagesOf = (error: any): string[] =>
  [
    ...((error && error.graphQLErrors) || []).map((e: any) => e && e.message),
    error && error.message,
  ].filter(Boolean);

export const hasEditError = (error: any, code: string) =>
  messagesOf(error).some((message) => message.includes(code));

export const editErrorNotice = (error: any): string => {
  if (hasEditError(error, EDIT_STAGE_LOCKED)) {
    return '이미 처리가 시작되어 공개 설정만 바꿀 수 있어요.';
  }

  if (hasEditError(error, EDIT_NOT_ALLOWED)) {
    return '이 티켓은 수정할 수 없어요.';
  }

  if (hasEditError(error, EDIT_INVALID_INPUT)) {
    return '입력한 내용을 확인해 주세요.';
  }

  return '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
};
