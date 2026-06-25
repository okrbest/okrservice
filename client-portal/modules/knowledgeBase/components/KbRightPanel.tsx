import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import Link from 'next/link';
import { IKbArticle } from '../../types';
import { articlesQuery } from '../graphql/queries';
import { getRecentArticles, RecentArticle } from '../utils/recentArticles';
import { RightPanelWrapper, RightPanelSection, TocWrapper } from './styles';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  topicId: string;
  categoryId?: string;
  toc?: TocItem[];
}

export default function KbRightPanel({ topicId, categoryId, toc }: Props) {
  const [recent, setRecent] = useState<RecentArticle[]>([]);

  const { data } = useQuery(gql(articlesQuery), {
    variables: { topicId, isPrivate: true },
  });

  useEffect(() => {
    setRecent(getRecentArticles());
  }, []);

  const allArticles: IKbArticle[] = data?.clientPortalKnowledgeBaseArticles as IKbArticle[] || [];

  const filtered = categoryId
    ? allArticles.filter((a) => a.categoryId === categoryId)
    : allArticles;

  const popular = filtered
    .slice()
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  return (
    <RightPanelWrapper>
      {toc && toc.length > 0 && (
        <RightPanelSection>
          <h6>이 문서의 목차</h6>
          <TocWrapper>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`toc-item level-${item.level}`}
              >
                {item.text}
              </a>
            ))}
          </TocWrapper>
        </RightPanelSection>
      )}

      {popular.length > 0 && (
        <RightPanelSection>
          <h6>{categoryId ? '이 카테고리 인기글' : '많이 본 질문'}</h6>
          <ul>
            {popular.map((a) => (
              <li key={a._id}>
                <Link
                  href={`/knowledge-base/article?id=${a._id}${a.categoryId ? `&catId=${a.categoryId}` : ''}`}
                >
                  <a title={a.title}>• {a.title}</a>
                </Link>
              </li>
            ))}
          </ul>
        </RightPanelSection>
      )}

      {recent.length > 0 && (
        <RightPanelSection>
          <h6>최근 본 문서</h6>
          <ul>
            {recent.map((a) => (
              <li key={a._id}>
                <Link
                  href={`/knowledge-base/article?id=${a._id}${a.categoryId ? `&catId=${a.categoryId}` : ''}`}
                >
                  <a title={a.title}>• {a.title}</a>
                </Link>
              </li>
            ))}
          </ul>
        </RightPanelSection>
      )}
    </RightPanelWrapper>
  );
}
