import {
  Button,
  CalenderWrapper,
  CheckBoxWrapper,
  CloseDateContent,
  CloseDateWrapper,
  DateGrid,
} from "../../styles/popup";
import { generateButtonClass, selectOptions } from "../../utils";
import { __ } from "coreui/utils";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Datetime from "@nateradebaugh/react-datetime";
import FormControl from "@erxes/ui/src/components/form/Control";
import Popover from "@erxes/ui/src/components/Popover";
import { REMINDER_MINUTES } from "../../constants";
import React from "react";
import Select from "react-select";
import dayjs from "dayjs";

type Props = {
  closeDate: Date;
  startDate: Date;
  createdDate: Date;
  isCheckDate?: boolean;
  isComplete: boolean;
  reminderMinute: number;
  onChangeField: (
    name: "closeDate" | "reminderMinute" | "isComplete",
    value: any
  ) => void;
  stage?: any;
};

type State = {
  dueDate: Date;
};

class CloseDate extends React.Component<Props, State> {
  private ref;
  private overlay: any;

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      dueDate: props.closeDate || dayjs(),
    };
  }

  componentDidMount() {
    const { stage, closeDate, isComplete, onChangeField } = this.props;
    
    // 마운트 시에도 마지막 단계이고 closeDate가 설정되어 있으면 자동으로 isComplete를 true로 설정
    if (stage?.probability === 'Resolved' && closeDate && !isComplete) {
      console.log('componentDidMount: 자동으로 isComplete를 true로 설정합니다');
      onChangeField("isComplete", true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { stage, closeDate, isComplete, onChangeField } = this.props;
    
    // 디버깅 로그
    console.log('CloseDate componentDidUpdate:', {
      stage,
      closeDate,
      isComplete,
      stageKeys: stage ? Object.keys(stage) : [],
      stageValues: stage ? Object.values(stage) : []
    });
    
    // probability가 'Resolved'인 경우 마지막 단계로 간주
    const isLastStage = stage?.probability === 'Resolved';
    
    console.log('isLastStage (Resolved-based):', isLastStage);
    
    // 마지막 단계이고 closeDate가 설정되어 있으면 자동으로 isComplete를 true로 설정
    // prevProps.closeDate !== closeDate 조건 제거하여 더 자주 체크
    if (isLastStage && closeDate && !isComplete) {
      console.log('자동으로 isComplete를 true로 설정합니다');
      onChangeField("isComplete", true);
    }
  }

  setOverlay = (overlay) => {
    this.overlay = overlay;
  };

  minuteOnChange = ({ value }: any) => {
    this.props.onChangeField("reminderMinute", parseInt(value, 10));
  };

  dateOnChange = (date) => {
    this.setState({ dueDate: date });
  };

  onSave = (close) => {
    const { dueDate } = this.state;
    const { startDate } = this.props;

    // 시작일이 비어 있으면 마감일을 설정할 수 없음
    if (!startDate) {
      alert(__("시작일을 먼저 설정해주세요."));
      return;
    }

    this.props.onChangeField("closeDate", dueDate);
    close();
  };

  remove = (close) => {
    this.props.onChangeField("closeDate", null);
    close();
  };

  renderContent = (close) => {
    const { reminderMinute, isCheckDate, createdDate } = this.props;
    const { dueDate } = this.state;

    const checkedDate = new Date(
      Math.max(new Date(dueDate).getTime(), new Date(createdDate).getTime())
    );
    const day = isCheckDate
      ? dayjs(checkedDate).format("YYYY-MM-DD")
      : dayjs(dueDate).format("YYYY-MM-DD");

    const time = dayjs(dueDate).format("HH:mm");

    const renderValidDate = (current) => {
      return isCheckDate
        ? dayjs(current).isAfter(dayjs(createdDate).subtract(1, "day"))
        : true;
    };

    const onChangeDateTime = (e) => {
      const type = e.target.type;
      const value = e.target.value;

      const oldDay = dayjs(dueDate).format("YYYY/MM/DD");
      const oldTime = dayjs(dueDate).format("HH:mm");
      let newDate = dueDate;

      if (type === "date") {
        newDate = new Date(value.concat(" ", oldTime));
      }

      if (type === "time") {
        newDate = new Date(oldDay.concat(" ", value));
      }

      this.setState({ dueDate: newDate });
    };

    return (
      <CloseDateContent>
        {dueDate && (
          <DateGrid>
            <div>
              <ControlLabel>Date</ControlLabel>
              <input type="date" value={day} onChange={onChangeDateTime} />
            </div>
            <div>
              <ControlLabel>Time</ControlLabel>
              <input type="time" value={time} onChange={onChangeDateTime} />
            </div>
          </DateGrid>
        )}

        <CalenderWrapper>
          <Datetime
            inputProps={{ placeholder: "Click to select a date" }}
            dateFormat="YYYY/MM/DD"
            timeFormat="HH:mm"
            value={dueDate}
            closeOnSelect={true}
            utc={true}
            input={false}
            isValidDate={renderValidDate}
            onChange={this.dateOnChange}
            defaultValue={dayjs()
              .startOf("day")
              .add(12, "hour")
              .format("YYYY-MM-DD HH:mm:ss")}
          />
        </CalenderWrapper>

        <ControlLabel>Set reminder</ControlLabel>

        <Select
          required={true}
          value={
            reminderMinute
              ? selectOptions(REMINDER_MINUTES).filter(
                  (o) => o.value === reminderMinute.toString()
                )
              : null
          }
          onChange={this.minuteOnChange}
          options={selectOptions(REMINDER_MINUTES)}
          isClearable={false}
          menuPlacement="top"
        />

        <DateGrid>
          <Button colorname="red" onClick={() => this.remove(close)}>
            {__("Remove")}
          </Button>
          <Button colorname="green" onClick={() => this.onSave(close)}>
            {__("Save")}
          </Button>
        </DateGrid>
      </CloseDateContent>
    );
  };

  render() {
    const { isComplete, onChangeField, closeDate, startDate, stage } = this.props;
    const time = dayjs(closeDate).format("HH:mm");

    const onChange = (e) => onChangeField("isComplete", e.target.checked);

    // probability가 'Resolved'인 경우 마지막 단계로 간주
    const isLastStage = stage?.probability === 'Resolved';
    
    console.log('CloseDate render - isLastStage (Resolved):', isLastStage);

    const trigger = (
      <Button 
        colorname={generateButtonClass(closeDate, isComplete)}
        disabled={!startDate}
        title={!startDate ? __("시작일을 먼저 설정해주세요.") : ""}
      >
        {closeDate
          ? `${dayjs(closeDate).format("MMM DD")} at ${time}`
          : __("Close date")}
      </Button>
    );

    return (
      <CloseDateWrapper ref={this.ref}>
        <Popover
          placement="bottom-end"
          trigger={trigger}
          closeAfterSelect={true}
        >
          {this.renderContent}
        </Popover>
        {closeDate && (
          <CheckBoxWrapper>
            <FormControl
              checked={isComplete}
              componentclass="checkbox"
              onChange={onChange}
              disabled={isLastStage} // 마지막 단계일 때는 체크박스 비활성화
            />

          </CheckBoxWrapper>
        )}
      </CloseDateWrapper>
    );
  }
}

export default CloseDate;
