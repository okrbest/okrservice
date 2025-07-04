import { __ } from "coreui/utils";
export const STORAGE_BOARD_KEY = "erxesCurrentBoardId";
export const STORAGE_PIPELINE_KEY = "erxesCurrentPipelineId";

export const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export const DATERANGES = [
  { name: "Created date", value: "createdAt" },
  { name: "Stage changed date", value: "stageChangedDate" },
  { name: "Start date", value: "startDate" },
  { name: "Close date", value: "closeDate" },
];

export const TEXT_COLORS = [
  "#fff",
  "#fefefe",
  "#fafafa",
  "#ccc",
  "#ddd",
  "#888",
  "#444",
  "#333",
  "#222",
  "#000",
];

export const REMINDER_MINUTES = [
  { _id: "1", name: "At Time of Due Date" },
  { _id: "5", name: "5 Minutes Before" },
  { _id: "10", name: "10 Minutes Before" },
  { _id: "15", name: "15 Minutes Before" },
  { _id: "60", name: "1 Hour Before" },
  { _id: "120", name: "2 Hour Before" },
  { _id: "1440", name: "1 Day Before" },
  { _id: "2880", name: "2 Day Before" },
];

export const PIPELINE_UPDATE_STATUSES = {
  START: __("start"),
  END: __("end"),
  NEW_REQUEST: __("newRequest"),
};

export const EMPTY_CONTENT_PURCHASE = {
  title: __("Getting Started with Purchase"),
  description: __(
    `Drive leads to a successful close with our Kanban-style boards`
  ),
  steps: [
    {
      title: __("Create Boards and tickets Pipeline"),
      description: `${__(
        "Track your entire tickets pipeline from one dashboard"
      )}${__("You can also restrict access to your tickets pipelines")}`,
      url: "/settings/boards/purchase",
      urlText: __("Go to Board & tickets pipeline"),
    },
    {
      title: __("Tip: Choose different views"),
      description: __(
        "Click on “Boards, Calendar, Conversions” to filter tickets pipeline"
      ),
      icon: "lightbulb-alt",
    },
  ],
};

export const groupByList = [
  {
    name: "stage",
    title: "Stage",
  },
  {
    name: "label",
    title: "Label",
  },
  {
    name: "priority",
    title: "Priority",
  },
  {
    name: "assignee",
    title: "Assignee",
  },
  {
    name: "dueDate",
    title: "Due Date",
  },
];

export const groupByGantt = [
  {
    name: "stage",
    title: "Stage",
  },
  {
    name: "label",
    title: "Label",
  },
  {
    name: "priority",
    title: "Priority",
  },
  {
    name: "assignee",
    title: "Assignee",
  },
];

export const showByTime = [
  {
    name: "stage",
    title: "Stage",
  },
  {
    name: "tags",
    title: "Tags",
  },
  {
    name: "members",
    title: "Members",
  },
];

export const stackByChart = [
  {
    name: "stage",
    title: "Stage",
  },
  {
    name: "label",
    title: "Label",
  },
  {
    name: "priority",
    title: "Priority",
  },
  {
    name: "dueDate",
    title: "Due Date",
  },
];

export const chartTypes = [
  {
    name: "line",
    title: "Line Chart",
    icon: "chart-line",
  },
  {
    name: "area",
    title: "Area Chart",
    icon: "arrow-growth",
  },
  {
    name: "simpleBar",
    title: "Simple Bar Chart",
    icon: "chart-bar",
  },
  {
    name: "stackedBar",
    title: "Stacked Bar Chart",
    icon: "chart",
  },
];

export const SEARCH_ACTIVITY_CHECKBOX = [
  { action: "create", value: "added new card", title: "Added new card" },
  { action: "moved", value: "moved card", title: "Moved card" },
  { action: "archive", value: "archived card", title: "Archived card" },
  {
    action: "delete",
    value: "deleted archived card",
    title: "Deleted archived card",
  },
  { action: "addNote", value: "added notes on", title: "Added notes" },
];

export const TYPES = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
  all: ["day", "week", "month", "year"],
};

// type from growthHack
export const HACKSTAGES = [
  "Awareness",
  "Acquisition",
  "Activation",
  "Retention",
  "Revenue",
  "Referrals",
];
