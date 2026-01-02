"use client";

import { ApolloProvider as ApolloClientProvider } from "@apollo/client/react";
import { apolloClient } from "../apollo";

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <ApolloClientProvider client={apolloClient}>
      {children}
    </ApolloClientProvider>
  );
}
