import ArticleDetail from '../../../modules/knowledgeBase/containers/ArticleDetail';
import ArticleListContainer from '../../../modules/knowledgeBase/containers/ArticleList';
import Layout from '../../../modules/main/containers/Layout';
import React from 'react';
import { Store } from '../../../modules/types';
import { useRouter } from 'next/router';

export default function Category() {
  const router = useRouter();
  const { searchValue } = router.query;

  const renderContent = (props: Store) => {
    if (searchValue) {
      return (
        <ArticleListContainer
          searchValue={searchValue}
          topicId={props.topic._id}
          config={props.config}
          currentUser={props.currentUser}
        />
      );
    }

    return <ArticleDetail {...props} queryParams={router.query} />;
  };

  return (
    <Layout>
      {(props: Store) => renderContent(props)}
    </Layout>
  );
}
