import { gql, useQuery } from '@apollo/client';
import React, { useState } from 'react'

type IProps = {
  mainType?: string;
  mainTypeId?: string;
  mainTypeName?: string;
  relType?: string;
  component: any;
  queryName: string;
  itemsQuery: string;
  data?: any;
  collapseCallback?: () => void;
  alreadyItems?: any;
  actionSection?: any;
  initialSkip?: boolean;
};

const PortableItemsContainer = (props: IProps) => {
  const [active, setActive] = useState(!props.initialSkip);

  const { itemsQuery, component, queryName, mainType, mainTypeId, relType, alreadyItems } = props;

  const variables: any = {
    mainType,
    mainTypeId,
    relType,
    noSkipArchive: true,
    limit: 40,
    isSaved: true,
    sortField: 'status',
    sortDirection: 1
  };

  if (mainType === 'user') {
    variables.assignedUserIds = [mainTypeId];
    variables.isSaved = false;
  }

  const shouldSkip = !active || (!mainType && !mainTypeId && !relType) || alreadyItems !== undefined;

  const {data, loading, error, refetch} = useQuery(gql(itemsQuery), {
    skip: shouldSkip,
    variables,
    fetchPolicy: 'cache-and-network',
  })

  let items = alreadyItems || [];

  if (!alreadyItems && active) {
    if (loading || error || !data) {
      items = [];
    } else {
      items = data[queryName] || [];
    }
  }

  const onChangeItem = () => {
    refetch()
  };

  const onActivate = () => {
    if (!active) setActive(true);
  };

  const extendedProps = {
    ...props,
    items,
    onChangeItem,
    onActivate,
  };

  const Component = component;
  return <Component {...extendedProps} />;
}

export default PortableItemsContainer