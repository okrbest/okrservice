import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import { generateModels } from './connectionResolver';

import { setupMessageConsumers } from './messageBroker';
import afterMutations from './afterMutations';
import beforeResolvers from './beforeResolvers';
import { getSubdomain } from '@erxes/api-utils/src/core';
import * as permissions from './permissions';

export default {
  name: 'productplaces',
  permissions,
  hasSubscriptions: true,
  subscriptionPluginPath: require('path').resolve(
    __dirname,
    'graphql',
    'subscriptionPlugin.js',
  ),
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers: await resolvers(),
    };
  },
  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.subdomain = subdomain;
    context.models = await generateModels(subdomain);

    return context;
  },

  onServerInit: async () => { },
  setupMessageConsumers,
  meta: {
    afterMutations,
    beforeResolvers,
    permissions,
  },
};
