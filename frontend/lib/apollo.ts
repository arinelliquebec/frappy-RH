import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// HTTP Link
const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
});

// Auth Link - adds token to headers
const authLink = setContext((_, { headers }) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Error Link - handles errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorLink = onError((errorResponse: any) => {
  if (errorResponse.graphQLErrors) {
    errorResponse.graphQLErrors.forEach(({ message, locations, path }: { message: string; locations: unknown; path: unknown }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (errorResponse.networkError) {
    console.error(`[Network error]: ${errorResponse.networkError}`);
  }
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache policies can be configured here
          colaboradores: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          users: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
    query: {
      fetchPolicy: "network-only",
    },
  },
});

// Reset cache on logout
export const resetApolloCache = () => {
  apolloClient.resetStore();
};
