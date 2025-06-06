import {
  ModalTrigger,
  Button,
  Box,
  EmptyState,
  Tip,
  Icon
} from "@erxes/ui/src/components";
import React from "react";
import { AddForm } from "@erxes/ui-sales/src/boards/containers/portable";
import EditForm from "@erxes/ui-sales/src/boards/containers/editForm/EditForm";
import { IItem, IOptions } from "../../types";
import { __ } from "coreui/utils";
import { SectionBodyItem } from "@erxes/ui/src/layout/styles";
import { Flex } from "@erxes/ui/src/styles/main";
import { ITicket } from "../../../tickets/types";

type Props = {
  children: IItem[] | ITicket[];
  parentId: string;
  options: IOptions;
  stageId: string;
  itemId: string;
};

type State = {
  openChildId: string;
  openParentId: string;
};

class ChildrenSection extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      openChildId: "",
      openParentId: ""
    };
  }

  renderAddForm() {
    const content = ({ closeModal }) => {
      const updateProps = {
        ...this.props,
        parentId: this.props.itemId,
        closeModal
      };
      return <AddForm {...updateProps} />;
    };
    const trigger = (
      <Button btnStyle="link">
        <Tip text={__("Add Child Card")}>
          <Icon icon="plus-circle" size={16} />
        </Tip>
      </Button>
    );
    return (
      <ModalTrigger
        title="Add New Child Card"
        trigger={trigger}
        content={content}
      />
    );
  }

  renderParentForm() {
    const { stageId, parentId } = this.props;

    const { openParentId } = this.state;

    const closeModal = () => {
      this.setState({ openParentId: "" });
    };

    const openModal = () => {
      const { parentId } = this.props;
      this.setState({ openParentId: parentId });
    };

    const updatedProps = {
      itemId: parentId,
      stageId: stageId,
      isPopupVisible: openParentId === parentId,
      beforePopupClose: closeModal
    };

    return (
      <>
        <Button btnStyle="link" onClick={openModal}>
          <Tip text={__("See Parent Card")}>
            <Icon icon="technology" />
          </Tip>
        </Button>
        <EditForm {...updatedProps} />
      </>
    );
  }

  renderChildForm(child: IItem | ITicket) {
    const { openChildId } = this.state;

    const closeModal = () => {
      localStorage.removeItem("isChildModal");
      this.setState({ openChildId: "" });
    };

    const openModal = () => {
      localStorage.setItem("isChildModal", "true");
      this.setState({ openChildId: child._id });
    };

    const updatedProps = {
      itemId: child._id,
      parentId: this.props.itemId,
      stageId: child.stageId,
      isPopupVisible: openChildId === child._id,
      beforePopupClose: closeModal
    };

    return (
      <>
        <EditForm {...updatedProps} />
      </>
    );
  }

  render() {
    const { children, parentId } = this.props;

    const extraButtons = () => {
      return (
        <Flex>
          {parentId && this.renderParentForm()}
          {this.renderAddForm()}
        </Flex>
      );
    };

    return (
      <Box title="Children" extraButtons={extraButtons()} isOpen={true}>
        {children?.length ? (
          (children as Array<IItem | ITicket>).map(child => (
            <SectionBodyItem key={child._id}>
              {this.renderChildForm(child)}
            </SectionBodyItem>
          ))
        ) : (
          <EmptyState text="No Children" icon="list-ui-alt" />
        )}
      </Box>
    );
  }
}

export default ChildrenSection;
