interface SuggestionButton {
  label: string;
  url: string;
}

interface SuggestionItem {
  keyword: string;
  label: string;
  buttons: SuggestionButton[];
}

const SUGGESTION_DICT: SuggestionItem[] = [
  {
    keyword: '출근',
    label: '출근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  {
    keyword: '퇴근',
    label: '퇴근',
    buttons: [{ label: '출퇴근 체크', url: '/MobileMain.do' }],
  },
  {
    keyword: '출퇴근변경',
    label: '출퇴근변경',
    buttons: [{ label: '출퇴근변경', url: '/MobileWorkTimeChgAppl.do' }],
  },
  {
    keyword: '휴가',
    label: '휴가신청',
    buttons: [{ label: '휴가신청', url: '/MobileLeaveAppl.do' }],
  },
  {
    keyword: '연장근무',
    label: '연장근무신청',
    buttons: [{ label: '연장근무신청', url: '/MobileOvertimeAppl.do' }],
  },
  {
    keyword: '출장',
    label: '출장신청',
    buttons: [{ label: '출장신청', url: '/MobileBusinessAppl.do' }],
  },
  {
    keyword: '조퇴',
    label: '조퇴/외출신청',
    buttons: [{ label: '조퇴/외출신청', url: '/MobileHalfLeaveAppl.do' }],
  },
  {
    keyword: '경조',
    label: '경조 관련 신청',
    buttons: [
      { label: '경조휴가신청', url: '/MobileConLeaveAppl.do' },
      { label: '경조금신청', url: '/MobileCtsmnAppl.do' },
    ],
  },
  {
    keyword: '결재',
    label: '결재함',
    buttons: [{ label: '결재함', url: '/MobileApprovalBox.do' }],
  },
  {
    keyword: '근무일정',
    label: '근무일정조회',
    buttons: [{ label: '근무일정조회', url: '/MobileDclzWorkSearchCldr.do' }],
  },
];

const suggestionQueries = {
  chatbotSuggestions(
    _root: any,
    { keyword, chatbotId }: { keyword: string; chatbotId?: string },
    _context: any,
  ): SuggestionItem[] {
    // chatbotId: 향후 멀티테넌트 사전 분기를 위해 파라미터를 받아두나, 현재는 미사용
    if (!keyword || keyword.length < 2) {
      return [];
    }
    return SUGGESTION_DICT.filter((item) => item.keyword.startsWith(keyword));
  },
};

export default suggestionQueries;
