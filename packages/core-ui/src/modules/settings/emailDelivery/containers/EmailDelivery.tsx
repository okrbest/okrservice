import { gql } from "@apollo/client";
import { router } from "@erxes/ui/src/utils";
import { generatePaginationParams } from "@erxes/ui/src/utils/router";
import * as React from "react";
import { useMutation, useQuery } from "@apollo/client";
import EmailDelivery from "../components/EmailDelivery";
import queries from "../queries";
import mutations from "../mutations";
import { isEnabled } from "@erxes/ui/src/utils/core";
import { useLocation, useNavigate } from "react-router-dom";
import Alert from "@erxes/ui/src/utils/Alert/index";
import confirm from "@erxes/ui/src/utils/confirmation/confirm";
import { __ } from "coreui/utils";

type Props = {
  queryParams: Record<string, string | string[] | undefined>;
};

export const EMAIL_TYPES = {
  TRANSACTION: "transaction",
  AUTOMATION: "automation",
  ENGAGE: "engage",
};

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || "");
  return String(v || "");
}

function EmailDeliveryContainer(props: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { queryParams } = props;

  const rawType = firstParam(queryParams.emailType);
  const emailType =
    rawType === EMAIL_TYPES.AUTOMATION
      ? EMAIL_TYPES.AUTOMATION
      : rawType === EMAIL_TYPES.ENGAGE
        ? EMAIL_TYPES.ENGAGE
        : EMAIL_TYPES.TRANSACTION;

  const status = firstParam(queryParams.status);

  const isAutomation = emailType === EMAIL_TYPES.AUTOMATION;

  const transactionResponse = useQuery(
    gql(queries.transactionEmailDeliveries),
    {
      variables: {
        searchValue: firstParam(queryParams.searchValue),
        ...generatePaginationParams(queryParams as Record<string, string>),
      },
      skip: isAutomation || emailType === EMAIL_TYPES.ENGAGE,
    }
  );

  const automationResponse = useQuery(gql(queries.automationEmailDeliveries), {
    variables: {
      searchValue: firstParam(queryParams.searchValue),
      ...generatePaginationParams(queryParams as Record<string, string>),
    },
    skip: !isAutomation,
  });

  const engageReportsListResponse = useQuery(gql(queries.engageReportsList), {
    variables: {
      status: firstParam(queryParams.status),
      customerId: firstParam(queryParams.customerId),
      ...generatePaginationParams(queryParams as Record<string, string>),
      searchValue: firstParam(queryParams.searchValue),
    },
    skip:
      !isEnabled("engages") || emailType !== EMAIL_TYPES.ENGAGE,
  });

  const [removeEmailDeliveryMutation] = useMutation(
    gql(mutations.removeEmailDelivery)
  );

  const handleRemoveEmailDelivery = (_id: string) => {
    confirm(__("Are you sure you want to delete this email log?")).then(() => {
      removeEmailDeliveryMutation({ variables: { _id } })
        .then(() => {
          Alert.success(__("Successfully deleted"));
          if (emailType === EMAIL_TYPES.AUTOMATION) {
            automationResponse.refetch();
          } else if (emailType === EMAIL_TYPES.TRANSACTION) {
            transactionResponse.refetch();
          }
        })
        .catch((e: Error) => {
          Alert.error(__(e.message));
        });
    });
  };

  const handleSelectEmailType = (type: string) => {
    if (type === EMAIL_TYPES.ENGAGE) {
      router.removeParams(
        navigate,
        location,
        "page",
        "perPage",
        "searchValue"
      );
      return router.setParams(navigate, location, {
        emailType: type,
        status: "",
      });
    }
    router.removeParams(
      navigate,
      location,
      "page",
      "perPage",
      "searchValue",
      "status"
    );
    return router.setParams(navigate, location, {
      emailType: type,
      page: "1",
    });
  };

  const handleSelectStatus = (emailStatus: string) => {
    return router.setParams(navigate, location, {
      status: emailStatus,
      emailType: EMAIL_TYPES.ENGAGE,
    });
  };

  const transactionData = transactionResponse.data || {};
  const emailDeliveries = transactionData.transactionEmailDeliveries || {};
  const emailDeliveriesLoading = transactionResponse.loading;

  const automationData = automationResponse.data || {};
  const automationDeliveries =
    automationData.automationEmailDeliveries || {};
  const automationLoading = automationResponse.loading;

  const engageReportsListData = engageReportsListResponse.data || {};
  const reportsList = engageReportsListData.engageReportsList || {};
  const reportsListLoading = engageReportsListResponse.loading;

  let list;
  let count;
  let loading;

  if (emailType === EMAIL_TYPES.TRANSACTION) {
    list = emailDeliveries.list || [];
    count = emailDeliveries.totalCount || 0;
    loading = emailDeliveriesLoading;
  } else if (emailType === EMAIL_TYPES.AUTOMATION) {
    list = automationDeliveries.list || [];
    count = automationDeliveries.totalCount || 0;
    loading = automationLoading;
  } else {
    list = reportsList.list || [];
    count = reportsList.totalCount || 0;
    loading = reportsListLoading;
  }

  const updatedProps = {
    ...props,
    count,
    list,
    loading,
    emailType,
    handleSelectEmailType,
    searchValue: firstParam(queryParams.searchValue),
    handleSelectStatus,
    status,
    onRemoveEmailDelivery: handleRemoveEmailDelivery,
  };

  return <EmailDelivery {...updatedProps} />;
}

export default EmailDeliveryContainer;
