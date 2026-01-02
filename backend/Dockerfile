# Build stage
FROM golang:1.24-alpine AS builder

# Instala dependências necessárias para compilação
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copia go.mod e go.sum primeiro para cache de dependências
COPY go.mod go.sum ./
RUN go mod download

# Copia o código fonte
COPY . .

# Compila o binário
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o frappyou-api .

# Runtime stage
FROM alpine:3.19

# Instala certificados e timezone
RUN apk --no-cache add ca-certificates tzdata

# Cria usuário não-root
RUN adduser -D -g '' appuser

WORKDIR /app

# Copia o binário do build stage
COPY --from=builder /app/frappyou-api .

# Define o usuário não-root
USER appuser

# Expõe a porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Comando de inicialização
CMD ["./frappyou-api"]

