import * as React from "react";

import Button from "../common/Button";
import Container from "../common/Container";
import FileUploader from "../common/FileUploader";
import Input from "../common/Input";
import SuccessForm from "./SuccessForm";
import { __ } from "../../../utils";
import { useConfig } from "../../context/Config";
import TicketListContainer from "../../containers/ticket/TicketListContainer";

type Props = {
  loading: boolean;
  isSubmitted: boolean;
  ticketNumber: string;
  formData: any;
  customerLoading: boolean;
  handleSubmit: (e: any) => void;
  handleChange: (e: any) => void;
  handleButtonClick: () => void;
  handleFiles: (files: any) => void;
};

const TicketSubmitForm: React.FC<Props> = ({
  handleSubmit,
  isSubmitted,
  loading,
  ticketNumber,
  customerLoading,
  formData,
  handleChange,
  handleFiles,
  handleButtonClick,
}) => {
  const submitText = __("Submit");
  const continueText = __("Continue");
  const { email, firstName, lastName, phone } = formData;

  const { isAuthFieldsVisible } = useConfig();

  const renderForm = () => {
    return (
      <form id="ticket-form" onSubmit={handleSubmit}>
        <div className="form-container">
          {isAuthFieldsVisible && (
            <>
              <div className="ticket-form-item">
                <Input
                  id="firstName"
                  label={String(__("Name"))}
                  onChange={handleChange}
                  placeholder={String(__("First name"))}
                  value={firstName || ""}
                  required={false}
                />
                <Input
                  id="lastName"
                  placeholder={String(__("Last name"))}
                  onChange={handleChange}
                  value={lastName || ""}
                  required={false}
                />
              </div>
              <div className="ticket-form-item">
                <Input
                  id="phone"
                  label={String(__("Phone number"))}
                  placeholder={String(__("Phone number"))}
                  onChange={handleChange}
                  type="number"
                  value={phone}
                  required={false}
                />
                <Input
                  id="email"
                  label={String(__("Email"))}
                  placeholder={String(__("Email"))}
                  type="email"
                  required={false}
                  value={email}
                  onChange={handleChange}
                />
              </div>
            </>
          )}
          <div className="ticket-form-item">
            <div className="input-container">
              <label htmlFor="ticketType">
                {__("Ticket type")} <span className="required">*</span>
              </label>
              <select
                id="ticketType"
                onChange={handleChange}
                value={formData.ticketType}
                required
              >
                <option value="inquiry">{__("inquiry")}</option>
                <option value="improvement">{__("improvement")}</option>
                <option value="error">{__("error")}</option>
              </select>
            </div>
          </div>
          <div className="input-container">
            <label htmlFor="attachments">{__("Attachments")} </label>
            <FileUploader handleFiles={handleFiles} />
          </div>
          <div className="ticket-form-item">
            <Input
              id="title"
              label={String(__("Ticket title"))}
              onChange={handleChange}
              required
            />
          </div>
          <div className="ticket-form-item">
            <Input
              textArea
              id="description"
              label={String(__("Describe the problem"))}
              onChange={handleChange}
              rows={10}
              required
            />
          </div>
        </div>
      </form>
    );
  };

  // Trigger route change to "ticket-list" when isSubmitted becomes true
  React.useEffect(() => {
    if (isSubmitted) {
      handleButtonClick();
    }
  }, [isSubmitted, ticketNumber, handleButtonClick]);

  return (
    <Container
      withBottomNavBar={true}
      title={__("Submit a ticket")}
      backRoute="ticket"
      persistentFooter={
        !isSubmitted ? (
          <Button form="ticket-form" type="submit" full>
            {loading ? (
              <div className="loader" />
            ) : (
              <span className="font-semibold">{submitText}</span>
            )}
          </Button>
        ) : null
      }
    >
      <div className="ticket-container">
        {loading || customerLoading ? <div className="loader" /> : renderForm()}
      </div>
    </Container>
  );
};

export default TicketSubmitForm;
