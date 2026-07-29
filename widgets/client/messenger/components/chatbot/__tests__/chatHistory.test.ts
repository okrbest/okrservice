import "@testing-library/jest-dom";
import { connection } from "../../../connection";
import {
  AiMessage,
  ChatHistoryEntry,
  getActiveSessionId,
  startNewSession,
  setActiveSessionId,
  loadMessages,
  saveMessages,
  loadIndex,
  upsertIndexEntry,
  deleteIndexEntry,
} from "../chatHistory";

describe("chatHistory", () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
  });

  describe("세션 포인터", () => {
    it("저장된 세션이 없으면 새로 생성해 반환하고, 이후 같은 값을 반환한다", () => {
      const sid = getActiveSessionId();
      expect(sid).toMatch(/^[0-9a-f-]{36}$/i);
      expect(getActiveSessionId()).toBe(sid);
    });

    it("startNewSession은 새 id를 발급하고 활성 포인터를 교체한다", () => {
      const first = getActiveSessionId();
      const second = startNewSession();
      expect(second).not.toBe(first);
      expect(getActiveSessionId()).toBe(second);
    });

    it("setActiveSessionId로 지정한 id가 활성 포인터가 된다", () => {
      setActiveSessionId("11111111-1111-4111-8111-111111111111");
      expect(getActiveSessionId()).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("customerId가 있으면 고객별로 분리된 포인터를 사용한다", () => {
      connection.data = { customerId: "cust-1" };
      const custSid = startNewSession();
      connection.data = {};
      const anonSid = getActiveSessionId();
      expect(anonSid).not.toBe(custSid);
    });
  });

  describe("메시지 저장/복원", () => {
    it("저장한 메시지를 그대로 복원한다 (streaming은 false로 저장)", () => {
      const messages: AiMessage[] = [
        { id: "m1", role: "user", text: "안녕", createdAt: 1 },
        {
          id: "m2",
          role: "bot",
          text: "네 안녕하세요",
          createdAt: 2,
          streaming: true,
        },
      ];
      saveMessages("sess-1", messages);
      expect(loadMessages("sess-1")).toEqual([
        {
          id: "m1",
          role: "user",
          text: "안녕",
          createdAt: 1,
          streaming: false,
        },
        {
          id: "m2",
          role: "bot",
          text: "네 안녕하세요",
          createdAt: 2,
          streaming: false,
        },
      ]);
    });

    it("저장된 값이 없으면 빈 배열을 반환한다", () => {
      expect(loadMessages("no-such-session")).toEqual([]);
    });

    it("손상된 JSON은 빈 배열로 폴백한다", () => {
      localStorage.setItem("erxes_ai_chat_broken", "{invalid json");
      expect(loadMessages("broken")).toEqual([]);
    });
  });

  describe("대화 이력 인덱스", () => {
    it("빈 상태에서는 빈 배열을 반환한다", () => {
      expect(loadIndex()).toEqual([]);
    });

    it("upsertIndexEntry로 항목을 추가하고 updatedAt 내림차순으로 반환한다", () => {
      upsertIndexEntry({ id: "a", firstMessage: "첫번째", updatedAt: 100 });
      upsertIndexEntry({ id: "b", firstMessage: "두번째", updatedAt: 200 });
      expect(loadIndex().map((e) => e.id)).toEqual(["b", "a"]);
    });

    it("같은 id로 upsert하면 기존 항목을 갱신한다 (중복 생성 안 함)", () => {
      upsertIndexEntry({ id: "a", firstMessage: "첫번째", updatedAt: 100 });
      upsertIndexEntry({ id: "a", firstMessage: "수정됨", updatedAt: 300 });
      const index = loadIndex();
      expect(index).toHaveLength(1);
      expect(index[0]).toEqual({
        id: "a",
        firstMessage: "수정됨",
        updatedAt: 300,
      });
    });

    it("50개를 초과하면 오래된 항목부터 제거한다", () => {
      for (let i = 0; i < 55; i++) {
        upsertIndexEntry({
          id: `id-${i}`,
          firstMessage: `msg-${i}`,
          updatedAt: i,
        });
      }
      const index = loadIndex();
      expect(index).toHaveLength(50);
      expect(index.find((e) => e.id === "id-0")).toBeUndefined();
      expect(index.find((e) => e.id === "id-54")).toBeDefined();
    });

    it("deleteIndexEntry는 인덱스와 메시지 저장소를 함께 지운다", () => {
      upsertIndexEntry({ id: "a", firstMessage: "첫번째", updatedAt: 100 });
      saveMessages("a", [{ id: "m1", role: "user", text: "hi", createdAt: 1 }]);
      deleteIndexEntry("a");
      expect(loadIndex()).toEqual([]);
      expect(loadMessages("a")).toEqual([]);
    });

    it("손상된 JSON은 빈 배열로 폴백한다", () => {
      localStorage.setItem("erxes_ai_chat_index_anon", "{invalid json");
      expect(loadIndex()).toEqual([]);
    });
  });
});
