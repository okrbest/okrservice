import * as React from 'react';
import { ChatbotMenu } from './chatbotMenus';

interface ChatbotSuggestionsProps {
  menus: ChatbotMenu[];
  questions: string[];
  onMenuClick: (menu: ChatbotMenu) => void;
  onQuestionClick: (question: string) => void;
  onClose: () => void;
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '10px',
  color: '#94a3b8',
  borderBottom: '1px solid #f0f0f8',
};

const MENU_BUTTON_STYLE: React.CSSProperties = {
  display: 'inline-block',
  margin: '6px 6px 0',
  padding: '5px 12px',
  background: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '20px',
  fontSize: '12px',
  color: '#4f46e5',
  cursor: 'pointer',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const QUESTION_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 'calc(100% - 20px)',
  margin: '4px 10px',
  padding: '10px 12px',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  textAlign: 'left',
  fontSize: '13px',
  color: '#374151',
  cursor: 'pointer',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
  gap: '8px',
};

const ChatbotSuggestions: React.FC<ChatbotSuggestionsProps> = ({
  menus,
  questions,
  onMenuClick,
  onQuestionClick,
  onClose,
}) => {
  if (menus.length === 0 && questions.length === 0) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        background: '#fff',
        border: '1px solid #e0e0f4',
        borderBottom: 'none',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {menus.length > 0 && (
        <>
          <div style={SECTION_LABEL_STYLE}>💡 HR 메뉴 바로가기</div>
          <div style={{ padding: '0 6px 8px' }}>
            {menus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                style={MENU_BUTTON_STYLE}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onMenuClick(menu);
                  onClose();
                }}
              >
                {menu.label} →
              </button>
            ))}
          </div>
        </>
      )}

      {menus.length > 0 && questions.length > 0 && (
        <div style={{ height: '1px', background: '#f0f0f8' }} />
      )}

      {questions.length > 0 && (
        <>
          <div style={SECTION_LABEL_STYLE}>이런 질문 어때요?</div>
          <div style={{ paddingBottom: '8px' }}>
          {questions.map((q, idx) => (
            <button
              key={`question-${idx}`}
              type="button"
              style={QUESTION_BUTTON_STYLE}
              onMouseDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
              }}
              onClick={() => {
                onQuestionClick(q);
                onClose();
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
              }}
            >
              <span>{q}</span>
              <span style={{ fontSize: '12px', flexShrink: 0, opacity: 0.7 }}>↗</span>
            </button>
          ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatbotSuggestions;
