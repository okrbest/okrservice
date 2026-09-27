import { CHATBOT_MENUS, ChatbotMenu } from './chatbotMenus';
import { KEYWORD_MAP, KeywordMatch } from './chatbotKeywordMap';

// 입력 중 추천(useChatbotKeywordSuggestions)과 보낸 질문의 답변 아래 바로가기가
// 같은 규칙을 쓰도록 매칭을 한곳에 둔다.

// 첫 번째 매칭 키워드만 사용 (복수 키워드 동시 입력 시 우선순위: KEYWORD_MAP 정의 순)
// 추천 팝업이 "어떤 단어에 반응했는지" 보여줄 수 있게 키워드도 함께 돌려준다
export function findKeywordEntry(
  text: string,
): { keyword: string; match: KeywordMatch } | null {
  if (text.trim().length < 2) {
    return null;
  }

  const entry = Object.entries(KEYWORD_MAP).find(([keyword]) =>
    text.includes(keyword),
  );

  return entry ? { keyword: entry[0], match: entry[1] } : null;
}

export function findKeywordMatch(text: string): KeywordMatch | null {
  const entry = findKeywordEntry(text);
  return entry ? entry.match : null;
}

// 메뉴 순서는 연결표(menuIds)에 적힌 순서를 따른다
export function getMenusForText(text: string): ChatbotMenu[] {
  const match = findKeywordMatch(text);

  if (!match) {
    return [];
  }

  return match.menuIds
    .map((id) => CHATBOT_MENUS.find((menu) => menu.id === id))
    .filter((menu): menu is ChatbotMenu => !!menu);
}
