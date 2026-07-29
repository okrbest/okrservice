import "@testing-library/jest-dom";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import ChatbotHistoryView from "../ChatbotHistoryView";
import { connection } from "../../../connection";
import {
  getActiveSessionId,
  loadIndex,
  startNewSession,
  upsertIndexEntry,
  saveMessages,
} from "../chatHistory";

const mockSetRoute = jest.fn();

jest.mock("../../../context/Router", () => ({
  useRouter: () => ({
    setRoute: mockSetRoute,
    setChatbotMenu: jest.fn(),
    setActiveRoute: jest.fn(),
    isZoomed: false,
    setIsZoomed: jest.fn(),
  }),
}));

jest.mock("../../BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

describe("ChatbotHistoryView", () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    mockSetRoute.mockClear();
  });

  it("이력이 없으면 안내 문구를 표시한다", () => {
    render(<ChatbotHistoryView />);
    expect(screen.getByText("아직 대화 이력이 없어요")).toBeInTheDocument();
  });

  it("첫 메시지와 날짜/시간을 표시한다", () => {
    upsertIndexEntry({
      id: "a",
      firstMessage: "연차 신청 방법 알려줘",
      updatedAt: new Date(2026, 6, 29, 14, 30).getTime(),
    });
    render(<ChatbotHistoryView />);
    expect(screen.getByText("연차 신청 방법 알려줘")).toBeInTheDocument();
    expect(screen.getByText("07/29 14:30")).toBeInTheDocument();
  });

  it("항목 클릭 시 해당 세션으로 전환하고 chatbot으로 이동한다", () => {
    // getActiveSessionId()는 UUID 형식만 유효한 포인터로 인정하므로,
    // 여기서는 반드시 UUID 형식의 id를 사용해야 한다 (실제 세션 id도 항상 UUID).
    const entryId = "22222222-2222-4222-8222-222222222222";
    upsertIndexEntry({ id: entryId, firstMessage: "연차 신청 방법", updatedAt: 1 });
    render(<ChatbotHistoryView />);

    fireEvent.click(screen.getByText("연차 신청 방법"));

    expect(getActiveSessionId()).toBe(entryId);
    expect(mockSetRoute).toHaveBeenCalledWith("chatbot");
  });

  it("삭제 아이콘 클릭 시 항목과 메시지 저장소를 지우고 라우팅하지 않는다", () => {
    upsertIndexEntry({ id: "a", firstMessage: "연차 신청 방법", updatedAt: 1 });
    saveMessages("a", [{ id: "m1", role: "user", text: "연차 신청 방법", createdAt: 1 }]);
    render(<ChatbotHistoryView />);

    fireEvent.click(screen.getByRole("button", { name: "대화 삭제" }));

    expect(screen.queryByText("연차 신청 방법")).not.toBeInTheDocument();
    expect(loadIndex()).toEqual([]);
    expect(mockSetRoute).not.toHaveBeenCalled();
  });

  it("현재 활성 대화를 삭제하면 새 세션이 발급된다", () => {
    const activeId = startNewSession();
    upsertIndexEntry({ id: activeId, firstMessage: "연차 신청 방법", updatedAt: 1 });
    render(<ChatbotHistoryView />);

    fireEvent.click(screen.getByRole("button", { name: "대화 삭제" }));

    expect(getActiveSessionId()).not.toBe(activeId);
  });
});
