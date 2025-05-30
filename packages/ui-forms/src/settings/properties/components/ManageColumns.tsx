import Button from "@erxes/ui/src/components/Button";
import { Footer } from "../styles";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IConfigColumn } from "../types";
import React from "react";
import { ScrollWrapper } from "@erxes/ui/src/styles/main";
import SortableList from "@erxes/ui/src/components/SortableList";
import { __ } from "coreui/utils";
import { colors } from "@erxes/ui/src/styles";
import styled from "styled-components";

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  background: ${colors.bgActive};
  border: 1px solid ${colors.borderPrimary};
  border-radius: 2px;
  margin-bottom: 10px;

  > span {
    text-transform: uppercase;
    padding: 5px 20px 5px 30px;
    font-weight: bold;
  }
`;

const Child = styled.div`
  width: 100%;
  label {
    float: right;
  }
`;

type Props = {
  columns: IConfigColumn[];
  save: (columnsConfig: IConfigColumn[], importType?: string) => void;
  closeModal: () => void;
  contentType: string;
  type: string;
};

type State = {
  columns: IConfigColumn[];
  importType: string;
  searchValue: string;
};

class ManageColumns extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    if (props.columns.findIndex((c) => c._id === "#") === -1) {
      props.columns.unshift({
        _id: "#",
        name: "#",
        label: "Numerical index",
        order: 0,
        checked: false,
      });
    }

    this.state = {
      columns: props.columns,
      importType: "csv",
      searchValue: "",
    };
  }

  onSubmit = (e) => {
    e.preventDefault();
    const columnsConfig: IConfigColumn[] = [];
    const { importType } = this.state;

    this.state.columns.forEach((col, index) => {
      const element = document.getElementById(col._id) as HTMLInputElement;

      columnsConfig.push({
        _id: col._id,
        order: index,
        checked: element.checked,
        name: col.name,
        label: col.label,
        group: col.group,
      });
    });

    this.props.save(columnsConfig, importType);
    this.props.closeModal();
  };

  onChangeColumns = (columns) => {
    this.setState({ columns });
  };

  search = (e) => {
    const searchValue = e.target.value;
    this.setState({ searchValue });
  };

  render() {
    const { type, contentType } = this.props;

    const child = (col) => {
      return (
        <Child>
          <span>{__(col.label)}</span>
          <FormControl
            id={String(col._id)}
            defaultChecked={col.checked}
            componentclass="checkbox"
          />
        </Child>
      );
    };

    const onclickCsv = (e) => {
      this.setState({ importType: "csv" }, () => {
        this.onSubmit(e);
      });
    };

    return (
      <form onSubmit={this.onSubmit}>
        <FormGroup>
          <FormControl
            type="text"
            placeholder={__("Type to search")}
            onChange={this.search}
            value={this.state.searchValue}
          />
        </FormGroup>
        <Header>
          <span>{__("Column name")}</span>
          <span>{__("Visible")}</span>
        </Header>

        <ScrollWrapper calcHeight="320">
          <SortableList
            fields={this.state.columns}
            child={child}
            onChangeFields={this.onChangeColumns}
            isModal={true}
            searchValue={this.state.searchValue}
          />
        </ScrollWrapper>
        <Footer>
          <Button
            type="button"
            btnStyle="simple"
            onClick={this.props.closeModal}
          >
            Cancel
          </Button>

          {type && type === "import" ? (
            <Button type="submit" onClick={onclickCsv}>
              Download csv
            </Button>
          ) : null}

          {type && type === "export" ? (
            <Button type="submit" onClick={this.onSubmit}>
              Export {contentType}
            </Button>
          ) : null}

          {!["export", "import"].includes(type) ? (
            <Button type="submit" onClick={this.onSubmit}>
              Save
            </Button>
          ) : null}
        </Footer>
      </form>
    );
  }
}

export default ManageColumns;
