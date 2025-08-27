import { IItem, IOptions } from "../../types";

import DueDateChooser from "./DueDateChooser";
import Header from "./Header";
import { HeaderContent } from "../../styles/item";
import Move from "../../containers/editForm/Move";
import React from "react";
import { __ } from "coreui/utils";
import CloseDate from "./CloseDate";

type Props = {
  item: IItem;
  options: IOptions;
  stageId: string;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  onChangeStage?: (stageId: string) => void;
  onUpdate: (item: IItem, prevStageId?: string) => void;
  amount?: () => React.ReactNode;
};

function Top(props: Props) {
  function renderMove() {
    const { stageId, options, onChangeStage, item } = props;

    return (
      <Move
        options={options}
        item={item}
        stageId={stageId}
        onChangeStage={onChangeStage}
      />
    );
  }

  const { saveItem, amount, onUpdate, item } = props;

  const onCloseDateFieldsChange = (key: string, value: any) => {
    saveItem({ [key]: value });
  };

  return (
    <React.Fragment>
      <Header item={item} saveItem={saveItem} amount={amount} />
      <HeaderContent>{renderMove()}</HeaderContent>
      <CloseDate
        onChangeField={onCloseDateFieldsChange}
        closeDate={item.closeDate}
        startDate={item.startDate}
        isCheckDate={item.pipeline.isCheckDate}
        createdDate={item.createdAt}
        reminderMinute={item.reminderMinute}
        isComplete={item.isComplete}
      />
      <DueDateChooser item={item} saveItem={saveItem} onUpdate={onUpdate} />
    </React.Fragment>
  );
}

export default Top;
