import { useEffect, useState } from 'react';
import { CHATBOT_MENUS, ChatbotMenu } from './chatbotMenus';
import { KEYWORD_MAP } from './chatbotKeywordMap';

interface ChatbotSuggestionResult {
  menus: ChatbotMenu[]
  questions: string[]
}

const EMPTY: ChatbotSuggestionResult = { menus: [], questions: [] };

export function useChatbotKeywordSuggestions(input: string): ChatbotSuggestionResult {
  const [result, setResult] = useState<ChatbotSuggestionResult>(EMPTY);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim().length < 2) {
        setResult(EMPTY);
        return;
      }

      // 첫 번째 매칭 키워드만 사용 (복수 키워드 동시 입력 시 우선순위: KEYWORD_MAP 정의 순)
      const entry = Object.entries(KEYWORD_MAP).find(([keyword]) =>
        input.includes(keyword)
      );

      if (!entry) {
        setResult(EMPTY);
        return;
      }

      const [, match] = entry;
      const menus = CHATBOT_MENUS.filter((m) => match.menuIds.includes(m.id));
      setResult({ menus, questions: match.suggestedQuestions });
    }, 500);

    return () => clearTimeout(timer);
  }, [input]);

  return result;
}
