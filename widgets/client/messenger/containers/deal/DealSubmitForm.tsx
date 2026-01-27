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

interface FileWithUrl extends File {
  url?: string;
}

type CustomField = { _id: string; name: string; label: string; type: string; options?: Array<{ value: string; label: string }> };

type Props = {
  loading: boolean;
};

const DealSubmitContainer = (props: Props) => {
  const { setRoute } = useRouter();

  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const dealData = getDealData();
  const { customerId } = connection.data;
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [dealId, setDealId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    firstName: "",
    companyName: "",
    phone: 0,
    email: "",
    name: "",
    description: "",
    amount: "",
    closeDate: "",
  });
  const [customFieldsData, setCustomFieldsData] = React.useState<Record<string, any>>({});

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
        setDealId(widgetDealCreated._id);
        setIsSubmitted(true);
        setError(null);
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

      await dealAdd({
        variables: {
          name: formData.name,
          description: formData.description || undefined,
          attachments: transformedFiles,
          stageId: dealData.dealStageId,
          customerIds: [customerId],
          amount: formData.amount ? parseFloat(String(formData.amount)) : undefined,
          closeDate: formData.closeDate || undefined,
          customFieldsData: customFieldsDataArr.length ? customFieldsDataArr : undefined,
        },
      });

      customerRefetch();
    },
    onError(err) {
      console.error("[Deal] Failed to update customer:", err.message);
      setError(err.message || "Failed to save customer information. Please try again.");
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

    return customerEdit({
      variables: {
        customerId,
        firstName: formData.firstName,
        lastName: "",
        emails: [formData.email],
        phones: [formData.phone],
        companyName: formData.companyName,
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
      error={error}
      handleSubmit={onSubmit}
      handleChange={handleChange}
      handleCustomFieldChange={handleCustomFieldChange}
      handleButtonClick={onButtonClick}
      handleFiles={setFiles}
      customerLoading={customerId ? customerLoading : false}
    />
  );
};

export default DealSubmitContainer;
