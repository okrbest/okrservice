import { getEnv } from "../../../utils";
import {
  CLIENT_TOOL_EVENT_TYPE,
  ClientToolSpec,
  handleClientToolRequest,
} from "./clientTools";

export interface ChatChunk {
  type?: string;
  textResponse: string | null;
  close: boolean;
  error: string | boolean | null;
  callId?: string;
  spec?: ClientToolSpec;
}

export interface StreamChatOptions {
  signal?: AbortSignal;
}

/**
 * 위젯 서버의 /ai-chat/stream 프록시를 경유해 TeamplGPT와 스트리밍 채팅.
 * API 키는 서버에서만 보관되며 클라이언트 번들에 포함되지 않는다.
 */
export async function* streamChat(
  message: string,
  sessionId: string,
  options: StreamChatOptions = {}
): AsyncGenerator<ChatChunk> {
  const { ROOT_URL } = getEnv();
  const baseUrl = (ROOT_URL || "").replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/ai-chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`AI chat error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const chunk = JSON.parse(jsonStr) as ChatChunk;
        if (chunk.type === CLIENT_TOOL_EVENT_TYPE) {
          // R1 클라이언트 실행 위임 — 브리지 왕복은 백그라운드로,
          // 스트림 소비는 계속 (await 금지), UI로는 yield하지 않음
          void handleClientToolRequest(chunk, sessionId);
          continue;
        }
        yield chunk;
        if (chunk.close) return;
      } catch {
        // 파싱 실패 청크 무시
      }
    }
  }
}
