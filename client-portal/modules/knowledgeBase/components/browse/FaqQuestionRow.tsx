import Link from 'next/link';
import React from 'react';
import { IKbArticle } from '../../../types';
import { articleHref, splitTitleTag } from '../../utils/faqDisplay';
import { FaqRowLink, FaqTag } from '../faqStyles';

type Props = {
  article: IKbArticle;
  searchValue?: string;
};

// 검색어를 <mark>로 감싼다(띄어쓰기 차이는 무시)
export function highlight(text: string, keyword?: string): React.ReactNode {
  if (!keyword || !text) return text;

  const flexible = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s*');
  const parts = text.split(new RegExp(`(${flexible})`, 'gi'));

  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : part,
  );
}

function FaqQuestionRow({ article, searchValue }: Props) {
  const { tag, text } = splitTitleTag(article.title);

  return (
    <Link href={articleHref(article)} passHref={true}>
      <FaqRowLink>
        {tag && <FaqTag>{tag}</FaqTag>}
        <div>
          <b>{highlight(text, searchValue)}</b>
          {article.summary && (
            <span className="faq-summary">
              {highlight(article.summary, searchValue)}
            </span>
          )}
        </div>
      </FaqRowLink>
    </Link>
  );
}

export default FaqQuestionRow;
