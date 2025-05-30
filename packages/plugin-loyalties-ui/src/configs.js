module.exports = {
  srcDir: __dirname,
  name: "loyalties",
  port: 3002,
  scope: "loyalties",
  exposes: {
    "./routes": "./src/routes.tsx",
    "./customerSidebar": "./src/containers/CustomerSidebar.tsx",
    "./companySidebar": "./src/containers/CompanySidebar.tsx",
    "./userSidebar": "./src/containers/UserSidebar.tsx",
    "./automation": "./src/automations/automation.tsx",
  },
  routes: {
    url: "http://localhost:3002/remoteEntry.js",
    scope: "loyalties",
    module: "./routes",
  },
  automation: "./automation",
  menus: [
    {
      text: "Loyalties",
      url: "/score",
      icon: "icon-piggybank",
      location: "mainNavigation",
      permission: "showLoyalties",
    },
    {
      text: "Loyalties config",
      to: "/erxes-plugin-loyalty/settings/general",
      image: "/images/icons/erxes-16.svg",
      location: "settings",
      scope: "loyalties",
      action: "loyaltyConfig",
      permissions: ["manageLoyalties", "showLoyalties"],
    },
  ],
  customerRightSidebarSection: "./customerSidebar",
  companyRightSidebarSection: "./companySidebar",
  userRightSidebarSection: [
    {
      text: "userSection",
      component: "./userSidebar",
      scope: "loyalties",
    },
  ],
};
