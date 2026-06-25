import ArticleListContainer from './ArticleList';
import CategoryList from '../components/CategoryList';
import HeroSearch from '../components/HeroSearch';
import KbRightPanel from '../components/KbRightPanel';
import SideBar from '../components/SideBar';
import Layout from '../../main/containers/Layout';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol } from '../components/styles';
import React from 'react';
import { Store } from '../../types';
import { useRouter } from 'next/router';

function CategoriesContainer() {
  const router = useRouter();
  const { searchValue, view } = router.query;

  return (
    <Layout>
      {(props: Store) => {
        if (!searchValue && !view) {
          return (
            <>
              <HeroSearch topicId={props.topic._id} initialValue="" />
              <KbPageContainer>
                <CategoryList {...props} />
              </KbPageContainer>
            </>
          );
        }

        if (view === 'all') {
          return (
            <>
              <HeroSearch
                topicId={props.topic._id}
                initialValue=""
              />
              <KbPageContainer>
                <KbThreeCol>
                  <KbLeftCol>
                    <SideBar
                      parentCategories={props.topic?.parentCategories}
                      category={{} as any}
                      config={props.config}
                    />
                  </KbLeftCol>
                  <KbCenterCol>
                    <ArticleListContainer
                      topicId={props.topic._id}
                      config={props.config}
                      currentUser={props.currentUser}
                    />
                  </KbCenterCol>
                  <KbRightCol>
                    <KbRightPanel topicId={props.topic._id} />
                  </KbRightCol>
                </KbThreeCol>
              </KbPageContainer>
            </>
          );
        }

        return (
          <>
            <HeroSearch
              topicId={props.topic._id}
              initialValue={(searchValue as string) || ''}
            />
            {searchValue ? (
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
