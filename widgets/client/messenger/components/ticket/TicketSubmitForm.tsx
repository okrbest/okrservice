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
  const [showTooltip, setShowTooltip] = React.useState(false);

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
              <label htmlFor="ticketType" style={{ position: "relative" }}>
                {__("고객요청구분")} <span className="required">*</span>
                <span 
                  className="ticket-request-type-tooltip" 
                  style={{ marginLeft: "5px", cursor: "pointer", fontSize: "14px", display: "inline-block" }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  ℹ️
                  {showTooltip && (
                    <span 
                      className="ticket-request-type-tooltip-text"
                      style={{
                        width: '250px',
                        backgroundColor: '#fff',
                        color: '#666',
                        textAlign: 'left',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px 12px',
                        position: 'absolute',
                        zIndex: 1000,
                        top: '100%',
                        marginTop: '5px',
                        left: '50%',
                        marginLeft: '-125px',
                        fontSize: '11px',
                        lineHeight: '1.5',
                        whiteSpace: 'normal',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        pointerEvents: 'none'
                      }}
                    >
                      단순문의: 일반적인 문의사항<br />
                      개선요청: 기능 개선 요청<br />
                      오류처리: 버그나 오류 신고<br />
                      설정변경: 시스템 설정 변경 요청<br />
                      추가개발: 새로운 기능 개발 요청<br />
                      사용안내: 시스템 사용 방법 안내<br />
                      데이터작업: 데이터 관련 작업 요청
                    </span>
                  )}
                </span>
              </label>
              <select
                id="ticketType"
                onChange={handleChange}
                value={formData.ticketType}
                required
              >
                <option value="">{__("요청구분을 선택하세요")}</option>
                <option value="inquiry">{__("단순문의")}</option>
                <option value="improvement">{__("개선요청")}</option>
                <option value="error">{__("오류처리")}</option>
                <option value="config">{__("설정변경")}</option>
                <option value="additional_development">{__("추가개발")}</option>
                <option value="usage_guide">{__("사용안내")}</option>
                <option value="data_work">{__("데이터작업")}</option>
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
          <Button 
            form="ticket-form" 
            type="submit" 
            full
            disabled={loading || customerLoading}
          >
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
