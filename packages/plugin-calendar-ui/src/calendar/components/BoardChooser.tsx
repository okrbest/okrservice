import { Controls, FlexRow } from "../styles";
import {
  HeaderButton,
  HeaderLink
} from "@erxes/ui-sales/src/boards/styles/header";
import Button from "@erxes/ui/src/components/Button";
import DropdownToggle from "@erxes/ui/src/components/DropdownToggle";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import Icon from "@erxes/ui/src/components/Icon";
import Tip from "@erxes/ui/src/components/Tip";
import { __ } from "coreui/utils";
import { IBoard, IGroup } from "../types";
import React from "react";
import Dropdown from "@erxes/ui/src/components/Dropdown";
import { Link } from "react-router-dom";

type Props = {
  currentBoard?: IBoard;
  currentGroup?: IGroup;
  boards: IBoard[];
};

const calendarLink = "/calendar";

class BoardChooser extends React.Component<Props> {
  static defaultProps = {
    viewType: "board",
    boardText: "Board",
    groupText: "Group"
  };

  renderBoards() {
    const { currentBoard, boards } = this.props;

    return boards.map(board => {
      let link = `${calendarLink}?id=${board._id}`;

      const { groups = [] } = board;

      if (groups.length > 0) {
        link = `${link}&groupId=${groups[0]._id}`;
      }

      return (
        <li
          key={board._id}
          className={`${
            currentBoard && board._id === currentBoard._id && "active"
          }`}
        >
          <Link to={link}>{board.name}</Link>
        </li>
      );
    });
  }

  renderGroups() {
    const { currentBoard, currentGroup } = this.props;

    const groups = currentBoard ? currentBoard.groups || [] : [];

    if (groups.length === 0 || !currentBoard) {
      return (
        <EmptyState
          icon="web-grid-alt"
          text="Create Calendar group first"
          size="small"
          extra={
            <Button btnStyle="warning" size="small">
              <Link
                to={`/settings/calendars?boardId=${
                  currentBoard ? currentBoard._id : ""
                }`}
              >
                Create Group
              </Link>
            </Button>
          }
        />
      );
    }

    return groups.map(group => {
      return (
        <li
          key={group._id}
          className={`${
            currentGroup && group._id === currentGroup._id && "active"
          }`}
        >
          <Link
            to={`${calendarLink}?id=${currentBoard._id}&groupId=${group._id}`}
          >
            {group.name}
          </Link>
        </li>
      );
    });
  }

  render() {
    const { currentBoard, currentGroup } = this.props;

    return (
      <Controls>
        <Dropdown
          as={DropdownToggle}
          toggleComponent={
            <HeaderButton $hasBackground={true}>
              <Icon icon="web-section-alt" />
              {(currentBoard && currentBoard.name) || __("Choose board")}
            </HeaderButton>
          }
        >
          {this.renderBoards()}
        </Dropdown>
        <FlexRow>
          <Dropdown
            as={DropdownToggle}
            toggleComponent={
              <HeaderButton $hasBackground={true}>
                <Icon icon="window-grid" />
                {(currentGroup && currentGroup.name) || __("Choose group")}
              </HeaderButton>
            }
          >
            {this.renderGroups()}
          </Dropdown>
          <HeaderLink>
            <Tip text={__("Manage Board & Group")} placement="bottom">
              <Link
                to={`/settings/calendars?boardId=${
                  currentBoard ? currentBoard._id : ""
                }`}
              >
                <Icon icon="cog" />
              </Link>
            </Tip>
          </HeaderLink>
        </FlexRow>
      </Controls>
    );
  }
}

export default BoardChooser;
