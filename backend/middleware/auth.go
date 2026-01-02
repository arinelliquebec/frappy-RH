package middleware

import (
	"strings"

	"github.com/frappyou/backend/config"
	"github.com/gofiber/fiber/v2"
)

// AuthMiddleware verifica o token JWT
func AuthMiddleware(c *fiber.Ctx) error {
	// Pega o header Authorization
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Token não fornecido",
		})
	}

	// Extrai o token do header "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Formato de token inválido",
		})
	}

	tokenString := parts[1]

	// Valida o token
	claims, err := config.ValidateToken(tokenString)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Token inválido ou expirado",
		})
	}

	// Adiciona os dados do usuário ao contexto
	c.Locals("user_id", claims.UserID)
	c.Locals("email", claims.Email)
	c.Locals("role", claims.Role)

	return c.Next()
}

