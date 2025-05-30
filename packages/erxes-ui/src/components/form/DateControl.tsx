import Datetime from "@nateradebaugh/react-datetime";
import React from "react";
import moment from "moment";
import "moment/locale/ko";
import { Column } from "@erxes/ui/src/styles/main";
import { __ } from "coreui/utils";
moment.locale("ko");

type Props = {
  onChange?: (e: React.FormEvent<HTMLElement>) => void;
  defaultValue?: any;
  value?: any;
  placeholder?: string;
  name?: string;
  errors?: any;
  dateFormat?: string;
  required?: boolean;
  timeFormat?: boolean | string;
  registerChild?: (child: any) => void;
  isValidDate?: (currentDate: any, selectedDate?: Date) => boolean;
};

class DateControl extends React.Component<Props> {
  static defaultProps = {
    dateFormat: "YYYY년 MM월 DD일",
  };

  componentDidMount() {
    const { registerChild } = this.props;

    if (registerChild) {
      registerChild(this);
    }
  }

  render() {
    const {
      errors,
      value,
      name,
      placeholder,
      dateFormat,
      timeFormat,
      required,
      isValidDate,
    } = this.props;
    const errorMessage = errors && errors[name || ""];

    // cancel custom browser default form validation error
    const onChange = (e) => {
      if (this.props.onChange) {
        this.props.onChange(e);
      }
    };

    const inputProps = {
      name,
      placeholder: placeholder ? __(placeholder) : "",
      required: required || false,
      autoComplete: "off",
    };

    const attributes = {
      inputProps,
      dateFormat,
      timeFormat: timeFormat || false,
      value,
      closeOnSelect: true,
      onChange,
      utc: true,
      isValidDate,
    };

    return (
      <Column>
        <Datetime {...attributes} />
        {errorMessage}
      </Column>
    );
  }
}

export default DateControl;
