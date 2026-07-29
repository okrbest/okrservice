import "@testing-library/jest-dom";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import ChatbotView from "../ChatbotView";
import { connection } from "../../../connection";
import { getActiveSessionId, startNewSession, saveMessages, loadIndex } from "../chatHistory";

jest.mock("../../../context/Router", () => ({
  useRouter: () => ({
    setRoute: jest.fn(),
    setChatbotMenu: jest.fn(),
    setActiveRoute: jest.fn(),
    isZoomed: false,
    setIsZoomed: jest.fn(),
  }),
}));

jest.mock("../../../context/RpaMessage", () => ({
  useRpaMessages: () => ({ rpaMessages: [] }),
}));

jest.mock("../../../context/ChatbotButtonMessages", () => ({
  useChatbotButtonMessages: () => ({ buttonCardMessages: [] }),
}));

jest.mock("../useChatbotKeywordSuggestions", () => ({
  useChatbotKeywordSuggestions: () => ({ menus: [], questions: [] }),
}));

jest.mock("../useChatbotMessages", () => ({
  useChatbotMessages: () => [],
}));

jest.mock("../teamplgpt", () => ({
  streamChat: jest.fn(),
}));

jest.mock("../../BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

// jsdom은 scrollIntoView를 구현하지 않음 (ChatbotView.tsx의 자동 스크롤 useEffect용 stub)
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("ChatbotView - 새 채팅 버튼", () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
  });

  it("대화가 비어 있으면 새 채팅 버튼을 눌러도 세션이 바뀌지 않는다", () => {
    render(<ChatbotView />);
    const before = getActiveSessionId();

    fireEvent.click(screen.getByRole("button", { name: "새 채팅" }));

    expect(getActiveSessionId()).toBe(before);
  });

  it("대화가 있으면 새 채팅 버튼을 눌러 세션을 교체하고 화면을 초기화한다", () => {
    const existingId = startNewSession();
    saveMessages(existingId, [
      { id: "u-1", role: "user", text: "안녕하세요", createdAt: 1 },
      { id: "b-1", role: "bot", text: "네 반갑습니다", createdAt: 2 },
    ]);

    render(<ChatbotView />);
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "새 채팅" }));

    expect(getActiveSessionId()).not.toBe(existingId);
    expect(screen.queryByText("안녕하세요")).not.toBeInTheDocument();
    expect(loadIndex().some((e) => e.id === existingId)).toBe(true);
    // 새 세션은 아직 메시지가 없으므로 이력에 중복 항목이 남으면 안 된다
    // (sessionId만 바꾸고 aiMessages를 그대로 두면, 이전 메시지가 새 sessionId와
    // 함께 저장되며 중복 항목이 생기는 회귀가 있었다)
    expect(loadIndex()).toHaveLength(1);
  });
});
