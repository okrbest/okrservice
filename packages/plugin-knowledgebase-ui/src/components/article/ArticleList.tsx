import DataWithLoader from '@erxes/ui/src/components/DataWithLoader';
import EmptyContent from '@erxes/ui/src/components/empty/EmptyContent';
import Spinner from '@erxes/ui/src/components/Spinner';
import { EMPTY_CONTENT_KNOWLEDGEBASE } from '@erxes/ui-settings/src/constants';
import React, { useState } from 'react';
import { IArticle } from '@erxes/ui-knowledgebase/src/types';
import ArticleRow from './ArticleRow';
import { RowArticle, SortBar, SortButton } from './styles';

type SortKey = 'default' | 'helpful_desc' | 'helpful_asc' | 'needs_improvement';

type Props = {
  articles: IArticle[];
  queryParams: any;
  currentCategoryId: string;
  topicId: string;
  remove: (articleId: string) => void;
  loading: boolean;
  isMainCategory?: boolean;
};

function getRatio(article: IArticle): number {
  const counts = article.reactionCounts || {};
  const helpful = counts.helpful || 0;
  const total = helpful + (counts.not_helpful || 0);
  return total > 0 ? helpful / total : -1;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: '기본순' },
  { key: 'helpful_desc', label: '👍 높은순' },
  { key: 'helpful_asc', label: '👎 낮은순' },
  { key: 'needs_improvement', label: '⚠ 개선 필요' },
];

const ArticleList = (props: Props) => {
  const { articles, loading, queryParams, currentCategoryId, topicId, remove } = props;
  const [sort, setSort] = useState<SortKey>('default');

  const sorted = [...articles].sort((a, b) => {
    if (sort === 'helpful_desc') return getRatio(b) - getRatio(a);
    if (sort === 'helpful_asc') {
      const ra = getRatio(a);
      const rb = getRatio(b);
      if (ra === -1 && rb === -1) return 0;
      if (ra === -1) return 1;
      if (rb === -1) return -1;
      return ra - rb;
    }
    if (sort === 'needs_improvement') {
      const needsA = getRatio(a) !== -1 && getRatio(a) < 0.5 ? 0 : 1;
      const needsB = getRatio(b) !== -1 && getRatio(b) < 0.5 ? 0 : 1;
      if (needsA !== needsB) return needsA - needsB;
      return getRatio(a) - getRatio(b);
    }
    return 0;
  });

  const renderLoading = () => (
    <RowArticle style={{ height: '115px' }}>
      <Spinner />
    </RowArticle>
  );

  const renderArticles = () => (
    <>
      <SortBar>
        <span>정렬:</span>
        {SORT_OPTIONS.map((opt) => (
          <SortButton
            key={opt.key}
            active={sort === opt.key}
            onClick={() => setSort(opt.key)}
          >
            {opt.label}
          </SortButton>
        ))}
      </SortBar>
      {sorted.map((article) => (
        <ArticleRow
          key={article._id}
          queryParams={queryParams}
          currentCategoryId={currentCategoryId}
          topicId={topicId}
          article={article}
          remove={remove}
        />
      ))}
    </>
  );

  return (
    <DataWithLoader
      loading={loading}
      count={articles.length}
      emptyContent={
        <EmptyContent
          content={EMPTY_CONTENT_KNOWLEDGEBASE}
          maxItemWidth="420px"
        />
      }
      loadingContent={renderLoading()}
      data={renderArticles()}
    />
  );
};

export default ArticleList;
