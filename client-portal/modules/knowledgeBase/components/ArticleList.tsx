import React, { useState } from 'react';
import { Config, IKbArticle } from '../../types';
import ArticleListItem from './ArticleListItem';
import { ArticleListWrapper, ResultBar, SortButton, EmptyState, SkeletonItem, SkeletonLine } from './styles';
import SingleArticle from './SingleArticle';

function ArticleListSkeleton() {
  return (
    <ArticleListWrapper>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonItem key={i}>
          <SkeletonLine width="70%" height="18px" />
          <SkeletonLine width="100%" height="13px" />
          <SkeletonLine width="85%" height="13px" />
        </SkeletonItem>
      ))}
    </ArticleListWrapper>
  );
}

type SortType = 'relevance' | 'latest';

type Props = {
  articles: IKbArticle[];
  config: Config;
  searchValue?: string;
  loading?: boolean;
};

function ArticleList({ articles, config, searchValue, loading }: Props) {
  const [sort, setSort] = useState<SortType>('relevance');

  if (loading) {
    return <ArticleListSkeleton />;
  }

  if (!articles || articles.length === 0) {
    if (searchValue) {
      return (
        <EmptyState>
          <span className="material-icons">search_off</span>
          <h4>"{searchValue}"에 대한 결과가 없습니다.</h4>
          <p>다른 검색어로 시도하거나, 아래 방법으로 문의해 주세요.</p>
          <div className="contact-hint">
            <span className="material-icons">confirmation_number</span>
            서비스데스크에서 티켓 발급받기
          </div>
        </EmptyState>
      );
    }
    return (
      <EmptyState>
        <span className="material-icons">article</span>
        <h4>아직 등록된 문서가 없습니다.</h4>
      </EmptyState>
    );
  }

  // 단일 아티클이고 검색이 아닐 때는 기존 SingleArticle 렌더링 유지
  if (articles.length === 1 && !searchValue) {
    return <SingleArticle article={articles[0]} config={config} />;
  }

  const sorted = [...articles].sort((a, b) => {
    if (sort === 'latest') {
      const dateA = new Date(a.modifiedDate || a.createdDate).getTime();
      const dateB = new Date(b.modifiedDate || b.createdDate).getTime();
      return dateB - dateA;
    }
    return 0; // relevance: 서버 순서 유지
  });

  return (
    <ArticleListWrapper>
      <ResultBar>
        <span>
          총 <strong>{articles.length}</strong>건
        </span>
        <div className="sort-group">
          <SortButton
            active={sort === 'relevance'}
            onClick={() => setSort('relevance')}
          >
            정확도순
          </SortButton>
          <SortButton
            active={sort === 'latest'}
            onClick={() => setSort('latest')}
          >
            최신순
          </SortButton>
        </div>
      </ResultBar>

      {sorted.map((article) => (
        <ArticleListItem
          key={article._id}
          article={article}
          searchValue={searchValue}
        />
      ))}
    </ArticleListWrapper>
  );
}

export default ArticleList;
