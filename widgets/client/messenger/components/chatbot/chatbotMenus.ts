export interface ChatbotMenu {
  id: string;
  label: string;
  // 답변 아래 바로가기 패널에 보여줄 한 줄 설명
  description: string;
  path: string;
  category: 'attendance' | 'leave' | 'approval' | 'hr' | 'inquiry' | 'settings';
}

export const CHATBOT_MENU_CATEGORIES: {
  key: ChatbotMenu['category'];
  cols: number;
}[] = [
  { key: 'attendance', cols: 3 },
  { key: 'leave', cols: 3 },
  { key: 'approval', cols: 2 },
  { key: 'hr', cols: 3 },
  { key: 'inquiry', cols: 3 },
  { key: 'settings', cols: 2 },
];

// 급여명세서 화면이 보여줄 지급 구분 — HR 모바일 메뉴의 searchApplCd 그대로
const SALARY_APPL_CD =
  '급여(P),상여(B),소급(S),성과급(I),연차(Y),기타지급(O),퇴직급여(R),휴가비(B1),귀향비(B2), 격려금(B3), 명절상여(H), 격려금(G), 생산장려금(P1)';

export const CHATBOT_MENUS: ChatbotMenu[] = [
  {
    id: 'main',
    label: '출퇴근 체크',
    description: '오늘 출근·퇴근 기록',
    path: '/MobileMain.do',
    category: 'attendance',
  },
  {
    id: 'worktimechg',
    label: '출퇴근변경',
    description: '출퇴근 시각 정정 신청',
    path: '/MobileWorkTimeChgAppl.do',
    category: 'attendance',
  },
  {
    id: 'schedule',
    label: '근무일정조회',
    description: '월별 근무 일정 확인',
    path: '/MobileDclzWorkSearchCldr.do',
    category: 'attendance',
  },
  {
    id: 'leave',
    label: '휴가신청',
    description: '연차·반차 등 휴가 신청',
    path: '/MobileLeaveAppl.do',
    category: 'leave',
  },
  {
    id: 'overtime',
    label: '연장근무신청',
    description: '연장·휴일 근무 신청',
    path: '/MobileOvertimeAppl.do',
    category: 'leave',
  },
  {
    id: 'business',
    label: '출장신청',
    description: '출장 일정·경비 신청',
    path: '/MobileBusinessAppl.do',
    category: 'leave',
  },
  {
    id: 'halfleave',
    label: '조퇴/외출신청',
    description: '근무 중 조퇴·외출 신청',
    path: '/MobileHalfLeaveAppl.do',
    category: 'leave',
  },
  {
    id: 'conleave',
    label: '경조휴가신청',
    description: '결혼·조사 등 경조 휴가',
    path: '/MobileConLeaveAppl.do',
    category: 'leave',
  },
  {
    id: 'approval',
    label: '결재함',
    description: '결재할 문서와 진행 상황',
    path: '/MobileApprovalBox.do',
    category: 'approval',
  },
  {
    id: 'ctsmn',
    label: '경조금신청',
    description: '경조사 지원금 신청',
    path: '/MobileCtsmnAppl.do',
    category: 'approval',
  },

  // ─── HR 모바일 메뉴 중 바로가기에 없던 항목 ───
  // searchApplCd·batchButnYns처럼 화면 구분에 필요한 값만 붙이고, 나머지 파라미터는 기존 항목처럼 생략

  // 근태신청
  {
    id: 'worktype',
    label: '근무유형신청',
    description: '근무 형태 변경 신청',
    path: '/MobileWrkTypeAppl.do?searchApplCd=1025',
    category: 'leave',
  },
  {
    id: 'flex2w',
    label: '탄력신청(2주)',
    description: '2주 단위 탄력근무 신청',
    path: '/MobileFlexWorkAppl.do',
    category: 'leave',
  },
  {
    id: 'flex3w',
    label: '탄력신청(3주)',
    description: '3주 단위 탄력근무 신청',
    path: '/MobileFlexWork2Appl.do',
    category: 'leave',
  },
  {
    id: 'flexmonth',
    label: '선택신청(월)',
    description: '월 단위 선택근무 신청',
    path: '/MobileFlexWorkMonthAppl.do?batchButnYns=NN',
    category: 'leave',
  },
  {
    id: 'replcholiday',
    label: '대체휴무신청',
    description: '휴일 근무 대신 쉬는 날 신청',
    path: '/MobileReplcHvofAppl.do',
    category: 'leave',
  },
  {
    id: 'replcholidaypers',
    label: '대체휴무신청(개인)',
    description: '본인 대체휴무 신청',
    path: '/MobileReplcHvofPersAppl.do',
    category: 'leave',
  },
  {
    id: 'education',
    label: '교육신청',
    description: '교육 과정 신청',
    path: '/MobileEduNmReqstMgr.do?searchApplCd=1133',
    category: 'leave',
  },

  // 전자결재
  {
    id: 'cancelappl',
    label: '결재취소신청',
    description: '올린 결재 취소 요청',
    path: '/MobileCancelReqstAppl.do',
    category: 'approval',
  },
  {
    id: 'grievance',
    label: '고충신고서',
    description: '고충 사항 접수',
    path: '/MobileFreeDataFormReqstMgr.do?searchApplCd=5470',
    category: 'approval',
  },

  // 인사신청
  {
    id: 'resign',
    label: '사직서(직원)',
    description: '사직서 작성·제출',
    path: '/EAPApprovalMgr.do?cmd=viewEAPApprovalMgr?searchApplCd=1590',
    category: 'hr',
  },
  {
    id: 'resignhitachi',
    label: '사직서(히타치)',
    description: '히타치 소속 사직서 제출',
    path: '/MobileFreeDataFormReqstMgr.do?searchApplCd=6000-303',
    category: 'hr',
  },
  {
    id: 'tuition',
    label: '학자금신청',
    description: '학자금 지원 신청',
    path: '/MobileSchxpnReqstDetMgr.do',
    category: 'hr',
  },
  {
    id: 'uniform',
    label: '근무복신청서',
    description: '근무복 지급 신청',
    path: '/MobileFreeDataFormReqstMgr.do?searchApplCd=5200-303',
    category: 'hr',
  },
  {
    id: 'certificate',
    label: '증명서신청',
    description: '재직·경력 증명서 발급',
    path: '/MobileMcrtfReqstRefromMgr.do',
    category: 'hr',
  },

  // 조회
  {
    id: 'salary',
    label: '급여명세서',
    description: '월별 급여·상여 내역',
    path: `/MobileSalaryDtstmnMgr.do?searchApplCd=${encodeURIComponent(SALARY_APPL_CD)}`,
    category: 'inquiry',
  },
  {
    id: 'otschedule',
    label: '연장근무현황',
    description: '연장근무 일정·시간 현황',
    path: '/MobileDclzWorkOtSchdul.do',
    category: 'inquiry',
  },
  {
    id: 'attendstatus',
    label: '출근현황',
    description: '월별 출근 기록',
    path: '/MobileWrkTimeShtListMgr.do',
    category: 'inquiry',
  },
  {
    id: 'leavecalendar',
    label: '휴가캘린더',
    description: '휴가 일정 달력',
    path: '/MobileDclzVcatnCldr.do',
    category: 'inquiry',
  },
  {
    id: 'leavestatus',
    label: '휴가현황',
    description: '연차 발생·사용·잔여',
    path: '/MobileLeavDetailStaff.do',
    category: 'inquiry',
  },
  {
    id: 'empcard',
    label: '인사카드',
    description: '내 인사 정보',
    path: '/MobilePrtEmpCard.do',
    category: 'inquiry',
  },
  {
    id: 'otlist',
    label: 'OT현황',
    description: '초과근무 시간 현황',
    path: '/MobileOtListMgr.do',
    category: 'inquiry',
  },
  {
    id: 'notice',
    label: '게시판',
    description: '회사 공지·게시글',
    path: '/MobileNoticeBoard.do',
    category: 'inquiry',
  },
  {
    id: 'orgmembers',
    label: '조직원조회',
    description: '조직원 연락처 찾기',
    path: '/MobileHrBassiemList.do',
    category: 'inquiry',
  },

  // 설정
  {
    id: 'password',
    label: '비밀번호변경',
    description: 'HR 로그인 비밀번호 변경',
    path: '/MobileChgPwd.do',
    category: 'settings',
  },
];
