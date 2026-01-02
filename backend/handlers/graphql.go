package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/graph"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
)

// contextKey is a custom type for context keys
type contextKey string

const (
	userIDKey contextKey = "user_id"
	roleKey   contextKey = "role"
)

// graphqlServer is the singleton GraphQL server
var graphqlServer *handler.Server

func init() {
	resolver := graph.NewResolver()
	graphqlServer = handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	graphqlServer.AddTransport(transport.Options{})
	graphqlServer.AddTransport(transport.GET{})
	graphqlServer.AddTransport(transport.POST{})
	graphqlServer.AddTransport(transport.MultipartForm{
		MaxUploadSize: 20 * 1024 * 1024, // 20MB
	})

	graphqlServer.Use(extension.Introspection{})
}

// GraphQLHandler returns the GraphQL handler for Fiber
func GraphQLHandler() fiber.Handler {
	return adaptor.HTTPHandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract user info from JWT if present
		ctx := r.Context()
		authHeader := r.Header.Get("Authorization")

		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := config.ValidateToken(token)
			if err == nil {
				ctx = context.WithValue(ctx, userIDKey, claims.UserID)
				ctx = context.WithValue(ctx, roleKey, claims.Role)
			}
		}

		graphqlServer.ServeHTTP(w, r.WithContext(ctx))
	})
}

// PlaygroundHandler returns the GraphQL Playground handler
func PlaygroundHandler() fiber.Handler {
	h := playground.Handler("FrappYou GraphQL Playground", "/graphql")
	return adaptor.HTTPHandler(h)
}
