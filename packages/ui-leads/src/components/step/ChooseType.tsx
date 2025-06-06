import { COLORS } from "@erxes/ui/src/constants/colors";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Icon from "@erxes/ui/src/components/Icon";
import { LeftItem } from "@erxes/ui/src/components/step/styles";
import { __ } from "coreui/utils";
import { ColorPick, ColorPicker } from "@erxes/ui/src/styles/main";
import React from "react";
import Popover from "@erxes/ui/src/components/Popover";
import TwitterPicker from "react-color/lib/Twitter";
import {
  Box,
  BoxRow,
  FlexItem,
  LabelWrapper,
} from "@erxes/ui/src/components/step/style";

type Props = {
  type: string;
  onChange: (name: "type" | "color" | "theme", value: string) => void;
  calloutTitle?: string;
  calloutBtnText?: string;
  color: string;
  theme: string;
};

class ChooseType extends React.Component<Props, {}> {
  renderBox(name: string, icon: string, value: string) {
    const onClick = () => this.onChange(value);

    return (
      <Box $selected={this.props.type === value} onClick={onClick}>
        <Icon icon={icon} />
        <span>{__(name)}</span>
      </Box>
    );
  }

  onChange(value: string) {
    return this.props.onChange("type", value);
  }

  onColorChange = (e) => {
    this.setState({ color: e.hex, theme: "#000" }, () => {
      this.props.onChange("color", e.hex);
      this.props.onChange("theme", e.hex);
    });
  };

  render() {
    const { color, theme } = this.props;

    return (
      <FlexItem>
        <LeftItem>
          <FormGroup>
            <LabelWrapper>
              <ControlLabel>Theme color</ControlLabel>
            </LabelWrapper>
            <div>
              <Popover
                trigger={
                  <ColorPick>
                    <ColorPicker style={{ backgroundColor: theme }} />
                  </ColorPick>
                }
                placement="bottom-start"
              >
                <TwitterPicker
                  width="240px"
                  triangle="hide"
                  colors={COLORS}
                  color={color}
                  onChange={this.onColorChange}
                />
              </Popover>
            </div>
          </FormGroup>

          <LabelWrapper>
            <ControlLabel>Choose a flow type</ControlLabel>
          </LabelWrapper>
          <BoxRow>
            {this.renderBox("ShoutBox", "comment-1", "shoutbox")}
            {this.renderBox("Popup", "window", "popup")}
          </BoxRow>

          <BoxRow>
            {this.renderBox("Embedded", "focus", "embedded")}
            {this.renderBox("Dropdown", "arrow-from-top", "dropdown")}
          </BoxRow>

          <BoxRow>
            {this.renderBox("Slide-in Left", "arrow-from-right", "slideInLeft")}
            {this.renderBox(
              "Slide-in Right",
              "left-arrow-from-left",
              "slideInRight"
            )}
          </BoxRow>
        </LeftItem>
      </FlexItem>
    );
  }
}

export default ChooseType;
