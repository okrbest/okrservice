import React from 'react';
import { Container } from 'react-bootstrap';
import { Config, IKbCategory, IUser, Topic } from '../../types';
import ArticleListContainer from '../containers/ArticleList';
import SectionHeader from '../../common/SectionHeader';
import SideBar from './SideBar';
import KbRightPanel from './KbRightPanel';
import { KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol } from './styles';

type Props = {
  category: IKbCategory;
  loading: boolean;
  topic: Topic;
  config: Config;
  currentUser?: IUser;
};

function CategoryDetail({ topic, category, config, currentUser }: Props) {
  return (
    <Container className="knowledge-base">
      <SectionHeader
        categories={topic.parentCategories}
        selectedCat={category}
      />
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
          <KbRightPanel topicId={topic._id} />
        </KbRightCol>
      </KbThreeCol>
    </Container>
  );
}

export default CategoryDetail;
