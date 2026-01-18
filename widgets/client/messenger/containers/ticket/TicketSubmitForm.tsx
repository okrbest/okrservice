import * as React from "react";

import { CUSTOMER_EDIT, TICKET_ADD } from "../../graphql/mutations";
import { gql, useMutation, useQuery } from "@apollo/client";

import { ICustomer } from "../../../types";
import TicketSubmitForm from "../../components/ticket/TicketSubmitForm";
import { connection } from "../../connection";
import { customerDetail } from "../../graphql/queries";
import { getTicketData } from "../../utils/util";
import { readFile } from "../../../utils";
import { useRouter } from "../../context/Router";

interface FileWithUrl extends File {
  url?: string;
}

type Props = {
  loading: boolean;
};

const TicketSubmitContainer = (props: Props) => {
  const { setRoute } = useRouter();

  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const ticketData = getTicketData();
  const { customerId } = connection.data;
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [ticketNumber, setTicketNumber] = React.useState("");
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    phone: 0,
    email: "",
    ticketType: "inquiry",
    title: "",
    description: "",
    visibility: "public",
  });

  const {
    data: customer,
    loading: customerLoading,
    refetch: customerRefetch,
  } = useQuery(gql(customerDetail), {
    variables: { customerId },
    skip: !customerId,
  });

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

  const [ticketAdd, { loading: ticketAddLoading }] = useMutation(TICKET_ADD, {
    onCompleted(data) {
      console.log("[디버그] ticketAdd onCompleted data:", data);

      const { widgetTicketCreated } = data || {};

      console.log("[디버그] 티켓 생성 응답 data:", data);
      console.log("[디버그] 발급된 ticketNumber:", widgetTicketCreated?.number);

      setTicketNumber(widgetTicketCreated.number || "");
      setIsSubmitted(true);
      customerRefetch();
    },
    onError(error) {
      console.error("[디버그] ticketAdd 에러:", error);
      alert(error.message);
    },
  });

  const [customerEdit, { loading: customerEditLoading }] = useMutation(CUSTOMER_EDIT, {
    fetchPolicy: "no-cache",
    onCompleted: async () => {
      try {
        const transformedFiles = files.map((file) => ({
          url: readFile(file.url || ""),
          name: file.name,
          type: "image",
        }));

        console.log("[디버그] 티켓 생성 요청 직전", {
          title: formData.title,
          description: formData.description,
          attachments: transformedFiles,
          stageId: ticketData.ticketStageId,
          type: formData.ticketType,
          customerIds: [customerId],
        });

      await ticketAdd({
        variables: {
          name: formData.title,
          description: formData.description,
          attachments: transformedFiles,
          stageId: ticketData.ticketStageId,
          type: formData.ticketType,
          customerIds: [customerId],
          visibility: formData.visibility,
        },
      });

      customerRefetch();
    },
    onError(error) {
      console.error("[디버그] customerEdit 에러:", error);
      alert(error.message);
    },
  });

  // 전체 로딩 상태 (customerEdit 또는 ticketAdd 중 하나라도 로딩 중이면 true)
  const loading = customerEditLoading || ticketAddLoading;

  const handleChange = (e: any) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const onSubmit = (e: any) => {
    e.preventDefault();

    // 이미 제출 중이면 중복 제출 방지
    if (loading || isSubmitted) {
      return;
    }

    // 필수 필드 검증
    if (!formData.title || !formData.description || !formData.ticketType) {
      alert("제목, 내용, 요청구분은 필수 항목입니다.");
      return;
    }

    customerEdit({
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
    setRoute("ticket-list");
  };
  return (
    <TicketSubmitForm
      isSubmitted={isSubmitted}
      loading={loading}
      formData={formData}
      ticketNumber={ticketNumber}
      handleSubmit={onSubmit}
      handleChange={handleChange}
      handleButtonClick={onButtonClick}
      handleFiles={setFiles}
      customerLoading={customerId ? customerLoading : false}
    />
  );
};

export default TicketSubmitContainer;
