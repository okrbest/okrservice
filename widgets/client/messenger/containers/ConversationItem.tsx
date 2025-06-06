import * as React from "react";

import { conversationDetailQuery, unreadCountQuery } from "../graphql/queries";

import ConversationItem from "../components/ConversationItem";
import { IConversation } from "../types";
import { connection } from "../connection";
import { conversationMessageInserted } from "../graphql/subscriptions";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

type Props = {
  conversation: IConversation;
  goToConversation: (conversationId: string) => void;
};

const ConversationItemContainer = (props: Props) => {
  const { conversation } = props;

  const { data, subscribeToMore, refetch } = useQuery(gql(unreadCountQuery), {
    variables: { conversationId: conversation._id },
  });
  const {
    data: newResponseData,
    subscribeToMore: subscribeToNewResponse,
    refetch: refetchNewResponse,
  } = useQuery(
    gql(conversationDetailQuery(connection.enabledServices.dailyco)),
    {
      variables: {
        _id: conversation._id,
        integrationId: connection.data.integrationId,
      },
      fetchPolicy: "network-only",
    }
  );

  React.useEffect(() => {
    if (!data || !newResponseData) {
      return;
    }
    // lister for all conversation changes for this customer
    const messageSubscription = subscribeToMore({
      document: gql(
        conversationMessageInserted(connection.enabledServices.dailyco)
      ),
      variables: { _id: conversation._id },
      updateQuery: () => {
        refetch();
      },
    });
    const responseSubscription = subscribeToNewResponse({
      document: gql(
        conversationMessageInserted(connection.enabledServices.dailyco)
      ),
      variables: { _id: conversation._id },
      updateQuery: () => {
        refetchNewResponse();
      },
    });

    return () => {
      messageSubscription();
      responseSubscription();
    };
  }, [data, newResponseData, subscribeToMore, subscribeToNewResponse]);

  const getLastMessageContent = (newResponseData: {
    widgetsConversationDetail: IConversation;
  }) => {
    if (newResponseData) {
      const messages = newResponseData?.widgetsConversationDetail?.messages;
      return {
        content: messages?.[messages.length - 1]?.content,
        createdAt: messages?.[messages.length - 1]?.createdAt,
      };
    }
  };

  const extendedProps = {
    ...props,
    unreadCount: data?.widgetsUnreadCount || 0,
    lastResponse: getLastMessageContent(newResponseData),
  };

  return <ConversationItem {...extendedProps} />;
};

export default ConversationItemContainer;
