import * as compose from "lodash.flowright";

import {
  ArticlesTotalCountQueryResponse,
  CategoryDetailQueryResponse,
  ICategory,
  LastCategoryQueryResponse,
  AllArticlesQueryResponse,
} from "@erxes/ui-knowledgebase/src/types";
import { router as routerUtils, withProps } from "@erxes/ui/src/utils";

import { IRouterProps } from "@erxes/ui/src/types";
import KnowledgeBaseComponent from "../components/KnowledgeBase";
import React from "react";
import { gql } from "@apollo/client";
import { graphql } from "@apollo/client/react/hoc";
import { queries } from "@erxes/ui-knowledgebase/src/graphql";
import queryString from "query-string";

type Props = {
  queryParams: any;
  currentCategoryId: string;
  allArticles?: any[]; // ✅ Added
};

type FinalProps = {
  articlesCountQuery?: ArticlesTotalCountQueryResponse;
  categoryDetailQuery?: CategoryDetailQueryResponse;
  allArticlesQuery?: AllArticlesQueryResponse;
} & Props &
  IRouterProps;

const KnowledgeBase = (props: FinalProps) => {
  const { categoryDetailQuery, articlesCountQuery, allArticlesQuery } = props;

  // GraphQL 쿼리 결과 디버깅
  console.log('=== GraphQL Query Debug Info ===');
  console.log('categoryDetailQuery:', categoryDetailQuery);
  console.log('articlesCountQuery:', articlesCountQuery);
  console.log('allArticlesQuery:', allArticlesQuery);
  
  if (allArticlesQuery?.loading) {
    console.log('allArticlesQuery is loading...');
  }
  
  if (allArticlesQuery?.error) {
    console.error('allArticlesQuery error:', allArticlesQuery.error);
  }

  const articlesCount =
    articlesCountQuery && articlesCountQuery.knowledgeBaseArticlesTotalCount;

  const currentCategory =
    categoryDetailQuery && categoryDetailQuery.knowledgeBaseCategoryDetail;

  const allArticles = props.allArticlesQuery?.knowledgeBaseArticles || [];

  console.log('Processed data:');
  console.log('articlesCount:', articlesCount);
  console.log('currentCategory:', currentCategory);
  console.log('allArticles count:', allArticles.length);

  // GraphQL 쿼리 진단 정보 추가
  console.log('=== GraphQL 쿼리 진단 ===');
  console.log('1. categoryDetailQuery 상태:');
  console.log('   로딩 중:', categoryDetailQuery?.loading);
  console.log('   에러:', categoryDetailQuery?.error);
  console.log('   데이터:', categoryDetailQuery?.knowledgeBaseCategoryDetail ? '있음' : '없음');
  
  console.log('2. articlesCountQuery 상태:');
  console.log('   로딩 중:', articlesCountQuery?.loading);
  console.log('   에러:', articlesCountQuery?.error);
  console.log('   카운트:', articlesCount);
  
  console.log('3. allArticlesQuery 상태:');
  console.log('   로딩 중:', allArticlesQuery?.loading);
  console.log('   에러:', allArticlesQuery?.error);
  console.log('   아티클 수:', allArticles.length);
  
  // 문제 진단
  if (allArticlesQuery?.error) {
    console.log('❌ allArticlesQuery 에러 발견:', allArticlesQuery.error);
  }
  
  if (allArticles.length === 0 && !allArticlesQuery?.loading) {
    console.log('❌ 아티클이 없음 - 백엔드 쿼리 문제 가능성');
  }
  
  if (currentCategory && allArticles.length > 0) {
    const categoryArticles = allArticles.filter(article => 
      article.categoryId === currentCategory._id
    );
    console.log('4. 현재 카테고리 아티클 분석:');
    console.log('   전체 아티클 수:', allArticles.length);
    console.log('   현재 카테고리 아티클 수:', categoryArticles.length);
    console.log('   다른 카테고리 아티클 수:', allArticles.length - categoryArticles.length);
  }

  const updatedProps = {
    ...props,
    articlesCount: articlesCount || 0,
    currentCategory: currentCategory || ({} as ICategory),
    allArticles, // ✅ Added
  };

  return <KnowledgeBaseComponent {...updatedProps} />;
};

const KnowledgeBaseContainer = withProps<Props>(
  compose(
    graphql<Props, CategoryDetailQueryResponse, { _id: string }>(
      gql(queries.knowledgeBaseCategoryDetail),
      {
        name: "categoryDetailQuery",
        options: ({ currentCategoryId }) => ({
          variables: { _id: currentCategoryId },
          fetchPolicy: "network-only",
        }),
        skip: ({ currentCategoryId }) => !currentCategoryId,
      }
    ),
    graphql<Props, ArticlesTotalCountQueryResponse, { categoryIds: string[] }>(
      gql(queries.knowledgeBaseArticlesTotalCount),
      {
        name: "articlesCountQuery",
        options: ({ currentCategoryId }) => ({
          variables: { categoryIds: [currentCategoryId] },
        }),
        skip: ({ currentCategoryId }) => !currentCategoryId,
      }
    ),
    graphql<Props, AllArticlesQueryResponse>(
      gql(queries.allKnowledgeBaseArticles),
      {
        name: "allArticlesQuery",
        options: () => ({
          fetchPolicy: "network-only",
        }),
      }
    )
  )(KnowledgeBase)
);

type WithCurrentIdProps = {
  location: any;
  navigate: any;
  queryParams: any;
};

type WithCurrentIdFinalProps = {
  lastCategoryQuery: LastCategoryQueryResponse;
} & WithCurrentIdProps;

class WithCurrentId extends React.Component<WithCurrentIdFinalProps> {
  componentWillReceiveProps(nextProps: WithCurrentIdFinalProps) {
    const {
      lastCategoryQuery,
      location,
      navigate,
      queryParams: { _id },
    } = nextProps;

    if (!lastCategoryQuery) {
      return;
    }

    const { knowledgeBaseCategoriesGetLast, loading } = lastCategoryQuery;

    if (!_id && knowledgeBaseCategoriesGetLast && !loading) {
      routerUtils.setParams(
        navigate,
        location,
        {
          id: knowledgeBaseCategoriesGetLast._id,
        },
        true
      );
    }
  }

  render() {
    const {
      queryParams: { id },
    } = this.props;

    const updatedProps = {
      ...this.props,
      currentCategoryId: id || "",
    };

    return <KnowledgeBaseContainer {...updatedProps} />;
  }
}

const WithLastCategory = withProps<WithCurrentIdProps>(
  compose(
    graphql<WithCurrentIdProps, LastCategoryQueryResponse>(
      gql(queries.categoriesGetLast),
      {
        name: "lastCategoryQuery",
        skip: ({ queryParams }: { queryParams: any }) => queryParams.id,
        options: () => ({ fetchPolicy: "network-only" }),
      }
    )
  )(WithCurrentId)
);

const WithQueryParams = (props: IRouterProps) => {
  const { location } = props;
  const queryParams = queryString.parse(location.search);

  const extendedProps = { ...props, queryParams };

  return <WithLastCategory {...extendedProps} />;
};

export default WithQueryParams;
