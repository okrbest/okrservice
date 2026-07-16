/**
 * clientTools 단위 테스트 — R1 클라이언트 실행 위임 (작업지시서 §6.1)
 * postMessage 왕복 mock / 타임아웃 시 ok:false 회신 / origin 불일치 무시
 */
import {
  handleClientToolRequest,
  __resetPinnedOriginForTest,
  ClientToolSpec,
} from "../clientTools";

jest.mock("../../../../utils", () => ({
  getEnv: () => ({ ROOT_URL: "https://widgets.example.com" }),
}));

const PARENT_ORIGIN = "https://kiwibox.example.com";

const SPEC: ClientToolSpec = {
  transport: "kiwibox-bridge",
  path: "/getMBLHomeLeaveDetail.do",
  method: "POST",
  form: { searchType: "1", cmmSearchStaffId: "$SELF_STAFF_ID" },
};

describe("handleClientToolRequest", () => {
  let fetchMock: jest.Mock;
  let parentPostMessage: jest.Mock;

  const setReferrer = (value: string) => {
    Object.defineProperty(document, "referrer", {
      value,
      configurable: true,
    });
  };

  const dispatchResult = (data: any, origin: string = PARENT_ORIGIN) => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    __resetPinnedOriginForTest();
    setReferrer(`${PARENT_ORIGIN}/main.jsp`);

    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;

    // jsdom에서 window.parent === window — 브리지 성립 조건을 위해 별도 부모 mock
    parentPostMessage = jest.fn();
    Object.defineProperty(window, "parent", {
      value: { postMessage: parentPostMessage },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, "parent", {
      value: window,
      configurable: true,
    });
  });

  it("브리지 성공 결과를 /ai-chat/tool-result로 회신한다", async () => {
    const promise = handleClientToolRequest(
      { callId: "call-1", spec: SPEC },
      "sess-1"
    );

    expect(parentPostMessage).toHaveBeenCalledWith(
      { type: "teamplgpt:hr-tool-request", callId: "call-1", spec: SPEC },
      PARENT_ORIGIN
    );

    dispatchResult({
      type: "teamplgpt:hr-tool-result",
      callId: "call-1",
      ok: true,
      status: 200,
      body: '{"leave":12}',
    });

    await promise;

    expect(fetchMock).toHaveBeenCalledWith(
      "https://widgets.example.com/ai-chat/tool-result",
      expect.objectContaining({ method: "POST" })
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({
      callId: "call-1",
      sessionId: "sess-1",
      ok: true,
      status: 200,
      body: '{"leave":12}',
    });
  });

  it("15초 타임아웃 시 ok:false로 회신한다", async () => {
    const promise = handleClientToolRequest(
      { callId: "call-2", spec: SPEC },
      "sess-1"
    );

    jest.advanceTimersByTime(15000);
    await promise;

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.ok).toBe(false);
    expect(sent.status).toBe(0);
    expect(sent.body).toContain("bridge timeout");
  });

  it("origin 불일치 메시지는 무시한다 (이후 정상 메시지로 완료)", async () => {
    const promise = handleClientToolRequest(
      { callId: "call-3", spec: SPEC },
      "sess-1"
    );

    dispatchResult(
      {
        type: "teamplgpt:hr-tool-result",
        callId: "call-3",
        ok: true,
        status: 200,
        body: "evil",
      },
      "https://evil.example.com"
    );
    expect(fetchMock).not.toHaveBeenCalled();

    dispatchResult({
      type: "teamplgpt:hr-tool-result",
      callId: "call-3",
      ok: true,
      status: 200,
      body: "good",
    });
    await promise;

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.body).toBe("good");
  });

  it("callId 불일치 메시지는 무시한다", async () => {
    const promise = handleClientToolRequest(
      { callId: "call-4", spec: SPEC },
      "sess-1"
    );

    dispatchResult({
      type: "teamplgpt:hr-tool-result",
      callId: "other-call",
      ok: true,
      status: 200,
      body: "x",
    });
    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(15000);
    await promise;
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).ok).toBe(false);
  });

  it("referrer가 없으면 즉시 ok:false 회신한다", async () => {
    __resetPinnedOriginForTest();
    setReferrer("");

    await handleClientToolRequest({ callId: "call-5", spec: SPEC }, "sess-1");

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.ok).toBe(false);
    expect(sent.body).toContain("no parent bridge available");
  });

  it("callId 또는 spec이 없으면 아무것도 하지 않는다", async () => {
    await handleClientToolRequest({ callId: "call-6" }, "sess-1");
    await handleClientToolRequest({ spec: SPEC }, "sess-1");
    expect(parentPostMessage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
