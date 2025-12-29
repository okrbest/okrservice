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
  widgetAlarm?: boolean;
};

type Props = {
  tickets: TicketItem[];
  loading: boolean;
  onTicketClick: (ticket: TicketItem) => void;
  onRefresh?: () => void;
  includeCompanyTickets?: boolean;
  onToggleCompanyTickets?: () => void;
};

const TicketList: React.FC<Props> = ({ tickets, loading, onTicketClick, includeCompanyTickets = false, onToggleCompanyTickets }) => {
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
            link.addEventListener('click', async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // URL에서 name 파라미터 제거하여 다운로드 방지
              let viewUrl = originalSrc;
              if (viewUrl.includes('&name=')) {
                viewUrl = viewUrl.split('&name=')[0];
              }
              
              // fetch로 이미지를 가져와서 blob URL로 변환하여 새 탭에서 열기
              try {
                const response = await fetch(viewUrl, { mode: 'cors' });
                if (response.ok) {
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                  if (newWindow) {
                    // 창이 열린 후 blob URL 정리
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                  }
                } else {
                  // fetch 실패 시 직접 열기 (CORS 문제 등)
                  window.open(viewUrl, '_blank', 'noopener,noreferrer');
                }
              } catch (error) {
                // 오류 발생 시 직접 열기
                console.warn('Failed to fetch image:', error);
                window.open(viewUrl, '_blank', 'noopener,noreferrer');
              }
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
    // 디버깅 로그 추가
          console.log('🔔 Widget Ticket widgetAlarm:', ticket._id, 'widgetAlarm:', ticket.widgetAlarm, 'type:', typeof ticket.widgetAlarm);
    
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