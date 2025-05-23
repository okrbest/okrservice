import React from "react";
import Comment from "../components/Comment";
import { IItem, IStage } from "../../boards/types";
import { IUser } from "@erxes/ui/src/auth/types";
import { Alert, confirm, withProps } from "@erxes/ui/src/utils";
import { gql } from "@apollo/client";
import { graphql } from "@apollo/client/react/hoc";
import * as compose from "lodash.flowright";
import { queries, mutations } from "../graphql/";
import {
  ClientPortalCommentQueryResponse,
  IClientPortalComment,
  CommentRemoveMutationResponse,
  WidgetsTicketCommentsQueryResponse,
  IWidgetsComment
} from "../types";
import withCurrentUser from "@erxes/ui/src/auth/containers/withCurrentUser";

type Props = {
  item: IItem;
  currentUser?: IUser;
  onChange: (field: string, value: any) => void;
};

type FinalProps = {
  clientPortalCommentsQuery: ClientPortalCommentQueryResponse;
  widgetsTicketCommentsQuery: WidgetsTicketCommentsQueryResponse
} & Props &
  CommentRemoveMutationResponse;

class CommentContainer extends React.Component<FinalProps> {
  render() {
    const { clientPortalCommentsQuery, widgetsTicketCommentsQuery, removeMutation, removeCommentMutation } = this.props;
    const clientPortalComments =
      clientPortalCommentsQuery.clientPortalComments ||
      ([] as IClientPortalComment[]);
    const widgetsTicketComments =
      widgetsTicketCommentsQuery?.widgetsTicketComments || ([] as IWidgetsComment[]);

    const remove = (_id: string) => {
      confirm().then(() => {
        removeMutation({ variables: { _id } })
          .then(() => {
            Alert.success("You successfully deleted a comment");
            clientPortalCommentsQuery.refetch();
          })
          .catch(e => {
            Alert.error(e.message);
          });
      });
    };

    const removeTicketComment = (_id: string) => {
      confirm().then(() => {
        removeCommentMutation({ variables: { _id } })
          .then(() => {
            Alert.success("You successfully deleted a comment");
            widgetsTicketCommentsQuery.refetch()
          })
          .catch(e => {
            Alert.error(e.message);
          });
      });
    };
    return (
      <Comment
        currentUser={this.props.currentUser || ({} as IUser)}
        widgetsTicketComments={widgetsTicketComments}
        clientPortalComments={clientPortalComments}
        remove={remove}
        removeTicketComment={removeTicketComment}
      />
    );
  }
}

const WithProps = withProps<Props>(
  compose(
    graphql<Props, ClientPortalCommentQueryResponse, {}>(
      gql(queries.clientPortalComments),
      {
        name: "clientPortalCommentsQuery",
        options: ({ item }: { item: IItem }) => ({
          variables: {
            typeId: item._id,
            type: (item.stage || ({} as IStage)).type
          },
          fetchPolicy: "network-only",
          notifyOnNetworkStatusChange: true
        })
      }
    ),
    graphql<Props, ClientPortalCommentQueryResponse, {}>(
      gql(queries.widgetsTicketComments),
      {
        name: "widgetsTicketCommentsQuery",
        options: ({ item }: { item: IItem }) => ({
          variables: {
            typeId: item._id,
            type: (item.stage || ({} as IStage)).type
          },
          fetchPolicy: "network-only",
          notifyOnNetworkStatusChange: true
        })
      }
    ),
    graphql<Props, CommentRemoveMutationResponse, {}>(
      gql(mutations.clientPortalCommentsRemove),
      {
        name: "removeMutation"
      }
    ),
    graphql<Props, CommentRemoveMutationResponse, {}>(
      gql(mutations.widgetsTicketCommentsRemove),
      {
        name: "removeCommentMutation"
      }
    )
  )(CommentContainer)
);

export default withCurrentUser(WithProps);