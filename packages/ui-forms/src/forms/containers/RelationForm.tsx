import Spinner from "@erxes/ui/src/components/Spinner";
import { IField } from "@erxes/ui/src/types";
import { gql } from "@apollo/client";
import React from "react";
import { useQuery } from "@apollo/client";

import RelationForm from "../components/RelationForm";
import queries from "../graphql/queries";

type Props = {
  contentType: string;
  insertedId?: string;
  onChange: (ids: string[], relationType: string) => void;
  relationData?: any;
  selectedCompanyIds?: string[];
};

const Container = (props: Props) => {
  const { data, loading } = useQuery(gql(queries.relations), {
    variables: { contentType: props.contentType, isVisibleToCreate: true }
  });

  if (loading) {
    return <Spinner objective={true} />;
  }

  const fields: IField[] = data ? data.fieldsGetRelations || [] : [];

  return <RelationForm {...props} fields={fields} relationData={props.relationData} selectedCompanyIds={props.selectedCompanyIds} />;
};

export default Container;
