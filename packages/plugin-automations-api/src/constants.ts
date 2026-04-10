export const ACTIONS = {
  WAIT: "delay",
  IF: "if",
  SET_PROPERTY: "setProperty",
  SEND_EMAIL: "sendEmail"
};

export const EMAIL_RECIPIENTS_TYPES = [
  {
    type: "customMail",
    name: "customMails",
    label: "Custom Mails"
  },
  {
    type: "attributionMail",
    name: "attributionMails",
    label: "Attribution Mails"
  },
  {
    type: "segmentBased",
    name: "segmentBased",
    label: "Trigger Segment Based Mails"
  },
  {
    type: "teamMember",
    name: "teamMemberIds",
    label: "Team Members"
  },
  {
    type: "lead",
    name: "leadIds",
    label: "Leads"
  },
  {
    type: "customer",
    name: "customerIds",
    label: "Customers"
  },
  {
    type: "company",
    name: "companyIds",
    label: "Companies"
  }
];

export const UI_ACTIONS = [
  {
    type: "if",
    icon: "sitemap-1",
    label: "Branches",
    description: "Create simple or if/then branches",
    isAvailable: true
  },
  {
    type: "setProperty",
    icon: "flask",
    label: "Manage properties",
    description:
      "Update existing default or custom properties for Contacts, Companies, Cards, Conversations",
    isAvailable: true
  },
  {
    type: "delay",
    icon: "hourglass",
    label: "Delay",
    description:
      "Delay the next action with a timeframe, a specific event or activity",
    isAvailable: true
  },
  {
    type: "workflow",
    icon: "glass-martini-alt",
    label: "Workflow",
    description:
      "Enroll in another workflow,  trigger outgoing webhook or write custom code",
    isAvailable: false
  },
  {
    type: "sendEmail",
    icon: "fast-mail",
    label: "Send Email",
    description: "Send Email",
    emailRecipientsConst: EMAIL_RECIPIENTS_TYPES,
    isAvailable: true
  }
];

export const STATUSES = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived"
};

/** 티켓 플러그인과 동일한 문자열 — 자동화 트리거 소스 (본문 수정 vs 댓글) */
export const TICKET_AUTOMATION_TRIGGER_SOURCE = {
  ASSIGN_ALARM_DESCRIPTION: "assignAlarmDescription",
  ASSIGN_ALARM_COMMENT: "assignAlarmComment"
} as const;
