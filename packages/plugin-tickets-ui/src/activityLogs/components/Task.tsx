import {
  ActivityDate,
  Date,
  DeleteAction,
  Description,
  Detail,
  FlexBody,
  FlexCenterContent,
  FlexContent,
  IconWrapper,
  JumpTo,
  LogWrapper,
  Row,
  Title,
} from "@erxes/ui-log/src/activityLogs/styles";

import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Datetime from "@nateradebaugh/react-datetime";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IItem } from "@erxes/ui-tickets/src/boards/types";
import Icon from "@erxes/ui/src/components/Icon";
import { Link } from "react-router-dom";
import Popover from "@erxes/ui/src/components/Popover";
import { REMINDER_MINUTES } from "@erxes/ui-tickets/src/boards/constants";
import React from "react";
import Select from "react-select";
import SelectTeamMembers from "@erxes/ui/src/team/containers/SelectTeamMembers";
import Tip from "@erxes/ui/src/components/Tip";
import { __ } from "coreui/utils";
import dayjs from "dayjs";
import { selectOptions } from "@erxes/ui-tickets/src/boards/utils";

type Props = {
  task: IItem;
  save: (variables, callback) => void;
  remove: (id: string) => void;
};

type State = {
  editing: boolean;
  name: string;
  closeDate: Date;
  showDetail: boolean;
  isComplete: boolean;
};

class Task extends React.Component<Props, State> {
  private overlayTrigger;

  constructor(props) {
    super(props);

    const task = props.task || {};
    this.state = {
      editing: false,
      name: task.name || "",
      closeDate: task.closeDate || dayjs(),
      showDetail: false,
      isComplete: task.isComplete || false,
    };
  }

  onOverlayClose = () => {
    this.overlayTrigger.hide();
  };

  onRemove = () => {
    const { remove, task } = this.props;
    remove(task._id);
  };

  onChange = (key: string) => {
    this.setState({ [key]: !this.state[key] } as any);
  };

  handleInputChange = (e) => {
    e.preventDefault();

    this.setState({ name: e.target.value });
  };

  saveItem = (key: string, value: any) => {
    const { task } = this.props;

    this.props.save(
      {
        _id: task._id,
        [key]: value,
      },
      () => {
        this.setState({ editing: false });
      }
    );
  };

  renderName() {
    const { task } = this.props;

    if (this.state.editing) {
      return (
        <>
          <FormGroup>
            <FormControl
              value={this.state.name}
              onChange={this.handleInputChange}
            />
          </FormGroup>
          <Button
            icon="cancel-1"
            btnStyle="simple"
            size="small"
            onClick={this.onChange.bind(this, "editing")}
          >
            Cancel
          </Button>
          <Button
            btnStyle="success"
            size="small"
            icon="checked-1"
            onClick={this.saveItem.bind(this, "name", this.state.name)}
          >
            Save
          </Button>
        </>
      );
    }

    return <h4 onClick={this.onChange.bind(this, "editing")}>{task.name}</h4>;
  }

  renderDetails() {
    const { showDetail, isComplete } = this.state;

    const minuteOnChange = (value) => {
      this.saveItem("reminderMinute", parseInt(value, 10));
    };

    if (!showDetail) {
      return null;
    }

    const value = this.props.task.reminderMinute;

    return (
      <>
        {isComplete && this.renderContent()}
        <Detail>
          <FlexBody>
            <Row>
              <ControlLabel>Set reminder</ControlLabel>
              <Select
                required={true}
                value={selectOptions(REMINDER_MINUTES).find(
                  (option) =>
                    option.value === this.props.task.reminderMinute.toString()
                )}
                onChange={minuteOnChange}
                options={selectOptions(REMINDER_MINUTES)}
                isClearable={true}
              />
            </Row>
          </FlexBody>
        </Detail>
      </>
    );
  }

  renderCloseDate() {
    const { closeDate } = this.state;

    const onDateChange = (date) => {
      this.setState({ closeDate: date }, () => {
        this.saveItem("closeDate", closeDate);
      });
    };

    return (
      <Popover
        trigger={
          <Date>
            <Icon icon="calendar-alt" />
            <span>{dayjs(closeDate).format("MM/DD/YYYY")}</span>
            <Icon icon="angle-down" size={14} />
          </Date>
        }
      >
        <Datetime
          inputProps={{ placeholder: __("Click to select a date") }}
          dateFormat="YYYY/MM/DD"
          timeFormat="HH:mm"
          value={closeDate}
          closeOnSelect={true}
          utc={true}
          input={false}
          onChange={onDateChange}
          defaultValue={dayjs()
            .startOf("day")
            .add(12, "hour")
            .format("YYYY-MM-DD HH:mm:ss")}
        />
      </Popover>
    );
  }

  renderContent() {
    const { task } = this.props;

    const assignedUserIds = (task.assignedUsers || []).map((user) => user._id);

    const onAssignedUserSelect = (usrs) => {
      this.saveItem("assignedUserIds", usrs);
    };

    return (
      <>
        <FlexContent>
          <FlexBody>
            <Row>
              <ControlLabel>Assigned to</ControlLabel>
              <SelectTeamMembers
                label={__("Choose team member")}
                name="assignedUserIds"
                initialValue={assignedUserIds}
                onSelect={onAssignedUserSelect}
              />
            </Row>
          </FlexBody>

          <FlexBody>
            <ControlLabel>Due date</ControlLabel>
            <FlexContent>{this.renderCloseDate()}</FlexContent>
          </FlexBody>
        </FlexContent>

        {task.description && <Description>{task.description}</Description>}
      </>
    );
  }

  render() {
    const { isComplete, showDetail, editing } = this.state;
    const { createdUser, createdAt, boardId, _id } = this.props.task;

    const onComplete = () => {
      this.setState({ isComplete: !this.state.isComplete }, () => {
        this.saveItem("isComplete", this.state.isComplete);
      });
    };

    return (
      <LogWrapper>
        <FlexCenterContent>
          <FlexBody>
            <strong>
              {createdUser && createdUser.details
                ? createdUser.details.fullName || createdUser.email
                : "Undefined"}
            </strong>{" "}
            created a task
          </FlexBody>
          <Link to={`/task/board?_id=${boardId}&itemId=${_id}`} target="_blank">
            <JumpTo>
              Jump to task
              <Icon icon="corner-down-right-alt" />
            </JumpTo>
          </Link>
          <DeleteAction onClick={this.onRemove}>Delete</DeleteAction>
          <Tip text={dayjs(createdAt).format("llll")}>
            <ActivityDate>
              {dayjs(createdAt).format("MMM D, h:mm A")}
            </ActivityDate>
          </Tip>
        </FlexCenterContent>
        <FlexContent>
          <Tip
            text={
              isComplete ? __("Mark as incomplete") : __("Mark as complete")
            }
          >
            <IconWrapper onClick={onComplete} isComplete={isComplete}>
              <Icon icon="check-1" size={25} />
            </IconWrapper>
          </Tip>
          <Title isComplete={isComplete} isEditing={editing}>
            {this.renderName()}
            <Icon icon="edit" />
          </Title>
        </FlexContent>
        {!isComplete && this.renderContent()}
        <Detail full={true}>
          <Date
            onClick={this.onChange.bind(this, "showDetail")}
            showDetail={showDetail}
          >
            <Icon icon="angle-right" /> {__("Details")}
          </Date>
          {this.renderDetails()}
        </Detail>
      </LogWrapper>
    );
  }
}

export default Task;
