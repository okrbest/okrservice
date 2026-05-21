var { withFilter } = require('graphql-subscriptions');

module.exports = {
  name: 'core',
  typeDefs: `
    rpaMessageReceived(loginId: String!): RpaMessage
  `,
  generateResolvers: (graphqlPubsub) => {
    return {
      rpaMessageReceived: {
        subscribe: withFilter(
          () => graphqlPubsub.asyncIterator('rpaMessageReceived'),
          (payload, variables) =>
            payload?.rpaMessageReceived?.loginId === variables.loginId,
        ),
      },
    };
  },
};
