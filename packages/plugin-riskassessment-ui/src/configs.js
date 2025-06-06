module.exports = {
  srcDir: __dirname,
  name: "riskassessment",
  port: 3213,
  scope: "riskassessment",
  exposes: {
    "./routes": "./src/routes.tsx",
    "./cardSideBarSection": "./src/assessments/section/containers/Section.tsx",
    "./selectVistors": "./src/Visitors.tsx",
  },
  routes: {
    url: "http://localhost:3213/remoteEntry.js",
    scope: "riskassessment",
    module: "./routes",
  },
  formsExtraFields: [
    {
      scope: "riskassessment",
      component: "./selectVistors",
      type: "riskAssessmentVisitors",
    },
  ],
  menus: [
    {
      text: "Risk Assessments",
      to: "/settings/risk-indicators",
      image: "/images/icons/erxes-18.svg",
      location: "settings",
      scope: "riskassessment",
      action: "riskAssessmentAll",
      permissions: ["showRiskAssessment", "manageRiskAssessment"],
    },
    {
      text: "Operations",
      to: "/settings/operations",
      image: "/images/icons/erxes-18.svg",
      location: "settings",
      scope: "riskassessment",
      action: "riskAssessmentAll",
      permissions: ["showRiskAssessment", "manageRiskAssessment"],
    },
    {
      text: "Risk Assessments",
      url: "/risk-assessments",
      icon: "icon-followers",
      location: "mainNavigation",
      action: "riskAssessmentAll",
      permissions: ["showRiskAssessment", "manageRiskAssessment"],
    },
  ],
  dealRightSidebarSection: {
    title: "Risk Assessment",
    component: "./cardSideBarSection",
  },
  ticketRightSidebarSection: "./cardSideBarSection",
  taskRightSidebarSection: "./cardSideBarSection",
};
