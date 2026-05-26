import * as React from "react";
import Container from "../common/Container";
import { CHATBOT_MENUS, CHATBOT_MENU_CATEGORIES } from "./chatbotMenus";
import { useRouter } from "../../context/Router";
import { getColor } from "../../utils/util";
import { useChatbotMessages } from "./useChatbotMessages";
import { useRpaMessages } from "../../context/RpaMessage";

const HR_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HR_BASE_URL) ?? '';

// rpaCode 별로 노출할 5240 바로가기 버튼 매핑
const RPA_BUTTON_MAP: Record<string, { label: string; url: string }[]> = {
  HR_RPA_090: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_100: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_110: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_120: [
    { label: "출퇴근 체크",   url: `${HR_BASE}/MobileMain.do` },
    { label: "연장근무신청",  url: `${HR_BASE}/MobileOvertimeAppl.do` },
  ],
  HR_RPA_130: [
    { label: "출퇴근 체크",   url: `${HR_BASE}/MobileMain.do` },
    { label: "연장근무신청",  url: `${HR_BASE}/MobileOvertimeAppl.do` },
  ],
  HR_RPA_140: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
  HR_RPA_800: [{ label: "출퇴근 체크", url: `${HR_BASE}/MobileMain.do` }],
};


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

function formatMessageTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getRpaDisplayText(msg: { message?: string }): string {
  return msg.message || "알림이 도착했습니다.";
}

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const primaryColor = getColor() || "#6366f1";
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const scheduledMessages = useChatbotMessages();
  const { rpaMessages } = useRpaMessages();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // 새 메시지가 쌓이면 자동으로 맨 아래로 스크롤
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scheduledMessages.length, rpaMessages.length]);

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
                {msg.buttons && msg.buttons.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    {msg.buttons.map((btn) => {
                      const btnKey = `${msg.id}-${btn.label}`;
                      const isHovered = hoveredBtn === btnKey;
                      return (
                        <button
                          key={btnKey}
                          type="button"
                          tabIndex={-1}
                          style={{
                            width: "86%",
                            maxWidth: "260px",
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

          {/* RPA 실시간 메시지 (KiwiBox 배치 → 서버 push) */}
          {rpaMessages.map((msg) => (
            <div
              key={msg._id}
              style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
            >
              <div style={BOT_AVATAR_STYLE}>🤖</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "80%" }}>
                <div style={BUBBLE_STYLE}>{getRpaDisplayText(msg)}</div>
                {!!msg.receivedAt && (
                  <span style={{ alignSelf: "flex-end", fontSize: "10px", color: "#94a3b8", marginRight: 2 }}>
                    {formatMessageTime(msg.receivedAt)}
                  </span>
                )}
                {/* rpaCode 에 따라 관련 5240 화면 바로가기 버튼 */}
                {RPA_BUTTON_MAP[msg.rpaCode] && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {RPA_BUTTON_MAP[msg.rpaCode].map((btn) => {
                      const btnKey = `${msg._id}-${btn.label}`;
                      const isHovered = hoveredBtn === btnKey;
                      return (
                        <button
                          key={btnKey}
                          type="button"
                          tabIndex={-1}
                          style={{
                            width: "86%",
                            maxWidth: "260px",
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
                              ? "0 6px 16px rgba(99,102,241,0.35)"
                              : "0 2px 8px rgba(99,102,241,0.25)",
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

        {/* ── 메뉴 그리드 (접기/펼치기) ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #ebebf5",
            background: "#f5f6fc",
          }}
        >
          {/* 토글 헤더 */}
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

          {/* 그리드 */}
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
          )}
        </div>
      </div>
    </Container>
  );
};

export default ChatbotView;
