import * as React from "react";
import dayjs from "dayjs";

import { __ } from "../../../utils";
import Container from "../common/Container";
import { openReadFileImageInNewTab } from "../../../utils";

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
  requestType?: string;
  createdAt: string;
  priority?: string;
  widgetAlarm?: boolean;
  customerName?: string;
};

type SearchOption = 'all' | 'title' | 'number' | 'description';

type Props = {
  tickets: TicketItem[];
  loading: boolean;
  onTicketClick: (ticket: TicketItem) => void;
  onRefresh?: () => void;
  includeCompanyTickets?: boolean;
  onToggleCompanyTickets?: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchOption?: SearchOption;
  onSearchOptionChange?: (option: SearchOption) => void;
};

const TicketList: React.FC<Props> = ({ tickets, loading, onTicketClick, includeCompanyTickets = false, onToggleCompanyTickets, searchTerm = "", onSearchChange, searchOption = 'all', onSearchOptionChange }) => {
  const descriptionRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // description 내 이미지 처리
  React.useEffect(() => {
    descriptionRefs.current.forEach((element, ticketId) => {
      if (element) {
        const images = element.querySelectorAll('img:not([data-link-added])');
        images.forEach((imgElement) => {
          const img = imgElement as HTMLImageElement;
          // 이미지 크기를 위젯에 맞게 조정
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.cursor = 'pointer';
          img.style.maxHeight = '150px';
          img.style.objectFit = 'contain';
          img.setAttribute('data-link-added', 'true');
          
          const originalSrc = img.src || img.getAttribute('src');
          if (originalSrc) {
            // 이미지 아래에 링크 추가
            const linkWrapper = document.createElement('div');
            linkWrapper.className = 'image-view-original-link';
            linkWrapper.style.cssText = 'margin-top: 4px; margin-bottom: 8px; text-align: center;';
            
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = __('원본 이미지 보기');
            link.style.cssText = 'font-size: 11px; color: #007bff; text-decoration: none; cursor: pointer;';
            link.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              openReadFileImageInNewTab(originalSrc);
            });
            
            linkWrapper.appendChild(link);
            
            // 이미지 다음에 링크 삽입
            if (img.parentNode) {
              img.parentNode.insertBefore(linkWrapper, img.nextSibling);
            }
          }
        });
      }
    });
  }, [tickets]);

  const setDescriptionRef = (ticketId: string, element: HTMLDivElement | null) => {
    if (element) {
      descriptionRefs.current.set(ticketId, element);
    } else {
      descriptionRefs.current.delete(ticketId);
    }
  };

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

  // 알림 표시를 위한 스타일
  const notificationStyles = {
    ticketNotification: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 8px',
      marginLeft: '1px',
      backgroundColor: '#ff6b6b',
      borderRadius: '12px',
      border: '2px solid #fff',
      whiteSpace: 'nowrap',
      minWidth: 'fit-content'
    },
    notificationIcon: {
      fontSize: '14px',
      color: '#fff',
      animation: 'pulse 2s infinite',
      fontWeight: 'bold'
    }
  };

  const renderTicketItem = (ticket: TicketItem) => {
    // 디버깅 로그
    if (includeCompanyTickets) {
      console.log('🔔 Rendering ticket:', ticket._id, 'customerName:', ticket.customerName, 'hasCustomerName:', !!ticket.customerName);
    }
    
    // 회사 티켓보기 모드일 때는 컴팩트한 리스트 형태로 표시
    if (includeCompanyTickets) {
      return (
        <div
          key={ticket._id}
          className="ticket-list-item"
          onClick={() => onTicketClick(ticket)}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e8e8e8',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            backgroundColor: '#fff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#333',
                  whiteSpace: 'nowrap'
                }}>
                  #{ticket.number}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {ticket.name}
                </span>
                {ticket.widgetAlarm === false && (
                  <span style={{
                    fontSize: '12px',
                    color: '#ff6b6b',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}>
                    🔔
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                <span className={`ticket-status ${getStatusClass(ticket.status)}`} style={{ fontSize: '12px', padding: '2px 6px' }}>
                  {ticket.stage?.name || ticket.status}
                </span>
                <span className="ticket-type" style={{ fontSize: '12px' }}>
                  {__(ticket.requestType || ticket.type)}
                </span>
                {ticket.customerName ? (
                  <span className="ticket-customer-name" style={{ 
                    color: '#666',
                    fontWeight: '500',
                    fontSize: '12px',
                    padding: '2px 6px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '20px'
                  }}>
                    {ticket.customerName}
                  </span>
                ) : null}
                <span style={{ color: '#999' }}>
                  {dayjs(ticket.createdAt).format("YYYY-MM-DD")}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 내 티켓보기 모드일 때는 기존 카드 형태로 표시
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
          {/* 알림 표시 */}
          {ticket.widgetAlarm === false && (
            <div style={notificationStyles.ticketNotification}>
              <span style={notificationStyles.notificationIcon}>🔔 새 답변알림</span>
            </div>
          )}
        </div>
        
        <div className="ticket-item-content">
          <h4 className="ticket-title">{ticket.name}</h4>
          {ticket.description && (
            <div 
              ref={(el) => setDescriptionRef(ticket._id, el)}
              className="ticket-description"
              onClick={(e) => e.stopPropagation()}
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
              <span className="ticket-type">{__(ticket.requestType || ticket.type)}</span>
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

    // 검색어로 티켓 필터링 (선택된 옵션에 따라)
    const filteredTickets = searchTerm
      ? tickets.filter((ticket) => {
          const searchLower = searchTerm.toLowerCase();
          
          if (searchOption === 'title') {
            return ticket.name.toLowerCase().includes(searchLower);
          } else if (searchOption === 'number') {
            return ticket.number.toLowerCase().includes(searchLower);
          } else if (searchOption === 'description') {
            const descriptionText = ticket.description 
              ? ticket.description.replace(/<[^>]*>/g, '').toLowerCase()
              : '';
            return descriptionText.includes(searchLower);
          } else {
            // 'all' 옵션: 모든 필드 검색
            const nameMatch = ticket.name.toLowerCase().includes(searchLower);
            const numberMatch = ticket.number.toLowerCase().includes(searchLower);
            const descriptionText = ticket.description 
              ? ticket.description.replace(/<[^>]*>/g, '').toLowerCase()
              : '';
            const descriptionMatch = descriptionText.includes(searchLower);
            return nameMatch || numberMatch || descriptionMatch;
          }
        })
      : tickets;

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

    if (filteredTickets.length === 0 && searchTerm) {
      return (
        <div className="ticket-list-container">
          <div className="ticket-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{includeCompanyTickets ? __("Company Tickets") : __("My Tickets")} ({tickets.length})</h3>
            {onToggleCompanyTickets && (
              <button
                onClick={onToggleCompanyTickets}
                style={{
                  padding: '8px 16px',
                  backgroundColor: includeCompanyTickets ? '#6f80ff ' : '#f5f5f5',
                  color: includeCompanyTickets ? '#fff' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!includeCompanyTickets) {
                    e.currentTarget.style.backgroundColor = '#e8e8e8';
                  }
                }}
                onMouseOut={(e) => {
                  if (!includeCompanyTickets) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }
                }}
              >
                {includeCompanyTickets ? __("내 티켓 보기") : __("회사 티켓보기")}
              </button>
            )}
          </div>
          {onSearchChange && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              {onSearchOptionChange && (
                <select
                  value={searchOption}
                  onChange={(e) => onSearchOptionChange(e.target.value as SearchOption)}
                  style={{
                    padding: '10px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    width: '80px'
                  }}
                >
                  <option value="all">{__('전체')}</option>
                  <option value="title">{__('제목')}</option>
                  <option value="number">{__('번호')}</option>
                  <option value="description">{__('내용')}</option>
                </select>
              )}
              <input
                type="text"
                placeholder={__("Search by ticket title")}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
          <div className="empty-tickets">
            <div className="empty-content">
              <h3>{__("No tickets found")}</h3>
              <p>{__("No tickets match your search.")}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ticket-list-container">
        <div className="ticket-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>{includeCompanyTickets ? __("Company Tickets") : __("My Tickets")} ({filteredTickets.length})</h3>
          {onToggleCompanyTickets && (
            <button
              onClick={onToggleCompanyTickets}
              style={{
                padding: '8px 16px',
                backgroundColor: includeCompanyTickets ? '#6f80ff ' : '#f5f5f5',
                color: includeCompanyTickets ? '#fff' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!includeCompanyTickets) {
                  e.currentTarget.style.backgroundColor = '#e8e8e8';
                }
              }}
              onMouseOut={(e) => {
                if (!includeCompanyTickets) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
            >
              {includeCompanyTickets ? __("내 티켓 보기") : __("회사 티켓보기")}
            </button>
          )}
        </div>
        {onSearchChange && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            {onSearchOptionChange && (
              <select
                value={searchOption}
                onChange={(e) => onSearchOptionChange(e.target.value as SearchOption)}
                style={{
                  padding: '10px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  width: '80px'
                }}
              >
                <option value="all">{__('전체')}</option>
                <option value="title">{__('제목')}</option>
                <option value="number">{__('번호')}</option>
                <option value="description">{__('내용')}</option>
              </select>
            )}
            <input
              type="text"
              placeholder={__("Search by ticket title")}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
        <div className="ticket-list-content">
          {filteredTickets.map(renderTicketItem)}
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