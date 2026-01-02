package handlers

import (
	"encoding/json"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// CheckSurveyStatus verifica se o usuário completou o survey
func CheckSurveyStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var surveyResponse models.SurveyResponse
	result := config.DB.Where("user_id = ?", userID).First(&surveyResponse)

	completed := result.Error == nil

	return c.JSON(fiber.Map{
		"success":   true,
		"completed": completed,
	})
}

// SubmitSurvey permite que um usuário autenticado submeta suas respostas
func SubmitSurvey(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Verificar se já existe um survey para este usuário
	var existingSurvey models.SurveyResponse
	if config.DB.Where("user_id = ?", userID).First(&existingSurvey).Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Você já completou o questionário",
		})
	}

	type SubmitSurveyRequest struct {
		Answers map[int]int `json:"answers"`
	}

	var req SubmitSurveyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Validar se todas as 35 respostas foram enviadas
	if len(req.Answers) != 35 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Todas as 35 perguntas devem ser respondidas",
		})
	}

	// Calcular pontuação
	score := models.CalculateSurveyScore(req.Answers)

	// Converter answers para JSON
	answersJSON, _ := json.Marshal(req.Answers)

	// Criar survey response
	surveyResponse := models.SurveyResponse{
		UserID:  userID,
		Answers: string(answersJSON),
		Score:   score,
	}

	if err := config.DB.Create(&surveyResponse).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao salvar respostas",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Questionário enviado com sucesso!",
		"score":   score,
	})
}

// GetQuestions retorna todas as perguntas do questionário
func GetQuestions(c *fiber.Ctx) error {
	questions := models.GetSurveyQuestions()

	return c.JSON(fiber.Map{
		"success":   true,
		"questions": questions,
	})
}

// GetSurveyResults retorna os resultados do questionário do usuário
func GetSurveyResults(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var surveyResponse models.SurveyResponse
	if result := config.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&surveyResponse); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Questionário não encontrado",
		})
	}

	// Parse das respostas
	var answers map[int]int
	if err := json.Unmarshal([]byte(surveyResponse.Answers), &answers); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao processar respostas",
		})
	}

	// Calcula categorias
	questions := models.GetSurveyQuestions()
	categories := make(map[string]struct{ total, count float64 })

	for _, q := range questions {
		value, ok := answers[q.ID]
		if !ok {
			continue
		}

		normalizedValue := float64(value)
		if models.InvertedQuestions[q.ID] {
			normalizedValue = 6.0 - float64(value)
		}

		cat := categories[q.Category]
		cat.total += normalizedValue
		cat.count += 1
		categories[q.Category] = cat
	}

	// Converte para percentuais
	categoryScores := make(map[string]float64)
	for category, data := range categories {
		categoryScores[category] = (data.total / (data.count * 5)) * 100
	}

	// Gera recomendações
	recommendations := generateRecommendations(categoryScores)

	return c.JSON(fiber.Map{
		"success": true,
		"results": models.SurveyResults{
			UserID:          userID,
			OverallScore:    surveyResponse.Score,
			Categories:      categoryScores,
			Recommendations: recommendations,
			CreatedAt:       surveyResponse.CreatedAt,
		},
	})
}

func generateRecommendations(categories map[string]float64) []string {
	recommendations := []string{}

	if categories["demandas"] < 60 {
		recommendations = append(recommendations, "Considere técnicas de gestão de tempo e priorização de tarefas")
	}
	if categories["controle"] < 60 {
		recommendations = append(recommendations, "Busque mais autonomia nas decisões sobre seu trabalho")
	}
	if categories["apoio"] < 60 {
		recommendations = append(recommendations, "Procure construir uma rede de apoio com colegas e gestores")
	}
	if categories["relacionamentos"] < 60 {
		recommendations = append(recommendations, "Invista em melhorar a comunicação e relacionamentos no trabalho")
	}
	if categories["papel"] < 60 {
		recommendations = append(recommendations, "Busque clareza sobre suas responsabilidades e expectativas")
	}
	if categories["mudanca"] < 60 {
		recommendations = append(recommendations, "Participe mais ativamente dos processos de mudança na organização")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "Continue mantendo o bom equilíbrio no trabalho!")
		recommendations = append(recommendations, "Pratique exercícios de mindfulness para gerenciar o estresse")
	}

	return recommendations
}
