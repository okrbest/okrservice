import { Button, DataWithLoader } from "@erxes/ui/src/components";
import { __ } from 'coreui/utils';
import { confirm } from '@erxes/ui/src/utils';

import { ContentBox } from "../styles";
import Header from "./Header";
import { IConfigsMap } from "../types";
import PerSettings from "./ReturnPerSettings";
import React from "react";
import Sidebar from "./Sidebar";
import { Title } from "@erxes/ui-settings/src/styles";
import { Wrapper } from "@erxes/ui/src/layout";

type Props = {
  save: (configsMap: IConfigsMap) => void;
  configsMap: IConfigsMap;
  loading: boolean;
};

type State = {
  configsMap: IConfigsMap;
};

class GeneralSettings extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      configsMap: props.configsMap,
    };
  }

  componentDidUpdate(prevProps: Readonly<Props>): void {
    if (prevProps.configsMap !== this.props.configsMap) {
      this.setState({ configsMap: this.props.configsMap || {} });
    }
  }

  add = (e) => {
    e.preventDefault();
    const { configsMap } = this.state;

    const newEbarimtConfig = { ...configsMap.returnEbarimtConfig };

    if (!configsMap.returnEbarimtConfig) {
      configsMap.returnEbarimtConfig = {};
    }

    // must save prev item saved then new item
    newEbarimtConfig.newEbarimtConfig = {
      title: "New Erkhet Config",
      boardId: "",
      pipelineId: "",
      stageId: "",
      userEmail: "",
      hasVat: false,
      hasCitytax: false,
      defaultPay: "debtAmount",
    };

    this.setState({
      configsMap: { ...configsMap, returnEbarimtConfig: newEbarimtConfig },
    });
  };

  delete = (currentConfigKey: string) => {
    confirm("This Action will delete this config are you sure?").then(() => {
      const { configsMap } = this.state;
      const returnEbarimtConfig = { ...configsMap.returnebarimtConfig };
      delete returnEbarimtConfig[currentConfigKey];
      delete returnEbarimtConfig.newEbarimtConfig;

      this.setState({
        configsMap: { ...configsMap, returnEbarimtConfig },
      });

      this.props.save({ ...configsMap, returnEbarimtConfig });
    });
  };

  renderConfigs(configs) {
    return Object.keys(configs).map((key) => {
      return (
        <PerSettings
          key={key}
          configsMap={this.state.configsMap}
          config={configs[key]}
          currentConfigKey={key}
          save={this.props.save}
          delete={this.delete}
        />
      );
    });
  }

  renderContent() {
    const { configsMap } = this.state;
    const configs = configsMap.returnEbarimtConfig || {};

    return (
      <ContentBox id={"GeneralSettingsMenu"}>
        {this.renderConfigs(configs)}
      </ContentBox>
    );
  }

  render() {
    const configCount = Object.keys(
      this.state.configsMap.returnEbarimtConfig || {}
    ).length;

    const breadcrumb = [
      { title: __("Settings"), link: "/settings" },
      { title: __("Return Erkhet config") },
    ];

    const actionButtons = (
      <Button
        btnStyle="success"
        onClick={this.add}
        icon="plus-circle"
        uppercase={false}
      >
        New config
      </Button>
    );

    return (
      <Wrapper
        header={
          <Wrapper.Header
            title={__("Return Erkhet config")}
            breadcrumb={breadcrumb}
          />
        }
        mainHead={<Header />}
        actionBar={
          <Wrapper.ActionBar
            left={<Title>{__("Return Erkhet configs")}</Title>}
            right={actionButtons}
          />
        }
        leftSidebar={<Sidebar />}
        content={
          <DataWithLoader
            data={this.renderContent()}
            loading={this.props.loading}
            count={configCount}
            emptyText={__("There is no config") + "."}
            emptyImage="/images/actions/8.svg"
          />
        }
        hasBorder={true}
        transparent={true}
      />
    );
  }
}

export default GeneralSettings;
