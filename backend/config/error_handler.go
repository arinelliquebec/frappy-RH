package config

import (
	"github.com/gofiber/fiber/v2"
)

// ErrorHandler é o handler global de erros
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Status code padrão
	code := fiber.StatusInternalServerError

	// Verifica se é um erro do Fiber
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	// Retorna erro em JSON
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   err.Error(),
	})
}

