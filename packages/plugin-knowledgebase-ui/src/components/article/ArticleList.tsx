import DataWithLoader from '@erxes/ui/src/components/DataWithLoader';
import EmptyContent from '@erxes/ui/src/components/empty/EmptyContent';
import Spinner from '@erxes/ui/src/components/Spinner';
import { EMPTY_CONTENT_KNOWLEDGEBASE } from '@erxes/ui-settings/src/constants';
import React from 'react';
import { IArticle } from '@erxes/ui-knowledgebase/src/types';
import ArticleRow from './ArticleRow';
import { RowArticle } from './styles';

type Props = {
  articles: IArticle[];
  queryParams: any;
  currentCategoryId: string;
  topicId: string;
  remove: (articleId: string) => void;
  loading: boolean;
  isMainCategory?: boolean;
};

const ArticleList = (props: Props) => {
  const { articles, loading, queryParams, currentCategoryId, topicId, remove, isMainCategory } =
    props;

  // 실제 렌더링되는 아티클들 로그
  console.log('=== ArticleList 렌더링 정보 ===');
  console.log('받은 articles 수:', articles.length);
  console.log('articles:', articles);
  console.log('currentCategoryId:', currentCategoryId);
  console.log('loading:', loading);
  
  // 각 아티클의 상세 정보
  articles.forEach((article, index) => {
    console.log(`렌더링될 아티클 ${index + 1}:`, {
      id: article._id,
      title: article.title,
      categoryId: article.categoryId,
      isPrivate: article.isPrivate,
      status: article.status
    });
  });

  const renderLoading = () => {
    return (
      <RowArticle style={{ height: '115px' }}>
        <Spinner />
      </RowArticle>
    );
  };

  const renderArticles = () => {
    return articles.map((article) => (
      <ArticleRow
        key={article._id}
        queryParams={queryParams}
        currentCategoryId={currentCategoryId}
        topicId={topicId}
        article={article}
        remove={remove}
      />
    ));
  };

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
    // 페이지네이션/perPage UI가 있다면 아래처럼 조건부 렌더링
    // {!isMainCategory && <PaginationOrPerPageComponent ... />}
  );
};

export default ArticleList;
