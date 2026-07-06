import ArticleListContainer from '../../../modules/knowledgeBase/containers/ArticleList';
import CategoryDetail from '../../../modules/knowledgeBase/containers/CategoryDetail';
import HeroSearch from '../../../modules/knowledgeBase/components/HeroSearch';
import KbRightPanel from '../../../modules/knowledgeBase/components/KbRightPanel';
import SideBar from '../../../modules/knowledgeBase/components/SideBar';
import Layout from '../../../modules/main/containers/Layout';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol } from '../../../modules/knowledgeBase/components/styles';
import React from 'react';
import { Store } from '../../../modules/types';
import { useRouter } from 'next/router';

export default function Category() {
  const router = useRouter();
  const { searchValue } = router.query;

  const renderContent = (props: Store) => {
    if (searchValue) {
      return (
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
                searchValue={searchValue}
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
      );
    }

    return <CategoryDetail {...props} queryParams={router.query} />;
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
