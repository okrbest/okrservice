export const renderText = (value) => {
  switch (value) {
    case "customer":
    case "core:customer":
      return "Customers";
    case "company":
    case "core:company":
      return "Companies";
    case "deal":
    case "sales:deal":
      return "Deals";
    case "purchase":
    case "purchases:purchase":
      return "Purchases";
    case "ticket":
    case "tickets:ticket":
      return "Tickets";
    case "task":
    case "tasks:task":
      return "Tasks";
    case "lead":
    case "core:lead":
      return "Leads";
    case "pos":
    case "core:pos":
      return "Pos";
    case "product":
    case "core:product":
      return "Products";
    case "user":
    case "core:user":
      return "Users";
    default:
      return value;
  }
};

export const renderIcon = (contentType) => {
  switch (contentType) {
    case "customer":
      return "users-alt";
    case "company":
      return "building";
    case "deal":
      return "signal-alt-3";
    case "purchase":
      return "signal-alt-3";
    case "task":
      return "laptop";
    case "ticket":
      return "ticket";

    case "lead":
      return "file-alt";

    case "user":
      return "user-square";

    case "pos":
      return "server-alt";
    default:
      return "users-alt";
  }
};
