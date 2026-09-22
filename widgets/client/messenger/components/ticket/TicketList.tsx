import * as classNames from 'classnames';
import * as React from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

import { IconSearch } from '../../../icons/Icons';
import { __, openReadFileImageInNewTab } from '../../../utils';
import Container from '../common/Container';

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

const TicketList: React.FC<Props> = ({
  tickets,
  loading,
  onTicketClick,
  includeCompanyTickets = false,
  onToggleCompanyTickets,
  searchTerm = '',
  onSearchChange,
  searchOption = 'all',
  onSearchOptionChange,
}) => {
  const descriptionRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // description 내 이미지 처리
  React.useEffect(() => {
    descriptionRefs.current.forEach((element) => {
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
            linkWrapper.style.cssText =
              'margin-top: 4px; margin-bottom: 8px; text-align: center;';

            const link = document.createElement('a');
            link.href = '#';
            link.textContent = __('원본 이미지 보기');
            link.style.cssText =
              'font-size: 11px; color: #007bff; text-decoration: none; cursor: pointer;';
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

  const setDescriptionRef = (
    ticketId: string,
    element: HTMLDivElement | null,
  ) => {
    if (element) {
      descriptionRefs.current.set(ticketId, element);
    } else {
      descriptionRefs.current.delete(ticketId);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return 'status-closed';
      case 'resolved':
        return 'status-resolved';
      case 'in progress':
        return 'status-in-progress';
      default:
        return 'status-open';
    }
  };

  const renderTicketItem = (ticket: TicketItem, index: number) => {
    return (
      <motion.div
        key={ticket._id}
        className="ticket-card"
        onClick={() => onTicketClick(ticket)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          delay: Math.min(index, 8) * 0.03,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="ticket-card-header">
          <span className="ticket-card-number">#{ticket.number}</span>
          {includeCompanyTickets && ticket.customerName && (
            <span className="ticket-card-customer">{ticket.customerName}</span>
          )}
          <span className="ticket-card-date">
            {dayjs(ticket.createdAt).format('YYYY-MM-DD')}
          </span>
          {ticket.widgetAlarm === false && (
            <span
              className="ticket-unread-dot"
              title={String(__('새 답변알림'))}
            />
          )}
        </div>

        <h4 className="ticket-card-title">{ticket.name}</h4>

        {!includeCompanyTickets && ticket.description && (
          <div
            ref={(el) => setDescriptionRef(ticket._id, el)}
            className="ticket-card-description"
            onClick={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{
              __html:
                ticket.description.length > 100
                  ? `${ticket.description.substring(0, 100)}...`
                  : ticket.description,
            }}
          />
        )}

        <div className="ticket-card-footer">
          <span className={`ticket-status ${getStatusClass(ticket.status)}`}>
            {__(ticket.stage?.name || ticket.status)}
          </span>
          <span className="ticket-type">
            {__(ticket.requestType || ticket.type)}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderListHeader = (count: number) => (
    <div className="ticket-list-header">
      <h3 className="ticket-list-title">
        {includeCompanyTickets ? __('Company Tickets') : __('My Tickets')} (
        {count})
      </h3>
      {onToggleCompanyTickets && (
        <button
          className={classNames('ticket-toggle-button', {
            active: includeCompanyTickets,
          })}
          onClick={onToggleCompanyTickets}
        >
          {includeCompanyTickets ? __('내 티켓 보기') : __('회사 티켓보기')}
        </button>
      )}
    </div>
  );

  const renderSearchBar = () => {
    if (!onSearchChange) {
      return null;
    }

    return (
      <div className="ticket-search-bar">
        {onSearchOptionChange && (
          <select
            className="ticket-search-select"
            value={searchOption}
            onChange={(e) =>
              onSearchOptionChange(e.target.value as SearchOption)
            }
          >
            <option value="all">{__('전체')}</option>
            <option value="title">{__('제목')}</option>
            <option value="number">{__('번호')}</option>
            <option value="description">{__('내용')}</option>
          </select>
        )}
        <div className="ticket-search-input-wrapper">
          <IconSearch />
          <input
            className="ticket-search-input"
            type="text"
            placeholder={String(__('Search by ticket title'))}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    );
  };

  const renderEmptyState = (title: string, description: string) => (
    <div className="empty-tickets">
      <div className="empty-content">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 1 0 0 6v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-6V6Z"
            stroke="#aaa"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9 6v12"
            stroke="#aaa"
            strokeWidth="1.6"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />
        </svg>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );

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
            const numberMatch = ticket.number
              .toLowerCase()
              .includes(searchLower);
            const descriptionText = ticket.description
              ? ticket.description.replace(/<[^>]*>/g, '').toLowerCase()
              : '';
            const descriptionMatch = descriptionText.includes(searchLower);
            return nameMatch || numberMatch || descriptionMatch;
          }
        })
      : tickets;

    if (!tickets || tickets.length === 0) {
      return renderEmptyState(
        String(__('No tickets found')),
        String(__("You haven't submitted any tickets yet.")),
      );
    }

    if (filteredTickets.length === 0 && searchTerm) {
      return (
        <div className="ticket-list-container">
          {renderListHeader(tickets.length)}
          {renderSearchBar()}
          {renderEmptyState(
            String(__('No tickets found')),
            String(__('No tickets match your search.')),
          )}
        </div>
      );
    }

    return (
      <div className="ticket-list-container">
        {renderListHeader(filteredTickets.length)}
        {renderSearchBar()}
        <div className="ticket-list-content">
          {filteredTickets.map((ticket, index) =>
            renderTicketItem(ticket, index),
          )}
        </div>
      </div>
    );
  };

  return (
    <Container
      withBottomNavBar={true}
      title={__('Ticket List')}
      backRoute="ticket"
    >
      {renderContent()}
    </Container>
  );
};

export default TicketList;
