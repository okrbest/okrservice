import { IItem, IOptions } from "../../types";

import ActionSection from "@erxes/ui-contacts/src/customers/containers/ActionSection";
import CompanySection from "@erxes/ui-contacts/src/companies/components/CompanySection";
import CustomerSection from "@erxes/ui-contacts/src/customers/components/CustomerSection";
import React from "react";

type Props = {
  item: IItem;
  saveItem: (doc: { [key: string]: any }) => void;
  options: IOptions;
  renderItems: () => React.ReactNode;
};

class SidebarConformity extends React.Component<Props> {
  shouldComponentUpdate(nextProps: Props) {
    if (nextProps.item.modifiedAt === this.props.item.modifiedAt) {
      return false;
    }
    return true;
  }

  render() {
    const { item, options, renderItems } = this.props;

    console.log("SidebarConformity: Rendering with", {
      mainType: options.type,
      mainTypeId: item._id,
      itemName: item.name,
      hasCustomers: !!item.customers?.length,
      hasCompanies: !!item.companies?.length,
      customers: item.customers,
      companies: item.companies
    });

    // Use existing customers and companies from item if available
    // This avoids the "No Living connections" error when GraphQL query fails
    // GetConformity will skip the query if alreadyItems is provided
    const existingCustomers = item.customers && Array.isArray(item.customers) ? item.customers : [];
    const existingCompanies = item.companies && Array.isArray(item.companies) ? item.companies : [];

    return (
      <>
        <CompanySection 
          mainType={options.type} 
          mainTypeId={item._id}
          relType="company"
          title="Companies"
          companies={existingCompanies.length > 0 ? existingCompanies : undefined}
        />
        <CustomerSection
          mainType={options.type}
          mainTypeId={item._id}
          relType="customer"
          actionSection={ActionSection}
          title="Customers"
          customers={existingCustomers.length > 0 ? existingCustomers : undefined}
        />
        {renderItems()}
      </>
    );
  }
}

export default SidebarConformity;
