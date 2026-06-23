import ArticleListContainer from './ArticleList';
import CategoryList from '../components/CategoryList';
import HeroSearch from '../components/HeroSearch';
import Layout from '../../main/containers/Layout';
import React, { useEffect } from 'react';
import Router from 'next/router';
import { Store } from '../../types';
import { useRouter } from 'next/router';

function AutoRedirect({ categoryId }: { categoryId: string }) {
  useEffect(() => {
    Router.replace(`/knowledge-base/category?id=${categoryId}`);
  }, [categoryId]);
  return null;
}

function CategoriesContainer() {
  const router = useRouter();
  const { searchValue, view } = router.query;

  return (
    <Layout>
      {(props: Store) => {
        const firstCat = props.topic?.parentCategories?.[0];

        if (!searchValue && !view && firstCat) {
          return <AutoRedirect categoryId={firstCat._id} />;
        }

        return (
          <>
            <HeroSearch
              topicId={props.topic._id}
              initialValue={(searchValue as string) || ''}
            />
            {(searchValue || view === 'all') ? (
              <ArticleListContainer
                searchValue={searchValue}
                topicId={props.topic._id}
                config={props.config}
                currentUser={props.currentUser}
              />
            ) : (
              <CategoryList {...props} />
            )}
          </>
        );
      }}
    </Layout>
  );
}

export default CategoriesContainer;
