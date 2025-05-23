import { gql } from '@apollo/client';
import * as compose from 'lodash.flowright';
import { graphql } from '@apollo/client/react/hoc';
import React from 'react';

import { Alert, withProps } from '@erxes/ui/src/utils';
import Spinner from '@erxes/ui/src/components/Spinner';
import UpdateConfigs from '../components/UpdateConfigs';
import { mutations, queries } from '../graphql';
import { IConfigsMap } from '@erxes/ui-settings/src/general/types';
import { getVersion } from '@erxes/ui/src/utils/core';

type Props = {
  history: any;
};

type FinalProps = {
  getConfigsQuery: any;
  updateConfigsMutation: (configsMap: IConfigsMap) => Promise<void>;
} & Props;

const ConfigsContainer = (props: FinalProps) => {
  const { VERSION } = getVersion();

  if (VERSION === 'saas') {
    return;
  }
  const { getConfigsQuery, updateConfigsMutation } = props;

  if (getConfigsQuery.loading) {
    return <Spinner />;
  }

  const configs = getConfigsQuery.cloudflareCallsGetConfigs;
  const configsMap = {};

  for (const config of configs) {
    configsMap[config.code] = config.value;
  }

  const updateConfigs = (value: IConfigsMap) => {
    updateConfigsMutation({ variables: { configsMap: value } })
      .then(() => {
        Alert.success('Successfully updated configs');
        getConfigsQuery.refetch();
      })
      .catch((e) => Alert.error(e.message));
  };

  const updatedProps = {
    loading: getConfigsQuery.loading,
    updateConfigs,
    configsMap,
  };

  return <UpdateConfigs {...updatedProps} />;
};

export default withProps<Props>(
  compose(
    graphql(gql(queries.callsGetConfigs), {
      name: 'getConfigsQuery',
      options: () => ({
        fetchPolicy: 'network-only',
        variables: { kind: 'calls' },
      }),
    }),

    graphql(gql(mutations.callsUpdateConfigs), {
      name: 'updateConfigsMutation',
    }),
  )(ConfigsContainer),
);
