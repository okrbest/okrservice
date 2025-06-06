import BoardSelectContainer from "@erxes/ui-sales/src/boards/containers/BoardSelect";
import Datetime from "@nateradebaugh/react-datetime";
import dayjs from "dayjs";
import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import React, { useState } from "react";
import { Sidebar, Wrapper } from "@erxes/ui/src/layout";
import { __ } from "coreui/utils";
import { router } from "@erxes/ui/src/utils";
import SelectTeamMembers from "@erxes/ui/src/team/containers/SelectTeamMembers";
import FormControl from "@erxes/ui/src/components/form/Control";
import { CustomRangeContainer, FilterContainer } from "../../styles";
import { DateContainer } from "@erxes/ui/src/styles/main";
import { EndDateContainer } from "@erxes/ui-forms/src/forms/styles";
import { useLocation, useNavigate } from "react-router-dom";

const { Section } = Wrapper.Sidebar;

interface IProps {
  queryParams: any;
}

const CheckerSidebar = (props: IProps) => {
  const { queryParams } = props;
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState({
    userId: queryParams.userId,
    boardId: queryParams.boardId,
    pipelineId: queryParams.pipelineId,
    stageId: queryParams.stageId,
    configStageId: queryParams.configStageId,
    stageChangedStartDate: queryParams.stageChangedStartDate,
    stageChangedEndDate: queryParams.stageChangedEndDate,
    dateType: queryParams.dateType,
    search: queryParams.search,
    number: queryParams.number,
  });

  const onFilter = () => {
    const {
      boardId,
      pipelineId,
      stageId,
      configStageId,
      userId,
      stageChangedStartDate,
      stageChangedEndDate,
      dateType,
      search,
      number,
    } = state;

    router.setParams(navigate, location, {
      page: 1,
      boardId,
      pipelineId,
      stageId,
      configStageId,
      userId,
      stageChangedStartDate,
      stageChangedEndDate,
      dateType,
      search,
      number,
    });
  };

  const onChangeRangeFilter = (kind, date) => {
    const cDate = dayjs(date).format("YYYY-MM-DD HH:mm");
    setState((prevState) => ({
      ...prevState,
      [kind]: cDate,
    }));
  };

  const renderRange = (dateType: string) => {
    const lblStart = `${dateType}StartDate`;
    const lblEnd = `${dateType}EndDate`;

    return (
      <>
        <FormGroup>
          <ControlLabel>{`${dateType} Date range:`}</ControlLabel>
          <CustomRangeContainer>
            <DateContainer>
              <Datetime
                inputProps={{ placeholder: __("Choose Date") }}
                dateFormat="YYYY-MM-DD"
                timeFormat="HH:mm"
                value={state[lblStart] || null}
                closeOnSelect={true}
                utc={true}
                input={true}
                onChange={onChangeRangeFilter.bind(this, lblStart)}
                viewMode={"days"}
                className={"filterDate"}
              />
            </DateContainer>
            <EndDateContainer>
              <DateContainer>
                <Datetime
                  inputProps={{ placeholder: __("Choose Date") }}
                  dateFormat="YYYY-MM-DD"
                  timeFormat="HH:mm"
                  value={state[lblEnd]}
                  closeOnSelect={true}
                  utc={true}
                  input={true}
                  onChange={onChangeRangeFilter.bind(this, lblEnd)}
                  viewMode={"days"}
                  className={"filterDate"}
                />
              </DateContainer>
            </EndDateContainer>
          </CustomRangeContainer>
        </FormGroup>
      </>
    );
  };

  const {
    boardId,
    pipelineId,
    stageId,
    userId,
    configStageId,
    dateType,
    search,
    number,
  } = state;

  const onChangeBoard = (boardId: string) => {
    setState((prevState) => ({ ...prevState, boardId }));
  };

  const onChangePipeline = (pipelineId: string) => {
    setState((prevState) => ({ ...prevState, pipelineId }));
  };

  const onChangeStage = (stageId: string) => {
    setState((prevState) => ({ ...prevState, stageId }));
  };

  const onChangeConfigStage = (stageId: string) => {
    setState((prevState) => ({ ...prevState, configStageId: stageId }));
  };

  const onUserChange = (userId) => {
    setState((prevState) => ({ ...prevState, userId }));
  };

  const onChangeType = (e: React.FormEvent<HTMLElement>) => {
    setState((prevState) => ({
      ...prevState,
      dateType: (e.currentTarget as HTMLInputElement).value,
    }));
  };

  const onChangeInput = (e: React.FormEvent<HTMLElement>) => {
    const value = (e.currentTarget as HTMLInputElement).value;
    const name = (e.currentTarget as HTMLInputElement).name;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  return (
    <Wrapper.Sidebar hasBorder={true}>
      <Section.Title>{__("Filters")}</Section.Title>
      <FilterContainer>
        <FormGroup>
          <ControlLabel>Choose Filter Stage</ControlLabel>
          <BoardSelectContainer
            type="deal"
            autoSelectStage={false}
            boardId={boardId || ""}
            pipelineId={pipelineId || ""}
            stageId={stageId || ""}
            onChangeBoard={onChangeBoard}
            onChangePipeline={onChangePipeline}
            onChangeStage={onChangeStage}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Assigned</ControlLabel>
          <SelectTeamMembers
            label="Choose users"
            name="userId"
            customOption={{ label: "Choose user", value: "" }}
            initialValue={userId || ""}
            onSelect={onUserChange}
            multi={false}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Deal search</ControlLabel>
          <FormControl
            type="text"
            name="search"
            onChange={onChangeInput}
            defaultValue={search}
            autoFocus={true}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Number</ControlLabel>
          <FormControl
            type="text"
            name="number"
            onChange={onChangeInput}
            defaultValue={number}
            autoFocus={true}
          />
        </FormGroup>

        {renderRange("stageChanged")}
        <FormGroup>
          <ControlLabel>Choose Get Config Stage</ControlLabel>
          <BoardSelectContainer
            type="deal"
            autoSelectStage={false}
            boardId={boardId || ""}
            pipelineId={pipelineId || ""}
            stageId={configStageId || stageId || ""}
            onChangeBoard={onChangeBoard}
            onChangePipeline={onChangePipeline}
            onChangeStage={onChangeConfigStage}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Date type</ControlLabel>
          <FormControl
            componentclass="select"
            value={dateType}
            name="dateType"
            onChange={onChangeType}
          >
            <option value={""}>Now</option>
            <option value={"lastMove"}>Last move at</option>
            <option value={"created"}>Created At</option>
            <option value={"closeOrCreated"}>Close date or created at</option>
            <option value={"closeOrMove"}>Close date or last move at</option>
            <option value={"firstOrMove"}>First synced or last move at</option>
            <option value={"firstOrCreated"}>First synced or created at</option>
          </FormControl>
        </FormGroup>
        <Button
          block={true}
          btnStyle="success"
          uppercase={false}
          onClick={onFilter}
          icon="filter"
        >
          {__("Filter")}
        </Button>
      </FilterContainer>
    </Wrapper.Sidebar>
  );
};

export default CheckerSidebar;
