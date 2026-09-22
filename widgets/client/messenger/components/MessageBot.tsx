import * as React from 'react';
import xss from 'xss';
import { motion } from 'framer-motion';
import { IUser } from '../../types';
import { urlify } from '../../utils';
import { IBotData } from '../types';
import Bot from './bot/Bot';
import Carousel from './bot/Carousel';
import CustomMessage from './bot/CustomMessage';

type Props = {
  botData: IBotData[];
  createdAt: Date;
  user?: IUser;
  color?: string;
  textColor?: string;
  replyAutoAnswer: (message: string, payload: string, type: string) => void;
  sendTypingInfo: (conversationId: string, text: string) => void;
  conversationId?: string;
  scrollBottom: () => void;
};

type CommonProps = {
  conversationId?: string;
  replyAutoAnswer: (message: string, payload: string, type: string) => void;
  sendTypingInfo: (conversationId: string, text: string) => void;
};

function MessageBot(props: Props) {
  const {
    conversationId,
    color,
    botData,
    replyAutoAnswer,
    sendTypingInfo,
    scrollBottom,
  } = props;

  if (botData?.length && botData.length === 0) {
    return null;
  }

  const renderTextMessage = (message: IBotData, idx: number) => {
    return (
      <div
        key={idx}
        className="erxes-message top"
        dangerouslySetInnerHTML={{ __html: xss(urlify(message.text || '')) }}
      />
    );
  };

  const renderFileMessage = (message: IBotData, idx: number) => {
    return (
      <div key={idx} className="bot-message">
        <img
          className="image-message"
          onLoad={scrollBottom}
          src={message.url}
          alt={message.title || ''}
        />
      </div>
    );
  };

  const renderCustomMessage = (
    message: IBotData,
    commonProps: CommonProps,
    idx: number,
  ) => {
    return (
      <CustomMessage
        key={idx}
        color={color}
        message={message}
        {...commonProps}
      />
    );
  };

  const renderCarouselMessage = (
    elements: any,
    commonProps: CommonProps,
    idx: number,
  ) => {
    return (
      <Carousel
        key={idx}
        scrollBottom={scrollBottom}
        items={elements}
        color={color}
        {...commonProps}
      />
    );
  };

  function renderBotMessage() {
    const commonProps = {
      conversationId,
      replyAutoAnswer,
      sendTypingInfo,
    };

    return botData?.map((item, idx) => {
      switch (item.type) {
        case 'text':
          return renderTextMessage(item, idx);
        case 'file':
          return renderFileMessage(item, idx);
        case 'carousel':
          return renderCarouselMessage(item.elements, commonProps, idx);
        case 'custom':
          return renderCustomMessage(item, commonProps, idx);
        default:
          return null;
      }
    });
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 12, scale: 0.96, x: -20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Bot />
      {renderBotMessage()}
    </motion.li>
  );
}

export default MessageBot;
