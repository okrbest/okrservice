import ArticleListContainer from './ArticleList';
import HeroSearch from '../components/HeroSearch';
import KbRightPanel from '../components/KbRightPanel';
import SideBar from '../components/SideBar';
import Layout from '../../main/containers/Layout';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol, MobileCategoryNav, MobileCategoryTab } from '../components/styles';
import Link from 'next/link';
import React from 'react';
import { Store } from '../../types';
import { useRouter } from 'next/router';

function CategoriesContainer() {
  const router = useRouter();
  const { searchValue } = router.query;

  return (
    <Layout>
      {(props: Store) => {
        if (!searchValue) {
          return (
            <>
              <HeroSearch
                topicId={props.topic._id}
                initialValue=""
              />
              <KbPageContainer>
                <MobileCategoryNav>
                  <MobileCategoryTab as="a" active={true}>전체</MobileCategoryTab>
                  {props.topic?.parentCategories?.map((cat) => (
                    <Link key={cat._id} href={`/knowledge-base/category?id=${cat._id}`}>
                      <MobileCategoryTab as="a">{cat.title}</MobileCategoryTab>
                    </Link>
                  ))}
                </MobileCategoryNav>
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
          </>
        );
      }}
    </Layout>
  );
}

export default CategoriesContainer;
