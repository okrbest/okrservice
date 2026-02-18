import {
  Button,
  CalenderWrapper,
  CloseDateContent,
  CloseDateWrapper,
  DateGrid,
} from "../../styles/popup";

import ControlLabel from "@erxes/ui/src/components/form/Label";
import Datetime from "@nateradebaugh/react-datetime";
import Popover from "@erxes/ui/src/components/Popover";
import React from "react";
import { flushSync } from "react-dom";
import dayjs from "dayjs";
import { generateButtonStart } from "../../utils";
import { __ } from "coreui/utils";
import TicketTimer from "@erxes/ui/src/components/Timer";

type Props = {
  startDate: Date;
  reminderMinute: number;
  onChangeField: (
    name: "startDate" | "reminderMinute" | "isComplete",
    value: any
  ) => void;
  itemId?: string; // 티켓 ID 추가
  timeTrack?: any; // 시간 추적 정보 추가
  updateTimeTrack?: any; // 시간 추적 업데이트 함수 추가
};

type State = {
  startDate: Date | null;
  popoverOpenKey: number;
};

class StartDate extends React.Component<Props, State> {
  private ref;
  private overlay: any;

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      startDate: props.startDate || null,
      popoverOpenKey: 0,
    };
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.startDate !== undefined && nextProps.startDate !== null) {
      return { ...prevState, startDate: nextProps.startDate };
    }
    return null;
  }

  setOverlay = (overlay) => {
    this.overlay = overlay;
  };

  dateOnChange = (date) => {
    this.setState({ startDate: date });
  };

  hideContent = () => {
    this.overlay.hide();
  };

  onSave = (close) => {
    const { startDate } = this.state;
    const toSave = startDate ?? dayjs();

    this.props.onChangeField("startDate", toSave);
    close();
  };

  remove = (close) => {
    this.setState({ startDate: null });
    this.props.onChangeField("startDate", null);
    close();
  };

  renderContent = (close) => {
    const { startDate } = this.state;
    const displayDate = startDate ?? dayjs().toDate();

    const day = dayjs(displayDate).format("YYYY-MM-DD");
    const time = dayjs(displayDate).format("HH:mm");

    const onChangeDateTime = (e) => {
      const type = e.target.type;
      const value = e.target.value;

      const oldDay = dayjs(displayDate).format("YYYY/MM/DD");
      const oldTime = dayjs(displayDate).format("HH:mm");
      let newDate: Date;

      if (type === "date") {
        newDate = new Date(value.concat(" ", oldTime));
      } else {
        newDate = new Date(oldDay.concat(" ", value));
      }

      this.setState({ startDate: newDate });
    };

    return (
      <CloseDateContent>
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

        <CalenderWrapper>
          <Datetime
            inputProps={{ placeholder: "Click to select a date" }}
            dateFormat="YYYY/MM/DD"
            timeFormat="HH:mm"
            value={displayDate}
            closeOnSelect={true}
            utc={true}
            input={false}
            onChange={this.dateOnChange}
            defaultValue={dayjs().format("YYYY-MM-DD HH:mm:ss")}
          />
        </CalenderWrapper>
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
    const { startDate, itemId, timeTrack, updateTimeTrack } = this.props;
    const time = dayjs(startDate).format("HH:mm");

    const trigger = (
      <span
        onClick={() => {
          flushSync(() =>
            this.setState({
              popoverOpenKey: Date.now(),
              ...(this.props.startDate != null ? {} : { startDate: null }),
            })
          );
        }}
        style={{ display: "inline-block" }}
      >
        <Button colorname={generateButtonStart(startDate)}>
          {startDate
            ? `${dayjs(startDate).format("MMM DD")} at ${time}`
            : __("Start date")}
        </Button>
      </span>
    );

    // Timer 컴포넌트에서 시작일 변경 시 호출되는 함수
    const handleStartDateChange = (newStartDate: Date) => {
      this.props.onChangeField("startDate", newStartDate);
    };

    return (
      <CloseDateWrapper ref={this.ref}>
        {/* Timer 컴포넌트 추가 */}
        {itemId && timeTrack && updateTimeTrack && (
          <div style={{ marginBottom: '15px' }}>
            <TicketTimer
              taskId={itemId}
              status={timeTrack.status || "stopped"}
              timeSpent={timeTrack.timeSpent || 0}
              startDate={timeTrack.startDate}
              update={updateTimeTrack}
              onStartDateChange={handleStartDateChange}
            />
          </div>
        )}
        
        <Popover
          placement="bottom-end"
          trigger={trigger}
          closeAfterSelect={true}
        >
          {(close) => (
            <React.Fragment key={this.state.popoverOpenKey}>
              {this.renderContent(close)}
            </React.Fragment>
          )}
        </Popover>
      </CloseDateWrapper>
    );
  }
}

export default StartDate;
