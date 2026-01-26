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
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
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
        lastName,
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
      }
    },
    onError(error) {
      return alert(error.message);
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
    onError(error) {
      return alert(error.message);
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

    return customerEdit({
      variables: {
        customerId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        emails: [formData.email],
        phones: [formData.phone],
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
