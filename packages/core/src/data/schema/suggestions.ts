export const types = `
  type SuggestionButton {
    label: String
    url: String
  }

  type SuggestionItem {
    keyword: String
    label: String
    buttons: [SuggestionButton]
  }
`;

export const queries = `
  chatbotSuggestions(keyword: String!, chatbotId: String): [SuggestionItem]
`;
