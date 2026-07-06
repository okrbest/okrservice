import React from 'react';
import Link from 'next/link';
import { IKbArticle } from '../../types';
import { ArticleListItemWrapper, CategoryBadge } from './styles';

interface Props {
  article: IKbArticle;
  searchValue?: string;
  categoryName?: string;
}

function highlight(text: string, keyword?: string): React.ReactNode {
  if (!keyword || !text) return text;
  const flexible = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s*');
  const regex = new RegExp(`(${flexible})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : part,
  );
}

export default function ArticleListItem({
  article,
  searchValue,
  categoryName,
}: Props) {
  return (
    <Link
      href={`/knowledge-base/article?id=${article._id}&catId=${article.categoryId}`}
    >
      <a style={{ textDecoration: 'none', display: 'block' }}>
        <ArticleListItemWrapper>
          {categoryName && <CategoryBadge>{categoryName}</CategoryBadge>}
          <h3>{highlight(article.title, searchValue)}</h3>
          {article.summary && (
            <p>{highlight(article.summary, searchValue)}</p>
          )}
        </ArticleListItemWrapper>
      </a>
    </Link>
  );
}
