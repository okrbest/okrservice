/**
 * hrBridge 단위 테스트 — R1 브리지 보안 규칙 (작업지시서 §1.4/§1.5/§4)
 * allowlist 거부 / searchType=mobile 거부 / $SELF_STAFF_ID 치환 / origin·source 검증
 */
import { initHrBridge } from "../hrBridge";

declare const window: any;

const WIDGET_ORIGIN = "https://widgets.example.com";

function makeIframe(): HTMLIFrameElement {
  // DOM에 붙이지 않음 — jsdom이 teardown 시 오버라이드된 contentWindow를
  // close하려다 실패하는 문제 회피 (브리지는 contentWindow 참조만 사용)
  const iframe = document.createElement("iframe");
  iframe.src = `${WIDGET_ORIGIN}/messenger`;
  return iframe;
}

function dispatchRequest(
  iframe: HTMLIFrameElement,
  data: any,
  overrides: { origin?: string; source?: any } = {}
) {
  const event = new MessageEvent("message", {
    data,
    origin: overrides.origin ?? WIDGET_ORIGIN,
  });
  // MessageEvent 생성자는 source에 실제 Window 프록시만 허용 — defineProperty로 주입
  Object.defineProperty(event, "source", {
    value: "source" in overrides ? overrides.source : iframe.contentWindow,
  });
  window.dispatchEvent(event);
}

const request = (spec: any, callId = "call-1") => ({
  type: "teamplgpt:hr-tool-request",
  callId,
  spec,
});

describe("initHrBridge", () => {
  let fetchMock: jest.Mock;
  let replyMock: jest.Mock;
  let iframe: HTMLIFrameElement;

  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    document.body.innerHTML = "";
    window.erxesSettings = {
      messenger: { hrBaseUrl: "https://kiwibox.example.com" },
    };

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("RESPONSE_BODY"),
    });
    (global as any).fetch = fetchMock;

    iframe = makeIframe();
    replyMock = jest.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: replyMock },
      configurable: true,
    });

    initHrBridge(iframe);
  });

  it("허용 경로 요청을 kiwibox로 fetch하고 결과를 회신한다", async () => {
    const staffInput = document.createElement("input");
    staffInput.id = "searchUserId";
    staffInput.value = "STAFF123";
    document.body.appendChild(staffInput);

    dispatchRequest(
      iframe,
      request({
        transport: "kiwibox-bridge",
        path: "/getMBLHomeLeaveDetail.do",
        method: "POST",
        form: { searchType: "1", cmmSearchStaffId: "$SELF_STAFF_ID" },
      })
    );
    await flush();

    // hrBaseUrl에 컨텍스트 경로 없음 → /kiwibox 보정 (작업지시서 §4)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kiwibox.example.com/kiwibox/getMBLHomeLeaveDetail.do",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: "searchType=1&cmmSearchStaffId=STAFF123",
      })
    );
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ callId: "call-1", ok: true, status: 200, body: "RESPONSE_BODY" }),
      WIDGET_ORIGIN
    );
  });

  it("allowlist 외 경로는 fetch 없이 거부한다", async () => {
    dispatchRequest(
      iframe,
      request({ path: "/deleteEverything.do", method: "POST", form: {} })
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: "bridge: path not allowed" }),
      WIDGET_ORIGIN
    );
  });

  it("searchType=mobile은 거부한다", async () => {
    dispatchRequest(
      iframe,
      request({
        path: "/getMBLHomeLeaveDetail.do",
        method: "POST",
        form: { searchType: "mobile" },
      })
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: "bridge: forbidden param value" }),
      WIDGET_ORIGIN
    );
  });

  it("staffId를 찾지 못하면 거부한다", async () => {
    dispatchRequest(
      iframe,
      request({
        path: "/getMBLHomeLeaveDetail.do",
        method: "POST",
        form: { cmmSearchStaffId: "$SELF_STAFF_ID" },
      })
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: "bridge: staffId not found" }),
      WIDGET_ORIGIN
    );
  });

  it("빈 #searchUserId가 먼저 있으면 값 있는 input으로 폴백한다", async () => {
    const empty = document.createElement("input");
    empty.id = "searchUserId";
    document.body.appendChild(empty);
    const filled = document.createElement("input");
    filled.id = "searchUserId";
    filled.setAttribute("value", "STAFF777");
    document.body.appendChild(filled);

    dispatchRequest(
      iframe,
      request({
        path: "/getMBLHomeLeaveDetail.do",
        method: "POST",
        form: { cmmSearchStaffId: "$SELF_STAFF_ID" },
      })
    );
    await flush();

    expect(fetchMock.mock.calls[0][1].body).toBe("cmmSearchStaffId=STAFF777");
  });

  it("origin 불일치 메시지는 무시한다", async () => {
    dispatchRequest(
      iframe,
      request({ path: "/getMBLHomeLeaveDetail.do", method: "POST", form: {} }),
      { origin: "https://evil.example.com" }
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).not.toHaveBeenCalled();
  });

  it("source가 chatbot iframe이 아니면 무시한다", async () => {
    dispatchRequest(
      iframe,
      request({ path: "/getMBLHomeLeaveDetail.do", method: "POST", form: {} }),
      { source: {} }
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).not.toHaveBeenCalled();
  });

  it("hrBaseUrl 없으면 리스너를 등록하지 않는다", async () => {
    window.erxesSettings = { messenger: {} };
    const iframe2 = makeIframe();
    const reply2 = jest.fn();
    Object.defineProperty(iframe2, "contentWindow", {
      value: { postMessage: reply2 },
      configurable: true,
    });
    initHrBridge(iframe2);

    dispatchRequest(
      iframe2,
      request({ path: "/getMBLHomeLeaveDetail.do", method: "POST", form: {} })
    );
    await flush();
    expect(reply2).not.toHaveBeenCalled();
  });

  it("hrBaseUrl에 컨텍스트 경로가 이미 있으면 보정하지 않는다", async () => {
    window.erxesSettings = {
      messenger: { hrBaseUrl: "https://kiwibox.example.com/kiwibox/" },
    };
    const iframe3 = makeIframe();
    Object.defineProperty(iframe3, "contentWindow", {
      value: { postMessage: jest.fn() },
      configurable: true,
    });
    initHrBridge(iframe3);

    dispatchRequest(
      iframe3,
      request({ path: "/getTodoIconCnt.do", method: "POST", form: {} }),
      undefined
    );
    // 이 이벤트는 iframe(첫 번째)의 리스너에도 도달하지만 source 불일치로 무시됨
    const event = new MessageEvent("message", {
      data: request({ path: "/getTodoIconCnt.do", method: "POST", form: {} }),
      origin: WIDGET_ORIGIN,
    });
    Object.defineProperty(event, "source", { value: iframe3.contentWindow });
    window.dispatchEvent(event);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kiwibox.example.com/kiwibox/getTodoIconCnt.do",
      expect.anything()
    );
  });
});
