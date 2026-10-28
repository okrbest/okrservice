import React from 'react';
import { Topic } from '../../../types';
import useFaqArticles from '../../containers/useFaqArticles';
import HeroSearch from '../HeroSearch';
import KbRightPanel from '../KbRightPanel';
import FaqBrowse from './FaqBrowse';
import FaqGroupList from './FaqGroupList';

type Props = {
  topic: Topic;
};

// "전체 질문 보기"(?view=all): 분류별 묶음
function FaqAllQuestions({ topic }: Props) {
  const { loading, error, seed, inScope } = useFaqArticles(topic);

  return (
    <FaqBrowse
      topic={topic}
      allActive={true}
      loading={loading}
      error={error}
      topSlot={<HeroSearch topicId={topic._id} variant="compact" />}
      rightPanel={<KbRightPanel topic={topic} seed={seed} />}
    >
      <FaqGroupList
        categories={topic.parentCategories || []}
        inScope={inScope}
        seed={seed}
      />
    </FaqBrowse>
  );
}

export default FaqAllQuestions;
