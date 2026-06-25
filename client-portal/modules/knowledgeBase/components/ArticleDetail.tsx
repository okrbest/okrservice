import React from 'react';
import { Config, IKbArticle, IKbCategory, Topic } from '../../types';
import SectionHeader from '../../common/SectionHeader';
import SideBar from './SideBar';
import SingleArticle from './SingleArticle';
import KbRightPanel from './KbRightPanel';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol } from './styles';

type Props = {
  article: IKbArticle;
  category: IKbCategory;
  topic: Topic;
  config: Config;
  loading: boolean;
};

function ArticleDetail({ loading, article, category, topic, config }: Props) {
  return (
    <KbPageContainer>
      <SectionHeader
        categories={topic.parentCategories}
        selectedCat={category}
      />
      <KbThreeCol>
        <KbLeftCol>
          <SideBar
            parentCategories={topic.parentCategories}
            category={category}
            articleId={article._id}
            config={config}
          />
        </KbLeftCol>

        <KbCenterCol>
          <SingleArticle article={article} loading={loading} config={config} />
        </KbCenterCol>

        <KbRightCol>
          <KbRightPanel topicId={topic._id} />
        </KbRightCol>
      </KbThreeCol>
    </KbPageContainer>
  );
}

export default ArticleDetail;
