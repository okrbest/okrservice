import React, { useState, useRef } from 'react';
import { gql, useQuery } from '@apollo/client';
import Router from 'next/router';
import Link from 'next/link';
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
  const [value, setValue] = useState(initialValue);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
    Router.push({ query: { searchValue: value.trim() } });
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
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="검색어를 입력하세요 (예: 인사발령)"
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <button type="button" onClick={onSearch}>
          검색
        </button>
        {open && suggestions.length > 0 && (
          <AutocompleteList>
            {suggestions.map((a) => (
              <Link
                key={a._id}
                href={`/knowledge-base/article?id=${a._id}&catId=${a.categoryId}`}
              >
                <AutocompleteItem onMouseDown={(e) => e.preventDefault()}>
                  {a.title}
                </AutocompleteItem>
              </Link>
            ))}
          </AutocompleteList>
        )}
      </div>
    </HeroSearchWrapper>
  );
}
