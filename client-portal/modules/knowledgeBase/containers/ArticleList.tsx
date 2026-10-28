import React from 'react';
import ArticleList from '../components/ArticleList';
import FaqBrowse from '../components/browse/FaqBrowse';
import HeroSearch from '../components/HeroSearch';
import KbRightPanel from '../components/KbRightPanel';
import { Config, Topic } from '../../types';
import useFaqArticles from './useFaqArticles';

type Props = {
  topic: Topic;
  config: Config;
  searchValue: string;
};

// 검색 결과 화면(시안 C): 왼쪽 분류 · 가운데 결과 · 오른쪽 많이 본 질문
function ArticleListContainer({ topic, config, searchValue }: Props) {
  const { articles, loading, error, seed } = useFaqArticles(topic, searchValue);

  return (
    <FaqBrowse
      topic={topic}
      loading={loading}
      error={error}
      topSlot={
        <HeroSearch
          topicId={topic._id}
          initialValue={searchValue}
          variant="compact"
        />
      }
      rightPanel={<KbRightPanel topic={topic} seed={seed} />}
    >
      <ArticleList
        articles={articles}
        config={config}
        searchValue={searchValue}
      />
    </FaqBrowse>
  );
}

export default ArticleListContainer;
