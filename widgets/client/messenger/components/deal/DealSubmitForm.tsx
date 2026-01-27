import * as React from "react";

import Button from "../common/Button";
import Container from "../common/Container";
import FileUploader from "../common/FileUploader";
import Input from "../common/Input";
import { __ } from "../../../utils";
import { useConfig } from "../../context/Config";

type CustomField = { _id: string; name: string; label: string; type: string; options?: Array<{ value: string; label: string }> };

type Props = {
  loading: boolean;
  isSubmitted: boolean;
  dealId: string;
  formData: any;
  customFields?: CustomField[];
  customFieldsData?: Record<string, any>;
  customerLoading: boolean;
  error?: string | null;
  handleSubmit: (e: any) => void;
  handleChange: (e: any) => void;
  handleCustomFieldChange?: (fieldId: string, value: any) => void;
  handleButtonClick: () => void;
  handleFiles: (files: any) => void;
};

const DealSubmitForm: React.FC<Props> = ({
  handleSubmit,
  isSubmitted,
  loading,
  dealId,
  customerLoading,
  formData,
  customFields = [],
  customFieldsData = {},
  error,
  handleChange,
  handleCustomFieldChange,
  handleFiles,
  handleButtonClick,
}) => {
  const submitText = __("Submit");
  const { email, firstName, companyName, phone } = formData;

  const { isAuthFieldsVisible } = useConfig();

  const renderCustomField = (f: CustomField) => {
    const value = customFieldsData[f._id];
    const onCustomChange = (e: any) => handleCustomFieldChange?.(f._id, e.target.value);
    const label = f.label || f._id;

    if (f.type === "textarea" || f.type === "note") {
      return (
        <div key={f._id} className="ticket-form-item">
          <Input
            id={`custom_${f._id}`}
            textArea
            label={String(label)}
            onChange={onCustomChange}
            value={value ?? ""}
            rows={4}
            required={true}
          />
        </div>
      );
    }
    if (f.type === "select" || (f.options && f.options.length > 0)) {
      const opts = f.options || [];
      return (
        <div key={f._id} className="ticket-form-item">
          <div className="input-container">
            <label htmlFor={`custom_${f._id}`} style={{ whiteSpace: "nowrap" }}>
              {label} <span className="required" style={{ color: "red", marginLeft: "2px" }}>*</span>
            </label>
            <select
              id={`custom_${f._id}`}
              value={value ?? ""}
              onChange={(e) => handleCustomFieldChange?.(f._id, e.target.value)}
              required
            >
              <option value="">{__("Select")}</option>
              {opts.map((o: any, idx: number) => {
                const val = o.value != null ? String(o.value) : "";
                const text = (o.label != null && o.label !== "") ? String(o.label) : val;
                return (
                  <option key={val || `opt-${idx}`} value={val}>
                    {text}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      );
    }
    if (f.type === "date") {
      return (
        <div key={f._id} className="ticket-form-item">
          <Input
            id={`custom_${f._id}`}
            label={String(label)}
            type="date"
            onChange={onCustomChange}
            value={value ?? ""}
            required={true}
          />
        </div>
      );
    }
    if (f.type === "number") {
      return (
        <div key={f._id} className="ticket-form-item">
          <Input
            id={`custom_${f._id}`}
            label={String(label)}
            type="number"
            onChange={onCustomChange}
            value={value ?? ""}
            required={true}
          />
        </div>
      );
    }
    return (
      <div key={f._id} className="ticket-form-item">
        <Input
          id={`custom_${f._id}`}
          label={String(label)}
          onChange={onCustomChange}
          value={value ?? ""}
          required={true}
        />
      </div>
    );
  };

  const useCustomFields = customFields.length > 0;

  const renderForm = () => {
    return (
      <form id="deal-form" onSubmit={handleSubmit}>
        <div className="form-container">
          {isAuthFieldsVisible && (
            <>
              <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "#1e40af" }}>
                  데모 사이트를 통해 직접 확인해보세요
                </h2>
                <h2 style={{ fontSize: "16px", fontWeight: "400", color: "#666", lineHeight: "1.6" }}>
                  문의를 남겨주시면 데모 사이트 오픈과 함께 <br /> 도입 방안을 안내해드립니다.
                </h2>
              </div>
              <div className="ticket-form-item">
                <Input
                  id="firstName"
                  label={String(__("Name"))}
                  onChange={handleChange}
                  placeholder={String(__("First name"))}
                  value={firstName || ""}
                  required={true}
                />
                <Input
                  id="companyName"
                  label={String(__("회사명"))}
                  onChange={handleChange}
                  value={companyName || ""}
                  required={true}
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
                  required={true}
                />
                <Input
                  id="email"
                  label={String(__("Email"))}
                  placeholder={String(__("Email"))}
                  type="email"
                  required={true}
                  value={email}
                  onChange={handleChange}
                />
              </div>
              {useCustomFields && customFields.map((f) => renderCustomField(f))}
            </>
          )}
          <div className="ticket-form-item">
            <Input
              id="name"
              label={String(__("Deal title"))}
              onChange={handleChange}
              required
            />
          </div>
          <div className="ticket-form-item">
            <Input
              textArea
              id="description"
              label={String(__("Deal description"))}
              onChange={handleChange}
              rows={10}
              required={true}
            />
          </div>
          <div className="input-container">
            <p className="deal-attachment-tip" style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#888" }}>
              ✼ {__("회사 URL 또는 소개서 파일을 첨부해 주시면 더욱 정확한 답변이 가능합니다.")}
            </p>
            <label htmlFor="attachments">{__("Attachments")} </label>
            <FileUploader handleFiles={handleFiles} />
          </div>
          {!useCustomFields && (
            <>
              <div className="ticket-form-item">
                <Input
                  id="amount"
                  label={String(__("Amount"))}
                  onChange={handleChange}
                  type="number"
                  required={false}
                />
              </div>
              <div className="ticket-form-item">
                <Input
                  id="closeDate"
                  label={String(__("Expected close date"))}
                  onChange={handleChange}
                  type="date"
                  required={false}
                />
              </div>
            </>
          )}
        </div>
      </form>
    );
  };

  React.useEffect(() => {
    if (isSubmitted && dealId) {
      handleButtonClick();
    }
  }, [isSubmitted, dealId, handleButtonClick]);

  return (
    <Container
      withBottomNavBar={true}
      title={__("Create a deal")}
      showBackButton={false}
      persistentFooter={
        !isSubmitted ? (
          <Button form="deal-form" type="submit" full>
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
        {error && (
          <div
            className="error-message"
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}
        {loading || customerLoading ? (
          <div className="loader" />
        ) : isSubmitted ? (
          <div className="success-wrapper">
            <div className="message">
              <h3>{__("Deal created successfully")}</h3>
              <p>{__("Your deal has been created")}</p>
              <Button onClick={handleButtonClick} full>
                <span className="font-semibold">{__("Continue")}</span>
              </Button>
            </div>
          </div>
        ) : (
          renderForm()
        )}
      </div>
    </Container>
  );
};

export default DealSubmitForm;
