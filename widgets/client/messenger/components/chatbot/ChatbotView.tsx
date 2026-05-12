import * as React from "react";
import Container from "../common/Container";
import { CHATBOT_MENUS, CHATBOT_MENU_CATEGORIES } from "./chatbotMenus";
import { useRouter } from "../../context/Router";
import { getColor } from "../../utils/util";
import { useChatbotMessages } from "./useChatbotMessages";

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

const BUBBLE_STYLE: React.CSSProperties = {
  background: "#fff",
  borderRadius: "4px 14px 14px 14px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.55,
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  maxWidth: "80%",
};

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const primaryColor = getColor() || "#6366f1";
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const scheduledMessages = useChatbotMessages();

  // 새 메시지가 쌓이면 자동으로 맨 아래로 스크롤
  React.useEffect(() => {
    if (scheduledMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [scheduledMessages.length]);

  const handleMenuClick = (title: string, url: string) => {
    setChatbotMenu({ title, url });
    setRoute("chatbot-iframe");
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
            overflowY: "auto",
            padding: "16px 16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: scheduledMessages.length > 0 ? 1 : 0,
            maxHeight: scheduledMessages.length > 0 ? "50%" : undefined,
          }}
        >
          {/* 봇 인사 말풍선 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={BOT_AVATAR_STYLE}>🤖</div>
            <div style={BUBBLE_STYLE}>
              안녕하세요! 👋
              <br />
              <strong style={{ color: primaryColor }}>HR 시스템</strong>의
              주요 기능을 바로 이용하세요.
            </div>
          </div>

          {/* 시간대별 메시지 (누적) */}
          {scheduledMessages.map((msg) => (
            <div
              key={msg.id}
              style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
            >
              <div style={BOT_AVATAR_STYLE}>🤖</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "80%" }}>
                <div style={BUBBLE_STYLE}>{msg.text}</div>
                {msg.buttons && msg.buttons.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {msg.buttons.map((btn) => {
                      const btnKey = `${msg.id}-${btn.label}`;
                      const isHovered = hoveredBtn === btnKey;
                      return (
                        <button
                          key={btnKey}
                          type="button"
                          tabIndex={-1}
                          style={{
                            width: "100%",
                            padding: "11px 16px",
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
                              ? `0 6px 16px rgba(99,102,241,0.35)`
                              : `0 2px 8px rgba(99,102,241,0.25)`,
                            transform: isHovered ? "translateY(-1px)" : "none",
                            letterSpacing: "0.2px",
                          }}
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
              </div>
            </div>
          ))}

          {/* 자동 스크롤 앵커 */}
          <div ref={chatBottomRef} />
        </div>

        {/* ── 메뉴 그리드 (고정) ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 14px 14px",
            borderTop: scheduledMessages.length > 0 ? "1px solid #ebebf5" : "none",
          }}
        >
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
                        onClick={() => handleMenuClick(menu.label, menu.url)}
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
      </div>
    </Container>
  );
};

export default ChatbotView;
