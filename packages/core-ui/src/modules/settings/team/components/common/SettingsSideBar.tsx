import { FieldStyle, SidebarCounter } from "@erxes/ui/src/layout/styles";
import { SidebarList } from "@erxes/ui/src";
import { __ } from "coreui/utils";

import { Link } from "react-router-dom";
import React from "react";

function ListItem(url, text, totalCount?) {
  return (
    <li>
      <Link
        to={url}
        className={window.location.href.includes(url) ? "active" : ""}
      >
        <FieldStyle>{__(text)}</FieldStyle>
        <SidebarCounter $nowrap={true}>{totalCount}</SidebarCounter>
      </Link>
    </li>
  );
}

type Props = {
  branchTotalCount: number;
  unitTotalCount: number;
  departmentTotalCount: number;
  positionTotalCount: number;
};

export default class SettingsSideBar extends React.Component<Props> {
  render() {
    return (
      <SidebarList>
        {ListItem("/settings/structure", "Structure")}
        {ListItem(
          "/settings/branches",
          "Branches",
          this.props.branchTotalCount
        )}
        {ListItem(
          "/settings/departments",
          "Departments",
          this.props.departmentTotalCount
        )}
        {ListItem("/settings/units", "Units", this.props.unitTotalCount)}
        {ListItem(
          "/settings/positions",
          "Positions",
          this.props.positionTotalCount
        )}
      </SidebarList>
    );
  }
}
