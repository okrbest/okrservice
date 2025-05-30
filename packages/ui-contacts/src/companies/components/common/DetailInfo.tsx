import {
  FieldStyle,
  SidebarCounter,
  SidebarFlexRow,
  SidebarList,
} from "@erxes/ui/src/layout/styles";

import { ICompany } from "../../types";
import { IField } from "@erxes/ui/src/types";
import React from "react";
import { __ } from "coreui/utils";

type Props = {
  company: ICompany;
  fields: IField[];
};

class DetailInfo extends React.Component<Props> {
  renderRow = (field, value) => {
    const { fields = [] } = this.props;

    const property = fields.find((e) => e.type === field);

    if (property && !property.isVisible) {
      return null;
    }

    const label = property && property.text;
    const className = field === "industry" ? "multiple-choice" : "";

    return (
      property && (
        <li className={className}>
          <FieldStyle>{__(`${label}`)}</FieldStyle>
          <SidebarCounter>{value || "-"}</SidebarCounter>
        </li>
      )
    );
  };

  renderParentCompany(parentCompany?: string) {
    return (
      <li>
        <FieldStyle>{__("Parent company")}:</FieldStyle>
        <SidebarCounter>{parentCompany || "-"}</SidebarCounter>
      </li>
    );
  }

  renderDescription(description?: string) {
    const { fields = [] } = this.props;

    const descriptionField = fields.find((e) => e.type === "description");

    if (descriptionField && !descriptionField.isVisible) {
      return null;
    }

    return (
      <SidebarFlexRow>
        {descriptionField && descriptionField.isVisible}
        {__(`Description`)}:<span>{description || "-"}</span>
      </SidebarFlexRow>
    );
  }

  render() {
    const { company = {} as ICompany } = this.props;

    return (
      <SidebarList className="no-link">
        {this.renderRow("code", company.code)}
        {this.renderRow("size", company.size)}
        {this.renderRow("industry", company.industry)}
        {this.renderParentCompany(
          company.parentCompany ? company.parentCompany.primaryName : "-"
        )}
        {this.renderRow("primaryEmail", company.primaryEmail)}
        {this.renderRow(
          "owner",
          company.owner && company.owner.details
            ? company.owner.details.fullName
            : "-"
        )}
        {this.renderRow("primaryPhone", company.primaryPhone)}
        {this.renderRow("location", company.location)}
        {this.renderRow("businessType", company.businessType)}
        {this.renderRow("isSubscribed", company.isSubscribed)}
        {this.renderRow("score", company.score)}
        {this.renderDescription(company.description)}
      </SidebarList>
    );
  }
}

export default DetailInfo;
