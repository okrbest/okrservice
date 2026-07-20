import { getEnv } from "../../../utils";

/**
 * clientTools — R1 클라이언트 실행 위임 위젯측 프로토콜 (TeamplGPT specs/003).
 *
 * 서버 SSE `clientToolRequest` 이벤트를 받아:
 *   1) 부모 페이지(kiwibox)의 로더 브리지에 postMessage로 실행 위임
 *   2) 브리지 결과를 받아 위젯 서버 `/ai-chat/tool-result` 프록시로 회신
 *
 * 부모 origin은 최초 로드 시 document.referrer로 고정(pin)하여
 * postMessage 송신 대상·수신 검증에 동일하게 사용한다 (테넌트별 도메인 자동 대응).
 * 세션 쿠키는 브리지의 same-origin fetch에서만 처리 — 이 모듈은 절대 다루지 않는다.
 */
const REQUEST_TYPE = "teamplgpt:hr-tool-request";
const RESULT_TYPE = "teamplgpt:hr-tool-result";
// 타임아웃 중첩 계약(작업지시서 §3.1): 브리지 fetch 20s < 위젯 대기 25s < broker 30s.
// 브리지보다 짧으면 kiwibox 지연 응답 구간에서 진짜 결과가 유실되고 거짓 실패가 회신된다.
const BRIDGE_TIMEOUT_MS = 25000;

export const CLIENT_TOOL_EVENT_TYPE = "clientToolRequest";

export interface ClientToolSpec {
  transport: string;
  path: string;
  method: string;
  form: Record<string, string>;
}

export interface ClientToolChunk {
  callId?: string;
  spec?: ClientToolSpec;
}

interface BridgeResult {
  ok: boolean;
  status: number;
  body: string;
}

let pinnedParentOrigin: string | null | undefined;

function getParentOrigin(): string | null {
  if (pinnedParentOrigin !== undefined) return pinnedParentOrigin;
  try {
    pinnedParentOrigin = document.referrer
      ? new URL(document.referrer).origin
      : null;
  } catch {
    pinnedParentOrigin = null;
  }
  return pinnedParentOrigin;
}

/** 테스트 전용 — pin된 origin 초기화 */
export function __resetPinnedOriginForTest(): void {
  pinnedParentOrigin = undefined;
}

function requestBridge(
  callId: string,
  spec: ClientToolSpec,
  origin: string | null
): Promise<BridgeResult> {
  return new Promise((resolve, reject) => {
    if (!origin || window.parent === window) {
      reject(new Error("no parent bridge available"));
      return;
    }
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("bridge timeout"));
    }, BRIDGE_TIMEOUT_MS);

    function onMessage(event: MessageEvent) {
      if (event.origin !== origin) return;
      const m = event.data;
      if (!m || m.type !== RESULT_TYPE || m.callId !== callId) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve({
        ok: m.ok === true,
        status: Number(m.status) || 0,
        body: typeof m.body === "string" ? m.body : "",
      });
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: REQUEST_TYPE, callId, spec }, origin);
  });
}

/**
 * SSE clientToolRequest 처리 — 브리지 왕복 후 위젯 서버 프록시로 결과 회신.
 * 실패해도 반드시 회신한다 (미회신 시 TeamplGPT 서버가 30초 대기).
 */
export async function handleClientToolRequest(
  chunk: ClientToolChunk,
  sessionId: string
): Promise<void> {
  const { callId, spec } = chunk;
  if (!callId || !spec) return;

  const result = await requestBridge(callId, spec, getParentOrigin()).catch(
    (e: Error): BridgeResult => ({
      ok: false,
      status: 0,
      body: `widget: ${e.message}`,
    })
  );

  const { ROOT_URL } = getEnv();
  const baseUrl = (ROOT_URL || "").replace(/\/$/, "");

  try {
    const resp = await fetch(`${baseUrl}/ai-chat/tool-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, sessionId, ...result }),
    });
    // 무음 삼킴 제거 — 회신 실패 원인을 콘솔에 남겨 사후 추적 가능하게.
    // 404 matched:false = upstream이 이 callId의 대기 호출을 못 찾음(타임아웃·타 백엔드).
    if (!resp.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[clientTools] tool-result ${resp.status} callId=${callId.slice(0, 8)}`
      );
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[clientTools] tool-result 전송 실패 callId=${callId.slice(0, 8)}`, e);
    // 재시도 안 함 — 서버 타임아웃(30s)에 맡김
  }
}
