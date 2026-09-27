import { useEffect, useState } from 'react';
import { ChatbotMenu } from './chatbotMenus';
import { findKeywordEntry, getMenusForText } from './chatbotMenuMatch';

interface ChatbotSuggestionResult {
  // 추천이 반응한 단어 — 팝업 머리말과 질문 속 강조에 쓴다
  keyword: string;
  menus: ChatbotMenu[];
  questions: string[];
}

const EMPTY: ChatbotSuggestionResult = {
  keyword: '',
  menus: [],
  questions: [],
};

export function useChatbotKeywordSuggestions(
  input: string,
): ChatbotSuggestionResult {
  const [result, setResult] = useState<ChatbotSuggestionResult>(EMPTY);

  useEffect(() => {
    const timer = setTimeout(() => {
      const entry = findKeywordEntry(input);

      if (!entry) {
        setResult(EMPTY);
        return;
      }

      setResult({
        keyword: entry.keyword,
        menus: getMenusForText(input),
        questions: entry.match.suggestedQuestions,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [input]);

  return result;
}
