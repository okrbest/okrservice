import * as React from "react";

import Button from "../common/Button";
import Container from "../common/Container";
import FileUploader from "../common/FileUploader";
import Input from "../common/Input";
import { __ } from "../../../utils";
import { useConfig } from "../../context/Config";

/** Used when integration has no dealPrivacyPolicyUrl */
const DEFAULT_DEAL_PRIVACY_POLICY_URL =
  "https://5240.cloud/%ea%b0%9c%ec%9d%b8%ec%a0%95%eb%b3%b4%ec%b2%98%eb%a6%ac%eb%b0%a9%ec%b9%a8/";

function resolvePrivacyPolicyHref(raw?: string): string {
  const t = raw != null ? String(raw).trim() : "";
  if (t === "") {
    return DEFAULT_DEAL_PRIVACY_POLICY_URL;
  }
  const lower = t.toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) {
    return t;
  }
  return DEFAULT_DEAL_PRIVACY_POLICY_URL;
}

type CustomField = { _id: string; name: string; label: string; type: string; options?: Array<{ value: string; label: string }> };

type Props = {
  loading: boolean;
  isSubmitted: boolean;
  dealId: string;
  formData: any;
  customFields?: CustomField[];
  customFieldsData?: Record<string, any>;
  requiredCustomFieldIds?: string[];
  customerLoading: boolean;
  error?: string | null;
  handleSubmit: (e: any) => void;
  handleChange: (e: any) => void;
  handleCustomFieldChange?: (fieldId: string, value: any) => void;
  handleButtonClick: () => void;
  handleFiles: (files: any) => void;
  agreePrivacy?: boolean;
  onAgreePrivacyChange?: (checked: boolean) => void;
  showPrivacyConsent?: boolean;
  /** Integration-specific header; falls back to i18n "Create a deal" */
  formTitle?: string;
  /** Privacy policy link; invalid/non-http(s) values fall back to default URL */
  privacyPolicyUrl?: string;
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
  requiredCustomFieldIds = [],
  error,
  handleChange,
  handleCustomFieldChange,
  handleFiles,
  handleButtonClick,
  agreePrivacy = false,
  onAgreePrivacyChange,
  showPrivacyConsent = true,
  formTitle,
  privacyPolicyUrl,
}) => {
  const submitText = __("Submit");
  const { email, firstName, companyName, phone } = formData;

  const { isAuthFieldsVisible } = useConfig();

  const isRequired = (fieldId: string) => requiredCustomFieldIds.includes(fieldId);

  const renderCustomField = (f: CustomField) => {
    const value = customFieldsData[f._id];
    const onCustomChange = (e: any) => handleCustomFieldChange?.(f._id, e.target.value);
    const label = f.label || f._id;
    const required = isRequired(f._id);
    const labelNode = required ? (
      <>
        {label} <span className="required" style={{ color: "red", marginLeft: "2px" }}>*</span>
      </>
    ) : (
      label
    );

    if (f.type === "textarea" || f.type === "note") {
      return (
        <div key={f._id} className="ticket-form-item">
          <Input
            id={`custom_${f._id}`}
            textArea
            label={required ? `${label} *` : String(label)}
            onChange={onCustomChange}
            value={value ?? ""}
            rows={4}
            required={required}
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
              {labelNode}
            </label>
            <select
              id={`custom_${f._id}`}
              value={value ?? ""}
              onChange={(e) => handleCustomFieldChange?.(f._id, e.target.value)}
              required={required}
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
            label={required ? `${label} *` : String(label)}
            type="date"
            onChange={onCustomChange}
            value={value ?? ""}
            required={required}
          />
        </div>
      );
    }
    if (f.type === "number") {
      return (
        <div key={f._id} className="ticket-form-item">
          <Input
            id={`custom_${f._id}`}
            label={required ? `${label} *` : String(label)}
            type="number"
            onChange={onCustomChange}
            value={value ?? ""}
            required={required}
          />
        </div>
      );
    }
    return (
      <div key={f._id} className="ticket-form-item">
        <Input
          id={`custom_${f._id}`}
          label={required ? `${label} *` : String(label)}
          onChange={onCustomChange}
          value={value ?? ""}
          required={required}
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
              <div
                style={{
                  marginBottom: "24px",
                  textAlign: "center",
                  width: "100%",
                  alignSelf: "stretch",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "#1e40af", textAlign: "center" }}>
                  데모 사이트를 통해 직접 확인해보세요
                </h2>
                <h2 style={{ fontSize: "16px", fontWeight: "400", color: "#666", lineHeight: "1.6", textAlign: "center" }}>
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

  const trimmedTitle = formTitle != null ? String(formTitle).trim() : "";
  const headerTitle =
    trimmedTitle !== "" ? trimmedTitle : __("Create a deal");
  const privacyPolicyHref = resolvePrivacyPolicyHref(privacyPolicyUrl);

  return (
    <Container
      withBottomNavBar={false}
      title={headerTitle}
      showBackButton={false}
      showZoomButton={false}
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
          <>
            {renderForm()}
            {showPrivacyConsent && (
              <div
                style={{
                  marginTop: "20px",
                  width: "100%",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="agree-privacy"
                    checked={agreePrivacy}
                    onChange={(e) => onAgreePrivacyChange?.(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
                  />
                  <label
                    htmlFor="agree-privacy"
                    style={{
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#334155",
                      userSelect: "none",
                    }}
                  >
                    (필수){" "}
                    <a
                      href={privacyPolicyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "#4f33af", textDecoration: "underline" }}
                    >
                      개인정보 처리방침
                    </a>
                    에 동의합니다.
                  </label>
                </div>
              </div>
            )}
            {error && (
              <div
                className="error-message"
                style={{
                  width: "90%",
                  padding: "12px 16px",
                  marginBottom: "12px",
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
            {showPrivacyConsent && (
              <p
                style={{
                  marginTop: 0,
                  marginBottom: "14px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  lineHeight: 1.5,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                ✼ 본 양식을 제출하실 경우,{" "}
                <a
                  href={privacyPolicyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4f33af", textDecoration: "underline" }}
                >
                  개인정보 처리방침
                </a>
                에 모두 동의하신 것으로 간주됩니다.
              </p>
            )}
            <div
              style={{
                width: "calc(100% + 24px)",
                maxWidth: "calc(100% + 24px)",
                margin: "0 -12px",
              }}
            >
              <Button
                form="deal-form"
                type="submit"
                full
                style={{
                  padding: "14px 24px",
                  fontSize: "16px",
                  minHeight: "52px",
                  maxWidth: "100%",
                  fontWeight: 600,
                }}
              >
                {loading ? (
                  <div className="loader" />
                ) : (
                  <span className="font-semibold">{submitText}</span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Container>
  );
};

export default DealSubmitForm;
