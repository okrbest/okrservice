import { IButtonMutateProps, IOption } from "@erxes/ui/src/types";
import { LeftContent, Row } from "../styles";

import Button from "@erxes/ui/src/components/Button";
import ChannelForm from "../../channels/containers/ChannelForm";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IChannel } from "../../channels/types";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import React from "react";
import Select from "react-select";
import { __ } from "coreui/utils";

type Props = {
  channels: IChannel[];
  onChange?: (values: string[]) => any;
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  defaultValue?: string[];
  isRequired?: boolean;
  description?: string;
};

class SelectChannels extends React.Component<Props, {}> {
  renderAddBrand = () => {
    const { renderButton } = this.props;

    const trigger = (
      <Button btnStyle="primary" icon="plus-circle">
        {__("Create channel")}
      </Button>
    );

    const content = (props) => (
      <ChannelForm {...props} renderButton={renderButton} />
    );

    return (
      <ModalTrigger
        title="Create channel"
        trigger={trigger}
        content={content}
      />
    );
  };

  generateUserOptions(array: IChannel[] = []): IOption[] {
    return array.map((item) => {
      const channel = item || ({} as IChannel);

      return {
        value: channel._id,
        label: channel.name,
      };
    });
  }

  onChangeChannel = (values) => {
    if (this.props.onChange) {
      this.props.onChange(values.map((item) => item.value) || []);
    }
  };

  render() {
    const {
      channels,
      defaultValue,
      isRequired,
      description = __(
        "In which Channel(s) do you want to add this integration?"
      ),
    } = this.props;

    return (
      <FormGroup>
        <ControlLabel required={isRequired}>Channel</ControlLabel>
        <p>{description}</p>
        <Row>
          <LeftContent>
            <Select
              placeholder={__("Select channel")}
              value={this.generateUserOptions(channels).filter((o) =>
                (defaultValue || []).includes(o.value)
              )}
              onChange={this.onChangeChannel}
              options={this.generateUserOptions(channels)}
              isMulti={true}
            />
          </LeftContent>
          {this.renderAddBrand()}
        </Row>
      </FormGroup>
    );
  }
}

export default SelectChannels;
