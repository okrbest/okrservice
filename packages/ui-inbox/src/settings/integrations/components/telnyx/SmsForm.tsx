import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IIntegrationWithPhone } from "@erxes/ui-engage/src/types";
import { ISelectedOption } from "@erxes/ui/src/types";
import React from "react";
import { __ } from "coreui/utils";
import colors from "@erxes/ui/src/styles/colors";
import Select, { components } from "react-select";
import styled from "styled-components";
import styledTS from "styled-components-ts";

const SMSInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Char = styledTS<{ count: number }>(styled.div)`
  color: ${(props) =>
    props.count > 10
      ? props.count < 30 && colors.colorCoreOrange
      : colors.colorCoreRed};
  font-weight: bold;
`;

const ButtonWrapper = styled(SMSInfo)`
  justify-content: flex-end;
`;

type Props = {
  sendSms: (integrationId: string, message: string, to: string) => any;
  integrations: IIntegrationWithPhone[];
  primaryPhone: string;
};

type State = {
  integrationId: string;
  characterCount: number;
  message: string;
};

class SmsForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      characterCount: 160,
      message: "",
      integrationId: "",
    };
  }

  calcCharacterCount(maxChar: number, character?: string) {
    if (!character) {
      return maxChar;
    }
    return maxChar - character.length;
  }

  fromSelectOptions = () => {
    const { integrations } = this.props;
    const options: any[] = [];

    integrations.map((i) =>
      options.push({
        value: i._id,
        label: `${i.name} (${i.phoneNumber})`,
        disabled: !i.isActive,
      })
    );

    return options;
  };

  fromOptionRenderer = (option) => (
    <div>
      <strong>{option.name}</strong> <i>{option.label}</i>
    </div>
  );

  renderSubmitButton() {
    const { primaryPhone, sendSms } = this.props;
    const { integrationId, message } = this.state;
    const hasContent = integrationId && message;

    const onClick = () => sendSms(integrationId, message, primaryPhone);

    return (
      <ButtonWrapper>
        <Button
          onClick={onClick}
          btnStyle="primary"
          size="small"
          icon="message"
          disabled={hasContent === "" || !primaryPhone}
        >
          {__("Send")}
        </Button>
      </ButtonWrapper>
    );
  }

  render() {
    const { characterCount } = this.state;

    const onChangeContent = (e) =>
      this.setState({ message: (e.target as HTMLInputElement).value });

    const onChangeFrom = (value: ISelectedOption) => {
      const userId = value ? value.value : "";

      this.setState({ integrationId: userId });
    };

    const onChangeSmsContent = (e) => {
      const content = (e.target as HTMLInputElement).value;

      this.setState({
        message: content,
        characterCount: this.calcCharacterCount(160, content),
      });
    };

    const Option = (props) => {
      return (
        <components.Option {...props}>
          {this.fromOptionRenderer(props.data)}
        </components.Option>
      );
    };

    return (
      <>
        <FormGroup>
          <ControlLabel>From:</ControlLabel>
          <Select
            placeholder={__("Choose phone number")}
            value={this.fromSelectOptions().find(
              (o) => o.value === this.state.integrationId
            )}
            onChange={onChangeFrom}
            options={this.fromSelectOptions()}
            isClearable={true}
            components={{ Option }}
          />
        </FormGroup>
        <FormGroup>
          <SMSInfo>
            <ControlLabel>{__("SMS content")}:</ControlLabel>
            <Char count={characterCount}>{characterCount}</Char>
          </SMSInfo>
          <FormControl
            componentclass="textarea"
            defaultValue={this.state.message}
            onBlur={onChangeContent}
            onChange={onChangeSmsContent}
            // sms part max size
            maxLength={160}
          />
        </FormGroup>
        {this.renderSubmitButton()}
      </>
    );
  }
}

export default SmsForm;
