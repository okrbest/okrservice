import * as moment from "moment";

import { Button, Icon } from "@erxes/ui/src/components";
import { FieldStyle, SidebarList } from "@erxes/ui/src/layout/styles";
import { MeetingListSearch, ParticipantList } from "../../styles";
import React, { useEffect, useState } from "react";
import { __ } from "coreui/utils";
import { router } from "@erxes/ui/src/utils";

import Box from "@erxes/ui/src/components/Box";
import { ChooseOwnerFormContainer } from "../../containers/myCalendar/ChooseOwnerForm";
import DataWithLoader from "@erxes/ui/src/components/DataWithLoader";
import FormControl from "@erxes/ui/src/components/form/Control";
import { IMeeting } from "../../types";
import { IUser } from "@erxes/ui/src/auth/types";
import LeftSidebar from "@erxes/ui/src/layout/components/Sidebar";
import { ModalTrigger } from "@erxes/ui/src";
import { SidebarListItem } from "@erxes/ui-settings/src/styles";
import Wrapper from "@erxes/ui/src/layout/components/Wrapper";
import { colors } from "@erxes/ui/src/styles";
import dayjs from "dayjs";
import { generateColorCode } from "../../utils";
import { useNavigate, useLocation } from "react-router-dom";

const { Section } = Wrapper.Sidebar;

type Props = {
  closeModal?: () => void;
  afterSave?: () => void;
  meetings: IMeeting[];
  queryParams: any;
  loading: boolean;
  participantUsers: IUser[];
  pinnedUsers: {
    pinnedUserIds: string[];
    userId: string;
    pinnedUsersInfo: IUser[];
  };
  currentUser: IUser;
};

export const SideBar = (props: Props) => {
  const { queryParams, meetings, loading, pinnedUsers, currentUser } = props;
  const { meetingId } = queryParams;
  const [filteredMeeting, setFilteredMeeting] = useState(meetings);
  const { pinnedUsersInfo = [] } = pinnedUsers;

  const [checkedUsers, setCheckedUsers] = useState(
    (queryParams.participantUserIds &&
      queryParams.participantUserIds.split(",")) ||
      []
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setFilteredMeeting(meetings);
  }, [meetings, meetings.length]);

  const onClick = (_id: string) => {
    router.setParams(navigate, location, { meetingId: _id });
  };

  const ListItem = (meeting) => {
    const className = meeting && meetingId === meeting._id ? "active" : "";
    const startTime =
      meeting.startDate && dayjs(meeting.startDate).format("HH:mm");
    const endTime = meeting.endDate && dayjs(meeting.endDate).format("HH:mm");

    return (
      <SidebarListItem
        $isActive={className === "active"}
        key={meeting._id}
        onClick={() => onClick(meeting._id)}
        backgroundColor="#f2f2f2"
        style={{
          margin: "0 20px 4px 20px",
          borderRadius: "10px",
          padding: "4px 8px",
        }}
      >
        <div
          style={{
            margin: "4px",
            display: "grid",
            color:
              className === "active" ? colors.colorPrimary : colors.textPrimary,
          }}
        >
          <h5 style={{ margin: 0 }}>{__(meeting.title)}</h5>
          {startTime && endTime && (
            <span>
              {startTime} - {endTime}
            </span>
          )}
        </div>
      </SidebarListItem>
    );
  };

  const todayMeetings = (meetings) => {
    const today = moment(); // Get today's date
    const todayMeetings = meetings.filter((meeting) => {
      const meetingDate = moment(meeting.startDate);
      return meeting.status !== "completed" && meetingDate.isSame(today, "day");
    });

    return todayMeetings;
  };

  const tommorowMeetings = (meetings) => {
    const tomorrow = moment().add(1, "day"); // Get tomorrow's date
    return meetings.filter((meeting) => {
      const meetingDate = moment(meeting.startDate);
      return (
        meeting.status !== "completed" && meetingDate.isSame(tomorrow, "day")
      );
    });
  };

  const handleSearch = (event: any) => {
    setFilteredMeeting(
      meetings.filter((meeting) => {
        return meeting.title
          .toLowerCase()
          .includes(event.target.value.toLowerCase());
      })
    );
  };

  const handleChange = (e, userId: string) => {
    router.removeParams(navigate, location, meetingId);
    const isChecked = e.target.checked;
    if (isChecked && !checkedUsers?.includes(userId)) {
      setCheckedUsers([...checkedUsers, userId]);
      const participantIds = [...checkedUsers, userId];
      const queryString = "participantUserIds=" + participantIds.join(",");

      return navigate(`${window.location.pathname}?${queryString}`);
    } else {
      const uncheckedUser = checkedUsers?.filter((user) => user !== userId);
      setCheckedUsers(uncheckedUser);
      const queryString = "participantUserIds=" + uncheckedUser.join(",");

      return navigate(`${window.location.pathname}?${queryString}`);
    }
  };

  const clearUserFilter = () => {
    router.setParams(navigate, location, {
      searchUserValue: null,
    });
  };

  const data = (
    <SidebarList style={{ padding: "10px 20px" }}>
      {pinnedUsersInfo?.map((user: any) => {
        return (
          <ParticipantList key={user._id}>
            <FormControl
              componentclass="checkbox"
              onChange={(e) => handleChange(e, user._id)}
              defaultChecked={checkedUsers?.includes(user._id)}
            />
            &emsp;
            <FieldStyle>{user?.details?.fullName || user?.email}</FieldStyle>
            <div className="actions">
              <div
                className="badge"
                style={{
                  backgroundColor: generateColorCode(user._id),
                }}
              />
            </div>
          </ParticipantList>
        );
      })}

      <Section.QuickButtons>
        {router.getParam(location, "searchUserValue") && (
          <Button btnStyle="warning" onClick={clearUserFilter}>
            Clear filter
          </Button>
        )}
      </Section.QuickButtons>
    </SidebarList>
  );

  const trigger = (
    <a href="#settings" tabIndex={0}>
      <Icon icon="plus-circle" />
    </a>
  );

  const renderForm = ({ closeModal }) => {
    return (
      <ChooseOwnerFormContainer
        closeModal={closeModal}
        pinnedUserIds={pinnedUsers.pinnedUserIds}
        currentUser={currentUser}
      />
    );
  };

  const extraButtons = (
    <ModalTrigger
      content={({ closeModal }) => renderForm({ closeModal })}
      title={__(`Add members`)}
      trigger={trigger}
    />
  );

  return (
    <LeftSidebar>
      <MeetingListSearch>
        <FormControl
          type="text"
          placeholder={__("Search Meeting")}
          round={true}
          onChange={handleSearch}
        />
      </MeetingListSearch>
      {todayMeetings(filteredMeeting)?.length > 0 && (
        <Box title={__("Today")} name={`today`} isOpen={true}>
          <SidebarList noTextColor noBackground id="SideBar">
            {todayMeetings(filteredMeeting)?.map((meeting) => {
              return ListItem(meeting);
            })}
          </SidebarList>
        </Box>
      )}
      {tommorowMeetings(filteredMeeting)?.length > 0 && (
        <Box title={__("Tomorrow")} name={`tomorrow`} isOpen={true}>
          <SidebarList noTextColor noBackground id="SideBar">
            {tommorowMeetings(filteredMeeting)?.map((meeting) => {
              return ListItem(meeting);
            })}
          </SidebarList>
        </Box>
      )}

      <Box
        title={__("Other calendar")}
        name={`showCaledar`}
        isOpen={true}
        extraButtons={extraButtons}
        // collapsible={true}
      >
        <DataWithLoader
          data={data}
          loading={loading}
          count={pinnedUsersInfo?.length}
          emptyText={__("Empty")}
          emptyIcon="leaf"
          size="small"
          objective={true}
        />
      </Box>
    </LeftSidebar>
  );
};

export default SideBar;
