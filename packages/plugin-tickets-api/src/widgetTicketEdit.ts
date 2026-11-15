// 위젯 고객의 티켓 수정(접수 후). messageBroker.ts의 consumeRPCQueue에서 부른다.
// 오류는 계약의 코드(TICKET_EDIT_*)로 던지고, consumeRPCQueue가 호출 쪽(inbox-api)에 그대로 넘긴다.
// 직원 편집 경로(itemsEdit)는 쓰지 않는다 — 고객 알림 메일 예약·자동화가 고객 본인 수정에 돌면 안 된다.
import { IModels } from './connectionResolver';
import { BOARD_STATUSES } from './models/definitions/constants';

export const TICKET_EDIT_NOT_ALLOWED = 'TICKET_EDIT_NOT_ALLOWED';
export const TICKET_EDIT_STAGE_LOCKED = 'TICKET_EDIT_STAGE_LOCKED';
export const TICKET_EDIT_INVALID_INPUT = 'TICKET_EDIT_INVALID_INPUT';

// 새 탭 댓글과 같은 상한(inbox-api TICKET_VIEW_COMMENT_MAX_ATTACHMENTS)
const MAX_ATTACHMENTS = 10;

export type EditField = 'type' | 'description' | 'attachments' | 'visibility';

type Attachment = { url?: string; name?: string; type?: string; size?: number };

export type WidgetTicketEditInput = {
  customerId: string;
  ticketId: string;
  type?: string;
  description?: string;
  attachments?: Attachment[];
  visibility?: string;
};

// messageBroker.ts의 함수를 넘겨받는다(순환 참조 방지)
type Deps = {
  sendCore: (args: {
    subdomain: string;
    action: string;
    data: any;
    isRPC: boolean;
    defaultValue: any;
  }) => Promise<any>;
  publish?: (trigger: string, payload: any) => any;
  putActivityLog?: (
    subdomain: string,
    params: { action: string; data: any },
  ) => Promise<any>;
};

const asIds = (value: any): string[] =>
  Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];

/** 접수자 본인 — 위젯 목록이 "내 티켓"으로 보여 주는 연결(티켓 고객·고객 연결)과 같다. 회사 연결은 보지 않는다 */
export const isTicketOwner = ({
  customerId,
  ticketCustomerIds,
  conformityCustomerIds,
}: {
  customerId: string;
  ticketCustomerIds: string[];
  conformityCustomerIds: string[];
}): boolean =>
  Boolean(customerId) &&
  (ticketCustomerIds.includes(customerId) ||
    conformityCustomerIds.includes(customerId));

/** 위젯 단계 막대와 같은 순서(보관 단계 제외, order 오름차순)에서 맨 앞인지 */
export const isFirstStage = (
  stages: Array<{ _id: string; order?: number; status?: string }>,
  stageId?: string,
): boolean => {
  const first = stages
    .filter((stage) => stage.status !== BOARD_STATUSES.ARCHIVED)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

  return Boolean(stageId && first && first._id === stageId);
};

/** 위젯 접수(widgets.createTicket)와 같은 규칙: 태그가 없는 글이면 줄마다 <p>, 빈 줄은 뺀다 */
export const toWidgetDescriptionHtml = (description: string): string => {
  if (/<[^>]+>/.test(description)) {
    return description;
  }

  return (
    description
      .split(/\r\n|\r|\n/)
      .filter((line) => line.trim() !== '')
      .map((line) => `<p>${line}</p>`)
      .join('') || description
  );
};

const urlsOf = (attachments: Attachment[] = []) =>
  attachments.map((file) => file.url || '').join('\n');

const visibilityOf = (value?: string | null) => value || 'public';

/** 보낸 항목 중 지금 값과 다른 것. description은 저장될 HTML로 넘겨야 한다 */
export const computeChangedFields = (
  ticket: {
    type?: string;
    description?: string;
    attachments?: Attachment[];
    visibility?: string | null;
  },
  next: Omit<Partial<WidgetTicketEditInput>, 'customerId' | 'ticketId'>,
): EditField[] => {
  const changed: EditField[] = [];

  if (next.type !== undefined && next.type !== ticket.type) {
    changed.push('type');
  }

  if (
    next.description !== undefined &&
    next.description !== (ticket.description || '')
  ) {
    changed.push('description');
  }

  if (
    next.attachments !== undefined &&
    urlsOf(next.attachments) !== urlsOf(ticket.attachments)
  ) {
    changed.push('attachments');
  }

  if (
    next.visibility !== undefined &&
    visibilityOf(next.visibility) !== visibilityOf(ticket.visibility)
  ) {
    changed.push('visibility');
  }

  return changed;
};

// 업로드가 돌려주는 저장소 키만: 스킴(javascript:, https: …)·외부 주소(//…)는 거부
const isStorageKey = (url: unknown) =>
  typeof url === 'string' &&
  url.trim().length > 0 &&
  !/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) &&
  !url.trim().startsWith('//') &&
  !/http/i.test(url);

/** 첨부는 지금 붙어 있던 것(예전 접수는 전체 주소)이거나 새로 올린 저장 키만 */
export const validateEditAttachments = (
  current: Attachment[] = [],
  next: Attachment[],
) => {
  const existing = new Set(current.map((file) => file.url));

  if (
    next.length > MAX_ATTACHMENTS ||
    next.some(
      (file) => !file || !(existing.has(file.url) || isStorageKey(file.url)),
    )
  ) {
    throw new Error(TICKET_EDIT_INVALID_INPUT);
  }
};

/** 본인·보관 여부는 항상, 공개 설정 외 항목을 바꿀 때는 첫 단계인지도 본다 */
export const decideEdit = (
  state: { isOwner: boolean; isArchived: boolean; isFirstStage: boolean },
  changedFields: EditField[],
) => {
  if (!state.isOwner || state.isArchived) {
    throw new Error(TICKET_EDIT_NOT_ALLOWED);
  }

  if (
    !state.isFirstStage &&
    changedFields.some((field) => field !== 'visibility')
  ) {
    throw new Error(TICKET_EDIT_STAGE_LOCKED);
  }
};

export const buildCustomerEditActivity = (
  ticketId: string,
  customerId: string,
  changedFields: EditField[],
) => ({
  action: 'customerEdit',
  data: {
    contentType: 'ticket',
    contentId: ticketId,
    action: 'customerEdit',
    createdBy: customerId,
    content: { changedFields },
  },
});

const NOT_EDITABLE = { canEdit: false, canEditContent: false, ticket: null };

// 수정 화면에 채울 항목만 준다(연결 고객·담당자 등은 주지 않음)
const editableView = (ticket: any) => ({
  _id: ticket._id,
  name: ticket.name,
  type: ticket.type,
  description: ticket.description,
  visibility: visibilityOf(ticket.visibility),
  attachments: (ticket.attachments || []).map(
    ({ name, url, type, size }: any) => ({ name, url, type, size }),
  ),
});

const loadEditContext = async (
  models: IModels,
  subdomain: string,
  { sendCore }: Deps,
  { customerId, ticketId }: { customerId: string; ticketId: string },
) => {
  const ticket =
    customerId && ticketId
      ? await models.Tickets.findOne({ _id: ticketId }).lean()
      : null;

  if (!ticket) {
    return null;
  }

  const ticketCustomerIds = asIds(ticket.customerIds);
  // 티켓 고객으로 바로 확인되면 core에 묻지 않는다
  const conformityCustomerIds = ticketCustomerIds.includes(customerId)
    ? []
    : asIds(
        await sendCore({
          subdomain,
          action: 'conformities.savedConformity',
          data: {
            mainType: 'ticket',
            mainTypeId: ticketId,
            relTypes: ['customer'],
          },
          isRPC: true,
          defaultValue: [],
        }),
      );

  const stage = ticket.stageId
    ? await models.Stages.findOne({ _id: ticket.stageId }).lean()
    : null;
  const stages = stage
    ? await models.Stages.find(
        { pipelineId: stage.pipelineId },
        { _id: 1, order: 1, status: 1 },
      ).lean()
    : [];

  return {
    ticket,
    pipelineId: stage ? stage.pipelineId : undefined,
    isOwner: isTicketOwner({
      customerId,
      ticketCustomerIds,
      conformityCustomerIds,
    }),
    isArchived: ticket.status === BOARD_STATUSES.ARCHIVED,
    isFirstStage: isFirstStage(stages as any[], ticket.stageId),
  };
};

const toState = (context: any) => {
  if (!context || !context.isOwner || context.isArchived) {
    return NOT_EDITABLE;
  }

  return {
    canEdit: true,
    canEditContent: context.isFirstStage,
    ticket: editableView(context.ticket),
  };
};

/** 수정 버튼을 보일지, 내용까지 고칠 수 있는지. 못 고치면 오류 대신 버튼만 숨기는 값 */
export const getWidgetTicketEditState = async (
  models: IModels,
  subdomain: string,
  deps: Deps,
  args: { customerId: string; ticketId: string },
) => toState(await loadEditContext(models, subdomain, deps, args));

export const saveWidgetTicketEdit = async (
  models: IModels,
  subdomain: string,
  deps: Deps,
  input: WidgetTicketEditInput,
) => {
  const { customerId, ticketId, type, attachments, visibility } = input;
  const context = await loadEditContext(models, subdomain, deps, {
    customerId,
    ticketId,
  });

  if (!context) {
    throw new Error(TICKET_EDIT_NOT_ALLOWED);
  }

  const { ticket } = context;
  const description =
    input.description === undefined
      ? undefined
      : toWidgetDescriptionHtml(input.description);
  const next = { type, description, attachments, visibility };
  const changedFields = computeChangedFields(ticket as any, next);

  decideEdit(context, changedFields);

  if (changedFields.includes('attachments')) {
    validateEditAttachments(ticket.attachments as any, attachments || []);
  }

  if (!changedFields.length) {
    return toState(context);
  }

  const $set: any = { modifiedAt: new Date() };

  if (changedFields.includes('type')) {
    // 접수할 때처럼 요청 구분은 requestType에도 둔다
    $set.type = type;
    $set.requestType = type;
  }

  if (changedFields.includes('description')) {
    $set.description = description;
  }

  if (changedFields.includes('attachments')) {
    $set.attachments = (attachments || []).map(({ url, name, type, size }) => ({
      url,
      name,
      type,
      ...(size !== undefined ? { size } : {}),
    }));
  }

  if (changedFields.includes('visibility')) {
    $set.visibility = visibility;
  }

  await models.Tickets.updateOne({ _id: ticketId }, { $set });

  if (deps.putActivityLog) {
    await deps.putActivityLog(
      subdomain,
      buildCustomerEditActivity(ticketId, customerId, changedFields),
    );
  }

  // 열려 있는 직원 보드가 새로 그리게 한다
  if (deps.publish && context.pipelineId) {
    deps.publish(`ticketsPipelinesChanged:${context.pipelineId}`, {
      ticketsPipelinesChanged: { _id: context.pipelineId },
    });
  }

  return toState({
    ...context,
    ticket: { ...ticket, ...$set },
  });
};
