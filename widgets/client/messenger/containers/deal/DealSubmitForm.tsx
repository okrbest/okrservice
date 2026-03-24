import * as React from "react";

import { CUSTOMER_EDIT, DEAL_ADD } from "../../graphql/mutations";
import { gql, useMutation, useQuery } from "@apollo/client";

import { ICustomer } from "../../../types";
import DealSubmitForm from "../../components/deal/DealSubmitForm";
import { connection } from "../../connection";
import { customerDetail, widgetsGetDealFields } from "../../graphql/queries";
import { getDealData } from "../../utils/util";
import { readFile } from "../../../utils";
import { useRouter } from "../../context/Router";
import { useConversation } from "../../context/Conversation";

interface FileWithUrl extends File {
  url?: string;
}

type CustomField = { _id: string; name: string; label: string; type: string; options?: Array<{ value: string; label: string }> };

type Props = {
  loading: boolean;
};

const DealSubmitContainer = (props: Props) => {
  const { setRoute } = useRouter();
  const { toggle, saveGetNotified } = useConversation();

  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const dealData = getDealData();
  const { customerId } = connection.data;
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [dealId, setDealId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    firstName: "",
    companyName: "",
    phone: "",
    email: "",
    name: "",
    description: "",
    amount: "",
    closeDate: "",
  });
  const [customFieldsData, setCustomFieldsData] = React.useState<Record<string, any>>({});
  const [agreePrivacy, setAgreePrivacy] = React.useState(false);

  const {
    data: customer,
    loading: customerLoading,
    refetch: customerRefetch,
  } = useQuery(gql(customerDetail), {
    variables: { customerId },
    skip: !customerId,
  });

  const boardId = dealData?.dealBoardId || "";
  const pipelineId = dealData?.dealPipelineId || "";
  const selectedIds = dealData?.dealCustomFieldIds || [];
  const requiredCustomFieldIds = dealData?.dealRequiredCustomFieldIds || [];
  const showPrivacyConsent = dealData?.dealShowPrivacyConsent !== false;
  const { data: dealFieldsData } = useQuery(gql(widgetsGetDealFields), {
    variables: { boardId, pipelineId },
    skip: !boardId || !pipelineId,
  });
  const allFields: CustomField[] = dealFieldsData?.widgetsGetDealFields || [];
  const customFields: CustomField[] =
    selectedIds.length > 0
      ? allFields.filter((f) => selectedIds.includes(f._id))
      : allFields;

  React.useEffect(() => {
    if (customer && customer.widgetsTicketCustomerDetail) {
      const { emails, firstName, lastName, phones } =
        customer.widgetsTicketCustomerDetail || ({} as ICustomer);
      setFormData((prev) => ({
        ...prev,
        firstName,
        companyName: lastName || "",
        phone: phones?.[0]?.replace(/\D/g, "") || "",
        email: emails?.[0] || "",
      }));
    }
  }, [customer]);

  const [dealAdd, { loading }] = useMutation(DEAL_ADD, {
    onCompleted(data) {
      const { widgetDealCreated } = data || {};

      if (widgetDealCreated?._id) {
        setError(null);
        // 제출 완료 알림 후 위젯만 닫기 (성공 화면·문의&데모신청 화면 없이)
        window.alert("제출이 완료되었습니다. 감사합니다.");
        toggle();
      }
    },
    onError(err) {
      console.error("[Deal] Failed to create deal:", err.message);
      setError(err.message || "Failed to create deal. Please try again.");
    },
  });

  const [customerEdit] = useMutation(CUSTOMER_EDIT, {
    fetchPolicy: "no-cache",
    onCompleted: async () => {
      const transformedFiles = files.map((file) => ({
        url: readFile(file.url || ""),
        name: file.name,
        type: "image",
      }));

      const customFieldsDataArr = Object.entries(customFieldsData)
        .filter(([, v]) => v != null && v !== "")
        .map(([field, value]) => ({ field, value }));

      // customerId가 유효할 때만 customerIds에 포함 (영업 파이프라인에 고객 표시를 위해 필수)
      // saveGetNotified 직후 제출 시 connection.data.customerId 사용
      const validCustomerIds = connection.data.customerId ? [connection.data.customerId] : [];

      await dealAdd({
        variables: {
          name: formData.name,
          description: formData.description || undefined,
          attachments: transformedFiles,
          stageId: dealData.dealStageId,
          customerIds: validCustomerIds,
          amount: formData.amount ? parseFloat(String(formData.amount)) : undefined,
          closeDate: formData.closeDate || undefined,
          customFieldsData: customFieldsDataArr.length ? customFieldsDataArr : undefined,
        },
      });

      customerRefetch();
    },
    onError(err) {
      console.error("[Deal] Failed to update customer:", err.message);
      const message = err.message || "Failed to save customer information. Please try again.";
      const friendlyMessage =
        message.includes("Customer ID not found") || message.includes("custom id not found")
          ? "고객 정보를 찾을 수 없습니다. 이메일 또는 전화번호를 입력한 뒤 다시 제출해 주세요."
          : message;
      setError(friendlyMessage);
    },
  });

  const handleChange = (e: any) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldsData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
    setError(null); // Clear previous error on new submission

    if (showPrivacyConsent && !agreePrivacy) {
      setError("개인정보 수집/제공에 동의해 주세요.");
      return;
    }

    // 필수 커스텀 필드 검증
    if (requiredCustomFieldIds.length > 0 && customFields.length > 0) {
      const missing = requiredCustomFieldIds.filter((fieldId: string) => {
        const val = customFieldsData[fieldId];
        return val == null || (typeof val === "string" && val.trim() === "") || (Array.isArray(val) && val.length === 0);
      });
      if (missing.length > 0) {
        const fieldLabels = missing
          .map((id: string) => customFields.find((f) => f._id === id)?.label || id)
          .join(", ");
        setError(`필수 항목을 입력해 주세요: ${fieldLabels}`);
        return;
      }
    }

    // GraphQL [String] 타입에 맞게 문자열 배열로 전달
    const emails = formData.email != null && formData.email !== "" ? [String(formData.email)] : [];
    const phones = formData.phone != null && formData.phone !== "" ? [String(formData.phone)] : [];

    // custom id(고객 ID)가 없는 경우: 먼저 이메일/전화번호로 고객 생성 후 제출
    if (!customerId) {
      const type = formData.email ? "email" : "phone";
      const value = (formData.email || formData.phone || "").trim();
      if (!value) {
        setError("제출하려면 이메일 또는 전화번호를 입력해 주세요.");
        return;
      }
      saveGetNotified(
        { type, value },
        () => {},
        () => {
          // saveGetNotified 완료 후 connection.data.customerId가 설정됨 → 고객 정보 갱신 후 딜 생성
          customerEdit({
            variables: {
              customerId: connection.data.customerId,
              firstName: formData.firstName ?? "",
              lastName: "",
              emails,
              phones,
              companyName: formData.companyName ?? "",
            },
          });
        }
      );
      return;
    }

    return customerEdit({
      variables: {
        customerId,
        firstName: formData.firstName ?? "",
        lastName: "",
        emails,
        phones,
        companyName: formData.companyName ?? "",
      },
    });
  };

  const onButtonClick = () => {
    setRoute("deal");
  };

  return (
    <DealSubmitForm
      isSubmitted={isSubmitted}
      loading={loading}
      formData={formData}
      dealId={dealId}
      customFields={customFields}
      customFieldsData={customFieldsData}
      requiredCustomFieldIds={requiredCustomFieldIds}
      error={error}
      handleSubmit={onSubmit}
      handleChange={handleChange}
      handleCustomFieldChange={handleCustomFieldChange}
      handleButtonClick={onButtonClick}
      handleFiles={setFiles}
      customerLoading={customerId ? customerLoading : false}
      agreePrivacy={agreePrivacy}
      onAgreePrivacyChange={setAgreePrivacy}
      showPrivacyConsent={showPrivacyConsent}
    />
  );
};

export default DealSubmitContainer;
