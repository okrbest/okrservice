// 위젯 티켓 "새 탭에서 보기" RPC 처리. messageBroker.ts의 consumeRPCQueue에서 부른다.
// 오류는 계약의 코드(TICKET_VIEW_*)로 던지고, consumeRPCQueue가 호출 쪽(inbox-api)에 그대로 넘긴다.
import { IModels } from './connectionResolver';
import { BOARD_STATUSES } from './models/definitions/constants';
import { canIssueLink } from './ticketViewLink';

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

/** 고객이 위젯에서 볼 수 있는 티켓이면 열쇠를 발급한다(위젯 목록과 같은 판단 재료) */
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

  if (!ticket) {
    throw new Error(TICKET_VIEW_NOT_ALLOWED);
  }

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
        data: { mainType: 'ticket', mainTypeId: ticketId, relTypes },
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

  if (!allowed) {
    throw new Error(TICKET_VIEW_NOT_ALLOWED);
  }

  return models.TicketViewLinks.createLink({ ticketId, customerId });
};

const isOpenTicket = (ticket: any) =>
  Boolean(ticket) && ticket.status !== BOARD_STATUSES.ARCHIVED;

/**
 * 열쇠 확인(쓰는 중이면 만료 연장). 댓글 등록용이면 티켓이 아직 있고 보관되지 않았는지도 본다.
 * 열쇠 원문은 서버 사이 메시지에 싣지 않는다 — inbox-api가 지문(tokenHash)으로 바꿔 보낸다.
 */
export const useTicketViewLink = async (
  models: IModels,
  { tokenHash, forComment }: { tokenHash: string; forComment?: boolean },
) => {
  const link = await models.TicketViewLinks.useLink(tokenHash);

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
