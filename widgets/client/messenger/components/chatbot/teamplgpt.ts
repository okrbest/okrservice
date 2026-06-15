const DEFAULT_BASE_URL = "https://demo.teamplgpt.com";
const DEFAULT_WORKSPACE = "5240";
const DEFAULT_API_KEY = "N3GT9T5-JB44B7K-MMFSNPE-Y4F0BKN";

export interface AiChatConfig {
  baseUrl?: string;
  workspace?: string;
  apiToken?: string;
}

export interface ChatChunk {
  textResponse: string;
  close: boolean;
  error: string | null;
}

export async function* streamChat(
  message: string,
  sessionId: string,
  config: AiChatConfig = {}
): AsyncGenerator<ChatChunk> {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const workspace = config.workspace || DEFAULT_WORKSPACE;
  const apiToken = config.apiToken || DEFAULT_API_KEY;

  const response = await fetch(
    `${baseUrl}/api/v1/workspace/${workspace}/stream-chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        message,
        mode: "chat",
        sessionId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TeamplGPT API error: ${response.status}`);
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
        yield chunk;
        if (chunk.close) return;
      } catch {
        // 파싱 실패 청크 무시
      }
    }
  }
}
