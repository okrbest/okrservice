export interface KeywordMatch {
  menuIds: string[]
  suggestedQuestions: string[]
}

const ATTENDANCE = {
  menuIds: ['main', 'worktimechg', 'schedule'],
  suggestedQuestions: ['오늘 출근 처리가 됐나요?', '출퇴근 변경 어떻게 해요?'],
}

const LEAVE = {
  menuIds: ['leave', 'halfleave', 'conleave'],
  suggestedQuestions: ['남은 연차가 며칠인가요?', '반차 신청은 어떻게 해요?'],
}

const OVERTIME = {
  menuIds: ['overtime'],
  suggestedQuestions: ['연장근무 신청 어떻게 해요?'],
}

const HALFLEAVE = {
  menuIds: ['halfleave'],
  suggestedQuestions: ['조퇴 신청 어떻게 해요?', '외출 신청은 어디서 하나요?'],
}

const APPROVAL = {
  menuIds: ['approval'],
  suggestedQuestions: ['결재 대기 중인 건이 몇 개인가요?'],
}

const BUSINESS = {
  menuIds: ['business'],
  suggestedQuestions: ['출장 신청 어떻게 해요?'],
}

const CONGRATULATIONS = {
  menuIds: ['conleave', 'ctsmn'],
  suggestedQuestions: ['경조휴가 신청 어떻게 해요?', '경조금 신청은 어디서 해요?'],
}

export const KEYWORD_MAP: Record<string, KeywordMatch> = {
  // 출퇴근 관련
  출퇴근: ATTENDANCE,
  출근: ATTENDANCE,
  퇴근: ATTENDANCE,
  지각: ATTENDANCE,
  근무일정: ATTENDANCE,
  근무표: ATTENDANCE,
  근무시간: ATTENDANCE,
  근태: ATTENDANCE,

  // 휴가 관련
  휴가: LEAVE,
  연차: LEAVE,
  반차: LEAVE,
  병가: LEAVE,
  휴일: LEAVE,
  연휴: LEAVE,

  // 조퇴/외출 관련
  조퇴: HALFLEAVE,
  외출: HALFLEAVE,

  // 연장근무 관련
  연장근무: OVERTIME,
  야근: OVERTIME,
  초과근무: OVERTIME,

  // 결재 관련
  결재: APPROVAL,
  승인: APPROVAL,
  결재함: APPROVAL,

  // 출장 관련
  출장: BUSINESS,
  출장비: BUSINESS,

  // 경조 관련
  경조: CONGRATULATIONS,
  경조금: CONGRATULATIONS,
  경조휴가: CONGRATULATIONS,
  축의금: CONGRATULATIONS,
  조의금: CONGRATULATIONS,
  축의: CONGRATULATIONS,
  조의: CONGRATULATIONS,
}
