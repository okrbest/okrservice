import { FlexItem, FlexPad } from "modules/common/components/step/styles";
import { FormColumn, FormWrapper } from "@erxes/ui/src/styles/main";

import { FormControl } from "modules/common/components/form";
import FormGroup from "modules/common/components/form/Group";
import { OperatorList } from "../../styles";
import React from "react";
import { SubHeading } from "@erxes/ui-settings/src/styles";
import _ from "lodash";
import { __ } from "coreui/utils";
import { IExportField } from "../../types";

type Props = {
  columns: IExportField[];
  contentType: string;
  onClickField: (column) => void;
};

type State = {
  columns: IExportField[];
  searchValue: string;
};

class ConfigsForm extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      columns: props.columns || [],
      searchValue: "",
    };
  }

  groupByType = (results) => {
    return results.reduce((acc, field) => {
      const value = field.name;
      let key;

      if (field.group) {
        key = field.group;
      } else {
        key =
          value && value.includes(".")
            ? value.substr(0, value.indexOf("."))
            : "general";

        key = _.startCase(key);
      }

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(field);

      return acc;
    }, {});
  };

  renderFields = (fields) => {
    const onClickField = (field) => {
      const { columns } = this.state;

      for (const column of columns) {
        if (column._id === field._id) {
          column.checked = !column.checked;
        }
      }

      this.setState({ columns });

      this.props.onClickField(columns);
    };

    return fields.map((field) => {
      return (
        <FormControl
          key={Math.random()}
          id={String(fields._id)}
          defaultChecked={fields.checked}
          componentclass="checkbox"
          onChange={() => onClickField(field)}
          checked={field.checked}
        >
          {field.label}
        </FormControl>
      );
    });
  };

  renderOperators = (results) => {
    const objects = this.groupByType(results);

    return Object.keys(objects).map((key) => {
      return (
        <FormColumn key={Math.random()}>
          <OperatorList>
            <FormGroup>
              <b>{key}</b>
              {this.renderFields(objects[key])}
            </FormGroup>
          </OperatorList>
        </FormColumn>
      );
    });
  };

  onSearch = (e) => {
    const value = e.target.value;

    this.setState({ searchValue: value });
  };

  render() {
    const { columns, searchValue } = this.state;

    const condition = new RegExp(searchValue, "i");

    const results = columns.filter((field) => {
      return condition.test(field.label);
    });

    return (
      <FlexItem>
        <FlexPad direction="column" overflow="auto">
          <FormGroup>
            <SubHeading>{__("Properties to export")}</SubHeading>

            <FormControl placeholder={__("Type to search")} onChange={this.onSearch} />
          </FormGroup>

          <FormWrapper>{this.renderOperators(results)}</FormWrapper>
        </FlexPad>
      </FlexItem>
    );
  }
}

export default ConfigsForm;
