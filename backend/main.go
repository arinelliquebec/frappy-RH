// FrappYOU API - v1.1.0 - Survey & Career features
package main

import (
	"log"
	"os"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/handlers"
	"github.com/frappyou/backend/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Variáveis de ambiente já foram carregadas pelo config.init()

	// Conecta ao banco de dados
	if err := config.ConnectDB(); err != nil {
		log.Fatal("Falha ao conectar ao banco de dados:", err)
	}

	// Conecta ao Redis (opcional - continua funcionando sem)
	config.ConnectRedis()
	defer config.CloseRedis()

	// Seed de dados iniciais
	config.SeedDatabase()
	handlers.SeedDefaultBadges()

	// Cria a aplicação Fiber
	app := fiber.New(fiber.Config{
		AppName:      "FrappYOU API",
		ErrorHandler: config.ErrorHandler,
		BodyLimit:    500 * 1024 * 1024, // 500MB para uploads de vídeo
	})

	// Middlewares
	app.Use(logger.New())
	app.Use(recover.New())

	// CORS - configurável via variável de ambiente
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		// Inclui localhost para desenvolvimento e domínios de produção
		allowedOrigins = "http://localhost:3000, http://127.0.0.1:3000, https://www.frappyou.app, https://frappyou.app"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Servir arquivos estáticos (uploads de imagens)
	app.Static("/uploads/images", "./uploads/images", fiber.Static{
		Compress: true,
	})

	// Servir arquivos de vídeo com suporte a Range Requests (permite seek)
	app.Static("/uploads/videos", "./uploads/videos", fiber.Static{
		ByteRange: true, // Habilita suporte a Range Requests para seek em vídeos
	})

	// Rotas
	routes.SetupRoutes(app)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "message": "FrappYOU API is running"})
	})

	// Inicia o servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 FrappYOU API iniciada na porta %s", port)
	log.Fatal(app.Listen(":" + port))
}
