import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { ChatbotMenu } from './chatbotMenus';
import { getMenuIcon } from './menuIcons';

// 답변 아래 "HR 메뉴 바로가기" 패널 — 메뉴마다 아이콘·이름·한 줄 설명을 한 줄로.
// 브랜드 색은 아이콘 칸의 옅은 틴트와 아이콘에만 쓴다.

const PANEL_STYLE: React.CSSProperties = {
  alignSelf: 'stretch',
  marginTop: '6px',
  marginBottom: '10px',
  background: '#fff',
  border: '1px solid #e6e7ef',
  borderRadius: '14px',
  overflow: 'hidden',
};

const CAPTION_STYLE: React.CSSProperties = {
  padding: '10px 12px 4px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: '#6d6f78',
};

const rowStyle = (
  isFirst: boolean,
  isHovered: boolean,
): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  borderTop: isFirst ? 'none' : '1px solid #e6e7ef',
  background: isHovered ? '#f5f6fe' : 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  color: '#1a1b25',
  outline: 'none',
  transition: 'background 0.12s ease',
});

const iconBoxStyle = (primaryColor: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '9px',
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  background: `color-mix(in srgb, ${primaryColor} 12%, white)`,
  color: primaryColor,
});

type Props = {
  menus: ChatbotMenu[];
  primaryColor: string;
  onSelect: (menu: ChatbotMenu) => void;
};

const AnswerMenuPanel: React.FC<Props> = ({
  menus,
  primaryColor,
  onSelect,
}) => {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  if (menus.length === 0) {
    return null;
  }

  return (
    <div role="group" aria-label="HR 메뉴 바로가기" style={PANEL_STYLE}>
      <div style={CAPTION_STYLE}>HR 메뉴 바로가기</div>
      {menus.map((menu, index) => {
        const Icon = getMenuIcon(menu);
        return (
          <button
            key={menu.id}
            type="button"
            style={rowStyle(index === 0, hoveredId === menu.id)}
            onMouseEnter={() => setHoveredId(menu.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(menu.id)}
            onBlur={() => setHoveredId(null)}
            onClick={() => onSelect(menu)}
          >
            <span style={iconBoxStyle(primaryColor)}>
              <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span
              style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {menu.label}
              </span>
              <span style={{ fontSize: '11.5px', color: '#6d6f78' }}>
                {menu.description}
              </span>
            </span>
            <ChevronRight
              size={16}
              aria-hidden="true"
              style={{ marginLeft: 'auto', color: '#9a9ca6', flexShrink: 0 }}
            />
          </button>
        );
      })}
    </div>
  );
};

export default AnswerMenuPanel;
