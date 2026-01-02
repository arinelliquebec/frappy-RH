package middleware

import (
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitConfig contém as configurações de rate limiting
type RateLimitConfig struct {
	// Limite de requisições
	Max int
	// Janela de tempo
	Expiration time.Duration
	// Mensagem de erro
	Message string
	// Chave personalizada (por padrão usa IP)
	KeyGenerator func(*fiber.Ctx) string
}

// AuthRateLimiter aplica rate limiting restritivo para endpoints de autenticação
// Protege contra ataques de força bruta em login/signup
func AuthRateLimiter() fiber.Handler {
	// Permite configuração via variável de ambiente
	maxAttempts := getEnvInt("RATE_LIMIT_AUTH_MAX", 5)          // 5 tentativas
	windowMinutes := getEnvInt("RATE_LIMIT_AUTH_WINDOW", 1)     // por 1 minuto

	return limiter.New(limiter.Config{
		Max:        maxAttempts,
		Expiration: time.Duration(windowMinutes) * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Usa IP + endpoint para limitar por rota específica
			return c.IP() + "-" + c.Path()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Muitas tentativas",
				"message": "Você excedeu o limite de tentativas. Aguarde alguns minutos e tente novamente.",
				"code":    "RATE_LIMIT_EXCEEDED",
			})
		},
		SkipFailedRequests:     false, // Conta todas as requisições
		SkipSuccessfulRequests: false,
	})
}

// StrictAuthRateLimiter aplica rate limiting ainda mais restritivo
// Para endpoints críticos como reset de senha
func StrictAuthRateLimiter() fiber.Handler {
	maxAttempts := getEnvInt("RATE_LIMIT_STRICT_MAX", 3)       // 3 tentativas
	windowMinutes := getEnvInt("RATE_LIMIT_STRICT_WINDOW", 5)  // por 5 minutos

	return limiter.New(limiter.Config{
		Max:        maxAttempts,
		Expiration: time.Duration(windowMinutes) * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP() + "-strict-" + c.Path()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Limite de segurança atingido",
				"message": "Por segurança, você precisa aguardar 5 minutos antes de tentar novamente.",
				"code":    "SECURITY_LIMIT_EXCEEDED",
			})
		},
	})
}

// APIRateLimiter aplica rate limiting para APIs gerais
// Proteção básica contra DDoS e uso abusivo
func APIRateLimiter() fiber.Handler {
	maxRequests := getEnvInt("RATE_LIMIT_API_MAX", 100)        // 100 requisições
	windowMinutes := getEnvInt("RATE_LIMIT_API_WINDOW", 1)     // por minuto

	return limiter.New(limiter.Config{
		Max:        maxRequests,
		Expiration: time.Duration(windowMinutes) * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Para APIs autenticadas, usa o user ID se disponível
			if userID := c.Locals("userID"); userID != nil {
				return userID.(string) + "-api"
			}
			return c.IP() + "-api"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Limite de requisições excedido",
				"message": "Você está fazendo muitas requisições. Por favor, aguarde um momento.",
				"code":    "API_RATE_LIMIT_EXCEEDED",
			})
		},
		SkipSuccessfulRequests: false,
	})
}

// UploadRateLimiter aplica rate limiting para uploads
// Evita abuso de storage e bandwidth
func UploadRateLimiter() fiber.Handler {
	maxUploads := getEnvInt("RATE_LIMIT_UPLOAD_MAX", 10)       // 10 uploads
	windowMinutes := getEnvInt("RATE_LIMIT_UPLOAD_WINDOW", 5)  // por 5 minutos

	return limiter.New(limiter.Config{
		Max:        maxUploads,
		Expiration: time.Duration(windowMinutes) * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			if userID := c.Locals("userID"); userID != nil {
				return userID.(string) + "-upload"
			}
			return c.IP() + "-upload"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Limite de uploads excedido",
				"message": "Você atingiu o limite de uploads. Aguarde alguns minutos.",
				"code":    "UPLOAD_LIMIT_EXCEEDED",
			})
		},
	})
}

// GlobalRateLimiter aplica rate limiting global por IP
// Última linha de defesa contra DDoS
func GlobalRateLimiter() fiber.Handler {
	maxRequests := getEnvInt("RATE_LIMIT_GLOBAL_MAX", 300)     // 300 requisições
	windowMinutes := getEnvInt("RATE_LIMIT_GLOBAL_WINDOW", 1)  // por minuto

	return limiter.New(limiter.Config{
		Max:        maxRequests,
		Expiration: time.Duration(windowMinutes) * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP() + "-global"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Limite global excedido",
				"message": "Muitas requisições do seu IP. Aguarde um momento.",
				"code":    "GLOBAL_RATE_LIMIT",
			})
		},
		// Ignora rotas de saúde/status
		Next: func(c *fiber.Ctx) bool {
			return c.Path() == "/health"
		},
	})
}

// SlidingWindowRateLimiter implementa sliding window para distribuição mais suave
func SlidingWindowRateLimiter(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		KeyGenerator: func(c *fiber.Ctx) string {
			if userID := c.Locals("userID"); userID != nil {
				return userID.(string) + "-sliding"
			}
			return c.IP() + "-sliding"
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Rate limit excedido",
				"message": "Por favor, aguarde antes de tentar novamente.",
				"code":    "RATE_LIMIT_EXCEEDED",
			})
		},
		// Usando sliding window algorithm
		LimiterMiddleware: limiter.SlidingWindow{},
	})
}

// getEnvInt obtém uma variável de ambiente como int com fallback
func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return fallback
}



