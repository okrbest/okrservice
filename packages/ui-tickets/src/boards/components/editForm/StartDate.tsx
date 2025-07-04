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
import dayjs from "dayjs";
import { generateButtonStart } from "../../utils";
import { __ } from "coreui/utils";

type Props = {
  startDate: Date;
  reminderMinute: number;
  onChangeField: (
    name: "startDate" | "reminderMinute" | "isComplete",
    value: any
  ) => void;
};

type State = {
  startDate: Date;
};

class StartDate extends React.Component<Props, State> {
  private ref;
  private overlay: any;

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      startDate: props.startDate || dayjs(),
    };
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

    this.props.onChangeField("startDate", startDate);
    close();
  };

  remove = (close) => {
    this.props.onChangeField("startDate", null);
    close();
  };

  renderContent = (close) => {
    const { startDate } = this.state;

    const day = dayjs(startDate).format("YYYY-MM-DD");
    const time = dayjs(startDate).format("HH:mm");

    const onChangeDateTime = (e) => {
      const type = e.target.type;
      const value = e.target.value;

      const oldDay = dayjs(startDate).format("YYYY/MM/DD");
      const oldTime = dayjs(startDate).format("HH:mm");
      let newDate = startDate;

      if (type === "date") {
        newDate = new Date(value.concat(" ", oldTime));
      }

      if (type === "time") {
        newDate = new Date(oldDay.concat(" ", value));
      }

      this.setState({ startDate: newDate });
    };

    return (
      <CloseDateContent>
        {startDate && (
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
            value={startDate}
            closeOnSelect={true}
            utc={true}
            input={false}
            onChange={this.dateOnChange}
            defaultValue={dayjs()
              .startOf("day")
              .add(12, "hour")
              .format("YYYY-MM-DD HH:mm:ss")}
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
    const { startDate } = this.props;
    const time = dayjs(startDate).format("HH:mm");

    const trigger = (
      <Button colorname={generateButtonStart(startDate)}>
        {startDate
          ? `${dayjs(startDate).format("MMM DD")} at ${time}`
          : __("Start date")}
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
      </CloseDateWrapper>
    );
  }
}

export default StartDate;
