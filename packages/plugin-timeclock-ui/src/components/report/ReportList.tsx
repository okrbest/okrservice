import { FilterItem, FlexRow, FlexRowEven, ToggleButton } from '../../styles';
import React, { useState } from 'react';
import { __ } from 'coreui/utils';
import { loadDynamicComponent, router } from '@erxes/ui/src/utils';
import { useLocation, useNavigate } from 'react-router-dom';

import Button from '@erxes/ui/src/components/Button';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import FormGroup from '@erxes/ui/src/components/form/Group';
import { IReport } from '../../types';
import Icon from '@erxes/ui/src/components/Icon';
import Pagination from '@erxes/ui/src/components/pagination/Pagination';
import ReportRow from './ReportRow';
import Select from 'react-select';
import Table from '@erxes/ui/src/components/table';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';

type Props = {
  queryParams: any;
  reports: IReport[];
  totalCount: number;

  showSideBar: (sideBar: boolean) => void;
  getActionBar: (actionBar: any) => void;
  getPagination: (pagination: any) => void;

  exportReport: () => void;

  isCurrentUserAdmin: boolean;
};

function ReportList(props: Props) {
  const {
    reports,
    queryParams,
    totalCount,
    getActionBar,
    getPagination,
    exportReport,
    showSideBar,
    isCurrentUserAdmin
  } = props;
  const [reportType, setType] = useState(queryParams.reportType);
  const location = useLocation();
  const navigate = useNavigate();

  const [showDepartment, setShowDepartment] = useState(
    queryParams.showDepartment ? JSON.parse(queryParams.showDepartment) : false
  );

  const [showBranch, setShowBranch] = useState(
    queryParams.showBranch ? JSON.parse(queryParams.showBranch) : false
  );

  const [isSideBarOpen, setIsOpen] = useState(
    JSON.parse(localStorage.getItem('isSideBarOpen') || 'false')
  );

  const onToggleSidebar = () => {
    const toggleIsOpen = !isSideBarOpen;
    setIsOpen(toggleIsOpen);
    localStorage.setItem('isSideBarOpen', toggleIsOpen.toString());
  };

  const toggleShowDepartment = () => {
    const toggle = !showDepartment;
    setShowDepartment(toggle);
    router.setParams(navigate, location, { showDepartment: toggle });
  };

  const toggleShowBranch = () => {
    const toggle = !showBranch;
    setShowBranch(toggle);
    router.setParams(navigate, location, { showBranch: toggle });
  };

  const renderTableHead = () => {
    switch (reportType) {
      case 'Урьдчилсан':
        return (
          <tr>
            <th>{'№'}</th>
            <th>{__('Team member Id')}</th>
            <th>{__('Last Name')}</th>
            <th>{__('First Name')}</th>
            <th>{__('Position')}</th>
            <th>{__('Scheduled days')}</th>
            <th>{__('Worked days')}</th>
            <th>{__('Explanation')}</th>
          </tr>
        );
      case 'Сүүлд':
        return (
          <>
            <tr>
              <th rowSpan={2}>{'№'}</th>
              {showDepartment && <th rowSpan={2}>{__('Department')}</th>}
              {showBranch && <th rowSpan={2}>{__('Branch')}</th>}
              <th rowSpan={2}>{__('Team member Id')}</th>
              <th rowSpan={2}>{__('Last Name')}</th>
              <th rowSpan={2}>{__('First Name')}</th>
              <th rowSpan={2}>{__('Position')}</th>
              <th colSpan={2}>{__('Scheduled time')}</th>
              <th colSpan={8} style={{ textAlign: 'center' }}>
                {__('Timeclock info')}
              </th>
              <th colSpan={5} style={{ textAlign: 'center' }}>
                {__('Absence info')}
              </th>
              <th rowSpan={2}>{__('Checked by member')}</th>
            </tr>
            <tr>
              <th>{__('Days')}</th>
              <th>{__('Hours')}</th>
              <th>{__('Total break')}</th>
              <th>{__('Worked days')}</th>
              <th>{__('Worked hours')}</th>
              <th>{__('Overtime')}</th>
              <th>{__('Overnight')}</th>
              <th>{__('Total break')}</th>
              <th>{__('Total')}</th>
              <th>{__('Mins Late')}</th>
              <th>{__('Shift request')}</th>
              <th>{__('Томилолтоор ажилласан цаг')}</th>
              <th>{__('Чөлөөтэй цаг цалинтай')}</th>
              <th>{__('Чөлөөтэй цаг цалингүй')}</th>
              <th>{__('Өвдсөн цаг /ХЧТАТ бодох цаг/')}</th>
            </tr>
          </>
        );
      case 'Pivot':
        return (
          <>
            <tr>
              <th
                colSpan={5}
                style={{ textAlign: 'center', border: '1px solid #EEE' }}>
                {__('General Information')}
              </th>
              <th colSpan={1}>{__('Time')}</th>
              <th
                colSpan={4}
                style={{ textAlign: 'center', border: '1px solid #EEE' }}>
                {__('Schedule')}
              </th>
              <th
                colSpan={9}
                style={{ textAlign: 'center', border: '1px solid #EEE' }}>
                {__('Performance')}
              </th>
            </tr>
            <tr>
              <th>{'№'}</th>
              <th>{__('Team member Id')}</th>
              <th>{__('Last Name')}</th>
              <th>{__('First Name')}</th>
              <th style={{ textAlign: 'left' }}>{__('Position')}</th>
              <th>{__('Date')}</th>
              <th>{__('Planned Check In')}</th>
              <th>{__('Planned Check Out')}</th>
              <th>{__('Planned Duration')}</th>
              <th>{__('Planned Break')}</th>
              <th>{__('Check In')}</th>
              <th>{__('In Device')}</th>
              <th>{__('Check Out')}</th>
              <th>{__('Out Device')}</th>
              <th>{__('Planned Break')}</th>
              <th>{__('Overnight')}</th>
              <th>{__('Overtime')}</th>
              <th>{__('Duration')}</th>
              <th>{__('Mins Late')}</th>
            </tr>
          </>
        );
    }
  };

  const content = () => {
    // custom report for bichil-globus
    const bichilTable = loadDynamicComponent('bichilReportTable', {
      reportType,
      queryParams,
      isCurrentUserAdmin,
      getPagination
    });

    if (bichilTable) {
      return bichilTable;
    }

    return (
      <Table>
        <thead>{renderTableHead()}</thead>
        {reports &&
          reports.map((reportt, i) => (
            <ReportRow
              index={i + 1}
              key={Math.random()}
              reportType={reportType}
              report={reportt}
              showBranch={showBranch}
              showDepartment={showDepartment}
            />
          ))}
      </Table>
    );
  };

  const renderSelectionBar = () => {
    const onTypeSelect = type => {
      router.setParams(navigate, location, { reportType: type.value, page: 1 });
      // router.removeParams(navigate, location, 'page');
      setType(type.value);
    };

    const selectOptions = ['Урьдчилсан', 'Сүүлд', 'Pivot'].map(ipt => ({
      value: ipt,
      label: __(ipt)
    }));

    return (
      <FlexRow>
        <FlexRowEven>
          <ToggleButton
            id='btn-inbox-channel-visible'
            $isActive={isSideBarOpen}
            onClick={onToggleSidebar}>
            <Icon icon='subject' />
          </ToggleButton>
          {reportType === 'Сүүлд' && (
            <>
              <ToggleButton
                style={{ width: 'auto' }}
                $isActive={showDepartment}
                onClick={toggleShowDepartment}>
                <ControlLabel>{__('Department')}</ControlLabel>
              </ToggleButton>
              <ToggleButton
                style={{ width: 'auto' }}
                $isActive={showBranch}
                onClick={toggleShowBranch}>
                <ControlLabel>{__('Branch')}</ControlLabel>
              </ToggleButton>
            </>
          )}
        </FlexRowEven>
        <FilterItem>
          <FormGroup>
            <ControlLabel>Select type</ControlLabel>
            <Select
              value={selectOptions.find(o => o.value === reportType)}
              onChange={onTypeSelect}
              placeholder={__('Select type')}
              isMulti={false}
              isClearable={true}
              options={selectOptions}
            />
          </FormGroup>
        </FilterItem>
      </FlexRow>
    );
  };
  const renderExportBtn = () => {
    const bichilExportReportBtn = loadDynamicComponent(
      'bichilExportReportBtn',
      { ...queryParams, reportType, isCurrentUserAdmin }
    );
    if (bichilExportReportBtn) {
      return bichilExportReportBtn;
    }
    return (
      <div>
        <Button onClick={exportReport}>Export</Button>
      </div>
    );
  };

  const actionBar = (
    <Wrapper.ActionBar
      left={renderSelectionBar()}
      right={renderExportBtn()}
      hasFlex={true}
    />
  );

  getPagination(<Pagination count={totalCount} />);
  showSideBar(isSideBarOpen);
  getActionBar(actionBar);

  return content();
}

export default ReportList;
