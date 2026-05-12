import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import DumbCategoryDetail from "../components/CategoryDetail";
import { IKbCategory } from "../types";
import { AppConsumer } from "./AppContext";
import queries from "./graphql";

type Props = {
  goToCategories: () => void;
  category: IKbCategory | null;
};

type QueryResponse = {
  knowledgeBaseCategoryDetail: IKbCategory;
};

const CategoryDetail = ({ goToCategories, category }: Props) => {
  const { data, loading } = useQuery<QueryResponse>(
    gql(queries.getKbCategoryQuery),
    {
      fetchPolicy: "network-only",
      variables: {
        _id: category ? category._id : "",
      },
    }
  );

  if (loading) {
    return <div className="loader bigger top-space" />;
  }

  return (
    <DumbCategoryDetail
      goToCategories={goToCategories}
      category={data?.knowledgeBaseCategoryDetail || null}
    />
  );
};

const WithContext = () => (
  <AppConsumer>
    {({ goToCategories, activeCategory }) => (
      <CategoryDetail
        goToCategories={goToCategories}
        category={activeCategory}
      />
    )}
  </AppConsumer>
);

export default WithContext;
