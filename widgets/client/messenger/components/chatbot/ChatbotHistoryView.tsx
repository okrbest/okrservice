import * as React from 'react';
import { motion } from 'framer-motion';
import Container from '../common/Container';
import { useRouter } from '../../context/Router';
import {
  ChatHistoryEntry,
  deleteIndexEntry,
  getActiveSessionId,
  loadIndex,
  setActiveSessionId,
  startNewSession,
} from './chatHistory';
import { chatbotTheme } from './chatbotTheme';

const T = chatbotTheme;

function TrashIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyHistoryIcon({ color }: { color: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h16v12H8l-4 4V4Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const EMPTY_STATE_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '40px 20px',
  textAlign: 'center',
  color: T.color.mutedForeground,
  fontSize: '13px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
};

const LIST_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px',
};

// 참고 UI(.cmm-ai-convitem)와 동일 — 둥근 카드형 행, hover 시 옅은 배경
// 현재 활성 세션은 좌측 액센트 바 + 은은한 배경 틴트로 구분
function rowStyle(isHovered: boolean, isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    margin: '2px 0',
    borderRadius: T.radius.md,
    background: isActive
      ? T.color.accentSoft
      : isHovered
        ? T.color.muted
        : 'transparent',
    borderLeft: `3px solid ${isActive ? T.color.accent : 'transparent'}`,
    cursor: 'pointer',
    transition: 'background 0.12s ease, border-color 0.12s ease',
  };
}

const ROW_TEXT_COLUMN_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const ROW_TITLE_STYLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: T.color.foreground,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const ROW_SUBTITLE_STYLE: React.CSSProperties = {
  fontSize: '11px',
  color: T.color.mutedForeground,
};

function deleteButtonStyle(isHovered: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    width: '24px',
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    lineHeight: 1,
    borderRadius: T.radius.sm,
    cursor: 'pointer',
    color: isHovered ? T.color.destructive : T.color.mutedForeground,
    background: isHovered ? '#fdecea' : 'transparent',
    transition: 'background 0.12s ease, color 0.12s ease',
  };
}

const MAX_TITLE_LENGTH = 40;

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_TITLE_LENGTH
    ? `${trimmed.slice(0, MAX_TITLE_LENGTH)}…`
    : trimmed;
}

function formatEntryTime(updatedAt: number): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

const ChatbotHistoryView: React.FC = () => {
  const { setRoute } = useRouter();
  const [entries, setEntries] = React.useState<ChatHistoryEntry[]>(() =>
    loadIndex(),
  );
  const activeIdRef = React.useRef<string>(getActiveSessionId());
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null);
  const [hoveredDeleteId, setHoveredDeleteId] = React.useState<string | null>(
    null,
  );

  const handleSelect = (id: string) => {
    setActiveSessionId(id);
    setRoute('chatbot');
  };

  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    deleteIndexEntry(id);
    if (id === activeIdRef.current) {
      activeIdRef.current = startNewSession();
    }
    setEntries(loadIndex());
  };

  return (
    <Container backRoute="chatbot" title="채팅 이력" withBottomNavBar={true}>
      {entries.length === 0 ? (
        <div style={EMPTY_STATE_STYLE}>
          <EmptyHistoryIcon color={T.color.mutedForeground} />
          <span>아직 대화 이력이 없어요</span>
        </div>
      ) : (
        <div style={LIST_STYLE}>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(index, 8) * 0.03,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={rowStyle(
                hoveredRowId === entry.id,
                activeIdRef.current === entry.id,
              )}
              onClick={() => handleSelect(entry.id)}
              onMouseEnter={() => setHoveredRowId(entry.id)}
              onMouseLeave={() =>
                setHoveredRowId((cur) => (cur === entry.id ? null : cur))
              }
            >
              <div style={ROW_TEXT_COLUMN_STYLE}>
                <div style={ROW_TITLE_STYLE}>
                  {truncate(entry.firstMessage)}
                </div>
                <div style={ROW_SUBTITLE_STYLE}>
                  {formatEntryTime(entry.updatedAt)}
                </div>
              </div>
              <span
                role="button"
                aria-label="대화 삭제"
                style={deleteButtonStyle(hoveredDeleteId === entry.id)}
                onClick={(e) => handleDelete(e, entry.id)}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  setHoveredDeleteId(entry.id);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  setHoveredDeleteId((cur) => (cur === entry.id ? null : cur));
                }}
              >
                <TrashIcon
                  color={
                    hoveredDeleteId === entry.id
                      ? T.color.destructive
                      : T.color.mutedForeground
                  }
                />
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default ChatbotHistoryView;
