// 챗봇 첫 화면의 주제별 질문 버튼(무엇을 물어볼지 모를 때).
// 질문은 chatbotKeywordMap에 정리된 예시 질문에서만 고른다 — 챗봇이 답할 수 있는 질문만.
export type ChatbotStarterGroup = {
  key: 'work' | 'leave' | 'pay';
  title: string;
  questions: string[];
};

export const CHATBOT_STARTER_GROUPS: ChatbotStarterGroup[] = [
  {
    key: 'work',
    title: '내 근무',
    questions: ['이번 달 근무시간 조회하고 싶어', '오늘 출근 처리가 됐나요?'],
  },
  {
    key: 'leave',
    title: '휴가',
    questions: ['남은 연차가 며칠인가요?', '반차 신청은 어떻게 해요?'],
  },
  {
    key: 'pay',
    title: '급여·증명서',
    questions: ['이번 달 급여명세서 보여줘', '재직증명서 발급하고 싶어'],
  },
];
