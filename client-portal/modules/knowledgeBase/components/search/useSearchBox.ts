import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { IKbArticle } from '../../../types';
import { articleListQuery } from '../../graphql/queries';

const LIST_QUERY = gql(articleListQuery);
const MIN_QUERY = 2;
const DEBOUNCE_MS = 400;

// "/" 키를 누르면 검색창으로 이동
function useSlashFocus(inputRef: React.RefObject<HTMLInputElement>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inputRef]);
}

function useSuggestions(topicId: string, query: string): IKbArticle[] {
  const trimmed = query.trim();
  const { data } = useQuery(LIST_QUERY, {
    variables: { searchValue: trimmed, topicId, isPrivate: true },
    skip: trimmed.length < MIN_QUERY,
    fetchPolicy: 'cache-first',
  });

  return (data?.clientPortalKnowledgeBaseArticles || []).slice(0, 6);
}

// 입력값과 자동완성용 검색어(디바운스), 목록 열림 상태
function useDebouncedInput(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setValue(initialValue), [initialValue]);
  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const onChange = (next: string) => {
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(next);
      setOpen(next.trim().length >= MIN_QUERY);
    }, DEBOUNCE_MS);
  };

  const onBlur = () => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const reset = () => {
    setValue('');
    setQuery('');
    setOpen(false);
  };

  return { value, query, open, setOpen, onChange, onBlur, reset };
}

// 검색창 상태: 입력값·자동완성·검색 이동
export default function useSearchBox(topicId: string, initialValue: string) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const input = useDebouncedInput(initialValue);
  const suggestions = useSuggestions(topicId, input.query);

  useSlashFocus(inputRef);

  const onSearch = () => {
    if (!input.value.trim()) return;
    input.setOpen(false);
    router.push({
      pathname: router.pathname || '/knowledge-base',
      query: { searchValue: input.value.trim() },
    });
  };

  // 지우기: 검색 결과 화면일 때만 첫 화면으로 돌아가고, 그 밖에는 입력만 비운다
  const onClear = () => {
    input.reset();
    if (router.query.searchValue) router.push({ pathname: '/knowledge-base' });
    inputRef.current?.focus();
  };

  const onFocus = () => {
    if (input.value.trim().length >= MIN_QUERY && suggestions.length > 0) {
      input.setOpen(true);
    }
  };

  return {
    value: input.value,
    open: input.open,
    suggestions,
    inputRef,
    onChange: input.onChange,
    onSearch,
    onClear,
    onFocus,
    onBlur: input.onBlur,
  };
}
