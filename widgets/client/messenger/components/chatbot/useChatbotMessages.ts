import { useState, useEffect, useRef } from "react";
import {
  ScheduledMessage,
  fetchScheduledMessages,
} from "./chatbotMessages";

const CHECK_INTERVAL_MS = 60_000; // 1분마다 시간 체크

/**
 * 현재 시각 기준으로 표시해야 할 예약 메시지를 누적해서 반환한다.
 * - 위젯이 열려 있는 동안 매 1분마다 새로운 메시지 진입 여부를 확인
 * - 한 번 표시된 메시지는 세션 내에서 계속 쌓인다 (새로고침 시 초기화)
 */
export function useChatbotMessages() {
  const [visibleMessages, setVisibleMessages] = useState<ScheduledMessage[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const shownIds = useRef(new Set<string>());

  // 마운트 시 API(또는 mock) 호출
  useEffect(() => {
    fetchScheduledMessages().then(setScheduledMessages);
  }, []);

  // scheduledMessages가 로드되면 즉시 체크 + 1분 인터벌 등록
  useEffect(() => {
    if (scheduledMessages.length === 0) return;

    const checkMessages = () => {
      const now = new Date();
      const newMessages: ScheduledMessage[] = [];

      for (const msg of scheduledMessages) {
        if (shownIds.current.has(msg.id)) continue;

        const [hours, minutes] = msg.targetTime.split(":").map(Number);

        // targetTime 기준 당일 날짜로 고정
        const targetDate = new Date(now);
        targetDate.setHours(hours, minutes, 0, 0);

        const notifyAt = new Date(
          targetDate.getTime() - msg.notifyBefore * 60 * 1000
        );

        if (now >= notifyAt) {
          shownIds.current.add(msg.id);
          newMessages.push({
            ...msg,
            shownAt: now.toISOString(),
          });
        }
      }

      if (newMessages.length > 0) {
        setVisibleMessages((prev) => [...prev, ...newMessages]);
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scheduledMessages]);

  return visibleMessages;
}
