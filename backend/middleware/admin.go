package middleware

import (
	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// AdminMiddleware verifica se o usuário é admin
func AdminMiddleware(c *fiber.Ctx) error {
	userID := c.Locals("user_id")

	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Não autorizado",
		})
	}

	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	if user.Role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Acesso negado. Apenas administradores podem acessar este recurso.",
		})
	}

	return c.Next()
}

