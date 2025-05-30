import { ChildPlugin, Plugin } from './types';
import {
  DropSubNav,
  DropSubNavItem,
  SubNav,
  SubNavItem,
  SubNavTitle,
} from '../../styles';

import { NavLink } from 'react-router-dom';
import React from 'react';
import WithPermission from 'modules/common/components/WithPermission';
import { __ } from 'coreui/utils';
import { getLink } from './utils';

type Props = {
  plugin: Plugin;
  children: ChildPlugin[];
  navCollapse: number;
  showMenu?: boolean;
  clickedMenu?: string;
};

export default function NavigationItemChildren(props: Props) {
  const { plugin, children, navCollapse, showMenu, clickedMenu } = props;

  const renderChildren = (type: string) => {
    return children.map((child: ChildPlugin, index: number) => {
      const { to, permission, permissions, additional, text } = child;

      const link = <NavLink to={getLink(to)}>{__(text)}</NavLink>;

      return (
        <WithPermission
          key={index}
          action={permission ? permission : ''}
          actions={permissions ? permissions : []}
        >
          {type === 'horizontal' ? (
            <DropSubNavItem>{link}</DropSubNavItem>
          ) : (
            <SubNavItem additional={additional || false}>{link}</SubNavItem>
          )}
        </WithPermission>
      );
    });
  };

  if (children.length === 0) return <></>;

  if (navCollapse === 3 && clickedMenu === plugin.text && showMenu)
    return <DropSubNav>{renderChildren('vertical')}</DropSubNav>;

  return (
    <SubNav $navCollapse={navCollapse}>
      <SubNavTitle>{__(plugin.text)}</SubNavTitle>
      {renderChildren('horizontal')}
    </SubNav>
  );
}
