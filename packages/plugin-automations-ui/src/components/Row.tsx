import { __ } from "coreui/utils";
import { isEnabled } from "@erxes/ui/src/utils/core";

import ActionButtons from "@erxes/ui/src/components/ActionButtons";
import Button from "@erxes/ui/src/components/Button";
import { DateWrapper } from "@erxes/ui/src/styles/main";
import { FlexCenter } from "@erxes/ui/src/styles/main";
import FormControl from "@erxes/ui/src/components/form/Control";
import { IAutomation } from "../types";
import Icon from "@erxes/ui/src/components/Icon";
import Label from "@erxes/ui/src/components/Label";
import { Link } from "react-router-dom";
import NameCard from "@erxes/ui/src/components/nameCard/NameCard";
import React from "react";
import Tip from "@erxes/ui/src/components/Tip";
import WithPermission from "@erxes/ui/src/components/WithPermission";
import dayjs from "dayjs";
import s from "underscore.string";

type Props = {
  automation: IAutomation;
  navigate: any;
  isChecked: boolean;
  duplicate: (_id: string) => void;
  toggleBulk: (automation: IAutomation, isChecked?: boolean) => void;
  removeAutomations: (automations: IAutomation[]) => void;
};

function ActionRow({
  automation,
  navigate,
  isChecked,
  duplicate,
  toggleBulk,
  removeAutomations
}: Props) {
  const onChange = e => {
    if (toggleBulk) {
      toggleBulk(automation, e.target.checked);
    }
  };

  const onClick = e => {
    e.stopPropagation();
  };

  const onNameClick = () => {
    navigate(`/automations/details/${automation._id}`);
  };

  const editAction = () => {
    return (
      <Link to={`/automations/details/${automation._id}`}>
        <Tip text={__("Edit")} placement="top">
          <Button btnStyle="link">
            <Icon icon="edit-3" />
          </Button>
        </Tip>
      </Link>
    );
  };

  const duplicateAction = () => {
    const onDuplicate = () => duplicate(automation._id);

    return (
      <Tip text={__("Duplicate")} placement="top">
        <Button
          id="automationDuplicate"
          btnStyle="link"
          onClick={onDuplicate}
          icon="copy-1"
        />
      </Tip>
    );
  };

  const removeAction = () => {
    const onRemove = () => removeAutomations([automation]);

    return (
      <WithPermission action="automationsRemove">
        <Tip text={__("Delete")} placement="top">
          <Button
            id="automationDelete"
            btnStyle="link"
            onClick={onRemove}
            icon="times-circle"
          />
        </Tip>
      </WithPermission>
    );
  };

  const {
    name,
    status,
    updatedAt,
    createdAt,
    createdUser,
    updatedUser,
    triggers,
    actions,
    tags
  } = automation;

  const isActive = status !== "draft" ? true : false;
  const labelStyle = isActive ? "success" : "simple";

  return (
    <tr>
      <td id="automationsCheckBox" onClick={onClick}>
        <FormControl
          checked={isChecked}
          componentclass="checkbox"
          onChange={onChange}
        />
      </td>
      <td onClick={onNameClick}> {name} </td>
      <td>
        <Label lblStyle={labelStyle}>{status}</Label>
      </td>
      <td className="text-primary">
        <Icon icon="swatchbook" />
        <b> {s.numberFormat(triggers.length)}</b>
      </td>
      <td className="text-warning">
        <Icon icon="share-alt" />
        <b> {s.numberFormat(actions.length)}</b>
      </td>

      <td>
        {(tags || []).map(tag => (
          <Label lblColor={tag.colorCode}>{tag.name}</Label>
        ))}
      </td>

      <td>
        <FlexCenter>
          <NameCard user={updatedUser} avatarSize={30} />
        </FlexCenter>
      </td>
      <td>
        <FlexCenter>
          <NameCard user={createdUser} avatarSize={30} />
        </FlexCenter>
      </td>
      <td>
        <Icon icon="calender" />{" "}
        <DateWrapper>{dayjs(updatedAt || new Date()).format("ll")}</DateWrapper>
      </td>
      <td>
        <Icon icon="calender" />{" "}
        <DateWrapper>{dayjs(createdAt || new Date()).format("ll")}</DateWrapper>
      </td>
      <td>
        <ActionButtons>
          {editAction()}
          {removeAction()}
          {duplicateAction()}
        </ActionButtons>
      </td>
    </tr>
  );
}

export default ActionRow;
