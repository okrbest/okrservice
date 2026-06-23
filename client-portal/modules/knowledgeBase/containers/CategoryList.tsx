import ArticleListContainer from './ArticleList';
import CategoryList from '../components/CategoryList';
import HeroSearch from '../components/HeroSearch';
import Layout from '../../main/containers/Layout';
import React from 'react';
import { Store } from '../../types';
import { useRouter } from 'next/router';

function CategoriesContainer() {
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

    return <CategoryList {...props} />;
  };

  return (
    <Layout>
      {(props: Store) => (
        <>
          <HeroSearch
            topicId={props.topic._id}
            initialValue={(searchValue as string) || ''}
          />
          {renderContent(props)}
        </>
      )}
    </Layout>
  );
}

export default CategoriesContainer;
