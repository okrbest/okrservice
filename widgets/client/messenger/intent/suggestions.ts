import { useEffect, useRef, useState } from 'react';
import gql from 'graphql-tag';
import client from '../../apollo-client';
import { chatbotSuggestionsQuery } from '../graphql/queries';

export interface SuggestionButton {
  label: string;
  url: string;
}

export interface SuggestionItem {
  keyword: string;
  label: string;
  buttons: SuggestionButton[];
}

export function useSuggestions(keyword: string, chatbotId?: string): SuggestionItem[] {
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (keyword.length < 2) {
      setItems([]);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const result = await client.query({
          query: gql(chatbotSuggestionsQuery),
          variables: { keyword, chatbotId },
          fetchPolicy: 'network-only',
        });
        setItems(result.data?.chatbotSuggestions ?? []);
      } catch {
        setItems([]);
      }
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [keyword, chatbotId]);

  return items;
}
