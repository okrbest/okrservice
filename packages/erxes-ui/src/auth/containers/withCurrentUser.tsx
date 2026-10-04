import * as gq from '../graphql';

import { CurrentUserQueryResponse, IUser } from '../types';
import { gql, useQuery } from '@apollo/client';

import React, { useEffect, useState } from 'react';
import { refreshAuthToken } from '../../utils/authRefresh';
// import Spinner from "../../components/Spinner";
import { storeConstantToStore } from '../../utils';

type Props = {
  currentUserQuery: CurrentUserQueryResponse;
};

const withCurrentUser = (WrappedComponent) => {
  const Container = (props: Props) => {
    const { loading, data, refetch } = useQuery<CurrentUserQueryResponse>(
      gql(gq.currentUser),
      {
        fetchPolicy: 'cache-first',
      },
    );
    // 로그인 토큰(1일)이 만료되면 currentUser가 오류 없이 null로 온다.
    // 바로 로그인 화면을 띄우지 말고 갱신 토큰(7일)으로 한 번 새로 받아 본다.
    const [refreshState, setRefreshState] = useState<
      'idle' | 'refreshing' | 'done'
    >('idle');
    const isSignedOut = !loading && Boolean(data) && !data?.currentUser;

    useEffect(() => {
      if (!isSignedOut || refreshState !== 'idle') {
        return;
      }

      setRefreshState('refreshing');

      refreshAuthToken()
        .then((refreshed) => (refreshed ? refetch() : undefined))
        .catch(() => undefined)
        .finally(() => setRefreshState('done'));
    }, [isSignedOut, refreshState, refetch]);

    if (loading || !data || (isSignedOut && refreshState !== 'done')) {
      return <div />;
      // return <Spinner />;
    }

    const currentUser = data ? data.currentUser : ({} as IUser);

    const updatedProps = {
      ...props,
      currentUser,
    };

    if (currentUser) {
      const constants = currentUser.configsConstants || [];

      constants.forEach((c) => storeConstantToStore(c.key, c.values));
    }

    return <WrappedComponent {...updatedProps} />;
  };

  return Container;
};

export default withCurrentUser;
