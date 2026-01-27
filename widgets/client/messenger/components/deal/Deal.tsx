import * as React from "react";

import { IconDeal } from "../../../icons/Icons";

import Button from "../common/Button";
import Container from "../common/Container";
import { __ } from "../../../utils";
import { connection } from "../../connection";

type Props = {
  loading: boolean;
  activeRoute: string;
  handleSubmit: (activeRoute: string) => void;
  handleButtonClick: () => void;
};

const Deal: React.FC<Props> = ({
  loading,
  activeRoute,
  handleSubmit,
  handleButtonClick,
}) => {
  const continueText = __("Continue");

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
      withBottomNavBar={true}
      title={__("Deal")}
      showBackButton={false}
      persistentFooter={
        <div style={{ display: "none" }}>
          <Button full onClick={handleButtonClick}>
            <span className="font-semibold">{continueText}</span>
          </Button>
        </div>
      }
    >
      <div className="ticket-container">
        {loading ? <div className="loader" /> : renderSubmitForm()}
      </div>
    </Container>
  );
};

export default Deal;
