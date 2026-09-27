import * as React from 'react';
import { ChevronRight, MessageSquare, X } from 'lucide-react';
import { ChatbotMenu } from './chatbotMenus';
import { getMenuIcon } from './menuIcons';

// 입력 중 추천 팝업 — 입력창 위로 떠오르는 명령 팔레트 카드.
// 반응한 단어를 머리말에 보여주고, 메뉴는 답변 아래 "HR 메뉴 바로가기" 패널과 같은 줄 모양,
// 질문은 그 단어를 형광펜으로. ↑↓·Enter·Esc 선택은 입력창(ChatbotView)이 activeIndex로 제어한다.

interface ChatbotSuggestionsProps {
  keyword?: string;
  menus: ChatbotMenu[];
  questions: string[];
  // 메뉴 → 질문 순서의 전체 항목 기준 선택 위치 (-1이면 선택 없음)
  activeIndex?: number;
  primaryColor?: string;
  onMenuClick: (menu: ChatbotMenu) => void;
  onQuestionClick: (question: string) => void;
  onClose: () => void;
}

const DEFAULT_COLOR = '#6569DF';
const INK = '#1a1b25';
const MUTED = '#6d6f78';
const FAINT = '#9a9ca6';
const LINE = '#e6e7ef';
const ACTIVE_BG = '#f5f6fe';

const CARD_STYLE: React.CSSProperties = {
  flexShrink: 0,
  margin: '0 10px',
  background: '#fff',
  border: `1px solid ${LINE}`,
  borderBottom: 'none',
  borderRadius: '16px 16px 0 0',
  boxShadow: '0 -12px 32px rgba(26,27,37,0.10)',
  overflow: 'hidden',
  animation: 'chatbot-suggest-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
};

const SECTION_STYLE: React.CSSProperties = {
  padding: '4px 12px 2px',
  fontSize: '10.5px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: FAINT,
};

const itemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: isActive ? ACTIVE_BG : 'transparent',
  textAlign: 'left',
  font: 'inherit',
  fontSize: '13px',
  color: INK,
  cursor: 'pointer',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
});

const KBD_STYLE: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '10.5px',
  background: '#f1f2f5',
  borderRadius: '4px',
  padding: '1px 5px',
  color: MUTED,
  marginRight: '2px',
};

// 질문 속 키워드를 <mark>로 감싼다
const highlight = (text: string, keyword?: string): React.ReactNode => {
  if (!keyword || !text.includes(keyword)) {
    return text;
  }
  const parts = text.split(keyword);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <mark
          style={{
            background: '#fff1b8',
            color: 'inherit',
            borderRadius: '3px',
            padding: '0 1px',
          }}
        >
          {keyword}
        </mark>
      )}
    </React.Fragment>
  ));
};

const ChatbotSuggestions: React.FC<ChatbotSuggestionsProps> = ({
  keyword,
  menus,
  questions,
  activeIndex = -1,
  primaryColor = DEFAULT_COLOR,
  onMenuClick,
  onQuestionClick,
  onClose,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState(-1);

  if (menus.length === 0 && questions.length === 0) return null;

  const isActive = (index: number) =>
    activeIndex === index || (activeIndex < 0 && hoveredIndex === index);

  return (
    <div role="listbox" aria-label="추천" style={CARD_STYLE}>
      <style>
        {`@keyframes chatbot-suggest-up{from{transform:translateY(8px);opacity:.3}to{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){[aria-label="추천"][role="listbox"]{animation:none!important}}`}
      </style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 8px 6px 12px',
          fontSize: '11.5px',
          color: MUTED,
        }}
      >
        {keyword && (
          <span
            style={{
              background: `color-mix(in srgb, ${primaryColor} 12%, white)`,
              color: primaryColor,
              borderRadius: '6px',
              padding: '1px 7px',
              fontWeight: 700,
            }}
          >
            {keyword}
          </span>
        )}
        <span>관련 추천</span>
        <button
          type="button"
          aria-label="추천 닫기"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            width: '24px',
            height: '24px',
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            borderRadius: '6px',
            background: 'transparent',
            color: FAINT,
            cursor: 'pointer',
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {menus.length > 0 && (
        <>
          <div style={SECTION_STYLE}>HR 메뉴 바로가기</div>
          {menus.map((menu, index) => {
            const Icon = getMenuIcon(menu);
            return (
              <button
                key={menu.id}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                style={itemStyle(isActive(index))}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(-1)}
                onClick={() => {
                  onMenuClick(menu);
                  onClose();
                }}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: `color-mix(in srgb, ${primaryColor} 12%, white)`,
                    color: primaryColor,
                  }}
                >
                  <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{menu.label}</span>
                  <span style={{ fontSize: '11px', color: MUTED }}>
                    {menu.description}
                  </span>
                </span>
                <ChevronRight
                  size={15}
                  aria-hidden="true"
                  style={{ marginLeft: 'auto', color: FAINT, flexShrink: 0 }}
                />
              </button>
            );
          })}
        </>
      )}

      {questions.length > 0 && (
        <>
          <div
            style={{
              ...SECTION_STYLE,
              paddingTop: menus.length > 0 ? '8px' : '4px',
            }}
          >
            이렇게 물어보세요
          </div>
          {questions.map((q, i) => {
            const index = menus.length + i;
            return (
              <button
                key={`question-${i}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                style={itemStyle(isActive(index))}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(-1)}
                // 닫기는 부모가 채운 질문 기준으로 처리 — onClose를 또 부르면 이전 입력으로 덮여 다시 뜬다
                onClick={() => onQuestionClick(q)}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: FAINT,
                  }}
                >
                  <MessageSquare
                    size={15}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>
                <span>{highlight(q, keyword)}</span>
              </button>
            );
          })}
        </>
      )}

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '4px',
          padding: '8px 12px',
          borderTop: `1px solid ${LINE}`,
          fontSize: '11px',
          color: FAINT,
        }}
      >
        <span>
          <kbd style={KBD_STYLE}>↑</kbd>
          <kbd style={KBD_STYLE}>↓</kbd> 이동
        </span>
        <span>
          <kbd style={KBD_STYLE}>Enter</kbd> 선택
        </span>
        <span>
          <kbd style={KBD_STYLE}>Esc</kbd> 닫기
        </span>
      </div>
    </div>
  );
};

export default ChatbotSuggestions;
