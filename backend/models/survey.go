package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SurveyResponse representa as respostas de um usuário ao questionário
type SurveyResponse struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID    string         `gorm:"type:nvarchar(36);index;not null" json:"user_id"`
	Answers   string         `gorm:"type:nvarchar(max)" json:"answers"` // JSON string
	Score     float64        `gorm:"type:decimal(5,2)" json:"score"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relacionamento
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// BeforeCreate gera o UUID antes de criar
func (s *SurveyResponse) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// Question representa uma pergunta do questionário
type Question struct {
	ID             int    `json:"id"`
	Text           string `json:"text"`
	ScaleType      string `json:"scale_type"`      // "frequency" ou "agreement"
	ScaleDirection string `json:"scale_direction"` // "normal" ou "inverted"
	Category       string `json:"category"`
}

// SurveyResults representa os resultados processados
type SurveyResults struct {
	UserID          string             `json:"user_id"`
	OverallScore    float64            `json:"overall_score"`
	Categories      map[string]float64 `json:"categories"`
	Recommendations []string           `json:"recommendations"`
	CreatedAt       time.Time          `json:"created_at"`
}

// GetSurveyQuestions retorna todas as perguntas do questionário
func GetSurveyQuestions() []Question {
	return []Question{
		// Perguntas 1-19 (primeira parte)
		{ID: 1, Text: "Sei claramente o que é esperado de mim no trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "papel"},
		{ID: 2, Text: "Posso decidir quando fazer uma pausa", ScaleType: "frequency", ScaleDirection: "normal", Category: "controle"},
		{ID: 3, Text: "Grupos de trabalho diferentes pedem-me coisas difíceis de conjugar", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 4, Text: "Sei do que necessito para fazer o meu trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "papel"},
		{ID: 5, Text: "Sou sujeito a assédio pessoal sob a forma de palavras ou comportamentos incorretos", ScaleType: "frequency", ScaleDirection: "inverted", Category: "relacionamentos"},
		{ID: 6, Text: "Tenho prazos impossíveis de cumprir", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 7, Text: "Se o trabalho se torna difícil, os colegas ajudam-me", ScaleType: "frequency", ScaleDirection: "normal", Category: "apoio"},
		{ID: 8, Text: "Recebo feedback de apoio sobre o trabalho que faço", ScaleType: "frequency", ScaleDirection: "normal", Category: "apoio"},
		{ID: 9, Text: "Tenho que trabalhar muito intensivamente", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 10, Text: "Tenho capacidade de decisão sobre a minha rapidez de trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "controle"},
		{ID: 11, Text: "Sei claramente os meus deveres e responsabilidades", ScaleType: "frequency", ScaleDirection: "normal", Category: "papel"},
		{ID: 12, Text: "Tenho que negligenciar tarefas porque tenho demasiado que fazer", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 13, Text: "Sei claramente as metas e objetivos do meu departamento", ScaleType: "frequency", ScaleDirection: "normal", Category: "papel"},
		{ID: 14, Text: "Há fricção ou animosidade entre os colegas", ScaleType: "frequency", ScaleDirection: "inverted", Category: "relacionamentos"},
		{ID: 15, Text: "Posso decidir como fazer o meu trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "controle"},
		{ID: 16, Text: "Não consigo fazer pausas suficientes", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 17, Text: "Compreendo como o meu trabalho se integra no objetivo geral da organização", ScaleType: "frequency", ScaleDirection: "normal", Category: "papel"},
		{ID: 18, Text: "Sou pressionado a trabalhar durante horários longos", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 19, Text: "Tenho poder de escolha para decidir o que faço no trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "controle"},
		// Perguntas 20-35 (segunda parte)
		{ID: 20, Text: "Tenho que trabalhar muito depressa", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 21, Text: "Sou sujeito a intimidação/perseguição no trabalho", ScaleType: "frequency", ScaleDirection: "inverted", Category: "relacionamentos"},
		{ID: 22, Text: "Tenho pressões de tempo irrealistas", ScaleType: "frequency", ScaleDirection: "inverted", Category: "demandas"},
		{ID: 23, Text: "Posso estar seguro de que o meu chefe imediato me ajuda num problema de trabalho", ScaleType: "frequency", ScaleDirection: "normal", Category: "apoio"},
		{ID: 24, Text: "Tenho ajuda e apoio necessários dos colegas", ScaleType: "agreement", ScaleDirection: "normal", Category: "apoio"},
		{ID: 25, Text: "Tenho algum poder de decisão sobre a minha forma de trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "controle"},
		{ID: 26, Text: "Tenho oportunidades suficientes para questionar os chefes sobre mudanças no trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "mudanca"},
		{ID: 27, Text: "Sou respeitado como mereço pelos colegas de trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "relacionamentos"},
		{ID: 28, Text: "O pessoal é sempre consultado sobre mudança no trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "mudanca"},
		{ID: 29, Text: "Posso falar com o meu chefe imediato sobre algo no trabalho que me transtornou ou irritou", ScaleType: "agreement", ScaleDirection: "normal", Category: "apoio"},
		{ID: 30, Text: "O meu horário pode ser flexível", ScaleType: "agreement", ScaleDirection: "normal", Category: "controle"},
		{ID: 31, Text: "Os meus colegas estão dispostos a ouvir os meus problemas relacionados com o trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "apoio"},
		{ID: 32, Text: "Quando são efetuadas mudanças no trabalho, sei claramente como resultarão na prática", ScaleType: "agreement", ScaleDirection: "normal", Category: "mudanca"},
		{ID: 33, Text: "Recebo apoio durante trabalho que pode ser emocionalmente exigente", ScaleType: "agreement", ScaleDirection: "normal", Category: "apoio"},
		{ID: 34, Text: "Os relacionamentos no trabalho estão sob pressão", ScaleType: "agreement", ScaleDirection: "inverted", Category: "relacionamentos"},
		{ID: 35, Text: "O meu chefe imediato encoraja-me no trabalho", ScaleType: "agreement", ScaleDirection: "normal", Category: "apoio"},
	}
}

// InvertedQuestions lista as perguntas com escala invertida
var InvertedQuestions = map[int]bool{
	3: true, 5: true, 6: true, 9: true, 12: true, 14: true,
	16: true, 18: true, 20: true, 21: true, 22: true, 34: true,
}

// CalculateSurveyScore calcula a pontuação do questionário
func CalculateSurveyScore(answers map[int]int) float64 {
	totalScore := 0.0
	maxScore := 35.0 * 5.0

	for i := 1; i <= 35; i++ {
		value, ok := answers[i]
		if !ok {
			continue
		}

		normalizedValue := float64(value)
		if InvertedQuestions[i] {
			normalizedValue = 6.0 - float64(value)
		}
		totalScore += normalizedValue
	}

	return (totalScore / maxScore) * 100
}

