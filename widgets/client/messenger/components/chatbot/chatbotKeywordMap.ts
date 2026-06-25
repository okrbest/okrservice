export interface KeywordMatch {
  menuIds: string[]
  suggestedQuestions: string[]
}

// ─── 신청 메뉴가 있는 항목 ───────────────────────────────────────────

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
  suggestedQuestions: ['연장근무 신청 어떻게 해요?', '이번 달 연장근무 시간 알려줘'],
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
  suggestedQuestions: ['출장 신청 어떻게 해요?', '출장 내역 조회하고 싶어'],
}

const CONGRATULATIONS = {
  menuIds: ['conleave', 'ctsmn'],
  suggestedQuestions: ['경조휴가 신청 어떻게 해요?', '경조금 신청은 어디서 해요?', '경조금 지급 현황 알려줘'],
}

// ─── 조회 전용 항목 (menuIds 없음) ──────────────────────────────────

const LEAVE_STATUS = {
  menuIds: [],
  suggestedQuestions: ['내 연차 발생·사용 현황 알려줘', '올해 남은 휴가가 며칠인가요?', '신입 연차 소멸 현황 알려줘'],
}

const WORKTIME_STATUS = {
  menuIds: ['schedule'],
  suggestedQuestions: ['이번 달 근무시간 조회하고 싶어', '월별 근무시간 현황 알려줘', '오늘 체류시간이 얼마나 됐나요?'],
}

const EXTRA_WORK_STATUS = {
  menuIds: ['overtime'],
  suggestedQuestions: ['이번 달 추가근무 시간 알려줘', '일자별 연장근무 현황 보여줘'],
}

const WORK_PLAN = {
  menuIds: ['schedule'],
  suggestedQuestions: ['근무계획 신청 내역 조회하고 싶어', '내 근무 계획 확인하고 싶어'],
}

const ATTENDANCE_STATUS = {
  menuIds: ['main'],
  suggestedQuestions: ['이번 달 출근 현황 알려줘', '체류시간 포함 출근 현황 보여줘'],
}

const LOAN = {
  menuIds: [],
  suggestedQuestions: ['대출금 현황 알려줘', '개인별 대출금 현황 보여줘'],
}

const MEDICAL = {
  menuIds: [],
  suggestedQuestions: ['가족 의료비 지원 현황 알려줘', '의료비 지원 받을 수 있나요?'],
}

const TUITION = {
  menuIds: [],
  suggestedQuestions: ['학자금 지원 현황 알려줘', '학자금 지원 조건이 어떻게 되나요?'],
}

const HEALTH_CHECK = {
  menuIds: [],
  suggestedQuestions: ['건강검진 현황 알려줘', '건강검진 언제 받을 수 있나요?'],
}

const RESORT = {
  menuIds: [],
  suggestedQuestions: ['휴양소 이용 현황 알려줘', '휴양소 신청 어떻게 해요?'],
}

const SOCIAL_INSURANCE = {
  menuIds: [],
  suggestedQuestions: ['사회보험 가입 현황 알려줘', '4대보험 고지 내역 확인하고 싶어'],
}

const CERTIFICATE = {
  menuIds: [],
  suggestedQuestions: ['재직증명서 발급하고 싶어', '증명서 발급 내역 확인하고 싶어'],
}

const PERSONAL_INFO = {
  menuIds: [],
  suggestedQuestions: ['내 인사카드 조회하고 싶어', '직원 명부 확인하고 싶어'],
}

const EDUCATION_HISTORY = {
  menuIds: [],
  suggestedQuestions: ['학력 사항 조회하고 싶어', '내 학력 정보 어디서 봐요?'],
}

const CAREER = {
  menuIds: [],
  suggestedQuestions: ['전직 경력 조회하고 싶어', '경력 사항 확인하고 싶어'],
}

const QUALIFICATION = {
  menuIds: [],
  suggestedQuestions: ['보유 자격증 조회하고 싶어', '자격 사항 확인하고 싶어'],
}

const LANGUAGE = {
  menuIds: [],
  suggestedQuestions: ['어학 사항 조회하고 싶어', '어학 점수 등록은 어디서 해요?'],
}

const MILITARY = {
  menuIds: [],
  suggestedQuestions: ['병역 사항 확인하고 싶어', '병역 정보 어디서 조회해요?'],
}

const REWARD = {
  menuIds: [],
  suggestedQuestions: ['포상 내역 조회하고 싶어', '내 포상 이력 확인하고 싶어'],
}

const DISCIPLINE = {
  menuIds: [],
  suggestedQuestions: ['징계 사항 조회하고 싶어', '내 징계 이력 확인하고 싶어'],
}

const TRAINING = {
  menuIds: [],
  suggestedQuestions: ['교육 이수 현황 알려줘', '교육 이력 조회하고 싶어', '기간별 교육 이수 현황 보여줘'],
}

export const KEYWORD_MAP: Record<string, KeywordMatch> = {
  // 출퇴근 관련
  출퇴근: ATTENDANCE,
  출근: ATTENDANCE,
  퇴근: ATTENDANCE,
  지각: ATTENDANCE,
  근무일정: ATTENDANCE,
  근무표: ATTENDANCE,
  근무시간: WORKTIME_STATUS,
  근태: WORKTIME_STATUS,
  체류시간: ATTENDANCE_STATUS,
  출근현황: ATTENDANCE_STATUS,

  // 휴가·연차 (신청 + 조회 혼합)
  휴가: LEAVE,
  연차: LEAVE,
  반차: LEAVE,
  병가: LEAVE,
  휴일: LEAVE,
  연휴: LEAVE,

  // 연차·휴가 조회 전용
  연차현황: LEAVE_STATUS,
  연차소멸: LEAVE_STATUS,
  잔여연차: LEAVE_STATUS,
  휴가현황: LEAVE_STATUS,
  잔여휴가: LEAVE_STATUS,

  // 조퇴/외출 관련
  조퇴: HALFLEAVE,
  외출: HALFLEAVE,

  // 연장·추가근무
  연장근무: EXTRA_WORK_STATUS,
  야근: EXTRA_WORK_STATUS,
  초과근무: EXTRA_WORK_STATUS,
  추가근무: EXTRA_WORK_STATUS,
  월별연장: EXTRA_WORK_STATUS,

  // 근무계획
  근무계획: WORK_PLAN,

  // 결재 관련
  결재: APPROVAL,
  승인: APPROVAL,
  결재함: APPROVAL,

  // 출장 관련
  출장: BUSINESS,
  출장비: BUSINESS,
  출장내역: BUSINESS,

  // 경조 관련
  경조: CONGRATULATIONS,
  경조금: CONGRATULATIONS,
  경조휴가: CONGRATULATIONS,
  축의금: CONGRATULATIONS,
  조의금: CONGRATULATIONS,
  축의: CONGRATULATIONS,
  조의: CONGRATULATIONS,

  // 복리후생 — 대출
  대출: LOAN,
  대출금: LOAN,

  // 복리후생 — 의료비
  의료비: MEDICAL,

  // 복리후생 — 학자금
  학자금: TUITION,

  // 복리후생 — 건강검진
  건강검진: HEALTH_CHECK,
  검진: HEALTH_CHECK,

  // 복리후생 — 휴양소
  휴양소: RESORT,

  // 복리후생 — 사회보험
  사회보험: SOCIAL_INSURANCE,
  '4대보험': SOCIAL_INSURANCE,
  국민연금: SOCIAL_INSURANCE,
  건강보험: SOCIAL_INSURANCE,
  고용보험: SOCIAL_INSURANCE,
  산재보험: SOCIAL_INSURANCE,

  // 복리후생 — 증명서
  증명서: CERTIFICATE,
  재직증명: CERTIFICATE,
  경력증명: CERTIFICATE,

  // 인적사항 — 기본
  인사카드: PERSONAL_INFO,
  직원명부: PERSONAL_INFO,

  // 인적사항 — 학력
  학력: EDUCATION_HISTORY,

  // 인적사항 — 경력
  전직경력: CAREER,
  경력사항: CAREER,

  // 인적사항 — 자격
  자격증: QUALIFICATION,
  자격사항: QUALIFICATION,

  // 인적사항 — 어학
  어학: LANGUAGE,

  // 인적사항 — 병역
  병역: MILITARY,

  // 인적사항 — 포상
  포상: REWARD,

  // 인적사항 — 징계
  징계: DISCIPLINE,

  // 인적사항 — 교육
  교육: TRAINING,
  교육이수: TRAINING,
  교육이력: TRAINING,
}
