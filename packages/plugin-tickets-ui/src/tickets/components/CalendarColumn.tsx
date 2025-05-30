import {
  ColumnContainer,
  ColumnContentBody,
  ColumnFooter
} from "@erxes/ui-tickets/src/boards/components/Calendar";
import { AddNew } from "@erxes/ui-tickets/src/boards/styles/stage";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import Icon from "@erxes/ui/src/components/Icon";
import { IDateColumn } from "@erxes/ui/src/types";
import { __ } from "coreui/utils";
import React from "react";
import options from "@erxes/ui-tickets/src/tickets/options";
import { ITicket } from "@erxes/ui-tickets/src/tickets/types";
import Ticket from "@erxes/ui-tickets/src/tickets/components/TicketItem";

type Props = {
  tickets: ITicket[];
  totalCount: number;
  date: IDateColumn;
  onLoadMore: (skip: number) => void;
};

class TicketColumn extends React.Component<Props, {}> {
  onLoadMore = () => {
    const { tickets, onLoadMore } = this.props;
    onLoadMore(tickets.length);
  };

  renderContent() {
    const { tickets } = this.props;

    if (tickets.length === 0) {
      return <EmptyState icon="postcard" text="No tickets" />;
    }

    const contents = tickets.map((ticket: ITicket, index: number) => (
      <Ticket options={options} key={index} item={ticket} portable={true} />
    ));

    return <ColumnContentBody>{contents}</ColumnContentBody>;
  }

  renderFooter() {
    const { tickets, totalCount } = this.props;

    if (tickets.length === totalCount || tickets.length > totalCount) {
      return null;
    }

    return (
      <ColumnFooter>
        <AddNew onClick={this.onLoadMore}>
          <Icon icon="refresh" /> {__("Load more")}
        </AddNew>
      </ColumnFooter>
    );
  }

  render() {
    return (
      <ColumnContainer>
        {this.renderContent()}
        {this.renderFooter()}
      </ColumnContainer>
    );
  }
}

export default TicketColumn;
