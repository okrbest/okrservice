import { ItemBox, ItemIndicator, Quantity } from "../styles/stage";

import { ICompany } from "@erxes/ui-contacts/src/companies/types";
import { ICustomer } from "@erxes/ui-contacts/src/customers/types";
import { IProduct } from "@erxes/ui-products/src/types";
import React from "react";
import { renderFullName } from "@erxes/ui/src/utils";

type Props = {
  items: ICompany[] | ICustomer[] | IProduct[];
  color: string;
};

class Details extends React.Component<Props> {
  renderItem(item, color, index) {
    // 고객(customer)은 이름만 표시(대표번호 제외). primaryName에 "이름+대표번호"가 올 수 있으므로 사용하지 않음.
    const isCustomer =
      item && !item.product && (item.firstName || item.lastName || item.primaryPhone);
    const displayName = item.product
      ? item.product.name
      : isCustomer
        ? renderFullName(item, true)
        : item.name || item.primaryName || renderFullName(item, true);
    return (
      <ItemBox key={index}>
        <ItemIndicator color={color} />
        {displayName}
        {item.quantity && (
          <Quantity>
            ({item.quantity} {item.uom ? item.uom : "PC"})
          </Quantity>
        )}
        {item.unitPrice && (
          <>
            {" "}
            -{" "}
            {item.unitPrice.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </>
        )}
      </ItemBox>
    );
  }

  renderItems(items) {
    const { color } = this.props;

    return items.map((item, index) => this.renderItem(item, color, index));
  }

  render() {
    const { items } = this.props;
    const length = items.length;

    if (length === 0) {
      return null;
    }

    return <>{this.renderItems(items)}</>;
  }
}

export default Details;
