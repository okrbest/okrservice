import { requireLogin } from "@erxes/api-utils/src";
import { IContext } from "../../../connectionResolver";

const emailDeliveryMutations = {
  async removeEmailDelivery(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    const result = await models.EmailDeliveries.deleteOne({ _id });
    return { deletedCount: result.deletedCount };
  }
};

requireLogin(emailDeliveryMutations, "removeEmailDelivery");

export default emailDeliveryMutations;
