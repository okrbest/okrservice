import React, { useState } from "react";
import { __ } from "coreui/utils";
import { isEnabled } from "@erxes/ui/src/utils/core";
import SalesBoardSelect from "@erxes/ui-sales/src/boards/containers/BoardSelect";
import { FlexItem, LeftItem } from "@erxes/ui/src/components/step/styles";
import { IMessengerData } from "@erxes/ui-inbox/src/settings/integrations/types";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Toggle from "@erxes/ui/src/components/Toggle";
import { ToggleWrapper } from "../widgetPreview/styles";

type DealField = { _id: string; label: string };

type Props = {
  dealLabel?: string;
  dealStageId: string;
  dealPipelineId: string;
  dealBoardId: string;
  fetchPipelines: (boardId: string) => void;
  handleFormChange: (name: string, value: string | boolean | string[]) => void;
  dealToggle?: boolean;
  dealCustomFieldIds?: string[];
  dealRequiredCustomFieldIds?: string[];
  dealShowPrivacyConsent?: boolean;
  dealFields?: DealField[];
  kind?: "client" | "vendor";
} & IMessengerData;

function General({
  dealStageId,
  dealPipelineId,
  dealBoardId,
  fetchPipelines,
  handleFormChange,
  dealToggle = false,
  dealCustomFieldIds = [],
  dealRequiredCustomFieldIds = [],
  dealShowPrivacyConsent = true,
  dealFields = [],
}: Props) {
  const [show, setShow] = useState<boolean>(false);

  const handleToggleBoardSelect = () => setShow(!show);

  const handleDealToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange("dealToggle", e.target.checked);
  };

  const handlePrivacyConsentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange("dealShowPrivacyConsent", e.target.checked);
  };

  const allIds = dealFields.map((f) => f._id);
  const showAll = dealCustomFieldIds.length === 0;

  const toggleCustomField = (fieldId: string) => {
    let next: string[];
    if (showAll) {
      next = allIds.filter((id) => id !== fieldId);
    } else if (dealCustomFieldIds.includes(fieldId)) {
      next = dealCustomFieldIds.filter((id) => id !== fieldId);
    } else {
      next = [...dealCustomFieldIds, fieldId];
    }
    handleFormChange("dealCustomFieldIds", next);
  };

  const toggleRequiredCustomField = (fieldId: string) => {
    const next = dealRequiredCustomFieldIds.includes(fieldId)
      ? dealRequiredCustomFieldIds.filter((id) => id !== fieldId)
      : [...dealRequiredCustomFieldIds, fieldId];
    handleFormChange("dealRequiredCustomFieldIds", next);
  };

  const BoardSelect: React.FC<any> = ({
    type,
    stageId,
    boardId,
    pipelineId,
    toggle
  }) => {
    const onChangeStage = (stgId) => handleFormChange(`${type}StageId`, stgId);
    const onChangePipeline = (plId) =>
      handleFormChange(`${type}PipelineId`, plId);
    const onChangeBoard = (brId) => handleFormChange(`${type}BoardId`, brId);

    return (
      <SalesBoardSelect
        isRequired={toggle}
        type={type}
        stageId={stageId}
        boardId={boardId || ""}
        pipelineId={pipelineId || ""}
        onChangeStage={onChangeStage}
        onChangePipeline={onChangePipeline}
        onChangeBoard={onChangeBoard}
        autoSelectStage={false}
        callback={handleToggleBoardSelect}
      />
    );
  };

  const renderFeatures = () => {
    if (!isEnabled("sales")) {
      return null;
    }

    return (
      <FlexItem>
        <LeftItem>
          <FormGroup>
            <ControlLabel>{__("Show Deal button in messenger widget")}</ControlLabel>
            <ToggleWrapper>
              <Toggle
                checked={dealToggle}
                onChange={handleDealToggle}
                icons={{
                  checked: <span>{__("Yes")}</span>,
                  unchecked: <span>{__("No")}</span>,
                }}
              />
            </ToggleWrapper>
          </FormGroup>
          <FormGroup>
            {isEnabled("sales") && (
              <BoardSelect
                type='deal'
                stageId={dealStageId}
                boardId={dealBoardId}
                pipelineId={dealPipelineId}
                toggle={dealToggle}
              />
            )}
          </FormGroup>
          {dealToggle && (
            <FormGroup>
              <ControlLabel>
                {__("Show privacy consent checkbox and notice on deal form")}
              </ControlLabel>
              <ToggleWrapper>
                <Toggle
                  checked={dealShowPrivacyConsent}
                  onChange={handlePrivacyConsentToggle}
                  icons={{
                    checked: <span>{__("Yes")}</span>,
                    unchecked: <span>{__("No")}</span>,
                  }}
                />
              </ToggleWrapper>
            </FormGroup>
          )}
          {dealToggle && dealFields.length > 0 && (
            <FormGroup>
              <ControlLabel>{__("Show these custom fields in widget (Create a deal)")}</ControlLabel>
              <p style={{ margin: "4px 0 8px 0", color: "#888", fontSize: "12px" }}>
                {__("Select which custom fields to display. If none selected, all are shown. Check \"Required\" to make the field mandatory.")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {dealFields.map((f) => {
                  const isShown = showAll || dealCustomFieldIds.includes(f._id);
                  const isRequired = dealRequiredCustomFieldIds.includes(f._id);
                  return (
                    <div
                      key={f._id}
                      style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={isShown}
                          onChange={() => toggleCustomField(f._id)}
                        />
                        <span>{f.label || f._id}</span>
                      </label>
                      {isShown && (
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#666" }}>
                          <input
                            type="checkbox"
                            checked={isRequired}
                            onChange={() => toggleRequiredCustomField(f._id)}
                          />
                          <span>{__("Required")}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormGroup>
          )}
        </LeftItem>
      </FlexItem>
    );
  };

  return <>{renderFeatures()}</>;
}

export default General;
