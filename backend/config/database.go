package config

import (
	"fmt"
	"log"
	"os"

	"net/url"

	"github.com/frappyou/backend/models"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() error {
	var dsn string

	// Verifica se há connection string do Azure
	azureConn := os.Getenv("AZURE_SQL_CONNECTION_STRING")
	if azureConn != "" {
		dsn = azureConn
	} else {
		// Monta a connection string a partir das variáveis individuais
		server := os.Getenv("DB_SERVER")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		database := os.Getenv("DB_NAME")

		if server == "" {
			server = "localhost"
		}
		if port == "" {
			port = "1433"
		}
		if database == "" {
			database = "frappyou"
		}

		// URL Encode na senha para evitar erros com caracteres especiais
		encodedPassword := url.QueryEscape(password)

		dsn = fmt.Sprintf("sqlserver://%s:%s@%s:%s?database=%s&encrypt=true&trustServerCertificate=true",
			user, encodedPassword, server, port, database)
	}

	// Configura o logger do GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	// Conecta ao banco
	var err error
	DB, err = gorm.Open(sqlserver.Open(dsn), gormConfig)
	if err != nil {
		return fmt.Errorf("erro ao conectar ao SQL Server: %w", err)
	}

	log.Println("✅ Conectado ao Azure SQL Server com sucesso!")

	// Auto migrate dos modelos
	if err := DB.AutoMigrate(
		&models.User{},
		&models.SurveyResponse{},
		&models.Document{},
		&models.Employee{},
		&models.Vacation{},
		&models.VacationBalance{},
		&models.VacationSellRequest{},
		&models.VacationSettings{},
		&models.CalendarEvent{},
		&models.AuditLog{},
		&models.News{},
		&models.NewsView{},
		&models.NewsReaction{},
		&models.Notification{},
		&models.NotificationPreference{},
		// E-Learning
		&models.Course{},
		&models.Module{},
		&models.Lesson{},
		&models.Quiz{},
		&models.QuizQuestion{},
		&models.QuizOption{},
		&models.Enrollment{},
		&models.LessonProgress{},
		&models.QuizAttempt{},
		&models.Certificate{},
		// Holerite/Contracheque
		&models.Payslip{},
		&models.PayslipItem{},
		// PDI (Plano de Desenvolvimento Individual)
		&models.PDI{},
		&models.PDIGoal{},
		&models.PDIAction{},
		&models.PDICheckin{},
		// Portal do Colaborador
		&models.Badge{},
		&models.UserBadge{},
		&models.CareerEvent{},
		// Chat IA
		&models.ChatSession{},
		&models.ChatMessage{},
		&models.ChatUsageStats{},
		// Base de Conhecimento (RAG)
		&models.KnowledgeArticle{},
		&models.KnowledgeFeedback{},
	); err != nil {
		return fmt.Errorf("erro ao executar migrations: %w", err)
	}

	log.Println("✅ Migrations executadas com sucesso!")

	return nil
}
