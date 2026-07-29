import * as React from "react";
import Container from "../common/Container";
import { useRouter } from "../../context/Router";
import {
  ChatHistoryEntry,
  deleteIndexEntry,
  getActiveSessionId,
  loadIndex,
  setActiveSessionId,
  startNewSession,
} from "./chatHistory";

const EMPTY_STATE_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "40px 20px",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "13px",
};

const LIST_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 16px",
  borderBottom: "1px solid #ebebf5",
  cursor: "pointer",
};

const ROW_TEXT_COLUMN_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const ROW_TITLE_STYLE: React.CSSProperties = {
  fontSize: "13px",
  color: "#374151",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const ROW_SUBTITLE_STYLE: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
};

const DELETE_BUTTON_STYLE: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "16px",
  cursor: "pointer",
  padding: "4px",
  lineHeight: 1,
};

const MAX_TITLE_LENGTH = 40;

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_TITLE_LENGTH
    ? `${trimmed.slice(0, MAX_TITLE_LENGTH)}…`
    : trimmed;
}

function formatEntryTime(updatedAt: number): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

const ChatbotHistoryView: React.FC = () => {
  const { setRoute } = useRouter();
  const [entries, setEntries] = React.useState<ChatHistoryEntry[]>(() => loadIndex());
  const activeIdRef = React.useRef<string>(getActiveSessionId());

  const handleSelect = (id: string) => {
    setActiveSessionId(id);
    setRoute("chatbot");
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
        <div style={EMPTY_STATE_STYLE}>아직 대화 이력이 없어요</div>
      ) : (
        <div style={LIST_STYLE}>
          {entries.map((entry) => (
            <div key={entry.id} style={ROW_STYLE} onClick={() => handleSelect(entry.id)}>
              <div style={ROW_TEXT_COLUMN_STYLE}>
                <div style={ROW_TITLE_STYLE}>{truncate(entry.firstMessage)}</div>
                <div style={ROW_SUBTITLE_STYLE}>{formatEntryTime(entry.updatedAt)}</div>
              </div>
              <span
                role="button"
                aria-label="대화 삭제"
                style={DELETE_BUTTON_STYLE}
                onClick={(e) => handleDelete(e, entry.id)}
              >
                🗑
              </span>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default ChatbotHistoryView;
