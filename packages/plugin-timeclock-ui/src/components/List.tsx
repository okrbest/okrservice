import { menuTimeClock } from '../constants';
import { __ } from 'coreui/utils';
import React, { useState, useEffect } from 'react';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';
import DataWithLoader from '@erxes/ui/src/components/DataWithLoader';
import SideBarList from '../containers/sidebar/SideBarList';
import ConfigList from '../containers/config/ConfigList';
import TimeclockList from '../containers/timeclock/TimeclockList2';
import AbsenceList from '../containers/absence/AbsenceList';
import ReportList from '../containers/report/ReportList';
import ScheduleList from '../containers/schedule/ScheduleList';
import LogsList from '../containers/logs/LogsList';
import { IBranch, IDepartment } from '@erxes/ui/src/team/types';
import { IScheduleConfig } from '../types';
import { isEnabled } from '@erxes/ui/src/utils/core';
import { IUser } from '@erxes/ui/src/auth/types';

type Props = {
  currentUser: IUser;
  branches: IBranch[];
  departments: IDepartment[];

  isCurrentUserAdmin: boolean;
  isCurrentUserSupervisor: boolean;

  currentDate?: string;
  queryParams: any;
  route?: string;
  startTime?: Date;
  loading: boolean;

  searchFilter: string;
};

function List(props: Props) {
  const { queryParams, isCurrentUserAdmin, route, searchFilter, branches } =
    props;

  const [showSideBar, setShowSideBar] = useState(true);
  const [rightActionBar, setRightActionBar] = useState(<div />);
  const [Component, setModalComponent] = useState(<div />);
  const [PaginationFooter, setPagination] = useState(<div />);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    switch (route) {
      case 'config':
        if (isCurrentUserAdmin) {
          setModalComponent(
            <ConfigList
              {...props}
              getPagination={setPagination}
              showSideBar={setShowSideBar}
              getActionBar={setRightActionBar}
              queryParams={queryParams}
            />
          );
        }
        setLoading(false);
        break;
      case 'report':
        setModalComponent(
          <ReportList
            {...props}
            reportType={queryParams.reportType}
            showSideBar={setShowSideBar}
            getActionBar={setRightActionBar}
            queryParams={queryParams}
            getPagination={setPagination}
          />
        );
        setLoading(false);
        break;
      case 'schedule':
        setModalComponent(
          <ScheduleList
            {...props}
            showSideBar={setShowSideBar}
            getPagination={setPagination}
            getActionBar={setRightActionBar}
            queryParams={queryParams}
          />
        );
        setLoading(false);
        break;
      case 'requests':
        setModalComponent(
          <AbsenceList
            {...props}
            showSideBar={setShowSideBar}
            getPagination={setPagination}
            getActionBar={setRightActionBar}
            queryParams={queryParams}
          />
        );
        setLoading(false);
        break;
      case 'logs':
        if (!isEnabled('bichil')) {
          setModalComponent(
            <LogsList
              {...props}
              showSideBar={setShowSideBar}
              getPagination={setPagination}
              getActionBar={setRightActionBar}
              queryParams={queryParams}
            />
          );
        }
        setLoading(false);
        break;
      default:
        setModalComponent(
          <TimeclockList
            {...props}
            showSideBar={setShowSideBar}
            getActionBar={setRightActionBar}
            getPagination={setPagination}
            queryParams={queryParams}
          />
        );
        setLoading(false);
    }
  }, [queryParams]);

  return (
    <Wrapper
      header={
        <Wrapper.Header
          title={__('Timeclocks')}
          submenu={menuTimeClock(searchFilter, isCurrentUserAdmin)}
        />
      }
      actionBar={rightActionBar}
      footer={PaginationFooter}
      content={
        <DataWithLoader
          data={Component}
          loading={loading}
          emptyText={__('Theres no timeclock')}
          emptyImage='/images/actions/8.svg'
        />
      }
      leftSidebar={
        showSideBar && <SideBarList {...props} queryParams={queryParams} />
      }
      transparent={true}
      hasBorder={true}
    />
  );
}

export default List;
