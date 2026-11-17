// 위젯 티켓 "새 탭에서 보기" RPC 처리. messageBroker.ts의 consumeRPCQueue에서 부른다.
// 오류는 계약의 코드(TICKET_VIEW_*)로 던지고, consumeRPCQueue가 호출 쪽(inbox-api)에 그대로 넘긴다.
import type { IModels } from './connectionResolver';
import { BOARD_STATUSES } from './models/definitions/constants';
import { stageTone } from './stageTone';
import {
  TICKET_VIEW_LINK_EXPIRED,
  canIssueLink,
  isEmailLink,
  shouldRecheck,
} from './ticketViewLink';

export const TICKET_VIEW_NOT_ALLOWED = 'TICKET_VIEW_NOT_ALLOWED';
export const TICKET_VIEW_NOT_FOUND = 'TICKET_VIEW_NOT_FOUND';

// core에 보내는 RPC — messageBroker.ts의 sendCoreMessage를 넘겨받는다(순환 참조 방지)
type SendCore = (args: {
  subdomain: string;
  action: string;
  data: any;
  isRPC: boolean;
  defaultValue: any;
}) => Promise<any>;

const asIds = (value: any): string[] =>
  Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];

const isPublic = (visibility?: string | null) =>
  !visibility || visibility === 'public';

/**
 * 고객이 위젯에서 볼 수 있는 티켓인지(위젯 목록과 같은 판단 재료).
 * 링크 발급과 메일 링크를 열 때의 권한 재확인이 같이 쓴다.
 */
export const canCustomerViewTicket = async (
  subdomain: string,
  sendCore: SendCore,
  { ticket, customerId }: { ticket: any; customerId: string },
): Promise<boolean> => {
  const ticketCustomerIds = asIds(ticket.customerIds);

  // 바로 확인되면 core에 묻지 않는다
  let allowed = canIssueLink({
    customerId,
    ticketCustomerIds,
    conformityCustomerIds: [],
    customerCompanyIds: [],
    ticketCompanyIds: [],
    ticketIsPublic: isPublic((ticket as any).visibility),
  });

  if (!allowed) {
    const related = (relTypes: string[]) =>
      sendCore({
        subdomain,
        action: 'conformities.savedConformity',
        data: { mainType: 'ticket', mainTypeId: ticket._id, relTypes },
        isRPC: true,
        defaultValue: [],
      });

    const customer = await sendCore({
      subdomain,
      action: 'customers.findOne',
      data: { _id: customerId },
      isRPC: true,
      defaultValue: null,
    });

    let customerCompanyIds = asIds(customer && customer.companyIds);

    if (!customerCompanyIds.length) {
      customerCompanyIds = asIds(
        await sendCore({
          subdomain,
          action: 'conformities.savedConformity',
          data: {
            mainType: 'customer',
            mainTypeId: customerId,
            relTypes: ['company'],
          },
          isRPC: true,
          defaultValue: [],
        }),
      );
    }

    allowed = canIssueLink({
      customerId,
      ticketCustomerIds,
      conformityCustomerIds: asIds(await related(['customer'])),
      customerCompanyIds,
      ticketCompanyIds: [
        ...asIds((ticket as any).companyIds),
        ...asIds(await related(['company'])),
      ],
      ticketIsPublic: isPublic((ticket as any).visibility),
    });
  }

  return allowed;
};

/** 고객이 위젯에서 볼 수 있는 티켓이면 열쇠를 발급한다 */
export const createTicketViewLink = async (
  models: IModels,
  subdomain: string,
  sendCore: SendCore,
  { customerId, ticketId }: { customerId: string; ticketId: string },
) => {
  const ticket =
    customerId && ticketId
      ? await models.Tickets.findOne({ _id: ticketId }).lean()
      : null;

  if (
    !ticket ||
    !(await canCustomerViewTicket(subdomain, sendCore, { ticket, customerId }))
  ) {
    throw new Error(TICKET_VIEW_NOT_ALLOWED);
  }

  return models.TicketViewLinks.createLink({ ticketId, customerId });
};

const isOpenTicket = (ticket: any) =>
  Boolean(ticket) && ticket.status !== BOARD_STATUSES.ARCHIVED;

/**
 * 자동화 메일에 넣을 고객 링크 열쇠(보낸 뒤 14일). 받을 수 없는 경우는 오류 없이 null —
 * 메일 발송이 링크 때문에 멈추면 안 된다. 상세를 볼 수 없는 보관 티켓에도 만들지 않는다.
 */
export const createEmailTicketViewLink = async (
  models: IModels,
  subdomain: string,
  sendCore: SendCore,
  { customerId, ticketId }: { customerId: string; ticketId: string },
) => {
  const ticket =
    customerId && ticketId
      ? await models.Tickets.findOne({ _id: ticketId }).lean()
      : null;

  if (
    !ticket ||
    !isOpenTicket(ticket) ||
    !(await canCustomerViewTicket(subdomain, sendCore, { ticket, customerId }))
  ) {
    return null;
  }

  const link = await models.TicketViewLinks.createLink(
    { ticketId, customerId },
    new Date(),
    'email',
  );
  const stage = ticket.stageId
    ? await models.Stages.findOne(
        { _id: ticket.stageId },
        { name: 1, pipelineId: 1 },
      ).lean()
    : null;
  const pipelineStages = stage
    ? await models.Stages.find(
        { pipelineId: stage.pipelineId },
        { _id: 1, order: 1, status: 1 },
      ).lean()
    : [];

  // 메일 카드에 보여 줄 요약 — 고객이 볼 수 있는 화면과 같은 범위(번호·제목·현재 단계와 그 색)만
  return {
    ...link,
    ticket: {
      number: ticket.number,
      name: ticket.name,
      stageName: stage ? stage.name : undefined,
      stageTone: stageTone(
        stage ? stage._id : undefined,
        stage ? stage.name : undefined,
        pipelineStages as any,
      ),
    },
  };
};

/**
 * 열쇠 확인(쓰는 중이면 만료 연장). 댓글 등록용이면 티켓이 아직 있고 보관되지 않았는지도 본다.
 * 열쇠 원문은 서버 사이 메시지에 싣지 않는다 — inbox-api가 지문(tokenHash)으로 바꿔 보낸다.
 */
export const useTicketViewLink = async (
  models: IModels,
  { tokenHash, forComment }: { tokenHash: string; forComment?: boolean },
  deps: { subdomain: string; sendCore: SendCore; now?: Date },
) => {
  const now = deps.now || new Date();
  const used = await models.TicketViewLinks.useLink(tokenHash, now);
  const link = { ticketId: used.ticketId, customerId: used.customerId };

  // 메일 링크는 14일 동안 살아 있어, 그사이 고객이 티켓을 볼 수 없게 되면 막는다(5분마다 다시 확인)
  if (isEmailLink(used) && shouldRecheck(used, now)) {
    const ticket = await models.Tickets.findOne({ _id: used.ticketId }).lean();
    const allowed =
      Boolean(ticket) &&
      (await canCustomerViewTicket(deps.subdomain, deps.sendCore, {
        ticket,
        customerId: used.customerId,
      }));

    // 폐기하지 않고 막기만 한다 — core가 잠깐 응답하지 않아 거부로 판단된 경우에도 링크가 영영 사라지지 않게.
    // 확인 시각을 남기지 않아 다음 요청에서 다시 판단한다
    if (!allowed) {
      throw new Error(TICKET_VIEW_LINK_EXPIRED);
    }

    await models.TicketViewLinks.markChecked(used._id, now);
  }

  if (forComment) {
    const ticket = await models.Tickets.findOne(
      { _id: link.ticketId },
      { status: 1 },
    ).lean();

    if (!isOpenTicket(ticket)) {
      throw new Error(TICKET_VIEW_NOT_FOUND);
    }
  }

  return link;
};

/** 새 탭 화면에 필요한 티켓·단계·댓글. 없거나 보관된 티켓이면 내용 없이 오류 */
export const getTicketViewDetail = async (
  models: IModels,
  { ticketId }: { ticketId: string },
) => {
  const ticket = ticketId
    ? await models.Tickets.findOne({ _id: ticketId }).lean()
    : null;

  if (!ticket || !isOpenTicket(ticket)) {
    throw new Error(TICKET_VIEW_NOT_FOUND);
  }

  const stage = ticket.stageId
    ? await models.Stages.findOne({ _id: ticket.stageId }).lean()
    : null;
  const stages = stage
    ? await models.Stages.find({ pipelineId: stage.pipelineId }).lean()
    : [];
  const comments = await models.Comments.find({ typeId: ticket._id })
    .sort({ createdAt: 1 })
    .lean();

  // 열쇠 하나로 읽을 수 있는 것은 화면에 필요한 항목뿐이다(연결 고객·담당자·사용자 정의 항목 등은 주지 않음)
  return {
    ticket: {
      _id: ticket._id,
      number: ticket.number,
      name: ticket.name,
      status: ticket.status,
      description: ticket.description,
      type: (ticket as any).type,
      requestType: (ticket as any).requestType,
      createdAt: ticket.createdAt,
      stage: stage ? { _id: stage._id, name: stage.name } : null,
      attachments: (ticket.attachments || []).map(
        ({ name, url, type, size }: any) => ({ name, url, type, size }),
      ),
    },
    stages: stages.map(({ _id, name, order, status }) => ({
      _id,
      name,
      order,
      status,
    })),
    comments,
  };
};
