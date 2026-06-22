import * as React from "react";
import Container from "../common/Container";
import { CHATBOT_MENUS, CHATBOT_MENU_CATEGORIES } from "./chatbotMenus";
import { useRouter } from "../../context/Router";
import { getColor } from "../../utils/util";
import { useChatbotMessages } from "./useChatbotMessages";
import { useRpaMessages } from "../../context/RpaMessage";
import { buildHrUrl } from "./getHrBaseUrl";
import { useChatbotButtonMessages, ChatbotButtonCardMessage } from "../../context/ChatbotButtonMessages";
import { resolveRpaButtons } from "./rpaButtons";
import { ScheduledMessage } from "./chatbotMessages";
import { RpaMessageItem } from "../../context/RpaMessage";
import { streamChat } from "./teamplgpt";
import { connection } from "../../connection";
import { useChatbotKeywordSuggestions } from './useChatbotKeywordSuggestions';
import ChatbotSuggestions from './ChatbotSuggestions';


const DIVIDER_STYLE: React.CSSProperties = {
  height: "1px",
  background: "linear-gradient(90deg, #e0e0f0 0%, transparent 100%)",
  margin: "10px 0",
};

const CARD_BASE_STYLE: React.CSSProperties = {
  background: "#fff",
  borderWidth: "1.5px",
  borderStyle: "solid",
  borderColor: "#ebebf5",
  borderRadius: "12px",
  minHeight: "52px",
  height: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "500",
  color: "#374151",
  cursor: "pointer",
  lineHeight: 1.35,
  padding: "8px 6px",
  boxShadow: "0 1px 3px rgba(99,102,241,0.06)",
  transition: "all 0.18s ease",
  boxSizing: "border-box" as const,
  whiteSpace: "normal" as const,
  wordBreak: "keep-all" as const,
  overflowWrap: "anywhere" as const,
  minWidth: 0,
  outline: "none",
  WebkitAppearance: "none",
  appearance: "none",
  WebkitTapHighlightColor: "transparent",
};

const BOT_AVATAR_STYLE: React.CSSProperties = {
  width: "28px",
  height: "28px",
  background: "linear-gradient(135deg, #6366f1, #a78bfa)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  flexShrink: 0,
};

const MESSAGE_COLUMN_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
  minWidth: 0,
  maxWidth: "calc(100% - 36px)",
};

const BUBBLE_STYLE: React.CSSProperties = {
  background: "#fff",
  borderRadius: "4px 14px 14px 14px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.55,
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  maxWidth: "100%",
  width: "fit-content",
  alignSelf: "flex-start",
};

const ACTION_BUTTON_GROUP_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "10px",
  alignSelf: "flex-start",
  alignItems: "flex-start",
  width: "fit-content",
  maxWidth: "100%",
};

function createActionButtonStyle(
  primaryColor: string,
  isHovered: boolean
): React.CSSProperties {
  return {
    width: "fit-content",
    maxWidth: "100%",
    padding: "10px 18px",
    background: isHovered
      ? `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`
      : primaryColor,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.15s ease",
    outline: "none",
    WebkitAppearance: "none",
    appearance: "none",
    boxShadow: isHovered
      ? "0 6px 16px rgba(99,102,241,0.35)"
      : "0 2px 8px rgba(99,102,241,0.25)",
    transform: isHovered ? "translateY(-1px)" : "none",
    letterSpacing: "0.2px",
    whiteSpace: "nowrap",
  };
}

function formatMessageTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getMessageTimestamp(value?: string): number {
  if (!value) return 0;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    // seconds 단위이면 ms로 변환 (10^10 미만이면 초 단위로 판단)
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRpaDisplayText(msg: { message?: string }): string {
  return msg.message || "알림이 도착했습니다.";
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${keyPrefix}-${i++}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(
        <code
          key={`${keyPrefix}-${i++}`}
          style={{
            background: "#f0f0f8",
            borderRadius: "3px",
            padding: "1px 5px",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "#6366f1",
          }}
        >
          {match[4]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={key} style={{ margin: "4px 0", paddingLeft: "18px" }}>
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const bullet = line.match(/^[-*]\s+(.+)/);
    const numbered = line.match(/^\d+[.)]\s+(.+)/);

    if (h2) {
      flushList(`list-${idx}`);
      nodes.push(
        <div
          key={idx}
          style={{
            fontWeight: 700,
            fontSize: "13px",
            color: "#374151",
            marginTop: "10px",
            marginBottom: "2px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "3px",
          }}
        >
          {renderInline(h2[1], `${idx}`)}
        </div>
      );
    } else if (h3) {
      flushList(`list-${idx}`);
      nodes.push(
        <div
          key={idx}
          style={{
            fontWeight: 600,
            fontSize: "12.5px",
            color: "#4b5563",
            marginTop: "7px",
            marginBottom: "2px",
          }}
        >
          {renderInline(h3[1], `${idx}`)}
        </div>
      );
    } else if (bullet || numbered) {
      const content = bullet ? bullet[1] : (numbered as RegExpMatchArray)[1];
      listItems.push(
        <li key={idx} style={{ marginBottom: "2px", lineHeight: 1.5 }}>
          {renderInline(content, `${idx}`)}
        </li>
      );
    } else if (line.trim() === "") {
      flushList(`list-${idx}`);
      nodes.push(<div key={idx} style={{ height: "4px" }} />);
    } else {
      flushList(`list-${idx}`);
      nodes.push(
        <div key={idx} style={{ lineHeight: 1.6 }}>
          {renderInline(line, `${idx}`)}
        </div>
      );
    }
  });

  flushList("list-end");
  return nodes;
}

interface AiMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  createdAt: number;
  streaming?: boolean;
}

type TimelineItem =
  | { kind: "scheduled"; sortKey: number; data: ScheduledMessage }
  | { kind: "rpa"; sortKey: number; data: RpaMessageItem }
  | { kind: "suggestion"; sortKey: number; data: ChatbotButtonCardMessage }
  | { kind: "ai-user"; sortKey: number; data: AiMessage }
  | { kind: "ai-bot"; sortKey: number; data: AiMessage };

function buildTimelineItems(
  scheduledMessages: ScheduledMessage[],
  rpaMessages: RpaMessageItem[],
  buttonCardMessages: ChatbotButtonCardMessage[],
  aiMessages: AiMessage[],
): TimelineItem[] {
  // 모든 메시지를 클라이언트 실제 수신 시각(화면에 나타난 시각) 기준으로 통합 정렬
  // RPA: clientReceivedAt (히스토리=로드시각, 구독=수신시각)
  // AI: createdAt (Date.now() 기반)
  return [
    ...scheduledMessages.map((msg) => ({
      kind: "scheduled" as const,
      sortKey: getMessageTimestamp(msg.shownAt),
      data: msg,
    })),
    ...rpaMessages.map((msg) => ({
      kind: "rpa" as const,
      sortKey: msg.clientReceivedAt ?? getMessageTimestamp(msg.receivedAt),
      data: msg,
    })),
    ...buttonCardMessages.map((msg) => ({
      kind: "suggestion" as const,
      sortKey: getMessageTimestamp(msg.createdAt),
      data: msg,
    })),
    ...aiMessages.map((msg) => ({
      kind: (msg.role === "user" ? "ai-user" : "ai-bot") as "ai-user" | "ai-bot",
      sortKey: msg.createdAt,
      data: msg,
    })),
  ].sort((a, b) => a.sortKey - b.sortKey);
}

const USER_BUBBLE_STYLE: React.CSSProperties = {
  background: "#6366f1",
  borderRadius: "14px 4px 14px 14px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#fff",
  lineHeight: 1.55,
  maxWidth: "100%",
  width: "fit-content",
  alignSelf: "flex-end",
  boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
};

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const primaryColor = getColor() || "#6366f1";
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const scheduledMessages = useChatbotMessages();
  const { rpaMessages } = useRpaMessages();
  const { buttonCardMessages } = useChatbotButtonMessages();
  const [inputValue, setInputValue] = React.useState('');
  const [inputFocused, setInputFocused] = React.useState(false);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [dismissedForValue, setDismissedForValue] = React.useState<string | null>(null);
  const { menus: suggestionMenus, questions: suggestionQuestions } =
    useChatbotKeywordSuggestions(inputValue);

  const showSuggestions =
    dismissedForValue !== inputValue &&
    (suggestionMenus.length > 0 || suggestionQuestions.length > 0);

  const aiConfig = connection.setting?.aiChat ?? {};
  const sessionId = connection.data?.customerId || "anonymous";
  const storageKey = `erxes_ai_chat_${sessionId}`;

  // localStorage에서 이전 대화 복원 (undefined 텍스트 정리)
  const [aiMessages, setAiMessages] = React.useState<AiMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed: AiMessage[] = JSON.parse(saved);
      return parsed.map((m) => ({
        ...m,
        text: (m.text ?? "").replace(/^undefined/, ""),
      }));
    } catch {
      return [];
    }
  });

  // aiMessages 변경 시 localStorage에 저장 (streaming 중인 메시지 제외)
  React.useEffect(() => {
    try {
      const toSave = aiMessages.map((m) => ({ ...m, streaming: false }));
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {
      // localStorage 용량 초과 등 무시
    }
  }, [aiMessages, storageKey]);

  const timelineItems = React.useMemo(
    () => buildTimelineItems(scheduledMessages, rpaMessages, buttonCardMessages, aiMessages),
    [scheduledMessages, rpaMessages, buttonCardMessages, aiMessages]
  );

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timelineItems.length, aiMessages]);

  const handleMenuClick = (title: string, pathOrUrl: string) => {
    setChatbotMenu({ title, url: buildHrUrl(pathOrUrl) });
    setRoute("chatbot-iframe");
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    const now = Date.now();
    const userMsg: AiMessage = { id: `u-${now}`, role: "user", text, createdAt: now };
    const botMsgId = `b-${now + 1}`;
    // createdAt은 첫 청크 수신 시점으로 업데이트 — 전송 시점으로 고정하면
    // 그 사이에 도착한 RPA 메시지보다 위에 정렬됨
    const botMsg: AiMessage = { id: botMsgId, role: "bot", text: "", createdAt: now + 1, streaming: true };

    setAiMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue('');
    setDismissedForValue('');
    setIsStreaming(true);

    try {
      let accumulated = "";
      let firstChunk = true;
      for await (const chunk of streamChat(text, sessionId, aiConfig)) {
        if (chunk.error) break;
        accumulated += chunk.textResponse ?? "";
        const receivedAt = Date.now();
        setAiMessages((prev) =>
          prev.map((m) => {
            if (m.id !== botMsgId) return m;
            return {
              ...m,
              text: accumulated,
              streaming: !chunk.close,
              // 첫 청크 수신 시각으로 createdAt 업데이트
              createdAt: firstChunk ? receivedAt : m.createdAt,
            };
          })
        );
        firstChunk = false;
      }
    } catch (e) {
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, text: "오류가 발생했습니다. 다시 시도해주세요.", streaming: false } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Container withBottomNavBar={true} showBackButton={false}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          minHeight: 0,
          height: "100%",
          background: "#f5f6fc",
        }}
      >
        {/* ── 채팅 영역: 인사 + 시간대 메시지 (스크롤) ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* 봇 인사 말풍선 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={BOT_AVATAR_STYLE}>🤖</div>
            <div style={MESSAGE_COLUMN_STYLE}>
              <div style={BUBBLE_STYLE}>
                안녕하세요! 👋
                <br />
                HR 관련 질문을 AI에게 물어보세요.
              </div>
            </div>
          </div>

          {/* 시간순 통합 메시지 (예약 / RPA / 추천단어) */}
          {timelineItems.map((item) => {
            if (item.kind === "scheduled") {
              const msg = item.data;
              return (
                <div
                  key={`scheduled-${msg.id}`}
                  style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
                >
                  <div style={BOT_AVATAR_STYLE}>🤖</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>{msg.text}</div>
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div style={ACTION_BUTTON_GROUP_STYLE}>
                        {msg.buttons.map((btn) => {
                          const btnKey = `${msg.id}-${btn.label}`;
                          const isHovered = hoveredBtn === btnKey;
                          return (
                            <button
                              key={btnKey}
                              type="button"
                              tabIndex={-1}
                              style={createActionButtonStyle(primaryColor, isHovered)}
                              onMouseEnter={() => setHoveredBtn(btnKey)}
                              onMouseLeave={() => setHoveredBtn(null)}
                              onMouseDown={(e) => e.preventDefault()}
                              onFocus={(e) => e.currentTarget.blur()}
                              onClick={() => handleMenuClick(btn.label, btn.url)}
                            >
                              {btn.label} →
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!!msg.shownAt && (
                      <span
                        style={{
                          alignSelf: "flex-end",
                          fontSize: "10px",
                          color: "#94a3b8",
                          marginRight: 2,
                        }}
                      >
                        {formatMessageTime(msg.shownAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (item.kind === "rpa") {
              const msg = item.data;
              const actionButtons = resolveRpaButtons(msg.rpaCode, msg.buttons);
              return (
                <div
                  key={`rpa-${msg._id}`}
                  style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
                >
                  <div style={BOT_AVATAR_STYLE}>🤖</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>{getRpaDisplayText(msg)}</div>
                    {actionButtons.length > 0 && (
                      <div style={ACTION_BUTTON_GROUP_STYLE}>
                        {actionButtons.map((btn) => {
                          const btnKey = `${msg._id}-${btn.label}`;
                          const isHovered = hoveredBtn === btnKey;
                          return (
                            <button
                              key={btnKey}
                              type="button"
                              tabIndex={-1}
                              style={createActionButtonStyle(primaryColor, isHovered)}
                              onMouseEnter={() => setHoveredBtn(btnKey)}
                              onMouseLeave={() => setHoveredBtn(null)}
                              onMouseDown={(e) => e.preventDefault()}
                              onFocus={(e) => e.currentTarget.blur()}
                              onClick={() => handleMenuClick(btn.label, btn.path)}
                            >
                              {btn.label} →
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!!msg.receivedAt && (
                      <span style={{ alignSelf: "flex-end", fontSize: "10px", color: "#94a3b8", marginRight: 2 }}>
                        {formatMessageTime(msg.receivedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            if (item.kind === "suggestion") {
              const msg = item.data;
              return (
                <div
                  key={`suggestion-${msg.id}`}
                  style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
                >
                  <div style={BOT_AVATAR_STYLE}>🤖</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>
                      <strong>{msg.label}</strong> 관련 메뉴입니다.
                    </div>
                    <div style={ACTION_BUTTON_GROUP_STYLE}>
                      {msg.buttons.map((btn) => {
                        const btnKey = `${msg.id}-${btn.label}`;
                        const isHovered = hoveredBtn === btnKey;
                        return (
                          <button
                            key={btnKey}
                            type="button"
                            tabIndex={-1}
                            style={createActionButtonStyle(primaryColor, isHovered)}
                            onMouseEnter={() => setHoveredBtn(btnKey)}
                            onMouseLeave={() => setHoveredBtn(null)}
                            onMouseDown={(e) => e.preventDefault()}
                            onFocus={(e) => e.currentTarget.blur()}
                            onClick={() => handleMenuClick(btn.label, btn.path)}
                          >
                            {btn.label} →
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ alignSelf: "flex-end", fontSize: "10px", color: "#94a3b8", marginRight: 2 }}>
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            }

            if (item.kind === "ai-user") {
              const msg = item.data;
              return (
                <div
                  key={`ai-user-${msg.id}`}
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <div style={USER_BUBBLE_STYLE}>{msg.text}</div>
                </div>
              );
            }

            if (item.kind === "ai-bot") {
              const msg = item.data;
              return (
                <div
                  key={`ai-bot-${msg.id}`}
                  style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
                >
                  <div style={BOT_AVATAR_STYLE}>🤖</div>
                  <div style={MESSAGE_COLUMN_STYLE}>
                    <div style={BUBBLE_STYLE}>
                      {msg.text
                        ? renderMarkdown(msg.text)
                        : msg.streaming
                        ? <span style={{ color: "#94a3b8" }}>...</span>
                        : ""}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* 자동 스크롤 앵커 */}
          <div ref={chatBottomRef} />
        </div>

        {/* ── AI 채팅 입력 ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #ebebf5',
            background: '#fff',
            padding: '12px 14px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            position: 'relative',
          }}
        >
          <ChatbotSuggestions
            menus={showSuggestions ? suggestionMenus : []}
            questions={showSuggestions ? suggestionQuestions : []}
            onMenuClick={(menu) => {
              handleMenuClick(menu.label, menu.path);
              setDismissedForValue(inputValue);
            }}
            onQuestionClick={(q) => {
              setInputValue(q);
              setDismissedForValue(q);
            }}
            onClose={() => setDismissedForValue(inputValue)}
          />
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            disabled={isStreaming}
            rows={3}
            style={{
              flex: 1,
              border: `1.5px solid ${inputFocused ? primaryColor : '#e0e0f4'}`,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#374151',
              outline: 'none',
              boxSizing: 'border-box',
              background: isStreaming ? '#f5f5f5' : '#f9f9ff',
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            style={{
              flexShrink: 0,
              background: isStreaming || !inputValue.trim() ? '#c7c7d4' : primaryColor,
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isStreaming || !inputValue.trim() ? 'not-allowed' : 'pointer',
              outline: 'none',
              height: '42px',
            }}
          >
            {isStreaming ? '...' : '전송'}
          </button>
        </div>

        {/* ── 메뉴 그리드 (접기/펼치기) ── 비활성화
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #ebebf5",
            background: "#f5f6fc",
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onFocus={(e) => e.currentTarget.blur()}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              outline: "none",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6366f1" }}>
              HR 메뉴
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                transition: "transform 0.2s",
                display: "inline-block",
                transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▲
            </span>
          </button>

          {isMenuOpen && (
            <div style={{ padding: "0 14px 14px", overflowY: "auto", maxHeight: "260px" }}>
              {CHATBOT_MENU_CATEGORIES.map((cat, catIndex) => {
            const items = CHATBOT_MENUS.filter((m) => m.category === cat.key);
            const gridCols =
              cat.cols === 2
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(96px, 1fr))";

            return (
              <div key={cat.key}>
                {catIndex > 0 && <div style={DIVIDER_STYLE} />}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: "7px",
                    marginBottom: "4px",
                    alignItems: "stretch",
                  }}
                >
                  {items.map((menu) => {
                    const isHovered = hoveredId === menu.id;
                    return (
                      <button
                        key={menu.id}
                        type="button"
                        tabIndex={-1}
                        className="chatbot-menu-button"
                        style={{
                          ...CARD_BASE_STYLE,
                          ...(isHovered
                            ? {
                                background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`,
                                borderWidth: "1.5px",
                                borderStyle: "solid",
                                borderColor: "transparent",
                                color: "#fff",
                                transform: "translateY(-2px)",
                                boxShadow: `0 6px 16px rgba(99,102,241,0.28)`,
                                outline: "none",
                              }
                            : {
                                borderWidth: "1.5px",
                                borderStyle: "solid",
                                borderColor: "#ebebf5",
                                outline: "none",
                              }),
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onFocus={(e) => e.currentTarget.blur()}
                        onMouseEnter={() => setHoveredId(menu.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleMenuClick(menu.label, menu.path)}
                      >
                        {menu.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
              })}
            </div>
          )}
        </div>
        ── 메뉴 그리드 비활성화 끝 ── */}
      </div>
    </Container>
  );
};

export default ChatbotView;
