import { ActionButtons, Header } from "@erxes/ui-settings/src/styles";
import { FieldStyle, SidebarList } from "modules/layout/styles";

import Button from "modules/common/components/Button";
import DataWithLoader from "modules/common/components/DataWithLoader";
import GroupForm from "./GroupForm";
import { IButtonMutateProps } from "@erxes/ui/src/types";
import { IUserGroup } from "@erxes/ui-settings/src/permissions/types";
import { IUserGroupDocument } from "../types";
import Icon from "modules/common/components/Icon";
import { Link } from "react-router-dom";
import LoadMore from "modules/common/components/LoadMore";
import MemberAvatars from "@erxes/ui/src/components/MemberAvatars";
import ModalTrigger from "modules/common/components/ModalTrigger";
import React from "react";
import Sidebar from "modules/layout/components/Sidebar";
import { SidebarItem } from "../styles";
import Tip from "modules/common/components/Tip";
import Wrapper from "modules/layout/components/Wrapper";
import { __ } from "coreui/utils";

const { Section } = Wrapper.Sidebar;

interface IProps {
  queryParams: Record<string, string>;
  refetch: any;
  totalCount: number;
  loading: boolean;
  objects: IUserGroupDocument[];
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  remove: (id: string) => void;
  copyItem: (id: string, key: string, list?: string[]) => void;
}

class GroupList extends React.Component<IProps> {
  renderFormTrigger(trigger: React.ReactNode, object?: IUserGroup) {
    const content = (props) => this.renderForm({ ...props, object });

    return (
      <ModalTrigger
        title="New Group"
        autoOpenKey={object ? "newUserGroup" : "showUserGroupAddModal"}
        trigger={trigger}
        content={content}
        tipText={object && "Edit"}
      />
    );
  }

  renderForm = (props) => {
    const { refetch, renderButton } = this.props;

    const extendedProps = { ...props, refetch };

    return <GroupForm {...extendedProps} renderButton={renderButton} />;
  };

  isActive = (id: string) => {
    const { queryParams } = this.props;
    const currentGroup = queryParams.groupId || "";

    return currentGroup === id;
  };

  renderEditAction(object: IUserGroupDocument) {
    const trigger = (
      <Button btnStyle="link">
        <Icon icon="edit" />
      </Button>
    );

    return this.renderFormTrigger(trigger, object);
  }

  renderRemoveAction(object: IUserGroupDocument) {
    const { remove } = this.props;

    return (
      <Tip text={__("Remove")} placement="bottom">
        <Button btnStyle="link" onClick={remove.bind(null, object._id)}>
          <Icon icon="cancel-1" />
        </Button>
      </Tip>
    );
  }

  renderCopyAction(object: IUserGroupDocument) {
    const onCopy = () =>
      this.props.copyItem(object._id, "memberIds", object.memberIds || []);

    const tipText = "Copies user group along with the permissions & users";

    return (
      <Tip text={tipText} placement="bottom">
        <Button btnStyle="link" onClick={onCopy}>
          <Icon icon="copy" />
        </Button>
      </Tip>
    );
  }

  renderObjects(objects: IUserGroupDocument[]) {
    return objects.map((object) => (
      <SidebarItem key={object._id} $isActive={this.isActive(object._id)}>
        <Link to={`?groupId=${object._id}`}>
          <FieldStyle>
            {object.name}
            <MemberAvatars
              selectedMemberIds={object.memberIds || []}
              allMembers={object.members || []}
            />
          </FieldStyle>
        </Link>
        <ActionButtons>
          {this.renderCopyAction(object)}
          {this.renderEditAction(object)}
          {this.renderRemoveAction(object)}
        </ActionButtons>
      </SidebarItem>
    ));
  }

  renderContent() {
    const { objects } = this.props;

    return (
      <SidebarList $noBackground={true} $noTextColor={true}>
        {this.renderObjects(objects)}
      </SidebarList>
    );
  }

  renderSidebarHeader() {
    const trigger = (
      <Button
        id="permission-create-user-group"
        btnStyle="success"
        icon="plus-circle"
        block={true}
      >
        Create user group
      </Button>
    );

    return (
      <>
        <Header>{this.renderFormTrigger(trigger)}</Header>
        <Section.Title>{__("User groups")}</Section.Title>
      </>
    );
  }

  render() {
    const { totalCount, loading } = this.props;

    return (
      <Sidebar wide={true} header={this.renderSidebarHeader()} hasBorder={true}>
        <DataWithLoader
          data={this.renderContent()}
          loading={loading}
          count={totalCount}
          emptyText="There is no group"
          emptyImage="/images/actions/26.svg"
        />
        <LoadMore all={totalCount} loading={loading} />
      </Sidebar>
    );
  }
}

export default GroupList;
