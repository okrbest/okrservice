import React from 'react';
import { Config, Topic } from '../../../types';
import useFaqArticles from '../../containers/useFaqArticles';
import { flattenCategories } from '../../utils/faqDisplay';
import { FaqEmpty, FaqSectionTitle, FaqSkeleton } from '../faqStyles';
import HeroSearch from '../HeroSearch';
import FaqCategoryCards from './FaqCategoryCards';
import FaqHelpBanner from './FaqHelpBanner';
import FaqPopularList from './FaqPopularList';
import { FaqHomeBody, FaqTileGrid } from './homeStyles';

type Props = {
  topic: Topic;
  config: Config;
};

function HomeLoading() {
  return (
    <FaqTileGrid>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <FaqSkeleton key={i} h={150} />
      ))}
    </FaqTileGrid>
  );
}

function HomeError() {
  return (
    <FaqEmpty>
      <span className="material-icons" aria-hidden="true">
        cloud_off
      </span>
      <h4>질문을 불러오지 못했어요.</h4>
      <p>잠시 후 새로고침해 주세요.</p>
    </FaqEmpty>
  );
}

function HomeSections({ topic }: { topic: Topic }) {
  const { articles, loading, error, seed, total, inScope } =
    useFaqArticles(topic);

  if (loading) return <HomeLoading />;
  if (error) return <HomeError />;

  const allCategories = flattenCategories(topic.parentCategories).map(
    (item) => item.category,
  );

  return (
    <>
      <section>
        <FaqSectionTitle>
          주제별로 찾기 <small>질문 {total}개</small>
        </FaqSectionTitle>
        <FaqCategoryCards
          categories={topic.parentCategories || []}
          inScope={inScope}
          seed={seed}
          totalCount={total}
        />
      </section>
      {total > 0 && (
        <section>
          <FaqSectionTitle>많이 본 질문</FaqSectionTitle>
          <FaqPopularList
            articles={articles}
            categories={allCategories}
            seed={seed}
          />
        </section>
      )}
    </>
  );
}

// FAQ 첫 화면(시안 A): 검색 → 주제 카드 → 많이 본 질문 → 매뉴얼 안내
function FaqHome({ topic, config }: Props) {
  return (
    <>
      <HeroSearch topicId={topic._id} variant="hero" />
      <FaqHomeBody>
        <HomeSections topic={topic} />
        <FaqHelpBanner externalLinks={config.externalLinks} />
      </FaqHomeBody>
    </>
  );
}

export default FaqHome;
