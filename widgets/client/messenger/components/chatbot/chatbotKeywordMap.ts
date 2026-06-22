export interface KeywordMatch {
  menuIds: string[]
  suggestedQuestions: string[]
}

export const KEYWORD_MAP: Record<string, KeywordMatch> = {
  휴가: {
    menuIds: ['leave', 'halfleave', 'conleave'],
    suggestedQuestions: ['남은 연차가 며칠인가요?', '반차 신청은 어떻게 해요?'],
  },
  출퇴근: {
    menuIds: ['main', 'worktimechg', 'schedule'],
    suggestedQuestions: ['오늘 출근 처리가 됐나요?', '출퇴근 변경 어떻게 해요?'],
  },
  결재: {
    menuIds: ['approval'],
    suggestedQuestions: ['결재 대기 중인 건이 몇 개인가요?'],
  },
  연장근무: {
    menuIds: ['overtime'],
    suggestedQuestions: ['연장근무 신청 어떻게 해요?'],
  },
  출장: {
    menuIds: ['business'],
    suggestedQuestions: ['출장 신청 어떻게 해요?'],
  },
  경조: {
    menuIds: ['conleave', 'ctsmn'],
    suggestedQuestions: ['경조휴가 신청 어떻게 해요?', '경조금 신청은 어디서 해요?'],
  },
}
