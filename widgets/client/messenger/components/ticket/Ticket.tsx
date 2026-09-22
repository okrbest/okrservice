import * as React from 'react';
import { motion } from 'framer-motion';

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
      </div>
    );
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
      <div className="ticket-container">
        {loading ? <div className="loader" /> : renderSubmitForm()}
      </div>
    </Container>
  );
};

export default Ticket;
