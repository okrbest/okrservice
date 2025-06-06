import Select, { OnChangeValue, components } from "react-select";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import { FlexItem, FlexPad } from "@erxes/ui/src/components/step/styles";
import colors from "@erxes/ui/src/styles/colors";
import { ISelectedOption } from "@erxes/ui/src/types";
import { __ } from "coreui/utils";
import React from "react";
import styled from "styled-components";
import styledTS from "styled-components-ts";
import { IEngageSms, IIntegrationWithPhone } from "@erxes/ui-engage/src/types";
import SmsPreview from "./SmsPreview";
import { IConfig } from "@erxes/ui-settings/src/general/types";

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

type Props = {
  onChange: (
    name: "shortMessage" | "fromUserId",
    value?: IEngageSms | string
  ) => void;
  messageKind: string;
  shortMessage?: IEngageSms;
  fromUserId: string;
  smsConfig: IConfig;
  integrations: IIntegrationWithPhone[];
};

type State = {
  characterCount: number;
  titleCount: number;
  message: string;
  title: string;
  fromIntegrationId: string;
};

type IOption = {
  value: string;
  label: string;
  phoneNumber: string;
  disabled: boolean;
};

class MessengerForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      characterCount: this.calcCharacterCount(160, this.getContent("content")),
      titleCount: this.calcCharacterCount(15, this.getContent("from")),
      message: this.getContent("content"),
      title: this.getContent("from"),
      fromIntegrationId: this.getContent("fromIntegrationId"),
    };
  }

  onChangeSms = (key: string, value: string) => {
    const shortMessage = { ...this.props.shortMessage } as IEngageSms;

    shortMessage[key] = value;

    this.props.onChange("shortMessage", shortMessage);
  };

  getContent(key: string) {
    const { shortMessage } = this.props;

    if (!shortMessage) {
      return "";
    }

    return shortMessage[key];
  }

  calcCharacterCount(maxChar: number, character?: string) {
    if (!character) {
      return maxChar;
    }

    return maxChar - character.length;
  }

  fromSelectOptions = () => {
    const { integrations } = this.props;
    const options: IOption[] = [];

    integrations.map((i) =>
      options.push({
        value: i._id,
        label: i.name,
        phoneNumber: i.phoneNumber,
        disabled: !i.isActive,
      })
    );

    return options;
  };

  fromOptionRenderer = (option) => (
    <div>
      <strong>{option.label}</strong> (<i>{option.phoneNumber}</i>)
    </div>
  );

  render() {
    const { shortMessage, smsConfig } = this.props;
    const { message, title, titleCount, characterCount, fromIntegrationId } =
      this.state;

    const onChangeTitle = (e) =>
      this.onChangeSms("from", (e.target as HTMLInputElement).value);

    const onChangeContent = (e) =>
      this.onChangeSms("content", (e.target as HTMLInputElement).value);

    const onChangeFrom = (value: OnChangeValue<ISelectedOption, false>) => {
      const integrationId = value ? value.value : "";

      this.setState({ fromIntegrationId: integrationId });
      this.onChangeSms("fromIntegrationId", integrationId);
    };

    const onChangeFromContent = (e) => {
      const from = (e.target as HTMLInputElement).value;

      this.setState({
        title: from,
        titleCount: this.calcCharacterCount(15, from),
      });
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

    if (!smsConfig) {
      return (
        <EmptyState
          text="SMS integration is not configured. Go to Settings > System config > Integrations config and set Telnyx SMS API key."
          image="/images/actions/21.svg"
        />
      );
    }

    return (
      <FlexItem>
        <FlexPad overflow="auto" direction="column" count="3">
          <FormGroup>
            <ControlLabel>From:</ControlLabel>
            <Select
              placeholder={__("Choose phone number")}
              value={this.fromSelectOptions().find(
                (option) => option.value === fromIntegrationId
              )}
              isClearable={true}
              onChange={onChangeFrom}
              options={this.fromSelectOptions()}
              components={{ Option }}
            />
          </FormGroup>
          <FormGroup>
            <SMSInfo>
              <ControlLabel>{__("SMS marketing from the title")}:</ControlLabel>
              <Char count={titleCount}>{titleCount}</Char>
            </SMSInfo>
            <FormControl
              onBlur={onChangeTitle}
              defaultValue={shortMessage && shortMessage.from}
              onChange={onChangeFromContent}
              maxLength={15}
            />
          </FormGroup>
          <FormGroup>
            <SMSInfo>
              <ControlLabel>{__("SMS marketing content")}:</ControlLabel>
              <Char count={characterCount}>{characterCount}</Char>
            </SMSInfo>
            <FormControl
              componentclass="textarea"
              defaultValue={shortMessage && shortMessage.content}
              onBlur={onChangeContent}
              onChange={onChangeSmsContent}
              // sms part max size
              maxLength={160}
            />
          </FormGroup>
        </FlexPad>

        <FlexItem overflow="auto" count="2">
          <SmsPreview title={title} message={message} />
        </FlexItem>
      </FlexItem>
    );
  }
}

export default MessengerForm;
