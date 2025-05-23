import gql from "graphql-tag";

import { types, mutations, queries } from "./schema/engage";
import { types as logTypes, queries as logQueries } from "./schema/engageLog";

const typeDefs = async () => {
  return gql`
    scalar JSON
    scalar Date

    ${types}
    ${logTypes}

    extend type Query {
      ${queries}
      ${logQueries}
    }

    extend type Mutation {
      ${mutations}
    }
  `;
};

export default typeDefs;
