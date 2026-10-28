import { gql, useQuery } from '@apollo/client';
import React from 'react';
import ArticleDetail from '../components/ArticleDetail';
import { articleDetailAndIncViewCountQuery } from '../graphql/queries';
import { AppConsumer } from '../../appContext';
import { Store } from '../../types';
import { trackRecentArticle } from '../utils/recentArticles';
import { firstQueryValue } from '../utils/faqDisplay';

type Props = {
  queryParams: any;
};

function ArticleDetailContainer({
  queryParams: { id, catId },
  ...props
}: Props) {
  // 본문을 받으면서 조회수를 1 올린다(같은 화면 세션에서 다시 열면 캐시 사용)
  const { loading, data = {} as any } = useQuery(
    gql(articleDetailAndIncViewCountQuery),
    {
      variables: { _id: firstQueryValue(id) },
      skip: !firstQueryValue(id),
      fetchPolicy: 'cache-first',
    },
  );

  const article =
    (data && data.knowledgeBaseArticleDetailAndIncViewCount) || {};

  React.useEffect(() => {
    if (article?._id && article?.title) {
      trackRecentArticle({
        _id: article._id,
        title: article.title,
        categoryId: article.categoryId,
      });
    }
  }, [article?._id]);

  return (
    <AppConsumer>
      {({ topic, config }: Store) => {
        return (
          <ArticleDetail
            {...props}
            loading={loading}
            article={article}
            categoryId={article.categoryId || firstQueryValue(catId)}
            topic={topic}
            config={config}
          />
        );
      }}
    </AppConsumer>
  );
}

export default ArticleDetailContainer;
