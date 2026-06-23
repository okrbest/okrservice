import React from 'react';
import { Container } from 'react-bootstrap';
import { Config, IKbCategory, IUser, Topic } from '../../types';
import ArticleListContainer from '../containers/ArticleList';
import { Card } from '../../styles/cards';
import SectionHeader from '../../common/SectionHeader';
import SideBar from './SideBar';
import KbRightPanel from './KbRightPanel';
import { SidebarList, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol } from './styles';
import { getConfigColor } from '../../common/utils';

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
          <Card>
            <SidebarList baseColor={getConfigColor(config, 'baseColor')}>
              <SideBar
                parentCategories={topic.parentCategories}
                category={category}
                config={config}
              />
            </SidebarList>
          </Card>
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
