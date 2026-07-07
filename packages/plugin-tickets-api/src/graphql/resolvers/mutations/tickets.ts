import { IItemDragCommonFields } from "../../../models/definitions/boards";
import { ITicket } from "../../../models/definitions/tickets";
import { checkPermission } from "@erxes/api-utils/src/permissions";
import {
  itemsAdd,
  itemsArchive,
  itemsChange,
  itemsCopy,
  itemsEdit,
  itemsRemove
} from "./utils";
import { IContext } from "../../../connectionResolver";
import { sendCoreMessage } from "../../../messageBroker";
interface ITicketsEdit extends ITicket {
  _id: string;
}

const ticketMutations = {
  /**
   * Create new ticket
   */
  async ticketsAdd(
    _root,
    doc: ITicket & { proccessId: string; aboveItemId: string },
    { user, models, subdomain }: IContext
  ) {
    return itemsAdd(
      models,
      subdomain,
      doc,
      "ticket",
      models.Tickets.createTicket,
      user
    );
  },
  /**
   * Edit ticket
   */
  async ticketsEdit(
    _root,
    { _id, proccessId, expectedModifiedAt, ...doc }: ITicketsEdit & { proccessId: string; expectedModifiedAt?: Date },
    { user, models, subdomain }: IContext
  ) {
    const oldTicket = await models.Tickets.getTicket(_id);

    if (
      doc.description !== undefined &&
      expectedModifiedAt != null &&
      oldTicket?.modifiedAt
    ) {
      const expectedMs = new Date(expectedModifiedAt).getTime();
      const actualMs = new Date(oldTicket.modifiedAt).getTime();
      if (Math.abs(expectedMs - actualMs) > 1000) {
        const err = new Error("DESCRIPTION_CONFLICT") as Error & { code?: string };
        err.code = "DESCRIPTION_CONFLICT";
        throw err;
      }
    }

    return itemsEdit(
      models,
      subdomain,
      _id,
      "ticket",
      oldTicket,
      doc,
      proccessId,
      user,
      models.Tickets.updateTicket
    );
  },

  /**
   * Change ticket
   */
  async ticketsChange(
    _root,
    doc: IItemDragCommonFields,
    { user, models, subdomain }: IContext
  ) {
    return itemsChange(
      models,
      subdomain,
      doc,
      "ticket",
      user,
      models.Tickets.updateTicket
    );
  },

  /**
   * Remove ticket
   */
  async ticketsRemove(
    _root,
    { _id }: { _id: string },
    { user, models, subdomain }: IContext
  ) {
    return itemsRemove(models, subdomain, _id, "ticket", user);
  },

  /**
   * Watch ticket
   */
  async ticketsWatch(
    _root,
    { _id, isAdd }: { _id: string; isAdd: boolean },
    { user, models }: IContext
  ) {
    return models.Tickets.watchTicket(_id, isAdd, user._id);
  },

  async ticketsCopy(
    _root,
    { _id, proccessId }: { _id: string; proccessId: string },
    { user, models, subdomain }: IContext
  ) {
    return itemsCopy(
      models,
      subdomain,
      _id,
      proccessId,
      "ticket",
      user,
      ["source"],
      models.Tickets.createTicket
    );
  },

  async ticketsArchive(
    _root,
    { stageId, proccessId }: { stageId: string; proccessId: string },
    { user, models, subdomain }: IContext
  ) {
    return itemsArchive(models, subdomain, stageId, "ticket", proccessId, user);
  },

  async ticketsBulkArchive(
    _root,
    { ids, pipelineId: _pipelineId }: { ids: string[]; pipelineId: string },
    { models, user }: IContext
  ) {
    if (!ids || ids.length === 0) return { count: 0 };
    const limitedIds = ids.slice(0, 500);

    await models.Tickets.updateMany(
      { _id: { $in: limitedIds } },
      { $set: { status: "archived", modifiedAt: new Date(), modifiedBy: user._id } }
    );

    return { count: limitedIds.length };
  },

  async ticketsBulkEdit(
    _root,
    { ids, status }: { ids: string[]; status: string },
    { models, user }: IContext
  ) {
    if (!ids || ids.length === 0) return { count: 0 };

    const VALID_STATUSES = ['active', 'archived'];
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`유효하지 않은 status: ${status}`);
    }

    const limitedIds = ids.slice(0, 500);

    await models.Tickets.updateMany(
      { _id: { $in: limitedIds } },
      { $set: { status, modifiedAt: new Date(), modifiedBy: user._id } }
    );

    return { count: limitedIds.length };
  },

  async ticketsBulkRemove(
    _root,
    { ids }: { ids: string[] },
    { models, subdomain, user }: IContext
  ) {
    if (!ids || ids.length === 0) return 0;
    const limitedIds = ids.slice(0, 500);

    const results = await Promise.allSettled(
      limitedIds.map((id) => itemsRemove(models, subdomain, id, 'ticket', user))
    );

    return results.filter((r) => r.status === 'fulfilled').length;
  },

  /**
   * Update widget alarm
   */
  async updateWidgetAlarm(
    _root,
    { ticketId }: { ticketId: string },
    { models }: IContext
  ) {
    try {
      await models.Tickets.updateOne(
        { _id: ticketId },
        { $set: { widgetAlarm: true } }
      );
      
      return {
        success: true,
        message: "Widget alarm updated successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};

checkPermission(ticketMutations, "ticketsAdd", "ticketsAdd");
checkPermission(ticketMutations, "ticketsEdit", "ticketsEdit");
checkPermission(ticketMutations, "ticketsRemove", "ticketsRemove");
checkPermission(ticketMutations, "ticketsWatch", "ticketsWatch");
checkPermission(ticketMutations, "ticketsArchive", "ticketsArchive");
checkPermission(ticketMutations, "ticketsBulkArchive", "ticketsArchive");
checkPermission(ticketMutations, "ticketsBulkEdit", "ticketsEdit");
checkPermission(ticketMutations, "ticketsBulkRemove", "ticketsRemove");

export default ticketMutations;
