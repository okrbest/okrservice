import * as React from "react";
import dayjs from "dayjs";

import { __ } from "../../../utils";
import Container from "../common/Container";

type TicketStage = {
  _id: string;
  name: string;
};

type TicketItem = {
  _id: string;
  name: string;
  number: string;
  status: string;
  stage: TicketStage;
  description: string;
  type: string;
  createdAt: string;
  priority?: string;
};

type Props = {
  tickets: TicketItem[];
  loading: boolean;
  onTicketClick: (ticket: TicketItem) => void;
};

const TicketList: React.FC<Props> = ({ tickets, loading, onTicketClick }) => {
  const getPriorityClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "priority-critical";
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-normal";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "closed":
        return "status-closed";
      case "resolved":
        return "status-resolved";
      case "in progress":
        return "status-in-progress";
      default:
        return "status-open";
    }
  };

  const renderTicketItem = (ticket: TicketItem) => {
    return (
      <div
        key={ticket._id}
        className="ticket-list-item"
        onClick={() => onTicketClick(ticket)}
      >
        <div className="ticket-item-header">
          <div className="ticket-number">#{ticket.number}</div>
          <div className="ticket-date">
            {dayjs(ticket.createdAt).format("YYYY-MM-DD")}
          </div>
        </div>
        
        <div className="ticket-item-content">
          <h4 className="ticket-title">{ticket.name}</h4>
          {ticket.description && (
            <div 
              className="ticket-description"
              dangerouslySetInnerHTML={{ 
                __html: ticket.description.length > 100
                  ? `${ticket.description.substring(0, 100)}...`
                  : ticket.description
              }}
            />
          )}
        </div>

        <div className="ticket-item-footer">
          <div className="ticket-labels">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={`ticket-status ${getStatusClass(ticket.status)}`}>
                {ticket.stage?.name || ticket.status}
              </span>
              <span className="ticket-type">{__(ticket.type)}</span>
              {ticket.priority && (
                <span className={`ticket-priority ${getPriorityClass(ticket.priority)}`}>
                  {__(ticket.priority)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loader" />;
    }

    if (!tickets || tickets.length === 0) {
      return (
        <div className="empty-tickets">
          <div className="empty-content">
            <h3>{__("No tickets found")}</h3>
            <p>{__("You haven't submitted any tickets yet.")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="ticket-list-container">
        <div className="ticket-list-header">
          <h3>{__("My Tickets")} ({tickets.length})</h3>
        </div>
        <div className="ticket-list-content">
          {tickets.map(renderTicketItem)}
        </div>
      </div>
    );
  };

  return (
    <Container withBottomNavBar={true} title={__("Ticket List")} backRoute="ticket">
      {renderContent()}
    </Container>
  );
};

export default TicketList; 