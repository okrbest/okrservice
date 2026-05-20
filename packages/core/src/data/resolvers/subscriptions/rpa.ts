import { withFilter } from 'graphql-subscriptions';
import { graphqlPubsub } from '../../../pubsub';

export default {
  rpaMessageReceived: {
    subscribe: withFilter(
      () => graphqlPubsub.asyncIterator('rpaMessageReceived'),
      (payload, variables) => {
        if (!payload) {
          return false;
        }
        return payload.rpaMessageReceived.loginId === variables.loginId;
      },
    ),
  },
};
