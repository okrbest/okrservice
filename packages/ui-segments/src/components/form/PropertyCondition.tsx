import { IField, ISegmentCondition, ISegmentMap } from "../../types";

import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import Icon from "@erxes/ui/src/components/Icon";
import PropertyForm from "./PropertyForm";
import PropertyList from "../../containers/form/PropertyList";
import React from "react";
import { RenderDynamicComponent } from "@erxes/ui/src/utils/core";
import { SegmentBackIcon } from "../styles";
import Select from "react-select";
import { __ } from "coreui/utils";
import FormSubmissionSegmentForm from "@erxes/ui-forms/src/segmenForm";

type Props = {
  contentType: string;
  associationTypes: any[];
  segment: ISegmentMap;
  addCondition: (condition: ISegmentCondition, segmentKey: string) => void;
  onClickBackToList: () => void;
  hideBackButton: boolean;
  hideDetailForm: boolean;
  changeSubSegmentConjunction: (
    segmentKey: string,
    conjunction: string
  ) => void;
  config?: any;
  onChangeConfig?: (config: any) => void;
};

type State = {
  propertyType: string;
  chosenProperty?: IField;
  searchValue: string;
};

class PropertyCondition extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    const { contentType } = props;

    this.state = {
      propertyType: contentType,
      searchValue: "",
    };
  }

  onClickProperty = (field) => {
    this.setState({ chosenProperty: field });
  };

  onClickBack = () => {
    this.setState({ chosenProperty: undefined, searchValue: "" });
  };

  onSearch = (e) => {
    const value = e.target.value;

    this.setState({ searchValue: value });
  };

  renderExtraContent = () => {
    const { contentType, hideDetailForm, config, onChangeConfig } = this.props;
    const { propertyType } = this.state;

    if (propertyType === "core:form_submission") {
      return (
        <FormSubmissionSegmentForm
          type={contentType}
          config={config}
          onChangeConfig={onChangeConfig}
        />
      );
    }

    const plugins: any[] = (window as any).plugins || [];

    for (const plugin of plugins) {
      if (propertyType.includes(`${plugin.name}:`) && plugin.segmentForm) {
        return (
          <RenderDynamicComponent
            scope={plugin.scope}
            component={plugin.segmentForm}
            injectedProps={{
              config,
              type: contentType,
              propertyType,
              onChangeConfig,
              hideDetailForm,
              component: "filter",
            }}
          />
        );
      }
    }

    return null;
  };

  render() {
    const { associationTypes, onClickBackToList, hideBackButton, config } =
      this.props;

    const { chosenProperty, propertyType, searchValue } = this.state;

    const onChange = (e) => {
      const value = e.value;

      this.setState({ propertyType: value, chosenProperty: undefined });
    };

    const options = associationTypes.map((option) => ({
      value: option.value,
      label: __(option.description),
    }));

    const generateSelect = () => {
      return (
        <Select
          isClearable={false}
          value={options.find((option) => option.value === propertyType)}
          options={options}
          onChange={onChange}
        />
      );
    };

    if (!chosenProperty) {
      return (
        <>
          {hideBackButton ? (
            <></>
          ) : (
            <SegmentBackIcon onClick={onClickBackToList}>
              <Icon icon="angle-left" size={20} /> back
            </SegmentBackIcon>
          )}

          <FormGroup>
            <ControlLabel>Property type</ControlLabel>
            {generateSelect()}
          </FormGroup>
          {this.renderExtraContent()}
          <FormGroup>
            <ControlLabel>Properties</ControlLabel>
            <FormControl
              type="text"
              placeholder={__("Type to search")}
              onChange={this.onSearch}
            />
          </FormGroup>
          <PropertyList
            config={config}
            onClickProperty={this.onClickProperty}
            contentType={propertyType}
            searchValue={searchValue}
          />
        </>
      );
    }

    return (
      <>
        <SegmentBackIcon onClick={this.onClickBack}>
          <Icon icon="angle-left" size={20} /> {__("back")}
        </SegmentBackIcon>
        <PropertyForm
          {...this.props}
          segmentKey={this.props.segment.key}
          propertyType={propertyType}
          field={chosenProperty}
          config={config}
        />
      </>
    );
  }
}

export default PropertyCondition;
