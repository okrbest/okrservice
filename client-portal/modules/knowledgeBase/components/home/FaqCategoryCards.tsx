import Link from 'next/link';
import React from 'react';
import { IKbArticle, IKbParentCategory } from '../../../types';
import {
  articleHref,
  categoryTone,
  splitTitleTag,
  stripCategoryNumber,
} from '../../utils/faqDisplay';
import { createSeededRandom, pickTopArticles } from '../../utils/faqRanking';
import { ERXES_TO_MATERIAL } from '../SideBar';
import { FaqAllTile, FaqTile, FaqTileGrid, FaqTileIcon } from './homeStyles';

type Props = {
  // 상위 분류만(하위 분류 질문은 상위 카드에 포함)
  categories: IKbParentCategory[];
  inScope: (category: IKbParentCategory) => IKbArticle[];
  seed: number;
  totalCount: number;
};

type TileProps = {
  category: IKbParentCategory;
  index: number;
  articles: IKbArticle[];
  seed: number;
};

const SAMPLE_COUNT = 2;

function CategoryTile({ category, index, articles, seed }: TileProps) {
  const tone = categoryTone(index);
  const samples = pickTopArticles(
    articles,
    SAMPLE_COUNT,
    createSeededRandom(seed + index),
  );

  return (
    <FaqTile>
      <Link href={`/knowledge-base/category?id=${category._id}`}>
        <a>
          <FaqTileIcon bg={tone.bg} fg={tone.fg}>
            <span className="material-icons" aria-hidden="true">
              {ERXES_TO_MATERIAL[category.icon] || 'folder'}
            </span>
          </FaqTileIcon>
          <div>
            <h4 title={category.title}>
              {stripCategoryNumber(category.title)}
            </h4>
            <span className="faq-tile-count">질문 {articles.length}개</span>
          </div>
        </a>
      </Link>
      <ul>
        {samples.length === 0 && <li>아직 질문이 없어요</li>}
        {samples.map((article) => (
          <li key={article._id}>
            <Link href={articleHref(article)}>
              <a>{splitTitleTag(article.title).text}</a>
            </Link>
          </li>
        ))}
      </ul>
    </FaqTile>
  );
}

function FaqCategoryCards({ categories, inScope, seed, totalCount }: Props) {
  return (
    <FaqTileGrid>
      {categories.map((category, index) => (
        <CategoryTile
          key={category._id}
          category={category}
          index={index}
          articles={inScope(category)}
          seed={seed}
        />
      ))}
      <Link href="/knowledge-base?view=all" passHref={true}>
        <FaqAllTile>
          <span className="material-icons" aria-hidden="true">
            apps
          </span>
          <b>전체 질문 보기</b>
          <span className="faq-tile-count">{totalCount}개 한 번에</span>
        </FaqAllTile>
      </Link>
    </FaqTileGrid>
  );
}

export default FaqCategoryCards;
