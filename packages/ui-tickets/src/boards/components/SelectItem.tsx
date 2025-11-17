import PriorityIndicator from "./editForm/PriorityIndicator";
import DropdownToggle from "@erxes/ui/src/components/DropdownToggle";
import Icon from "@erxes/ui/src/components/Icon";
import colors from "@erxes/ui/src/styles/colors";
import * as React from "react";
import Dropdown from "@erxes/ui/src/components/Dropdown";
import styled from "styled-components";
import { __ } from "coreui/utils";
import { Menu } from "@headlessui/react";

export const ActionItem = styled.button`
  width: 100%;
  text-align: left;
  min-width: 150px;
  background: none;
  outline: 0;
  border: 0;
  overflow: hidden;

  > i {
    color: ${colors.colorCoreGreen};
    float: right;
  }
`;

type IProps = {
  onChange: (value: string) => void;
  selectedItems?: string | string[];
  items: string[];
  trigger: React.ReactNode;
  multiple?: boolean;
  indicatorComponent?: React.ComponentType<{ value: string }>;
  labelMapper?: (value: string) => string;
};

class SelectItem extends React.Component<IProps> {
  isChecked = (item: string) => {
    const { selectedItems, multiple } = this.props;

    if (multiple) {
      return (selectedItems || []).includes(item);
    }

    return selectedItems === item;
  };

  render() {
    const { onChange, items, trigger, indicatorComponent, labelMapper } = this.props;
    const Indicator = indicatorComponent || PriorityIndicator;

    const onChangeItem = (value: string) => onChange(value);
    const getLabel = (value: string) => {
      if (labelMapper) {
        return labelMapper(value);
      }
      return __(value);
    };

    return (
      <Dropdown
        as={DropdownToggle}
        toggleComponent={trigger}
        isMenuWidthFit={true}
      >
        {items.map((item) => (
          <Menu.Item key={item}>
            {({ active }) => (
              <ActionItem 
                onClick={() => onChangeItem(item)}
                style={{
                  backgroundColor: active ? colors.bgActive : 'transparent'
                }}
              >
                <Indicator value={item} /> {getLabel(item)}
                {this.isChecked(item) && <Icon icon="check-1" />}
              </ActionItem>
            )}
          </Menu.Item>
        ))}
      </Dropdown>
    );
  }
}

export default SelectItem;
