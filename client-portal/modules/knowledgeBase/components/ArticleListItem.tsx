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
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part,
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
