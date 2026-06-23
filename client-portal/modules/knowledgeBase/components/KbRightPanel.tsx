import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import Link from 'next/link';
import { IKbArticle } from '../../types';
import { articlesQuery } from '../graphql/queries';
import { getRecentArticles, RecentArticle } from '../utils/recentArticles';
import { RightPanelWrapper, RightPanelSection } from './styles';

interface Props {
  topicId: string;
}

export default function KbRightPanel({ topicId }: Props) {
  const [recent, setRecent] = useState<RecentArticle[]>([]);

  const { data } = useQuery(gql(articlesQuery), {
    variables: { topicId, isPrivate: true },
  });

  useEffect(() => {
    setRecent(getRecentArticles());
  }, []);

  const popular: IKbArticle[] = (data?.clientPortalKnowledgeBaseArticles as IKbArticle[] || [])
    .slice()
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  return (
    <RightPanelWrapper>
      {popular.length > 0 && (
        <RightPanelSection>
          <h6>많이 본 질문</h6>
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
