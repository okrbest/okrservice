import ArticleDetail from '../../../modules/knowledgeBase/containers/ArticleDetail';
import ArticleListContainer from '../../../modules/knowledgeBase/containers/ArticleList';
import Layout from '../../../modules/main/containers/Layout';
import React from 'react';
import { Store } from '../../../modules/types';
import { useRouter } from 'next/router';
import { firstQueryValue } from '../../../modules/knowledgeBase/utils/faqDisplay';

export default function Category() {
  const router = useRouter();
  const searchValue = firstQueryValue(router.query.searchValue);

  const renderContent = (props: Store) => {
    if (searchValue) {
      return (
        <ArticleListContainer
          topic={props.topic}
          config={props.config}
          searchValue={searchValue}
        />
      );
    }

    return <ArticleDetail {...props} queryParams={router.query} />;
  };

  return (
    <Layout lightHeader={true}>{(props: Store) => renderContent(props)}</Layout>
  );
}
