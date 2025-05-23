import {
  Button,
  CollapseContent,
  ControlLabel,
  FormControl,
  FormGroup,
  Icon
} from "@erxes/ui/src/components";
import Select from "react-select";
import BoardSelectContainer from "@erxes/ui-sales/src/boards/containers/BoardSelect";
import { IConfigsMap } from "../types";
import { MainStyleModalFooter as ModalFooter } from "@erxes/ui/src/styles/eindex";
import React from "react";
import { __ } from "coreui/utils";
import { payOptions } from "../constants";

type Props = {
  configsMap: IConfigsMap;
  config: any;
  currentConfigKey: string;
  save: (configsMap: IConfigsMap) => void;
  delete: (currentConfigKey: string) => void;
};

type State = {
  config: any;
  hasOpen: boolean;
};

class PerSettings extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      config: props.config,
      hasOpen: false
    };
  }

  onChangeBoard = (boardId: string) => {
    this.setState({ config: { ...this.state.config, boardId } });
  };

  onChangePipeline = (pipelineId: string) => {
    this.setState({ config: { ...this.state.config, pipelineId } });
  };

  onChangeStage = (stageId: string) => {
    this.setState({ config: { ...this.state.config, stageId } });
  };

  onSave = e => {
    e.preventDefault();

    const { configsMap, currentConfigKey } = this.props;
    const { config } = this.state;
    const key = config.stageId;

    const returnEbarimtConfig = { ...configsMap.returnEbarimtConfig };

    delete returnEbarimtConfig[currentConfigKey];

    returnEbarimtConfig[key] = config;
    this.props.save({ ...configsMap, returnEbarimtConfig });
  };

  onDelete = e => {
    e.preventDefault();

    this.props.delete(this.props.currentConfigKey);
  };

  onChangeCombo = option => {
    this.onChangeConfig("defaultPay", option.value);
  };

  onChangeCheckbox = (code: string, e) => {
    this.onChangeConfig(code, e.target.checked);
  };

  onChangeConfig = (code: string, value) => {
    this.setState(prevState => ({
      config: {
        ...prevState.config,
        [code]: value
      }
    }));
  };

  onChangeInput = (code: string, e) => {
    this.onChangeConfig(code, e.target.value);
  };

  renderInput = (key: string, title?: string, description?: string) => {
    const { config } = this.state;

    return (
      <FormGroup>
        <ControlLabel>{title || key}</ControlLabel>
        {description && <p>{__(description)}</p>}
        <FormControl
          defaultValue={config[key]}
          onChange={this.onChangeInput.bind(this, key)}
          required={true}
        />
      </FormGroup>
    );
  };

  renderCheckbox = (key: string, title?: string, description?: string) => {
    const { config } = this.state;

    return (
      <FormGroup>
        <ControlLabel>{title || key}</ControlLabel>
        {description && <p>{__(description)}</p>}
        <FormControl
          checked={config[key]}
          onChange={this.onChangeCheckbox.bind(this, key)}
          componentclass="checkbox"
        />
      </FormGroup>
    );
  };

  render() {
    const { config } = this.state;
    return (
      <CollapseContent
        title={__(config.title)}
        beforeTitle={<Icon icon="settings" />}
        transparent={true}
        open={this.props.currentConfigKey === "newEbarimtConfig" ? true : false}
      >
        <FormGroup>
          <ControlLabel>{"Title"}</ControlLabel>
          <FormControl
            defaultValue={config.title}
            onChange={this.onChangeInput.bind(this, "title")}
            required={true}
            autoFocus={true}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Destination Stage</ControlLabel>
          <BoardSelectContainer
            type="deal"
            autoSelectStage={false}
            boardId={config.boardId}
            pipelineId={config.pipelineId}
            stageId={config.stageId}
            onChangeBoard={this.onChangeBoard}
            onChangePipeline={this.onChangePipeline}
            onChangeStage={this.onChangeStage}
          />
        </FormGroup>

        {this.renderInput("userEmail", "userEmail", "")}
        <FormGroup>
          <ControlLabel>{"Return type"}</ControlLabel>
          <FormControl
            componentclass="select"
            options={[
              { label: 'Тэмдэглэх', value: 'note' },
              { label: 'Устгах', value: 'hard' },
              { label: 'Буцаалтын бичилтээр', value: 'sale' },
              { label: 'Буцаалтын /Өртгийн хамт/ бичилтээр', value: 'full' }
            ]}
            defaultValue={config.returnType}
            onChange={this.onChangeInput.bind(this, "returnType")}
            autoFocus={true}
          />
        </FormGroup>

        {['sale', 'full'].includes(config.returnType) && (
          <FormGroup>
            <ControlLabel>{"defaultPay"}</ControlLabel>
            <Select
              value={payOptions.find(o => o.value === config.defaultPay) || ""}
              onChange={option => this.onChangeCombo(option)}
              isClearable={true}
              options={payOptions}
            />
          </FormGroup>
          // this.renderInput("defaultAccount", "default Account")
        )}

        <ModalFooter>
          <Button
            btnStyle="danger"
            icon="cancel-1"
            onClick={this.onDelete}
            uppercase={false}
          >
            Delete
          </Button>

          <Button
            btnStyle="success"
            icon="check-circle"
            onClick={this.onSave}
            uppercase={false}
            disabled={config.stageId ? false : true}
          >
            Save
          </Button>
        </ModalFooter>
      </CollapseContent>
    );
  }
}
export default PerSettings;
