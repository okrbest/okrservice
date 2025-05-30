import { IButtonMutateProps, IFormProps } from "@erxes/ui/src/types";
import { IUser, IUserDetails, IUserLinks } from "@erxes/ui/src/auth/types";
import { __ } from "coreui/utils";
import { getConstantFromStore } from "@erxes/ui/src/utils";

import CollapseContent from "@erxes/ui/src/components/CollapseContent";
import CommonForm from "@erxes/ui-settings/src/common/components/Form";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { ICommonFormProps } from "@erxes/ui-settings/src/common/types";
import React from "react";
import Select from "react-select";
import SelectBrands from "@erxes/ui/src/brands/containers/SelectBrands";
import UserCommonInfos from "@erxes/ui-settings/src/common/components/UserCommonInfos";

type Props = {
  channels: any[]; // check - IChannel
  groups: any[]; // check - IUserGroup
  selectedChannels: any[]; // check - IChannel
  selectedGroups: any[]; // check - IUserGroup
  selectedBrandIds: string[];
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  showBrands: boolean;
  queryParams?: any;
} & ICommonFormProps;

type State = {
  avatar: string;
  selectedChannels: any[]; // check - IChannel
  selectedGroups: any[]; // check - IUserGroup
  selectedBrandIds: string[];
};

class UserForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const user = props.object || { details: {} };
    const defaultAvatar = "/images/avatar-colored.svg";

    this.state = {
      avatar:
        user.details && user.details.avatar
          ? user.details.avatar
          : defaultAvatar,
      selectedChannels: this.generateParams(props.selectedChannels),
      selectedGroups: this.generateParams(props.selectedGroups),
      selectedBrandIds: props.selectedBrandIds,
    };
  }

  onAvatarUpload = (url) => {
    this.setState({ avatar: url });
  };

  generateParams = (options) => {
    return options.map((option) => ({
      value: option._id,
      label: option.name,
    }));
  };

  collectValues = (items) => {
    return items.map((item) => (typeof item === "string" ? item : item.value));
  };

  renderGroups() {
    const self = this;
    const { groups } = this.props;

    const onChange = (selectedGroups) => {
      this.setState({ selectedGroups });
    };

    return (
      <FormGroup>
        <ControlLabel>Choose the user groups</ControlLabel>
        <br />

        <Select
          placeholder={__("Choose groups")}
          value={self.state.selectedGroups}
          options={self.generateParams(groups)}
          onChange={onChange}
          isMulti={true}
        />
      </FormGroup>
    );
  }

  renderBrands() {
    const self = this;
    const { showBrands } = this.props;

    if (!showBrands) {
      return null;
    }

    const onChange = (selectedBrandIds) => {
      this.setState({ selectedBrandIds });
    };

    return (
      <FormGroup>
        <ControlLabel>Choose the brands</ControlLabel>
        <br />

        <SelectBrands
          label="Brand"
          initialValue={self.state.selectedBrandIds}
          onSelect={onChange}
          name="selectedBrandIds"
          multi={true}
        />
      </FormGroup>
    );
  }

  renderChannels() {
    const self = this;
    const { channels } = this.props;

    const onChange = (selectedChannels) => {
      self.setState({ selectedChannels });
    };

    return (
      <FormGroup>
        <ControlLabel>Choose the channels</ControlLabel>
        <br />

        <Select
          placeholder={__("Choose channels")}
          value={self.state.selectedChannels}
          options={self.generateParams(channels)}
          onChange={onChange}
          isMulti={true}
        />
      </FormGroup>
    );
  }

  generateDoc = (values: {} & IUser & IUserDetails & IUserLinks) => {
    const { object } = this.props;
    const { selectedChannels, selectedGroups, selectedBrandIds } = this.state;
    const finalValues = values;

    if (object) {
      finalValues._id = object._id;
    }

    const links = {};

    getConstantFromStore("social_links").forEach((link) => {
      links[link.value] = finalValues[link.value];
    });

    return {
      _id: finalValues._id,
      username: finalValues.username,
      email: finalValues.email,
      positionIds: this.props.queryParams?.positionIds,
      details: {
        avatar: this.state.avatar,
        shortName: finalValues.shortName,
        birthDate: finalValues.birthDate,
        position: finalValues.position,
        workStartedDate: finalValues.workStartedDate,
        location: finalValues.location,
        description: finalValues.description,
        operatorPhone: finalValues.operatorPhone,
        firstName: finalValues.firstName,
        lastName: finalValues.lastName,
        middleName: finalValues.middleName,
      },
      channelIds: this.collectValues(selectedChannels),
      links,
      groupIds: this.collectValues(selectedGroups),
      brandIds: selectedBrandIds,
      employeeId: finalValues.employeeId,
    };
  };

  renderContent = (formProps: IFormProps) => {
    const { object } = this.props;
    const user = object || { details: {} };

    return (
      <div>
        <UserCommonInfos
          user={user}
          onAvatarUpload={this.onAvatarUpload}
          formProps={formProps}
        />

        <CollapseContent title={__("Other")} compact={true}>
          {this.renderChannels()}
          {this.renderGroups()}
          {this.renderBrands()}
        </CollapseContent>
      </div>
    );
  };

  render() {
    return (
      <CommonForm
        {...this.props}
        name="team member"
        renderContent={this.renderContent}
        generateDoc={this.generateDoc}
        renderButton={this.props.renderButton}
        object={this.props.object}
      />
    );
  }
}

export default UserForm;
