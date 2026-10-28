import { gql, useQuery } from '@apollo/client';
import { useCallback, useMemo, useState } from 'react';
import { IKbArticle, Topic } from '../../types';
import { articleListQuery } from '../graphql/queries';
import {
  categoryScopeIds,
  countArticlesByCategory,
  topicCategoryIds,
} from '../utils/faqCategories';

const LIST_QUERY = gql(articleListQuery);
const NO_ARTICLES: IKbArticle[] = [];

// FAQ 목록을 한 번만 받아 여러 부품이 나눠 쓴다(같은 변수라 Apollo 캐시 공유).
// 질문 수도 이 목록 하나로 센다(서버 numOfArticles는 임시 저장 글까지 세어 화면과 어긋남).
export default function useFaqArticles(topic: Topic, searchValue?: string) {
  const [seed] = useState(() => Math.floor(Math.random() * 2147483647));
  const categoryIds = useMemo(() => topicCategoryIds(topic), [topic]);

  const { data, loading, error } = useQuery(LIST_QUERY, {
    variables: {
      topicId: topic._id,
      categoryIds,
      isPrivate: true,
      ...(searchValue ? { searchValue } : {}),
    },
    skip: !topic._id || categoryIds.length === 0,
    fetchPolicy: 'cache-first',
  });

  const articles: IKbArticle[] =
    data?.clientPortalKnowledgeBaseArticles || NO_ARTICLES;

  const counts = useMemo(
    () => countArticlesByCategory(articles, topic.parentCategories),
    [articles, topic.parentCategories],
  );

  // 분류(+하위 분류)에 속한 질문
  const inScope = useCallback(
    (category: { _id: string; childrens?: { _id: string }[] }) => {
      const ids = categoryScopeIds(category);

      return articles.filter((a) => ids.includes(a.categoryId || ''));
    },
    [articles],
  );

  return {
    articles,
    loading,
    error,
    seed,
    counts,
    total: articles.length,
    inScope,
  };
}
