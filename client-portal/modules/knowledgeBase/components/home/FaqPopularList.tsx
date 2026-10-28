import Link from 'next/link';
import React from 'react';
import { IKbArticle, IKbCategory } from '../../../types';
import {
  articleHref,
  splitTitleTag,
  stripCategoryNumber,
} from '../../utils/faqDisplay';
import { createSeededRandom, pickTopArticles } from '../../utils/faqRanking';
import { FaqTag } from '../faqStyles';
import { FaqPopularGrid, FaqPopularItem } from './homeStyles';

type Props = {
  articles: IKbArticle[];
  // 태그 이름을 찾을 분류 목록(하위 분류 포함)
  categories: IKbCategory[];
  seed: number;
  count?: number;
};

// "인사/조직" → "인사"처럼 태그 자리에 맞게 짧게
function shortCategoryName(category?: IKbCategory) {
  if (!category) return '';

  return stripCategoryNumber(category.title).split('/')[0].trim();
}

function FaqPopularList({ articles, categories, seed, count = 6 }: Props) {
  const popular = pickTopArticles(articles, count, createSeededRandom(seed));

  if (popular.length === 0) return null;

  return (
    <FaqPopularGrid $rows={Math.ceil(popular.length / 2)}>
      {popular.map((article, index) => {
        const category = categories.find((c) => c._id === article.categoryId);
        const label = shortCategoryName(category);

        return (
          <Link key={article._id} href={articleHref(article)} passHref={true}>
            <FaqPopularItem>
              <i>{index + 1}</i>
              {label && <FaqTag>{label}</FaqTag>}
              <span className="faq-popular-title">
                {splitTitleTag(article.title).text}
              </span>
            </FaqPopularItem>
          </Link>
        );
      })}
    </FaqPopularGrid>
  );
}

export default FaqPopularList;
