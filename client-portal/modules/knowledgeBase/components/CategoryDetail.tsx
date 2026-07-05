import React from 'react';
import { Config, IKbCategory, IUser, Topic } from '../../types';
import ArticleListContainer from '../containers/ArticleList';
import SectionHeader from '../../common/SectionHeader';
import SideBar from './SideBar';
import KbRightPanel from './KbRightPanel';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol, MobileCategoryNav, MobileCategoryTab } from './styles';
import Link from 'next/link';

type Props = {
  category: IKbCategory;
  loading: boolean;
  topic: Topic;
  config: Config;
  currentUser?: IUser;
};

function CategoryDetail({ topic, category, config, currentUser }: Props) {
  return (
    <KbPageContainer>
      <SectionHeader
        categories={topic.parentCategories}
        selectedCat={category}
      />
      <MobileCategoryNav>
        <Link href="/knowledge-base?view=all">
          <MobileCategoryTab as="a">전체</MobileCategoryTab>
        </Link>
        {topic.parentCategories?.map((cat) => (
          <Link key={cat._id} href={`/knowledge-base/category?id=${cat._id}`}>
            <MobileCategoryTab as="a" active={cat._id === category._id}>
              {cat.title}
            </MobileCategoryTab>
          </Link>
        ))}
      </MobileCategoryNav>
      <KbThreeCol>
        <KbLeftCol>
          <SideBar
            parentCategories={topic.parentCategories}
            category={category}
            config={config}
          />
        </KbLeftCol>

        <KbCenterCol>
          <ArticleListContainer
            categoryId={category._id}
            config={config}
            currentUser={currentUser}
          />
        </KbCenterCol>

        <KbRightCol>
          <KbRightPanel topicId={topic._id} categoryId={category._id} />
        </KbRightCol>
      </KbThreeCol>
    </KbPageContainer>
  );
}

export default CategoryDetail;
