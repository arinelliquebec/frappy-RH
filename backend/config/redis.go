package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var RedisEnabled bool

// ConnectRedis inicializa a conexão com o Redis
func ConnectRedis() error {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Println("⚠️ REDIS_URL não configurado - Cache desabilitado")
		RedisEnabled = false
		return nil
	}

	// Parse da URL do Redis
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Se não é URL, trata como host:port simples
		redisPassword := os.Getenv("REDIS_PASSWORD")
		redisDB := 0

		opt = &redis.Options{
			Addr:         redisURL,
			Password:     redisPassword,
			DB:           redisDB,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  3 * time.Second,
			WriteTimeout: 3 * time.Second,
			PoolSize:     10,
			MinIdleConns: 2,
		}
	}

	RedisClient = redis.NewClient(opt)

	// Testa conexão
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = RedisClient.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Falha ao conectar ao Redis: %v - Cache desabilitado", err)
		RedisEnabled = false
		return nil // Não retorna erro para não quebrar a aplicação
	}

	RedisEnabled = true
	log.Println("✅ Conectado ao Redis com sucesso!")
	return nil
}

// CloseRedis fecha a conexão com o Redis
func CloseRedis() {
	if RedisClient != nil {
		RedisClient.Close()
	}
}

// IsRedisAvailable verifica se o Redis está disponível
func IsRedisAvailable() bool {
	if !RedisEnabled || RedisClient == nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	_, err := RedisClient.Ping(ctx).Result()
	return err == nil
}

