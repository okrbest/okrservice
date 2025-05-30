import { FlexRowLeft, ToggleButton } from "../../styles";
import { IBranch, IDepartment } from "@erxes/ui/src/team/types";
import React, { useState } from "react";
import { dateFormat, timeFormat } from "../../constants";

import Button from "@erxes/ui/src/components/Button";
import ExtractForm from "./LogsExtractForm";
import { ITimelog } from "../../types";
import Icon from "@erxes/ui/src/components/Icon";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import Pagination from "@erxes/ui/src/components/pagination/Pagination";
import Table from "@erxes/ui/src/components/table";
import Tip from "@erxes/ui/src/components/Tip";
import Wrapper from "@erxes/ui/src/layout/components/Wrapper";
import { __ } from "coreui/utils";
import dayjs from "dayjs";

type Props = {
  queryParams: any;
  timelogs: ITimelog[];
  totalCount?: number;

  departments: IDepartment[];
  branches: IBranch[];

  isCurrentUserAdmin: boolean;

  extractTimeLogsFromMsSQL: (
    startDate: Date,
    endDate: Date,
    params: any
  ) => void;

  createTimeclockFromLog: (
    userId: string,
    timelog: Date,
    inDevice?: string
  ) => void;

  showSideBar: (sideBar: boolean) => void;
  getActionBar: (actionBar: any) => void;
  getPagination: (pagination: any) => void;
};

function ReportList(props: Props) {
  const {
    totalCount,
    timelogs,
    getPagination,
    showSideBar,
    getActionBar,
    createTimeclockFromLog,
    isCurrentUserAdmin,
  } = props;

  const [isSideBarOpen, setIsOpen] = useState(
    localStorage.getItem("isSideBarOpen") === "true" ? true : false
  );

  const [startDate, setStartDate] = useState(
    new Date(localStorage.getItem("startDate") || Date.now())
  );
  const [endDate, setEndDate] = useState(
    new Date(localStorage.getItem("endDate") || Date.now())
  );

  const onToggleSidebar = () => {
    const toggleIsOpen = !isSideBarOpen;
    setIsOpen(toggleIsOpen);
    localStorage.setItem("isSideBarOpen", toggleIsOpen.toString());
  };

  const extractTrigger = isCurrentUserAdmin ? (
    <Button icon="plus-circle" btnStyle="primary">
      Extract time logs
    </Button>
  ) : (
    <></>
  );

  const extractContent = () => <ExtractForm {...props} />;

  const actionBarLeft = (
    <FlexRowLeft>
      <ToggleButton
        id="btn-inbox-channel-visible"
        $isActive={isSideBarOpen}
        onClick={onToggleSidebar}
      >
        <Icon icon="subject" />
      </ToggleButton>
    </FlexRowLeft>
  );

  const actionBarRight = (
    <>
      <ModalTrigger
        title={__("Extract time logs")}
        trigger={extractTrigger}
        content={extractContent}
      />
    </>
  );

  const actionBar = (
    <Wrapper.ActionBar
      left={actionBarLeft}
      right={actionBarRight}
      hasFlex={true}
      wideSpacing={true}
    />
  );

  const content = (
    <Table>
      <thead>
        <tr>
          <th>{__("Employee Id")}</th>
          <th>{__("Team member")}</th>
          <th>{__("Date")}</th>
          <th>{__("Time")}</th>
          <th>{__("Device")}</th>
          <th>{__("Action")}</th>
        </tr>
      </thead>
      <tbody>
        {timelogs.map((timelog) => {
          return (
            <tr key={timelog._id}>
              <td>{timelog.user && timelog.user.employeeId}</td>
              <td>
                {timelog.user && timelog.user.details
                  ? timelog.user.details.fullName ||
                    `${timelog.user.details.firstName} ${timelog.user.details.lastName}`
                  : timelog.user.employeeId}
              </td>
              <td>{dayjs(timelog.timelog).format(dateFormat)}</td>
              <td>{dayjs(timelog.timelog).format(timeFormat)}</td>
              <td>{timelog.deviceName}</td>
              <td>
                <Tip text={__("Create Timeclock")} placement="top">
                  <Button
                    btnStyle="link"
                    onClick={() =>
                      createTimeclockFromLog(
                        timelog.user._id,
                        timelog.timelog,
                        timelog.deviceName
                      )
                    }
                    icon="clock-eight"
                  />
                </Tip>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );

  getPagination(<Pagination count={totalCount} />);
  showSideBar(isSideBarOpen);
  getActionBar(actionBar);

  return content;
}

export default ReportList;
