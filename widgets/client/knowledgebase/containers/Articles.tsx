import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import DumbArticles from "../components/Articles";
import { connection } from "../connection";
import { IKbArticle } from "../types";
import { AppConsumer } from "./AppContext";
import queries from "./graphql";

type QueryResponse = {
  widgetsKnowledgeBaseArticles: IKbArticle[];
};

const Articles = ({ searchString }: { searchString: string }) => {
  const { data, loading } = useQuery<QueryResponse>(
    gql(queries.kbSearchArticlesQuery),
    {
      fetchPolicy: "network-only",
      variables: {
        topicId: connection.setting.topic_id,
        searchString,
      },
    }
  );

  if (loading) {
    return null;
  }

  return (
    <DumbArticles articles={data?.widgetsKnowledgeBaseArticles || []} />
  );
};

const WithContext = () => (
  <AppConsumer>
    {({ searchString }) => <Articles searchString={searchString} />}
  </AppConsumer>
);

export default WithContext;
