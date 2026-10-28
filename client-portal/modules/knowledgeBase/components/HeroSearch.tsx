import React from 'react';
import Link from 'next/link';
import {
  FAQ_SUGGESTED_KEYWORDS,
  articleHref,
  splitTitleTag,
} from '../utils/faqDisplay';
import { AutocompleteList, AutocompleteItem } from './styles';
import { FaqChips, FaqHeroWrapper, FaqSearchBox } from './faqStyles';
import useSearchBox from './search/useSearchBox';

interface Props {
  topicId: string;
  initialValue?: string;
  // hero: 첫 화면 큰 영역(제목·추천 검색어), compact: 목록 화면 위 검색창만
  variant?: 'hero' | 'compact';
}

function SearchField({ topicId, initialValue = '', variant }: Props) {
  const box = useSearchBox(topicId, initialValue);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') box.onSearch();
    if (e.key === 'Escape') box.onClear();
  };

  return (
    <FaqSearchBox compact={variant === 'compact'}>
      <div className="faq-search-field">
        <span className="material-icons faq-search-icon" aria-hidden="true">
          search
        </span>
        <input
          ref={box.inputRef}
          value={box.value}
          onChange={(e) => box.onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={box.onFocus}
          onBlur={box.onBlur}
          placeholder="궁금한 내용을 입력하세요 (예: 연차, 급여명세서)"
          aria-label="질문 검색"
        />
        {box.value && (
          <button
            type="button"
            className="faq-search-clear"
            onClick={box.onClear}
            aria-label="검색어 지우기"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        )}
        <button
          type="button"
          className="faq-search-submit"
          onClick={box.onSearch}
        >
          검색
        </button>
      </div>
      {box.open && box.suggestions.length > 0 && (
        <AutocompleteList>
          {box.suggestions.map((a) => (
            <AutocompleteItem
              key={a._id}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Link href={articleHref(a)}>
                <a>{splitTitleTag(a.title).text}</a>
              </Link>
            </AutocompleteItem>
          ))}
        </AutocompleteList>
      )}
    </FaqSearchBox>
  );
}

export default function HeroSearch(props: Props) {
  if (props.variant === 'compact') {
    return <SearchField {...props} />;
  }

  return (
    <FaqHeroWrapper>
      <h1>무엇을 도와드릴까요?</h1>
      <p>궁금한 내용을 검색하거나 주제를 골라 보세요</p>
      <SearchField {...props} variant="hero" />
      <FaqChips>
        {FAQ_SUGGESTED_KEYWORDS.map((keyword) => (
          <Link
            key={keyword}
            href={`/knowledge-base?searchValue=${encodeURIComponent(keyword)}`}
          >
            <a>{keyword}</a>
          </Link>
        ))}
      </FaqChips>
    </FaqHeroWrapper>
  );
}
