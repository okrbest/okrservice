import * as React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "../../common";
import { connection } from "../connection";

export interface ChatbotButtonCardMessage {
  id: string;
  label: string;
  buttons: { label: string; path: string }[];
  createdAt: string;
}

interface ChatbotButtonMessagesContextType {
  buttonCardMessages: ChatbotButtonCardMessage[];
  addButtonCardMessage: (
    message: Pick<ChatbotButtonCardMessage, "label" | "buttons">
  ) => void;
}

const STORAGE_KEY_PREFIX = "chatbotButtonCardMessages";

const ChatbotButtonMessagesContext =
  createContext<ChatbotButtonMessagesContextType>({
    buttonCardMessages: [],
    addButtonCardMessage: () => undefined,
  });

function getStorageKey(): string {
  const brandId = connection.setting?.brand_id || "default";
  const customerId =
    getLocalStorageItem("customerId") ||
    connection.data?.customerId ||
    "anonymous";

  return `${STORAGE_KEY_PREFIX}:${brandId}:${customerId}`;
}

function isChatbotButtonCardMessage(
  value: unknown
): value is ChatbotButtonCardMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const msg = value as ChatbotButtonCardMessage;

  return (
    typeof msg.id === "string" &&
    typeof msg.label === "string" &&
    typeof msg.createdAt === "string" &&
    Array.isArray(msg.buttons) &&
    msg.buttons.every((btn) => typeof btn.label === "string")
  );
}

function normalizeMessage(value: ChatbotButtonCardMessage): ChatbotButtonCardMessage {
  return {
    id: value.id,
    label: value.label,
    createdAt: value.createdAt,
    buttons: value.buttons.map((btn) => ({
      label: btn.label,
      path: btn.path || (btn as { url?: string }).url || "",
    })),
  };
}

function loadStoredMessages(): ChatbotButtonCardMessage[] {
  try {
    const raw = getLocalStorageItem(getStorageKey());
    if (!raw) {
      return [];
    }

    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isChatbotButtonCardMessage)
      .map(normalizeMessage);
  } catch {
    return [];
  }
}

function syncSuggestionIdRef(
  messages: ChatbotButtonCardMessage[],
  ref: React.MutableRefObject<number>
) {
  let maxId = 0;

  for (const message of messages) {
    const match = message.id.match(/^suggestion-(\d+)$/);
    if (match) {
      maxId = Math.max(maxId, Number(match[1]));
    }
  }

  ref.current = maxId;
}

export const ChatbotButtonMessagesProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [buttonCardMessages, setButtonCardMessages] = useState<
    ChatbotButtonCardMessage[]
  >(() => loadStoredMessages());
  const suggestionIdRef = useRef(0);
  const skipPersistRef = useRef(true);
  const storageKeyRef = useRef(getStorageKey());

  useEffect(() => {
    syncSuggestionIdRef(buttonCardMessages, suggestionIdRef);
  }, [buttonCardMessages]);

  useEffect(() => {
    const reloadIfStorageKeyChanged = () => {
      const nextStorageKey = getStorageKey();
      if (nextStorageKey === storageKeyRef.current) {
        return;
      }

      storageKeyRef.current = nextStorageKey;
      skipPersistRef.current = true;
      const loaded = loadStoredMessages();
      setButtonCardMessages(loaded);
      syncSuggestionIdRef(loaded, suggestionIdRef);
    };

    reloadIfStorageKeyChanged();
    const interval = setInterval(reloadIfStorageKeyChanged, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    setLocalStorageItem(
      getStorageKey(),
      JSON.stringify(buttonCardMessages)
    );
  }, [buttonCardMessages]);

  const addButtonCardMessage = (
    message: Pick<ChatbotButtonCardMessage, "label" | "buttons">
  ) => {
    setButtonCardMessages((prev) => [
      ...prev,
      {
        id: `suggestion-${(suggestionIdRef.current += 1)}`,
        label: message.label,
        buttons: message.buttons,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <ChatbotButtonMessagesContext.Provider
      value={{ buttonCardMessages, addButtonCardMessage }}
    >
      {children}
    </ChatbotButtonMessagesContext.Provider>
  );
};

export const useChatbotButtonMessages = () =>
  useContext(ChatbotButtonMessagesContext);
