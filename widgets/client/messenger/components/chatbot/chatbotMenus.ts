export interface ChatbotMenu {
  id: string;
  label: string;
  url: string;
  category: "attendance" | "leave" | "approval";
}

export const CHATBOT_MENU_CATEGORIES: {
  key: ChatbotMenu["category"];
  cols: number;
}[] = [
  { key: "attendance", cols: 3 },
  { key: "leave", cols: 3 },
  { key: "approval", cols: 2 },
];

export const CHATBOT_MENUS: ChatbotMenu[] = [
  {
    id: "main",
    label: "출퇴근 체크",
    url: "https://api.5240.cloud/MobileMain.do",
    category: "attendance",
  },
  {
    id: "worktimechg",
    label: "출퇴근변경",
    url: "https://api.5240.cloud/MobileWorkTimeChgAppl.do",
    category: "attendance",
  },
  {
    id: "schedule",
    label: "근무일정조회",
    url: "https://api.5240.cloud/MobileDclzWorkSearchCldr.do",
    category: "attendance",
  },
  {
    id: "leave",
    label: "휴가신청",
    url: "https://api.5240.cloud/MobileLeaveAppl.do",
    category: "leave",
  },
  {
    id: "overtime",
    label: "연장근무신청",
    url: "https://api.5240.cloud/MobileOvertimeAppl.do",
    category: "leave",
  },
  {
    id: "business",
    label: "출장신청",
    url: "https://api.5240.cloud/MobileBusinessAppl.do",
    category: "leave",
  },
  {
    id: "halfleave",
    label: "조퇴/외출신청",
    url: "https://api.5240.cloud/MobileHalfLeaveAppl.do",
    category: "leave",
  },
  {
    id: "conleave",
    label: "경조휴가신청",
    url: "https://api.5240.cloud/MobileConLeaveAppl.do",
    category: "leave",
  },
  {
    id: "approval",
    label: "결재함",
    url: "https://api.5240.cloud/MobileApprovalBox.do",
    category: "approval",
  },
  {
    id: "ctsmn",
    label: "경조금신청",
    url: "https://api.5240.cloud/MobileCtsmnAppl.do",
    category: "approval",
  },
];
