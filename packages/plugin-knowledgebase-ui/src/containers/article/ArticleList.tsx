import { gql, useQuery, useMutation } from "@apollo/client";
import { Alert, confirm, withProps } from "@erxes/ui/src/utils";
import { generatePaginationParams } from "@erxes/ui/src/utils/router";
import React from "react";
import ArticleList from "../../components/article/ArticleList";
import { mutations, queries } from "@erxes/ui-knowledgebase/src/graphql";
import {
  ArticlesQueryResponse,
  RemoveArticlesMutationResponse,
} from "@erxes/ui-knowledgebase/src/types";

type Props = {
  queryParams: any;
  currentCategoryId: string;
  topicId: string;
  articles: any[]; // Added
  loading: boolean;
  isMainCategory: boolean;
};

const ArticleContainer = (props: Props) => {
  const { queryParams, currentCategoryId, topicId, loading, isMainCategory } = props;

  // page, perPage를 queryParams에서 추출하고 Number로 변환
  const page = Number(queryParams.page) > 0 ? Number(queryParams.page) : 1;
  const perPage = isMainCategory ? 1000 : (Number(queryParams.perPage) > 0 ? Number(queryParams.perPage) : 20);

  const articlesQuery = useQuery<ArticlesQueryResponse>(
    gql(queries.knowledgeBaseArticles),
    {
      variables: {
        page,
        perPage,
        ...(isMainCategory ? { isPrivate: true } : { categoryIds: [currentCategoryId] }),
      },
      fetchPolicy: "network-only",
    }
  );

  const backendArticles = articlesQuery.data?.knowledgeBaseArticles || [];
  const articles = isMainCategory 
    ? backendArticles.filter(article => article.isPrivate)
    : backendArticles;
  
  // 디버깅 로그 추가
  console.log('=== ArticleList 백엔드 쿼리 결과 ===');
  console.log('articlesQuery.data:', articlesQuery.data);
  console.log('articlesQuery.loading:', articlesQuery.loading);
  console.log('백엔드에서 받은 articles 수:', articlesQuery.data?.knowledgeBaseArticles?.length || 0);
  console.log('props.articles 수:', props.articles?.length || 0);
  console.log('최종 사용할 articles 수:', articles?.length || 0);

  const [removeArticlesMutation] = useMutation<RemoveArticlesMutationResponse>(
    gql(mutations.knowledgeBaseArticlesRemove),
    {
      refetchQueries: refetchQueries(currentCategoryId, topicId),
    }
  );

  // remove action
  const remove = (articleId) => {
    confirm().then(() => {
      removeArticlesMutation({
        variables: { _id: articleId },
      })
        .then(() => {
          articlesQuery.refetch();

          Alert.success("You successfully deleted an article");
        })
        .catch((error) => {
          Alert.error(error.message);
        });
    });
  };

  const extendedProps = {
    ...props,
    remove,
    currentCategoryId,
    topicId,
    queryParams,
    articles,
    loading,
    isMainCategory,
  };

  return <ArticleList {...extendedProps} />;
};

const refetchQueries = (currentCategoryId: string, topicId: string) => {
  return [
    {
      query: gql(queries.knowledgeBaseArticlesTotalCount),
      variables: { categoryIds: [currentCategoryId] },
    },
    {
      query: gql(queries.knowledgeBaseCategories),
      variables: { topicIds: [topicId] },
    },
    {
      query: gql(queries.knowledgeBaseCategoryDetail),
      variables: { _id: currentCategoryId },
    },
  ];
};

export default ArticleContainer;
