import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { IKbArticle, Topic } from '../../types';
import useFaqArticles from '../containers/useFaqArticles';
import { getRecentArticles, RecentArticle } from '../utils/recentArticles';
import { articleHref, splitTitleTag } from '../utils/faqDisplay';
import { findCategoryPath } from '../utils/faqCategories';
import { createSeededRandom, pickTopArticles } from '../utils/faqRanking';
import { RightPanelWrapper, RightPanelSection, TocWrapper } from './styles';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  topic: Topic;
  categoryId?: string;
  toc?: TocItem[];
  // 같은 화면의 다른 부품과 무작위 결과를 맞출 때 넘긴다
  seed?: number;
  // 지금 보고 있는 질문은 많이 본 질문에서 뺀다
  excludeId?: string;
}

const POPULAR_COUNT = 5;

function TocSection({ toc }: { toc?: TocItem[] }) {
  if (!toc || toc.length === 0) return null;

  return (
    <RightPanelSection>
      <h6>이 문서의 목차</h6>
      <TocWrapper>
        {toc.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`toc-item level-${item.level}`}
          >
            {item.text}
          </a>
        ))}
      </TocWrapper>
    </RightPanelSection>
  );
}

function PopularSection({
  title,
  articles,
}: {
  title: string;
  articles: IKbArticle[];
}) {
  if (articles.length === 0) return null;

  return (
    <RightPanelSection>
      <h6>{title}</h6>
      <ul>
        {articles.map((a, index) => {
          const text = splitTitleTag(a.title).text;

          return (
            <li key={a._id}>
              <Link href={articleHref(a)}>
                <a title={text}>
                  <i>{index + 1}</i>
                  {text}
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </RightPanelSection>
  );
}

function RecentSection() {
  const [recent, setRecent] = useState<RecentArticle[]>([]);

  useEffect(() => {
    setRecent(getRecentArticles());
  }, []);

  if (recent.length === 0) return null;

  return (
    <RightPanelSection>
      <h6>최근 본 질문</h6>
      <ul>
        {recent.map((a) => (
          <li key={a._id}>
            <Link href={articleHref(a)}>
              <a title={a.title}>{splitTitleTag(a.title).text}</a>
            </Link>
          </li>
        ))}
      </ul>
    </RightPanelSection>
  );
}

export default function KbRightPanel({
  topic,
  categoryId,
  toc,
  seed,
  excludeId,
}: Props) {
  const { articles, inScope, seed: ownSeed } = useFaqArticles(topic);
  const category = categoryId
    ? findCategoryPath(topic, categoryId)?.category
    : null;
  const candidates = category ? inScope(category) : articles;
  const popular = pickTopArticles(
    candidates,
    POPULAR_COUNT,
    createSeededRandom(seed ?? ownSeed),
    excludeId ? [excludeId] : [],
  );

  return (
    <RightPanelWrapper>
      <TocSection toc={toc} />
      <PopularSection
        title={category ? '이 분류에서 많이 본 질문' : '많이 본 질문'}
        articles={popular}
      />
      <RecentSection />
    </RightPanelWrapper>
  );
}
