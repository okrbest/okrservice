import { gql, useQuery } from '@apollo/client';
import React from 'react'

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
};

const PortableItemsContainer = (props: IProps) => {

  const { itemsQuery, component, queryName,  mainType, mainTypeId, relType, alreadyItems } = props;

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

  const shouldSkip = (!mainType && !mainTypeId && !relType) || alreadyItems !== undefined;

  console.log("GetConformity: Query params", {
    queryName,
    mainType,
    mainTypeId,
    relType,
    shouldSkip,
    alreadyItems: !!alreadyItems
  });

  const {data, loading, error, refetch} = useQuery(gql(itemsQuery), {
    skip: shouldSkip,
    variables
  })

  console.log("GetConformity: Query result", {
    queryName,
    loading,
    error: error?.message,
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : [],
    itemsCount: data?.[queryName]?.length || 0
  });

  let items = alreadyItems;

    if (!alreadyItems) {
      if (loading) {
        // Show loading state or empty array
        items = [];
      } else if (error) {
        console.error("GetConformity: Query error", error);
        items = [];
      } else if (!data) {
        // Return empty array instead of null to show empty state
        items = [];
      } else {
        items = data[queryName] || [];
      }
    }

    console.log("GetConformity: Final items", {
      queryName,
      itemsCount: items?.length || 0,
      items: items?.slice(0, 3) // Log first 3 items
    });

    const onChangeItem = () => {
      refetch()
    };

    const extendedProps = {
      ...props,
      items,
      onChangeItem
    };

    const Component = component;
    return <Component {...extendedProps} />;
}

export default PortableItemsContainer