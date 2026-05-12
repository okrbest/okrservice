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
}

/**
 * TODO: API 연동 시 이 함수만 실제 엔드포인트로 교체
 * 예) return await fetch('/api/chatbot/scheduled-messages').then(r => r.json())
 */
export async function fetchScheduledMessages(): Promise<ScheduledMessage[]> {
  return [
    {
      id: "checkin-30min",
      targetTime: "09:00",
      notifyBefore: 30,
      text: "출근 시간이 30분 후입니다. 출퇴근 체크를 잊지 마세요! ⏰",
      buttons: [
        { label: "출퇴근 체크", url: "https://api.5240.cloud/MobileMain.do" },
      ],
    },
    {
      id: "checkin-10min",
      targetTime: "09:00",
      notifyBefore: 10,
      text: "출근까지 10분 남았습니다! 아직 체크 안 하셨다면 지금 바로 해주세요.",
      buttons: [
        { label: "출퇴근 체크", url: "https://api.5240.cloud/MobileMain.do" },
      ],
    },
    {
      id: "lunch-checkout-30min",
      targetTime: "18:00",
      notifyBefore: 30,
      text: "퇴근 시간이 30분 후입니다. 미결재 문서가 있다면 지금 처리해주세요.",
      buttons: [
        { label: "결재함 확인", url: "https://api.5240.cloud/MobileApprovalBox.do" },
      ],
    },
    {
      id: "checkout-10min",
      targetTime: "18:00",
      notifyBefore: 10,
      text: "퇴근 10분 전입니다. 퇴근 체크를 잊지 마세요! 🏠",
      buttons: [
        { label: "출퇴근 체크", url: "https://api.5240.cloud/MobileMain.do" },
      ],
    },
  ];
}
