import {
  IButtonMutateProps,
  IField,
  IFieldLogic,
  IFormProps,
  ILocationOption,
  IObjectListConfig,
} from "@erxes/ui/src/types";
import { __ } from "coreui/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils/core";

import Button from "@erxes/ui/src/components/Button";
import CollapseContent from "@erxes/ui/src/components/CollapseContent";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Form from "@erxes/ui/src/components/form/Form";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IFieldGroup } from "../types";
import LocationOptions from "./LocationOptions";
import Map from "@erxes/ui/src/containers/map/Map";
import { ModalFooter } from "@erxes/ui/src/styles/main";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import ModifiableList from "@erxes/ui/src/components/ModifiableList";
import ObjectListConfigs from "./ObjectListConfigs";
import PropertyGroupForm from "../containers/PropertyGroupForm";
import PropertyLogics from "../containers/PropertyLogics";
import React from "react";
import { Row } from "../styles";
import Toggle from "@erxes/ui/src/components/Toggle";
import { stringToRegex } from "../utils";

type Props = {
  queryParams: any;
  field?: IField;
  groups: IFieldGroup[];
  type: string;
  inputTypes: { value: string; label: string }[];
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  closeModal: () => void;
};

type State = {
  options: any[];
  locationOptions: any[];
  objectListConfigs: IObjectListConfig[];
  type: string;
  hasOptions: boolean;
  add: boolean;
  currentLocation: ILocationOption;
  searchable: boolean;
  showInCard: boolean;
  logics?: IFieldLogic[];
  logicAction?: string;
  isSubmitted?: boolean;
  validation?: string;
  regexValidation?: string;
};

class PropertyForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    let doc: any = {
      options: [],
      type: "",
      locationOptions: [],
      objectListConfigs: [],
      hasOptions: false,
      searchable: false,
      showInCard: false,
      validation: "",
      regexValidation: "",
    };

    if (props.field) {
      const {
        type,
        options,
        locationOptions,
        objectListConfigs,
        searchable = false,
        showInCard = false,
        validation,
        regexValidation,
      } = props.field;

      doc = {
        ...doc,
        type,
        searchable,
        showInCard,
        validation,
        regexValidation,
      };

      if (
        type === "select" ||
        type === "multiSelect" ||
        type === "radio" ||
        type === "check"
      ) {
        doc = {
          type,
          hasOptions: true,
          options: Object.assign([], options || []),
          locationOptions: [],
          objectListConfigs: [],
          searchable: searchable || false,
          showInCard,
        };
      }

      if (type === "map") {
        doc = {
          type,
          hasOptions: false,
          options: [],
          locationOptions: Object.assign([], locationOptions || []),
          objectListConfigs: Object.assign([], objectListConfigs || []),
          searchable: searchable || false,
          showInCard: false,
        };
      }

      if (objectListConfigs) {
        doc.objectListConfigs = objectListConfigs.map((e) => {
          return {
            key: e.key,
            label: e.label,
            type: e.type,
          };
        });
      }
    }

    this.state = {
      ...doc,
      currentLocation: { lat: 0, lng: 0 },
      add: false,
      logics: props.field && props.field.logics ? props.field.logics : [],
      logicAction: props.field && props.field.logicAction,
    };
  }

  generateDoc = (values: {
    _id?: string;
    groupId: string;
    text: string;
    description: string;
    logicAction: string;
    logics: IFieldLogic[];
  }) => {
    const { field } = this.props;
    const {
      type,
      options,
      locationOptions,
      objectListConfigs,
      showInCard,
      searchable,
      logicAction,
      logics,
      validation,
      regexValidation,
    } = this.state;

    const finalValues = values;

    if (field) {
      finalValues._id = field._id;
    }

    return {
      ...finalValues,
      contentType: this.props.type,
      type,
      options,
      locationOptions,
      objectListConfigs: objectListConfigs.map((e) => {
        return {
          key: e.key,
          label: e.label,
          type: e.type,
        };
      }),
      searchable,
      showInCard,
      logicAction,
      logics,
      validation,
      regexValidation,
    };
  };

  onChangeOption = (options) => {
    this.setState({ options });
  };

  onChangeLocationOptions = (locationOptions) => {
    this.setState({ locationOptions });
  };

  onChangeObjectListConfig = (objectListConfigs) => {
    this.setState({ objectListConfigs });
  };

  onRemoveOption = (options) => {
    this.setState({ options });
  };

  onTypeChange = (e) => {
    const value = e.target.value;
    let doc: { hasOptions: boolean; options: any[] } = {
      hasOptions: false,
      options: [],
    };

    if (
      value === "select" ||
      value === "multiSelect" ||
      value === "check" ||
      value === "radio"
    ) {
      doc = { hasOptions: true, options: this.state.options };
    }

    this.setState({ type: value, ...doc });
  };

  onChangeSearchable = (e) => {
    const isChecked = (e.currentTarget as HTMLInputElement).checked;
    this.setState({ searchable: isChecked });
  };

  onSwitchChange = (e) => {
    this.setState({ showInCard: e.target.checked });
  };

  onChangeLogicAction = (value) => {
    this.setState({ logicAction: value });
  };

  onChangeLogics = (logics) => {
    this.setState({ logics });
  };

  onRegexChange = (e: any) => {
    if (e.target.value.length === 0) {
      this.setState({ regexValidation: "" });
      return;
    }

    const regexValidation = stringToRegex(e.target.value);

    this.setState({ regexValidation });
  };

  renderOptions = () => {
    if (!this.state.hasOptions) {
      return null;
    }

    return (
      <ModifiableList
        options={this.state.options}
        onChangeOption={this.onChangeOption}
      />
    );
  };

  renderObjectListConfigs = () => {
    if (!["objectList", "labelSelect"].includes(this.state.type)) {
      return null;
    }

    const { objectListConfigs = [] } = this.state;

    return (
      <FormGroup>
        <ControlLabel>Object List Configs:</ControlLabel>

        <ObjectListConfigs
          objectListConfigs={objectListConfigs}
          onChange={this.onChangeObjectListConfig}
        />
      </FormGroup>
    );
  };

  renderLocationOptions = () => {
    if (this.state.type !== "map") {
      return null;
    }

    const { currentLocation, locationOptions = [] } = this.state;

    return (
      <FormGroup>
        <ControlLabel htmlFor="locationOptions">Options:</ControlLabel>
        {locationOptions.length > 0 && (
          <Map
            id={this.props.field?._id || Math.random().toString(10)}
            center={currentLocation}
            locationOptions={locationOptions}
            streetViewControl={false}
            onChangeLocationOptions={this.onChangeLocationOptions}
            mode="config"
          />
        )}

        <LocationOptions
          locationOptions={locationOptions}
          onChange={this.onChangeLocationOptions}
        />
      </FormGroup>
    );
  };

  renderShowInCard = () => {
    const { type } = this.props;
    const { showInCard } = this.state;

    if (
      ![
        "sales:deal",
        "tickets:ticket",
        "tasks:task",
        "purchases:purchase",
      ].includes(type)
    ) {
      return null;
    }

    return (
      <FormGroup>
        <ControlLabel>Show in card</ControlLabel>
        <Toggle
          checked={showInCard}
          onChange={this.onSwitchChange}
          icons={{
            checked: <span>Yes</span>,
            unchecked: <span>No</span>,
          }}
        />
      </FormGroup>
    );
  };

  renderAddGroup = () => {
    const { queryParams } = this.props;

    const trigger = <Button>Create group</Button>;

    const content = (props) => (
      <PropertyGroupForm {...props} queryParams={queryParams} />
    );

    return (
      <ModalTrigger title="Create group" trigger={trigger} content={content} />
    );
  };

  renderContent = (formProps: IFormProps) => {
    const { groups, inputTypes, closeModal, renderButton, field } = this.props;

    const object = field || ({} as IField);

    const { values, isSubmitted } = formProps;
    const { type, searchable, validation, regexValidation } = this.state;

    return (
      <>
        <FormGroup>
          <ControlLabel required={true}>Name:</ControlLabel>
          <FormControl
            {...formProps}
            name="text"
            defaultValue={object.text || ""}
            required={true}
            autoFocus={true}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Description:</ControlLabel>
          <FormControl
            {...formProps}
            name="description"
            componentclass="textarea"
            defaultValue={object.description || ""}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Code:</ControlLabel>
          <FormControl
            {...formProps}
            name="code"
            defaultValue={object.code || ""}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel required={true}>Group:</ControlLabel>
          <Row>
            <FormControl
              {...formProps}
              name="groupId"
              componentclass="select"
              defaultValue={object.groupId || ""}
              required={true}
            >
              {groups
                .filter((e) => !e.isDefinedByErxes)
                .map((group) => {
                  return (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  );
                })}
            </FormControl>
            {this.renderAddGroup()}
          </Row>
        </FormGroup>

        <FormGroup>
          <ControlLabel required={true}>Type:</ControlLabel>

          <FormControl
            {...formProps}
            name="type"
            componentclass="select"
            value={type}
            onChange={this.onTypeChange}
            required={true}
          >
            <option />
            {inputTypes.map((inputType) => {
              return (
                <option value={inputType.value} key={Math.random()}>
                  {inputType.label}
                </option>
              );
            })}
          </FormControl>
        </FormGroup>
        {this.renderOptions()}
        {this.renderObjectListConfigs()}
        {this.renderLocationOptions()}
        {this.renderShowInCard()}

        {type === "input" && (
          <FormGroup>
            <ControlLabel>Validation:</ControlLabel>
            <FormControl
              {...formProps}
              componentclass="select"
              name="validation"
              defaultValue={object.validation || ""}
              onChange={(e: any) => {
                this.setState({ validation: e.target.value });
              }}
            >
              <option />
              <option value="email">Email</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="datetime">Date Time</option>
              <option value="regex">Regular Expression</option>
            </FormControl>
          </FormGroup>
        )}

        {validation === "regex" && (
          <FormGroup>
            <ControlLabel htmlFor="validation">
              Regular Expression:
            </ControlLabel>
            <p>{__("Setup regular expression")}</p>

            <FormControl
              id="regex"
              placeholder="Enter sample text here"
              componentclass="input"
              onChange={this.onRegexChange}
            />
            {regexValidation && <p>RegexPattern: {regexValidation || ""}</p>}
          </FormGroup>
        )}

        <FormGroup>
          <FormControl
            componentclass="checkbox"
            name="searchable"
            checked={searchable}
            onChange={this.onChangeSearchable}
          >
            {__("Searchable")}
          </FormControl>
        </FormGroup>

        {type.length > 0 && (
          <CollapseContent title={__("Logic")} compact={true}>
            <PropertyLogics
              contentType={this.props.queryParams.type}
              logics={this.state.logics || []}
              action={this.state.logicAction || "show"}
              onLogicsChange={this.onChangeLogics}
              onActionChange={this.onChangeLogicAction}
            />
          </CollapseContent>
        )}

        {field && loadDynamicComponent("fieldConfig", { field, isSubmitted })}

        <ModalFooter>
          <Button btnStyle="simple" onClick={closeModal} icon="times-circle">
            Close
          </Button>

          {renderButton({
            name: "property",
            values: this.generateDoc(values),
            isSubmitted,
            callback: closeModal,
            object: field,
          })}
        </ModalFooter>
      </>
    );
  };

  render() {
    return <Form renderContent={this.renderContent} />;
  }
}

export default PropertyForm;
