import { __ } from 'coreui/utils';
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sidebar as LeftSidebar,
  SidebarList as List,
} from '@erxes/ui/src/layout';
import SidebarHeader from '@erxes/ui-settings/src/common/components/SidebarHeader';

const SettingSideBar = () => {
  const renderListItem = (url: string, text: string) => {
    return (
      <li>
        <Link
          to={url}
          className={window.location.href.includes(url) ? 'active' : ''}
        >
          {__(text)}
        </Link>
      </li>
    );
  };

  return (
    <LeftSidebar header={<SidebarHeader />} hasBorder={true}>
      <List id="GeneralConfigSidebar">
        {renderListItem('/msdynamics', 'General config')}
      </List>
    </LeftSidebar>
  );
};

export default SettingSideBar;
