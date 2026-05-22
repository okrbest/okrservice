export interface ScheduledMessageButton {
  label: string;
  url: string;
}

export interface ScheduledMessage {
  id: string;
  /**
   * 실제 이벤트 발생 시각 "HH:MM" (예: "09:00")
   * notifyBefore 분 전에 메시지가 표시된다.
   */
  targetTime: string;
  /** targetTime 기준 몇 분 전에 알림을 표시할지 */
  notifyBefore: number;
  text: string;
  buttons?: ScheduledMessageButton[];
  shownAt?: string;
}

/**
 * TODO: API 연동 시 이 함수만 실제 엔드포인트로 교체
 * 예) return await fetch('/api/chatbot/scheduled-messages').then(r => r.json())
 */
export async function fetchScheduledMessages(): Promise<ScheduledMessage[]> {
  return [];
}
