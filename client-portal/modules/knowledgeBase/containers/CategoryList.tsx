import ArticleListContainer from './ArticleList';
import CategoryList from '../components/CategoryList';
import HeroSearch from '../components/HeroSearch';
import Layout from '../../main/containers/Layout';
import React from 'react';
import Router from 'next/router';
import { Store } from '../../types';
import { useRouter } from 'next/router';

function CategoriesContainer() {
  const router = useRouter();
  const { searchValue } = router.query;

  return (
    <Layout>
      {(props: Store) => {
        const firstCat = props.topic?.parentCategories?.[0];

        if (!searchValue && firstCat) {
          Router.replace(`/knowledge-base/category?id=${firstCat._id}`);
          return null;
        }

        return (
          <>
            <HeroSearch
              topicId={props.topic._id}
              initialValue={(searchValue as string) || ''}
            />
            <ArticleListContainer
              searchValue={searchValue}
              topicId={props.topic._id}
              config={props.config}
              currentUser={props.currentUser}
            />
          </>
        );
      }}
    </Layout>
  );
}

export default CategoriesContainer;
