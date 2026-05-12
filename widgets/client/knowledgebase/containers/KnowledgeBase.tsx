import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import { setLocale } from "../../utils";
import KnowledgeBase from "../components/KnowledgeBase";
import { connection } from "../connection";
import { IKbTopic } from "../types";
import { AppConsumer, AppProvider } from "./AppContext";
import queries from "./graphql";

import * as dayjs from "dayjs";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import * as relativeTime from "dayjs/plugin/relativeTime";

import "../sass/style.min.css";
import "../../sass/components/_faq-icons.scss";

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

type QueryResponse = {
  widgetsKnowledgeBaseTopicDetail: IKbTopic;
};

const Topic = () => {
  const { data, loading } = useQuery<QueryResponse>(
    gql(queries.getKbTopicQuery),
    {
      fetchPolicy: "network-only",
      variables: {
        _id: connection.setting.topic_id,
      },
    }
  );

  if (loading || !data || !data.widgetsKnowledgeBaseTopicDetail) {
    return null;
  }

  const { color, languageCode, backgroundImage } =
    data.widgetsKnowledgeBaseTopicDetail;

  setLocale(languageCode);

  return (
    <AppProvider>
      <AppConsumer>
        {({ activeRoute }) => (
          <KnowledgeBase
            color={color}
            backgroundImage={backgroundImage}
            activeRoute={activeRoute}
          />
        )}
      </AppConsumer>
    </AppProvider>
  );
};

export default Topic;
