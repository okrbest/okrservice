import * as compose from "lodash.flowright";

import { Alert, __, confirm } from "modules/common/utils";
import {
  AppsAddMutationResponse,
  AppsEditMutationResponse,
  AppsQueryResponse,
  AppsRemoveMutationResponse,
  AppsTotalCountQueryResponse,
  IApp,
  IAppEditParams,
  IAppParams,
} from "../types";
import { mutations, queries } from "../graphql/index";

import AppList from "../components/AppList";
import React from "react";
import Spinner from "modules/common/components/Spinner";
import { gql } from "@apollo/client";
import { graphql } from "@apollo/client/react/hoc";
import { queries as permissionQueries } from "../../permissions/graphql/index";
import { UsersGroupsQueryResponse } from "@erxes/ui-settings/src/permissions/types";

type Props = {
  listQuery: AppsQueryResponse;
  totalCountQuery: AppsTotalCountQueryResponse;
  addMutation: (params: { variables: IAppParams }) => Promise<IApp>;
  editMutation: (params: { variables: IAppEditParams }) => Promise<IApp>;
  removeMutation: (params: { variables: { _id: string } }) => Promise<string>;
  userGroupsQuery: UsersGroupsQueryResponse;
};

class AppListContainer extends React.Component<Props> {
  render() {
    const {
      listQuery,
      totalCountQuery,
      userGroupsQuery,
      addMutation,
      editMutation,
      removeMutation,
    } = this.props;

    const isLoading =
      listQuery.loading || totalCountQuery.loading || userGroupsQuery.loading;

    if (isLoading) {
      return <Spinner />;
    }

    const addApp = (doc: IAppParams) => {
      addMutation({ variables: doc })
        .then(() => {
          Alert.success(__("You successfully created an app"));
        })
        .catch((e) => {
          Alert.error(__(e.message));
        });
    };

    const editApp = (_id: string, doc: IAppParams) => {
      editMutation({ variables: { _id, ...doc } })
        .then(() => {
          Alert.success(__("You successfully edited an app"));
        })
        .catch((e) => {
          Alert.error(__(e.message));
        });
    };

    const removeApp = (_id: string) => {
      confirm(__("This will permanently delete are you absolutely sure?"), {
        hasDeleteConfirm: true,
      }).then(() => {
        removeMutation({ variables: { _id } })
          .then(() => {
            Alert.success(__("You successfully deleted an app"));
          })
          .catch((e) => {
            Alert.error(__(e.message));
          });
      });
    };

    return (
      <AppList
        apps={listQuery.apps}
        isLoading={isLoading}
        count={totalCountQuery.appsTotalCount}
        errorMessage={listQuery.error || ""}
        addApp={addApp}
        editApp={editApp}
        removeApp={removeApp}
        userGroups={userGroupsQuery.usersGroups}
      />
    );
  }
}

const options = () => ({ refetchQueries: ["apps"] });

export default compose(
  graphql(gql(queries.apps), {
    name: "listQuery",
  }),
  graphql<AppsAddMutationResponse, Props>(gql(mutations.appsAdd), {
    name: "addMutation",
    options,
  }),
  graphql<AppsEditMutationResponse, Props>(gql(mutations.appsEdit), {
    name: "editMutation",
    options,
  }),
  graphql<AppsRemoveMutationResponse, Props>(gql(mutations.appsRemove), {
    name: "removeMutation",
    options,
  }),
  graphql(gql(queries.appsTotalCount), {
    name: "totalCountQuery",
  }),
  graphql(gql(permissionQueries.usersGroups), {
    name: "userGroupsQuery",
  })
)(AppListContainer);
