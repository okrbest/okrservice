import { paginate, requireLogin } from "@erxes/api-utils/src";
import { IContext } from "../../../connectionResolver";

const emailDeliveryQueries = {
  async emailDeliveryDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return models.EmailDeliveries.findOne({ _id });
  },

  async transactionEmailDeliveries(
    _root,
    {
      searchValue,
      ...params
    }: { searchValue: string; page: number; perPage: number },
    { models }: IContext
  ) {
    const selector: any = { kind: "transaction" };

    if (searchValue) {
      const re = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      selector.$or = [
        { from: re },
        { subject: re },
        { to: re }
      ];
    }

    const totalCount = await models.EmailDeliveries.countDocuments(selector);

    const list = await paginate(
      models.EmailDeliveries.find(selector).sort({ createdAt: -1 }),
      params
    ).lean();

    return { list, totalCount };
  },

  async automationEmailDeliveries(
    _root,
    {
      searchValue,
      ...params
    }: { searchValue: string; page: number; perPage: number },
    { models }: IContext
  ) {
    const selector: any = { kind: "automation" };

    if (searchValue) {
      const re = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      selector.$or = [
        { from: re },
        { subject: re },
        { to: re },
        { triggerSummary: re }
      ];
    }

    const totalCount = await models.EmailDeliveries.countDocuments(selector);

    const list = await paginate(
      models.EmailDeliveries.find(selector).sort({ createdAt: -1 }),
      params
    ).lean();

    return { list, totalCount };
  },
  async emailDeliveriesAsLogs(
    _root,
    { contentId }: { contentId: string },
    { models }: IContext
  ) {
    const deliveries = await models.EmailDeliveries.find({
      customerId: contentId
    }).lean();

    return deliveries.map(d => ({
      ...d,
      contentType: "email",
      contentId
    }));
  }
};

requireLogin(emailDeliveryQueries, "emailDeliveryDetail");
requireLogin(emailDeliveryQueries, "transactionEmailDeliveries");
requireLogin(emailDeliveryQueries, "automationEmailDeliveries");
requireLogin(emailDeliveryQueries, "emailDeliveriesAsLogs");

export default emailDeliveryQueries;
