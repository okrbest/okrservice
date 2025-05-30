import {
  Sidebar as LeftSidebar,
  SidebarList as List,
} from '@erxes/ui/src/layout';
import { __ } from 'coreui/utils';
import React from 'react';
import { Link } from 'react-router-dom';
import SidebarHeader from '@erxes/ui-settings/src/common/components/SidebarHeader';

class Sidebar extends React.Component {
  renderListItem(url: string, text: string) {
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
  }

  render() {
    return (
      <LeftSidebar header={<SidebarHeader />} hasBorder={true}>
        <List id="SettingsSidebar">
          {this.renderListItem('/settings/activedirectory/', 'General config')}
        </List>
      </LeftSidebar>
    );
  }
}

export default Sidebar;
