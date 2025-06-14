import {
  ControlLabel,
  FormControl,
  FormGroup,
} from "@erxes/ui/src/components/form";
import { FlexItem, LeftItem } from "@erxes/ui/src/components/step/styles";
import {
  IIntegration,
  ILeadMessengerApp,
  IMessengerApps,
  ITopicMessengerApp,
  IWebsite,
  IWebsiteMessengerApp,
} from "@erxes/ui-inbox/src/settings/integrations/types";

import Button from "@erxes/ui/src/components/Button";
import { ITopic } from "@erxes/ui-knowledgebase/src/types";
import Icon from "@erxes/ui/src/components/Icon";
import { Options } from "@erxes/ui-inbox/src/settings/integrations/styles";
import React from "react";
import Select, { components } from "react-select";
import Tip from "@erxes/ui/src/components/Tip";
import { __ } from "coreui/utils";
import styled from "styled-components";

const WebsiteItem = styled.div`
  padding: 12px 16px 0 16px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #eee;
  position: relative;
`;

const RemoveButton = styled.div`
  position: absolute;
  right: 16px;
  top: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity ease 0.3s;

  &:hover {
    opacity: 0.8;
    cursor: pointer;
  }
`;

type Props = {
  type?: string;
  topics: ITopic[];
  leads: IIntegration[];
  selectedBrand?: string;
  leadMessengerApps?: ILeadMessengerApp[];
  knowledgeBaseMessengerApps?: ITopicMessengerApp[];
  websiteMessengerApps?: IWebsiteMessengerApp[];
  handleMessengerApps: (messengerApps: IMessengerApps) => void;
};

type State = {
  knowledgeBase: string;
  popups: string[];
  websites: IWebsite[];
};

class AddOns extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const {
      websiteMessengerApps = [],
      leadMessengerApps = [],
      knowledgeBaseMessengerApps = [],
    } = props;

    const initialWebsites = websiteMessengerApps.map((item) => ({
      url: item.credentials.url,
      buttonText: item.credentials.buttonText,
      description: item.credentials.description,
      openInNewWindow: item.credentials.openInNewWindow,
    }));
    const initialLeads = leadMessengerApps.map(
      (item) => item.credentials.formCode
    );
    const initialKb =
      knowledgeBaseMessengerApps.length > 0 &&
      knowledgeBaseMessengerApps[0].credentials.topicId;

    this.state = {
      knowledgeBase: initialKb || "",
      popups: initialLeads || [],
      websites: initialWebsites || [
        { url: "", buttonText: "", description: "", openInNewWindow: true },
      ],
    };
  }

  generateMessengerApps = () => {
    const { knowledgeBase, popups, websites } = this.state;
    return {
      knowledgebases: [{ topicId: knowledgeBase }],
      leads: popups.map((el) => ({ formCode: el })),
      websites,
    };
  };

  updateMessengerValues = () => {
    this.props.handleMessengerApps(this.generateMessengerApps());
  };

  renderOption = (option) => {
    return (
      <Options>
        {option.label}
        <i>{option.brand && option.brand.name}</i>
      </Options>
    );
  };

  generateObjectsParams = (objects) => {
    return objects.map((object) => ({
      value: object.form ? object.form.code : object._id,
      label: object.name || object.title,
      brand: object.brand,
      disabled:
        object.brand && this.props.selectedBrand
          ? this.props.selectedBrand !== object.brand._id
          : false,
    }));
  };

  onChangeKb = (obj) => {
    this.setState({ knowledgeBase: obj ? obj.value : "" }, () =>
      this.updateMessengerValues()
    );
  };

  onChangePopups = (objects) => {
    this.setState({ popups: objects.map((el) => el.value) }, () =>
      this.updateMessengerValues()
    );
  };

  onChangeInput = (
    i: number,
    type: "url" | "description" | "buttonText" | "openInNewWindow",
    e: React.FormEvent
  ) => {
    const target = e.target as HTMLInputElement;
    const value = type === "openInNewWindow" ? target.checked : target.value;

    const entries = [...this.state.websites];

    entries[i] = { ...entries[i], [type]: value };

    this.setState({ websites: entries }, () => this.updateMessengerValues());
  };

  handleRemoveWebsite = (i: number) => {
    this.setState(
      { websites: this.state.websites.filter((item, index) => index !== i) },
      () => this.updateMessengerValues()
    );
  };

  renderRemoveInput = (i: number) => {
    return (
      <Tip text={__("Remove")} placement="top">
        <RemoveButton onClick={this.handleRemoveWebsite.bind(null, i)}>
          <Icon icon="times" />
        </RemoveButton>
      </Tip>
    );
  };

  onAddMoreInput = () => {
    this.setState({
      websites: [
        ...this.state.websites,
        { url: "", buttonText: "", description: "", openInNewWindow: true },
      ],
    });
  };

  render() {
    const { knowledgeBase, popups, websites } = this.state;
    const { leads, topics } = this.props;

    const Option = (props) => {
      return (
        <components.Option {...props}>
          {this.renderOption(props.data)}
        </components.Option>
      );
    };

    return (
      <FlexItem>
        <LeftItem>
          <FormGroup>
            <ControlLabel>Knowledge Base</ControlLabel>
            <p>
              {__(
                "Which specific knowledgebase do you want to display in a separate tab in this messenger"
              )}
              ?
            </p>
            <Select
              value={this.generateObjectsParams(topics).find(
                (o) => o.value === knowledgeBase
              )}
              options={this.generateObjectsParams(topics)}
              onChange={this.onChangeKb}
              isClearable={true}
              components={{ Option }}
            />
          </FormGroup>
          <FormGroup>
            <ControlLabel>Forms</ControlLabel>
            <p>
              {__("Which form(s) do you want to display in this messenger")}?
            </p>
            <Select
              value={this.generateObjectsParams(leads).filter((o) =>
                popups.includes(o.value)
              )}
              options={this.generateObjectsParams(leads)}
              onChange={this.onChangePopups}
              components={{ Option }}
              isMulti={true}
            />
          </FormGroup>
          <FormGroup>
            <ControlLabel>Websites</ControlLabel>
            <p>
              {__("Which website(s) do you want to display in this messenger?")}
            </p>
          </FormGroup>
          {websites.map((website, index) => (
            <FormGroup key={index}>
              <WebsiteItem>
                <FormGroup>
                  <ControlLabel required={true}>Website Title</ControlLabel>
                  <FormControl
                    name="description"
                    onChange={this.onChangeInput.bind(
                      null,
                      index,
                      "description"
                    )}
                    required={true}
                    value={website.description}
                  />
                </FormGroup>
                <FormGroup>
                  <ControlLabel required={true}>Website Url</ControlLabel>
                  <FormControl
                    value={website.url}
                    onChange={this.onChangeInput.bind(null, index, "url")}
                    name="url"
                    required={true}
                  />
                </FormGroup>
                <FormGroup>
                  <ControlLabel required={true}>Button text</ControlLabel>
                  <FormControl
                    onChange={this.onChangeInput.bind(
                      null,
                      index,
                      "buttonText"
                    )}
                    value={website.buttonText}
                    name="buttonText"
                    required={true}
                  />
                </FormGroup>
                <FormGroup>
                  <ControlLabel>Open in new window</ControlLabel>
                  <input
                    type="checkbox"
                    checked={website.openInNewWindow ?? true}
                    onChange={this.onChangeInput.bind(
                      null,
                      index,
                      "openInNewWindow"
                    )}
                  />
                </FormGroup>
              </WebsiteItem>
              {this.renderRemoveInput(index)}
            </FormGroup>
          ))}
          <Button
            onClick={this.onAddMoreInput}
            icon="plus-circle"
            btnStyle="primary"
          >
            Add a Website
          </Button>
        </LeftItem>
      </FlexItem>
    );
  }
}

export default AddOns;
