import * as classNames from 'classnames';
import * as React from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

import { IconSearch } from '../../../icons/Icons';
import { __ } from '../../../utils';
import Container from '../common/Container';
import { isDoneStage, isRecent, previewText } from './listHelpers';

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
  const now = new Date();

  const renderTime = (createdAt: string) =>
    isRecent(createdAt, now)
      ? dayjs(createdAt).fromNow()
      : dayjs(createdAt).format(__('MMM D'));

  // 받은편지함처럼 한 줄씩: 제목(+새 답변), 내용 한 줄, 번호·단계, 오른쪽 시간
  const renderTicketItem = (ticket: TicketItem, index: number) => {
    const unread = ticket.widgetAlarm === false;
    const stageName = ticket.stage?.name || ticket.status;
    const done = isDoneStage(ticket.stage?.name, ticket.status);
    const preview = includeCompanyTickets
      ? ''
      : previewText(ticket.description);

    return (
      <motion.button
        type="button"
        key={ticket._id}
        className={classNames('tl-row', { 'is-unread': unread })}
        onClick={() => onTicketClick(ticket)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.22,
          delay: Math.min(index, 8) * 0.03,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span
          className={classNames('tl-dot', { 'is-done': done })}
          aria-hidden
        />
        <span className="tl-main">
          <span className="tl-title">
            <span className="tl-name">{ticket.name}</span>
            {unread && <span className="tl-new">{__('새 답변')}</span>}
          </span>
          {preview && <span className="tl-preview">{preview}</span>}
          <span className="tl-meta">
            <span className="tl-number">#{ticket.number}</span>
            {stageName && (
              <span className={classNames('tl-stage', { 'is-done': done })}>
                {__(stageName)}
              </span>
            )}
            {includeCompanyTickets && ticket.customerName && (
              <span className="tl-customer">{ticket.customerName}</span>
            )}
          </span>
        </span>
        <span className="tl-time">{renderTime(ticket.createdAt)}</span>
      </motion.button>
    );
  };

  // 내 티켓 / 회사 티켓 탭(지금 보는 쪽에 개수)
  const renderListHeader = (count: number) => {
    if (!onToggleCompanyTickets) {
      return null;
    }

    const tab = (company: boolean, label: string) => {
      const active = includeCompanyTickets === company;

      return (
        <button
          type="button"
          role="tab"
          aria-selected={active}
          className={classNames('tl-tab', { 'is-active': active })}
          onClick={() => !active && onToggleCompanyTickets()}
        >
          {label}
          {active && <span className="tl-count">{count}</span>}
        </button>
      );
    };

    return (
      <div className="tl-tabs" role="tablist">
        {tab(false, __('My Tickets'))}
        {tab(true, __('Company Tickets'))}
      </div>
    );
  };

  const renderSearchBar = () => {
    if (!onSearchChange) {
      return null;
    }

    return (
      <label className="tl-search">
        <IconSearch />
        <input
          type="text"
          placeholder={String(__('Search by ticket title'))}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {onSearchOptionChange && (
          <select
            className="tl-scope"
            aria-label={__('Search scope')}
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
      </label>
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
        <div className="tl-screen">
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
      <div className="tl-screen">
        {renderListHeader(filteredTickets.length)}
        {renderSearchBar()}
        <div className="tl-rows">
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
