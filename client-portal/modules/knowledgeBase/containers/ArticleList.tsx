import { gql, useQuery } from '@apollo/client';

import ArticleList from '../components/ArticleList';
import { Config, IUser } from '../../types';
import React from 'react';
import { articlesQuery } from '../graphql/queries';

type Props = {
  config: Config;
  searchValue?: any;
  categoryId?: string;
  topicId?: string;
  currentUser: IUser;
};

function ArticleListContainer(props: Props) {
  const { loading, data = {} as any } = useQuery(gql(articlesQuery), {
    variables: {
      searchValue: props.searchValue || '',
      categoryIds: props.categoryId && [props.categoryId],
      topicId: props.topicId || '',
      isPrivate: true,
    },
  });

  const articles = data.clientPortalKnowledgeBaseArticles || [];

  const updatedProps = {
    ...props,
    loading,
    articles,
  };

  return <ArticleList {...updatedProps} />;
}

export default ArticleListContainer;
