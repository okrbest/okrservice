import * as React from "react";
import Container from "../common/Container";
import { CHATBOT_MENUS, CHATBOT_MENU_CATEGORIES } from "./chatbotMenus";
import { useRouter } from "../../context/Router";
import { getColor } from "../../utils/util";

const DIVIDER_STYLE: React.CSSProperties = {
  height: "1px",
  background: "linear-gradient(90deg, #e0e0f0 0%, transparent 100%)",
  margin: "10px 0",
};

const CARD_BASE_STYLE: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid #ebebf5",
  borderRadius: "12px",
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  fontSize: "12.5px",
  fontWeight: "500",
  color: "#374151",
  cursor: "pointer",
  lineHeight: 1.4,
  padding: "0 8px",
  boxShadow: "0 1px 3px rgba(99,102,241,0.06)",
  transition: "all 0.18s ease",
  boxSizing: "border-box" as const,
};

const ChatbotView: React.FC = () => {
  const { setRoute, setChatbotMenu } = useRouter();
  const primaryColor = getColor() || "#6366f1";

  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

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
          height: "100%",
          background: "#f5f6fc",
        }}
      >
        {/* 봇 인사 말풍선 */}
        <div style={{ padding: "16px 16px 10px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div
              style={{
                background: "#fff",
                borderRadius: "4px 14px 14px 14px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#374151",
                lineHeight: 1.55,
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                maxWidth: "80%",
              }}
            >
              안녕하세요! 👋
              <br />
              <strong style={{ color: primaryColor }}>HR 시스템</strong>의
              주요 기능을 바로 이용하세요.
            </div>
          </div>
        </div>

        {/* 메뉴 영역 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 14px 14px",
          }}
        >
          {CHATBOT_MENU_CATEGORIES.map((cat, catIndex) => {
            const items = CHATBOT_MENUS.filter((m) => m.category === cat.key);
            const gridCols = cat.cols === 2 ? "1fr 1fr" : "1fr 1fr 1fr";

            return (
              <div key={cat.key}>
                {catIndex > 0 && <div style={DIVIDER_STYLE} />}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: "7px",
                    marginBottom: "4px",
                  }}
                >
                  {items.map((menu) => {
                    const isHovered = hoveredId === menu.id;
                    return (
                      <button
                        key={menu.id}
                        style={{
                          ...CARD_BASE_STYLE,
                          ...(isHovered
                            ? {
                                background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`,
                                borderColor: "transparent",
                                color: "#fff",
                                transform: "translateY(-2px)",
                                boxShadow: `0 6px 16px rgba(99,102,241,0.28)`,
                              }
                            : {}),
                        }}
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
