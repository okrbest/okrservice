import { IUser } from '@erxes/ui/src/auth/types';
import Button from '@erxes/ui/src/components/Button';
import EmptyState from '@erxes/ui/src/components/EmptyState';
import { __ } from 'coreui/utils';
import Sidebar from '../containers/leftSidebar/Sidebar';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';
import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  queryParams?: any;
  currentUser: IUser;
};

function Empty({ queryParams, currentUser }: Props) {
  const menuInbox = [{ title: 'Team Inbox', link: '/inbox/index' }];

  const suggestContent = (
    <>
      <Link to="/settings/channels">
        <Button btnStyle="simple" icon="sitemap-1">
          {__('Manage Channels')}
        </Button>
      </Link>
      <Link to="/welcome#usingGuide">
        <Button icon="laptop-1">{__('Watch Tutorial')}</Button>
      </Link>
    </>
  );

  const content = (
    <EmptyState
      text="Whoops! No messages here but you can always start"
      size="full"
      image="/images/actions/12.svg"
      extra={suggestContent}
    />
  );

  return (
    <Wrapper
      header={
        <Wrapper.Header
          title={__('Team Inbox')}
          queryParams={queryParams}
          submenu={menuInbox}
        />
      }
      content={content}
      leftSidebar={<Sidebar queryParams={queryParams} />}
    />
  );
}

export default Empty;
