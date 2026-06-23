import React, { useState } from 'react';
import { Config, IKbArticle } from '../../types';
import { Card } from '../../styles/cards';
import EmptyContent from '../../common/EmptyContent';
import ArticleListItem from './ArticleListItem';
import { ArticleListWrapper, ResultBar, SortButton } from './styles';
import SingleArticle from './SingleArticle';

type SortType = 'relevance' | 'latest';

type Props = {
  articles: IKbArticle[];
  config: Config;
  searchValue?: string;
};

function ArticleList({ articles, config, searchValue }: Props) {
  const [sort, setSort] = useState<SortType>('relevance');

  if (!articles || articles.length === 0) {
    return (
      <Card fullHeight={true}>
        <EmptyContent text="검색 결과가 없습니다." />
      </Card>
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
