import {
  Button,
  CalenderWrapper,
  CloseDateContent,
  CloseDateWrapper,
  DateGrid,
} from "../../styles/popup";
import { __ } from "coreui/utils";

import ControlLabel from "@erxes/ui/src/components/form/Label";
import Datetime from "@nateradebaugh/react-datetime";
import Popover from "@erxes/ui/src/components/Popover";
import React from "react";
import dayjs from "dayjs";
import { ICustomer } from "@erxes/ui-contacts/src/customers/types";

type Props = {
  customer: ICustomer;
  fieldId: string;
  fieldLabel: string;
  onSave: (customerId: string, fieldId: string, value: Date | null) => void;
};

type State = {
  date: Date | null;
};

class CustomerDateField extends React.Component<Props, State> {
  private ref;
  private overlay: any;

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    // Get current value from customer's customFieldsData
    const currentValue = this.getCurrentValue();
    
    let date: Date | null = null;
    if (currentValue) {
      try {
        date = new Date(currentValue);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          date = null;
        }
      } catch (e) {
        date = null;
      }
    }
    
    this.state = {
      date,
    };
  }

  getCurrentValue = (): string | null => {
    const { customer, fieldId } = this.props;
    
    if (!customer.customFieldsData || !Array.isArray(customer.customFieldsData)) {
      return null;
    }

    const fieldData = customer.customFieldsData.find(
      (data: any) => data.field === fieldId
    );

    if (!fieldData || !fieldData.value) {
      return null;
    }

    // Handle both ISO string and Date object
    if (typeof fieldData.value === 'string') {
      return fieldData.value;
    }
    
    return null;
  };

  setOverlay = (overlay) => {
    this.overlay = overlay;
  };

  dateOnChange = (date) => {
    this.setState({ date });
  };

  hideContent = () => {
    this.overlay.hide();
  };

  onSave = (close) => {
    const { date } = this.state;
    const { customer, fieldId, onSave } = this.props;

    onSave(customer._id, fieldId, date);
    close();
  };

  remove = (close) => {
    const { customer, fieldId, onSave } = this.props;
    
    this.setState({ date: null });
    onSave(customer._id, fieldId, null);
    close();
  };

  renderContent = (close) => {
    const { date } = this.state;

    if (!date) {
      return (
        <CloseDateContent>
          <CalenderWrapper>
            <Datetime
              inputProps={{ placeholder: "Click to select a date" }}
              dateFormat="YYYY/MM/DD"
              timeFormat="HH:mm"
              value={dayjs()}
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
            <Button colorname="green" onClick={() => this.onSave(close)}>
              {__("Save")}
            </Button>
          </DateGrid>
        </CloseDateContent>
      );
    }

    const day = dayjs(date).format("YYYY-MM-DD");
    const time = dayjs(date).format("HH:mm");

    const onChangeDateTime = (e) => {
      const type = e.target.type;
      const value = e.target.value;

      const oldDay = dayjs(date).format("YYYY/MM/DD");
      const oldTime = dayjs(date).format("HH:mm");
      let newDate = date;

      if (type === "date") {
        newDate = new Date(value.concat(" ", oldTime));
      }

      if (type === "time") {
        newDate = new Date(oldDay.concat(" ", value));
      }

      this.setState({ date: newDate });
    };

    return (
      <CloseDateContent>
        {date && (
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
            value={date}
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
    const { date } = this.state;
    const { fieldLabel } = this.props;
    const time = date ? dayjs(date).format("HH:mm") : "";

    const trigger = (
      <Button colorname={date ? "blue" : "simple"}>
        {date
          ? `${dayjs(date).format("MMM DD")} at ${time}`
          : fieldLabel}
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

export default CustomerDateField;

