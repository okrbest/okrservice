import Board from "@erxes/ui-sales/src/boards/containers/Board";
import MainActionBar from "@erxes/ui-sales/src/boards/containers/MainActionBar";
import {
  BoardContainer,
  BoardContent
} from "@erxes/ui-sales/src/boards/styles/common";
import { menuDeal } from "@erxes/ui/src/utils/menus";
import { __ } from "coreui/utils";
import Header from "@erxes/ui/src/layout/components/Header";
import React from "react";
import DealMainActionBar from "./DealMainActionBar";
import options from "@erxes/ui-sales/src/deals/options";
import styled from "styled-components";

const ListViewRoot = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  /* 리스트 박스가 아래 공간까지 꽉 차도록 뷰포트 기준 높이 강제 */
  height: calc(100vh - 120px);
  min-height: calc(100vh - 120px);
`;

type Props = {
  queryParams: any;
  viewType: string;
};

class DealBoard extends React.Component<Props> {
  renderContent() {
    const { queryParams, viewType } = this.props;

    return (
      <Board viewType={viewType} queryParams={queryParams} options={options} />
    );
  }

  renderActionBar() {
    return <MainActionBar type="deal" component={DealMainActionBar} />;
  }

  render() {
    const { viewType } = this.props;
    const isListView = viewType === "list";

    return (
      <BoardContainer
        style={
          isListView
            ? {
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }
            : undefined
        }
      >
        <Header title={__("Sales")} submenu={menuDeal} />
        <BoardContent
          $transparent={true}
          style={
            isListView
              ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }
              : undefined
          }
        >
          {this.renderActionBar()}
          {isListView ? (
            <ListViewRoot>{this.renderContent()}</ListViewRoot>
          ) : (
            this.renderContent()
          )}
        </BoardContent>
      </BoardContainer>
    );
  }
}

export default DealBoard;
