import {
  checkPermission,
  moduleRequireLogin
} from "@erxes/api-utils/src/permissions";
import { IContext } from "../../../connectionResolver";
import { IListParams } from "./boards";
import {
  archivedItems,
  archivedItemsCount,
  checkItemPermByUser,
  generateTicketCommonFilters,
  getItemList,
  IArchiveArgs
} from "./utils";
const ticketQueries = {
  /**
   * Tickets list
   */
  async tickets(
    _root,
    args: IListParams,
    { user, models, subdomain }: IContext
  ) {
    const filter = {
      ...(await generateTicketCommonFilters(models, subdomain, user._id, args))
    };

    return await getItemList(models, subdomain, filter, args, user, "ticket");
  },

  async ticketsTotalCount(
    _root,
    args: IListParams,
    { user, models, subdomain }: IContext
  ) {
    const filter = {
      ...(await generateTicketCommonFilters(models, subdomain, user._id, args))
    };

    return models.Tickets.find(filter).countDocuments();
  },

  /**
   * Archived list
   */
  async archivedTickets(_root, args: IArchiveArgs, { models }: IContext) {
    return archivedItems(models, args, models.Tickets);
  },

  async archivedTicketsCount(_root, args: IArchiveArgs, { models }: IContext) {
    return archivedItemsCount(models, args, models.Tickets);
  },

  /**
   * Tickets detail
   * includeRelations: false면 companies/customers/hasNotified 등 RPC 호출 생략 → 모달 첫 로딩 속도 개선
   */
  async ticketDetail(
    _root,
    { _id, includeRelations }: { _id: string; includeRelations?: boolean },
    context: IContext
  ) {
    const { user, models, subdomain } = context;
    (context as any).includeRelations = includeRelations !== false;

    const ticket = await models.Tickets.getTicket(_id);

    return checkItemPermByUser(subdomain, models, user, ticket);
  },

};

moduleRequireLogin(ticketQueries);

checkPermission(ticketQueries, "tickets", "showTickets", []);

export default ticketQueries;
