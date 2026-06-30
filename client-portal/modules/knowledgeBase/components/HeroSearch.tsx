import React, { useState, useRef, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { articlesQuery } from '../graphql/queries';
import {
  HeroSearchWrapper,
  AutocompleteList,
  AutocompleteItem,
} from './styles';

interface Props {
  topicId: string;
  initialValue?: string;
}

export default function HeroSearch({ topicId, initialValue = '' }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      clearTimeout(debounceRef.current);
      clearTimeout(blurTimerRef.current);
    };
  }, []);

  const { data } = useQuery(gql(articlesQuery), {
    variables: { searchValue: autocompleteQuery, topicId, isPrivate: true },
    skip: autocompleteQuery.length < 2,
  });

  const suggestions = (data?.clientPortalKnowledgeBaseArticles || []).slice(0, 6);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAutocompleteQuery(v);
      setOpen(v.length >= 2);
    }, 400);
  };

  const onSearch = () => {
    if (!value.trim()) return;
    setOpen(false);
    router.push({
      pathname: router.pathname || '/knowledge-base',
      query: { searchValue: value.trim() },
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <HeroSearchWrapper>
      <h2>자주 묻는 질문을 검색하세요.</h2>
      <div className="search-box">
        <input
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="검색어를 입력하세요 (예:인사발령)"
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
          onBlur={() => {
            clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => setOpen(false), 150);
          }}
        />
        <button type="button" onClick={onSearch}>
          검색
        </button>
        {open && suggestions.length > 0 && (
          <AutocompleteList>
            {suggestions.map((a) => (
              <AutocompleteItem
                key={a._id}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Link
                  href={`/knowledge-base/article?id=${a._id}&catId=${a.categoryId}`}
                >
                  <a>{a.title}</a>
                </Link>
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        )}
      </div>
    </HeroSearchWrapper>
  );
}
