import * as React from "react";

import { IconCheckTicket, IconTicket } from "../../../icons/Icons";

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

const Ticket: React.FC<Props> = ({
  loading,
  activeRoute,
  handleSubmit,
  handleButtonClick,
}) => {
  const continueText = __("Continue");

  const renderSubmitForm = () => {
    const submitTicketRoute = connection.data.customerId
      ? "ticket-submit"
      : "create-customer";

    return (
      <div className="type-choose-container">
        <div
          className={`${activeRoute === submitTicketRoute ? "active" : ""} ticket-box`}
          onClick={() => handleSubmit(submitTicketRoute)}
        >
          <IconTicket size="30px" />
          <span>{__("Submit a ticket")}</span>
        </div>
        <div
          className={`${activeRoute === "list" ? "active" : ""} ticket-box`}
          onClick={() => handleSubmit("list")}
        >
          <IconCheckTicket size="30px" />
          <span>{__("Ticket List")}</span>
        </div>
        {/*
        <div
          className={`${activeRoute === "check" ? "active" : ""} ticket-box`}
          onClick={() => handleSubmit("check")}
        >
          <IconCheckTicket size="30px" />
          <span>{__("Check ticket progress")}</span>
        </div>
        */}
      </div>
    );
  };

  return (
    <Container
      withBottomNavBar={true}
      title={__("Ticket")}
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

export default Ticket;
