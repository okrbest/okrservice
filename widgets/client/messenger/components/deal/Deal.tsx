import * as React from "react";

import { IconDeal } from "../../../icons/Icons";

import Container from "../common/Container";
import { __ } from "../../../utils";
import { connection } from "../../connection";

type Props = {
  loading: boolean;
  activeRoute: string;
  handleSubmit: (activeRoute: string) => void;
};

const Deal: React.FC<Props> = ({
  loading,
  activeRoute,
  handleSubmit,
}) => {
  const renderSubmitForm = () => {
    const submitDealRoute = connection.data.customerId
      ? "deal-submit"
      : "create-customer";

    return (
      <div className="type-choose-container">
        <div
          className={`${activeRoute === submitDealRoute ? "active" : ""} ticket-box`}
          onClick={() => handleSubmit(submitDealRoute)}
        >
          <IconDeal size="30px" />
          <span>{__("Submit a deal")}</span>
        </div>
      </div>
    );
  };

  return (
    <Container
      withBottomNavBar={false}
      title={__("Deal")}
      showBackButton={false}
      showZoomButton={false}
    >
      <div className="ticket-container">
        {loading ? <div className="loader" /> : renderSubmitForm()}
      </div>
    </Container>
  );
};

export default Deal;
