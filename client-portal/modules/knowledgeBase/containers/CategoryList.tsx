import ArticleListContainer from './ArticleList';
import FaqHome from '../components/home/FaqHome';
import FaqAllQuestions from '../components/browse/FaqAllQuestions';
import Layout from '../../main/containers/Layout';
import React from 'react';
import { Store } from '../../types';
import { useRouter } from 'next/router';
import { firstQueryValue } from '../utils/faqDisplay';

// `/`·`/knowledge-base` 화면 분기: 검색 결과 / 전체 질문(?view=all) / 첫 화면
function CategoriesContainer() {
  const router = useRouter();
  const searchValue = firstQueryValue(router.query.searchValue);
  const { view } = router.query;

  return (
    <Layout lightHeader={true}>
      {(props: Store) => {
        if (searchValue) {
          return (
            <ArticleListContainer
              topic={props.topic}
              config={props.config}
              searchValue={searchValue}
            />
          );
        }

        if (view === 'all') {
          return <FaqAllQuestions topic={props.topic} />;
        }

        return <FaqHome topic={props.topic} config={props.config} />;
      }}
    </Layout>
  );
}

export default CategoriesContainer;
