import Link from 'next/link';
import React from 'react';
import { IKbArticle, IKbParentCategory } from '../../../types';
import { stripCategoryNumber } from '../../utils/faqDisplay';
import { createSeededRandom, pickTopArticles } from '../../utils/faqRanking';
import { FaqEmpty } from '../faqStyles';
import FaqQuestionRow from './FaqQuestionRow';
import { FaqGroup, FaqGroupHead, FaqSeeAll } from './browseStyles';

type Props = {
  // 상위 분류만(하위 분류 질문은 상위 묶음에 포함)
  categories: IKbParentCategory[];
  inScope: (category: IKbParentCategory) => IKbArticle[];
  seed: number;
};

const GROUP_SIZE = 3;

type GroupProps = {
  category: IKbParentCategory;
  articles: IKbArticle[];
  seed: number;
};

function CategoryGroup({ category, articles, seed }: GroupProps) {
  const name = stripCategoryNumber(category.title);
  const picks = pickTopArticles(articles, GROUP_SIZE, createSeededRandom(seed));

  return (
    <FaqGroup>
      <FaqGroupHead>
        {name} <small>{articles.length}개</small>
      </FaqGroupHead>
      {picks.map((article) => (
        <FaqQuestionRow key={article._id} article={article} />
      ))}
      {articles.length > GROUP_SIZE && (
        <Link
          href={`/knowledge-base/category?id=${category._id}`}
          passHref={true}
        >
          <FaqSeeAll>
            {name} 질문 {articles.length}개 모두 보기 →
          </FaqSeeAll>
        </Link>
      )}
    </FaqGroup>
  );
}

// 전체 질문 화면: 분류마다 대표 질문 3개 + "모두 보기"
function FaqGroupList({ categories, inScope, seed }: Props) {
  const groups = categories
    .map((category, index) => ({
      category,
      index,
      articles: inScope(category),
    }))
    .filter(({ articles }) => articles.length > 0);

  if (groups.length === 0) {
    return (
      <FaqGroup>
        <FaqEmpty>
          <span className="material-icons" aria-hidden="true">
            article
          </span>
          <h4>아직 등록된 질문이 없어요.</h4>
        </FaqEmpty>
      </FaqGroup>
    );
  }

  return (
    <>
      {groups.map(({ category, index, articles }) => (
        <CategoryGroup
          key={category._id}
          category={category}
          articles={articles}
          seed={seed + index}
        />
      ))}
    </>
  );
}

export default FaqGroupList;
