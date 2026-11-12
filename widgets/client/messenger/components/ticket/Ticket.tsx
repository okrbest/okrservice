import * as React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, FileText, HelpCircle } from 'lucide-react';

import {
  IconCheckTicket,
  IconFeaturedChevronRight,
  IconTicket,
} from '../../../icons/Icons';

import Button from '../common/Button';
import Container from '../common/Container';
import { __ } from '../../../utils';
import { connection } from '../../connection';
import { getColor, hexToRGBA } from '../../utils/util';
import { useTicket } from '../../context/Ticket';
import { TICKET_HELP_LINKS } from './helpLinks';
import CompanyDocsPanel from '../chatbot/CompanyDocsPanel';
import {
  getCompanyName,
  getUploaderName,
  hasSeenCompanyDocsMenu,
  markCompanyDocsMenuSeen,
} from '../chatbot/companyDocs';

const HELP_LINK_ICONS = { faq: HelpCircle, manual: BookOpen };

type Props = {
  loading: boolean;
  activeRoute: string;
  handleSubmit: (activeRoute: string) => void;
  handleButtonClick: () => void;
};

const Ticket: React.FC<Props> = ({
  loading,
  handleSubmit,
  handleButtonClick,
}) => {
  const continueText = __('Continue');
  const { unreadTicketCount } = useTicket();
  // 회사 사규 문서 — 고객사가 companyData.name을 넘긴 경우에만(teamplgpt specs/021)
  const companyName = getCompanyName();
  const [docsOpen, setDocsOpen] = React.useState(false);
  const [docsIsNew, setDocsIsNew] = React.useState(
    () => !!companyName && !hasSeenCompanyDocsMenu(),
  );
  const openCompanyDocs = () => {
    setDocsOpen(true);
    if (docsIsNew) {
      setDocsIsNew(false);
      markCompanyDocsMenuSeen();
    }
  };

  const renderSubmitForm = () => {
    const submitTicketRoute = connection.data.customerId
      ? 'ticket-submit'
      : 'create-customer';
    const color = getColor() || '#6335ff';

    const items = [
      {
        key: submitTicketRoute,
        icon: <IconTicket size="22px" />,
        title: __('Submit a ticket'),
        description: __('Send us a new request'),
        onClick: () => handleSubmit(submitTicketRoute),
        badge: 0,
      },
      {
        key: 'list',
        icon: <IconCheckTicket size="22px" />,
        title: __('Ticket List'),
        description: __('Track your submitted tickets'),
        onClick: () => handleSubmit('list'),
        badge: unreadTicketCount,
      },
    ];

    return (
      <div className="type-choose-container">
        {items.map((item, index) => (
          <motion.div
            key={item.key}
            className="ticket-menu-item"
            onClick={item.onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: index * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div
              className="ticket-menu-icon"
              style={{ backgroundColor: hexToRGBA(color, 0.12) }}
            >
              {item.icon}
            </div>
            <div className="ticket-menu-text">
              <span className="ticket-menu-title">{item.title}</span>
              <span className="ticket-menu-description">
                {item.description}
              </span>
            </div>
            {item.badge > 0 && (
              <span className="ticket-menu-badge">{item.badge}</span>
            )}
            <IconFeaturedChevronRight />
          </motion.div>
        ))}
        {/* 바깥 사이트 바로가기: 일반 링크라 새 탭으로 열린다(팝업 차단에 걸리지 않음) */}
        {TICKET_HELP_LINKS.map((link, index) => {
          const LinkIcon = HELP_LINK_ICONS[link.key];

          return (
            <motion.a
              key={link.key}
              className="ticket-menu-item"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: (items.length + index) * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div
                className="ticket-menu-icon"
                style={{ backgroundColor: hexToRGBA(color, 0.12) }}
              >
                <LinkIcon size={22} strokeWidth={1.8} />
              </div>
              <div className="ticket-menu-text">
                <span className="ticket-menu-title">{__(link.title)}</span>
                <span className="ticket-menu-description">
                  {__(link.description)}
                </span>
              </div>
              <ExternalLink
                className="ticket-menu-external"
                size={16}
                aria-label={__('Opens in a new tab')}
              />
            </motion.a>
          );
        })}
        {companyName && (
          <motion.div
            className="ticket-menu-item"
            onClick={openCompanyDocs}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: (items.length + TICKET_HELP_LINKS.length) * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div
              className="ticket-menu-icon"
              style={{ backgroundColor: hexToRGBA(color, 0.12) }}
            >
              <FileText size={22} strokeWidth={1.8} />
            </div>
            <div className="ticket-menu-text">
              <span className="ticket-menu-title">
                {__('Company documents')}
                {docsIsNew && (
                  <span
                    style={{
                      marginLeft: '6px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: color,
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      verticalAlign: 'middle',
                    }}
                  >
                    {__('New')}
                  </span>
                )}
              </span>
              <span className="ticket-menu-description">
                {__("Upload your company's rules for the chatbot")}
              </span>
            </div>
            <IconFeaturedChevronRight />
          </motion.div>
        )}
      </div>
    );
  };

  const renderCompanyDocs = () => (
    // 패널은 부모를 꽉 채우는 absolute 레이아웃 — ticket-container(가운데 정렬 flex)를
    // 가로·세로로 채우는 기준 상자를 둔다
    <div
      style={{
        position: 'relative',
        alignSelf: 'stretch',
        flex: 1,
        minHeight: 0,
      }}
    >
      <CompanyDocsPanel
        companyName={companyName}
        uploaderName={getUploaderName()}
        onClose={() => setDocsOpen(false)}
      />
    </div>
  );

  const renderContent = () => {
    if (loading) return <div className="loader" />;
    if (docsOpen && companyName) return renderCompanyDocs();
    return renderSubmitForm();
  };

  return (
    <Container
      withBottomNavBar={true}
      title={__('Ticket')}
      persistentFooter={
        <div style={{ display: 'none' }}>
          <Button full onClick={handleButtonClick}>
            <span className="font-semibold">{continueText}</span>
          </Button>
        </div>
      }
    >
      <div className="ticket-container">{renderContent()}</div>
    </Container>
  );
};

export default Ticket;
