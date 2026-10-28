import * as React from 'react';
import { CalendarDays, Clock, Wallet } from 'lucide-react';

import {
  CHATBOT_STARTER_GROUPS,
  ChatbotStarterGroup,
} from './chatbotStarterQuestions';

// 챗봇 첫 화면 — 인사 아래 "이런 걸 물어볼 수 있어요"와 주제별 질문 버튼. 누르면 그 질문을 바로 보낸다.

const GROUP_ICONS: Record<ChatbotStarterGroup['key'], typeof Clock> = {
  work: Clock,
  leave: CalendarDays,
  pay: Wallet,
};

const INK = '#2e3170';
const MUTED = '#6d6f78';
const LINE = '#dfe1f6';
const GROUP_LABEL = '이런 걸 물어볼 수 있어요';

const StarterChip: React.FC<{
  question: string;
  primaryColor: string;
  disabled?: boolean;
  onSelect: (question: string) => void;
}> = ({ question, primaryColor, disabled, onSelect }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(question)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 11px',
        border: `1px solid ${hovered && !disabled ? primaryColor : LINE}`,
        borderRadius: 999,
        background: '#fff',
        color: INK,
        fontSize: 12.5,
        lineHeight: 1.35,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 0.15s ease',
      }}
    >
      {question}
    </button>
  );
};

interface ChatbotStartersProps {
  primaryColor: string;
  disabled?: boolean;
  onSelect: (question: string) => void;
}

const ChatbotStarters: React.FC<ChatbotStartersProps> = ({
  primaryColor,
  disabled,
  onSelect,
}) => (
  <div
    role="group"
    aria-label={GROUP_LABEL}
    style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}
  >
    <div
      style={{
        padding: '0 2px',
        fontSize: 11.5,
        fontWeight: 700,
        color: MUTED,
      }}
    >
      {GROUP_LABEL}
    </div>
    {CHATBOT_STARTER_GROUPS.map((group) => {
      const Icon = GROUP_ICONS[group.key];

      return (
        <div
          key={group.key}
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0 2px',
              fontSize: 11.5,
              fontWeight: 700,
              color: primaryColor,
            }}
          >
            <Icon size={14} strokeWidth={2} aria-hidden />
            {group.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {group.questions.map((question) => (
              <StarterChip
                key={question}
                question={question}
                primaryColor={primaryColor}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

export default ChatbotStarters;
