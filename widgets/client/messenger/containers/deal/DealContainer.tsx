import * as React from "react";

import AcquireInformation from "../../components/AcquireInformation";
import Deal from "../../components/deal/Deal";
import { connection } from "../../connection";
import { getUiOptions } from "../../utils/util";
import { useConversation } from "../../context/Conversation";
import { useRouter } from "../../context/Router";

type Props = {
  loading: boolean;
};

const DealContainer = (props: Props) => {
  const submitDealRoute = connection.data.customerId
    ? "deal-submit"
    : "create-customer";

  const { setRoute } = useRouter();
  const { saveGetNotified } = useConversation();

  const [activeRoute, handleActiveRoute] = React.useState(submitDealRoute);
  const [createCustomer, setCreateCustomer] = React.useState(false);

  const onSubmit = (name: string) => {
    handleActiveRoute(name);

    if (name === "create-customer") {
      setCreateCustomer(true);
    } else {
      setRoute(name);
    }
  };

  const onButtonClick = () => {
    if (activeRoute === "create-customer") {
      setCreateCustomer(true);
    } else {
      setRoute(activeRoute);
    }
  };

  const onCustomerAdd = ({ type, value }: { type: string; value: string }) => {
    saveGetNotified(
      { type, value },
      () => {},
      () => {
        setRoute("deal-submit");
      }
    );
  };

  const renderCustomerAddForm = () => {
    if (!createCustomer) return null;

    return (
      <div
        className={`ticket-auth-container ${createCustomer ? "active" : ""}`}
      >
        <div className="line-wrapper">
          <div className="line" />
        </div>
        <AcquireInformation
          color={getUiOptions().color}
          textColor={getUiOptions().textColor || "#fff"}
          save={onCustomerAdd}
          loading={false}
        />
      </div>
    );
  };

  return (
    <div
      className={`ticket-main-container ${createCustomer ? "active" : ""}`}
    >
      <Deal
        activeRoute={activeRoute}
        loading={props.loading}
        handleSubmit={onSubmit}
        handleButtonClick={onButtonClick}
      />
      <div
        className="ticket-overlay"
        onClick={() => setCreateCustomer(!createCustomer)}
      ></div>
      {renderCustomerAddForm()}
    </div>
  );
};

export default DealContainer;
