import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getEnv } from '../utils'

export function createApolloClient(token: string) {
  const { API_URL, API_SUBSCRIPTIONS_URL } = getEnv()

  const httpLink = createHttpLink({
    uri: `${API_URL}/graphql`,
    credentials: 'include',
  })

  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }))

  const wsLink = new GraphQLWsLink(
    createClient({
      url: API_SUBSCRIPTIONS_URL,
      lazyCloseTimeout: 30000,
      retryAttempts: 10,
      retryWait: () => new Promise((resolve) => setTimeout(resolve, 1000)),
      connectionParams: () => ({ token }),
    })
  )

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      )
    },
    wsLink,
    authLink.concat(httpLink)
  )

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  })
}
