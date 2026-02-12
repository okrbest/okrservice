import { IItem, IOptions } from "../../types";

import { ActionContainer } from "../../styles/item";
import { ArchiveBtn } from "./ArchiveBtn";
import ChecklistAdd from "../../../checklists/components/AddButton";
import { ColorButton } from "../../styles/common";
import Icon from "@erxes/ui/src/components/Icon";
import LabelChooser from "../../containers/label/LabelChooser";
import { PRIORITIES } from "../../constants";
import { PopoverButton } from "@erxes/ui-inbox/src/inbox/styles";
import PriorityIndicator from "./PriorityIndicator";
import QualityImpactIndicator from "./QualityImpactIndicator";
import React from "react";
import SelectItem from "../../components/SelectItem";
import { TAG_TYPES } from "@erxes/ui-tags/src/constants";
import TaggerPopover from "@erxes/ui-tags/src/components/TaggerPopover";
import Tags from "@erxes/ui/src/components/Tags";
import Watch from "../../containers/editForm/Watch";
import Comment from "../../../comment/containers/Comment";
import { __ } from "coreui/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils";
import { isEnabled } from "@erxes/ui/src/utils/core";
import Button from "@erxes/ui/src/components/Button";

type Props = {
  item: IItem;
  options: IOptions;
  copyItem: () => void;
  removeItem: (itemId: string) => void;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  onUpdate: (item: IItem, prevStageId?: string) => void;
  sendToBoard?: (item: any) => void;
  onChangeStage?: (stageId: string) => void;
  onChangeRefresh: () => void;
  onSendEmail?: () => void;
};

class Actions extends React.Component<Props> {
  onPriorityChange = (value: string) => {
    const { onUpdate, saveItem } = this.props;

    if (saveItem) {
      saveItem({ priority: value }, (updatedItem) => {
        onUpdate(updatedItem);
      });
    }
  };

  onQualityImpactChange = (value: string) => {
    const { onUpdate, saveItem } = this.props;

    if (saveItem) {
      saveItem({ qualityImpact: value }, (updatedItem) => {
        if (onUpdate) {
          onUpdate(updatedItem);
        }
      });
    }
  };

  render() {
    const {
      item,
      saveItem,
      options,
      copyItem,
      removeItem,
      sendToBoard,
      onChangeStage,
      onChangeRefresh,
      onSendEmail,
    } = this.props;

    const onLabelChange = (labels) => saveItem({ labels });

    const tags = item.tags || [];
    const pipelineTagId = item.pipeline.tagId || "";

    const priorityTrigger = (
      <ColorButton>
        {item.priority ? (
          <PriorityIndicator value={item.priority} />
        ) : (
          <Icon icon="sort-amount-up" />
        )}
        {__("우선순위")}: {item.priority ? __(item.priority) : __("선택")}
      </ColorButton>
    );

    const QUALITY_IMPACTS = ["critical", "major", "minor", "visual"];
    const getQualityImpactLabel = (value: string) => {
      switch (value) {
        case "critical":
          return "치명적";
        case "major":
          return "중대";
        case "minor":
          return "경미";
        case "visual":
          return "시각적";
        default:
          return value;
      }
    };

    const qualityImpactTrigger = (
      <ColorButton>
        {(item as any).qualityImpact ? (
          <QualityImpactIndicator value={(item as any).qualityImpact} />
        ) : (
          <Icon icon="exclamation-triangle" />
        )}
        {__("중요도")}: {(item as any).qualityImpact
          ? getQualityImpactLabel((item as any).qualityImpact)
          : __("선택")}
      </ColorButton>
    );

    const TAG_TYPE = TAG_TYPES.TICKET;

    const tagTrigger = (
      <PopoverButton id="conversationTags">
        {tags.length ? (
          <>
            <Tags tags={tags} limit={1} /> <Icon icon="angle-down" />
          </>
        ) : (
          <ColorButton>
            <Icon icon="tag-alt" /> {__("No tags")}
          </ColorButton>
        )}
      </PopoverButton>
    );

    return (
      <ActionContainer>
        <SelectItem
          items={PRIORITIES}
          selectedItems={item.priority}
          onChange={this.onPriorityChange}
          trigger={priorityTrigger}
        />

        <SelectItem
          items={QUALITY_IMPACTS}
          selectedItems={(item as any).qualityImpact}
          onChange={this.onQualityImpactChange}
          trigger={qualityImpactTrigger}
          indicatorComponent={QualityImpactIndicator}
          labelMapper={getQualityImpactLabel}
        />

        <LabelChooser
          item={item}
          onSelect={onLabelChange}
          onChangeRefresh={onChangeRefresh}
        />

        <ChecklistAdd itemId={item._id} type={options.type} />

        <Watch item={item} options={options} isSmall={true} />
        {(isEnabled("clientportal") && <Comment item={item} />) || ""}
        <ColorButton onClick={copyItem}>
          <Icon icon="copy-1" />
          {__("Copy")}
        </ColorButton>
        <ArchiveBtn
          item={item}
          removeItem={removeItem}
          saveItem={saveItem}
          sendToBoard={sendToBoard}
          onChangeStage={onChangeStage}
        />

        <TaggerPopover
          type={TAG_TYPE}
          trigger={tagTrigger}
          refetchQueries={["dealDetail"]}
          targets={[item]}
          parentTagId={pipelineTagId}
          singleSelect={false}
        />

        {onSendEmail && (() => {
          const isEnabled = !(item as any).widgetAlarm && !(item as any).emailSent;
          return (
            <Button
              btnStyle={isEnabled ? "primary" : "simple"}
              size="small"
              icon="envelope"
              onClick={isEnabled ? onSendEmail : undefined}
              uppercase={false}
              disabled={!isEnabled}
              style={{
                marginBottom: '5px',
                opacity: isEnabled ? 1 : 0.5,
                cursor: isEnabled ? 'pointer' : 'not-allowed'
              }}
            >
              {__("Send Email")}
            </Button>
          );
        })()}

        {loadDynamicComponent(
          "cardDetailAction",
          {
            item,
            contentType: "tickets",
            subType: item.stage?.type,
            path: `stageId=${item.stageId}`,
          },
          true
        )}
        {/* {isEnabled('documents') && <PrintActionButton item={item} />} */}
      </ActionContainer>
    );
  }
}

export default Actions;
