package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// KnowledgeCategory categoria do artigo
type KnowledgeCategory string

const (
	KnowledgeCategoryPolicies   KnowledgeCategory = "policies"    // Políticas da empresa
	KnowledgeCategoryBenefits   KnowledgeCategory = "benefits"    // Benefícios
	KnowledgeCategoryVacation   KnowledgeCategory = "vacation"    // Férias e ausências
	KnowledgeCategoryPayroll    KnowledgeCategory = "payroll"     // Folha de pagamento
	KnowledgeCategoryCompliance KnowledgeCategory = "compliance"  // Compliance e ética
	KnowledgeCategoryHR         KnowledgeCategory = "hr"          // RH geral
	KnowledgeCategoryIT         KnowledgeCategory = "it"          // TI e segurança
	KnowledgeCategorySafety     KnowledgeCategory = "safety"      // Segurança do trabalho
	KnowledgeCategoryCareer     KnowledgeCategory = "career"      // Carreira e desenvolvimento
	KnowledgeCategoryGeneral    KnowledgeCategory = "general"     // Geral
)

// KnowledgeArticle representa um artigo na base de conhecimento
type KnowledgeArticle struct {
	ID          string            `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`

	// Conteúdo principal
	Title       string            `gorm:"type:nvarchar(255);not null" json:"title"`
	Slug        string            `gorm:"type:nvarchar(255);uniqueIndex" json:"slug"`
	Summary     string            `gorm:"type:nvarchar(500)" json:"summary"`     // Resumo curto
	Content     string            `gorm:"type:nvarchar(max);not null" json:"content"` // Conteúdo completo em Markdown

	// Categorização
	Category    KnowledgeCategory `gorm:"type:nvarchar(50);not null;index" json:"category"`
	Tags        string            `gorm:"type:nvarchar(500)" json:"tags"` // Tags separadas por vírgula

	// Metadados para busca
	Keywords    string            `gorm:"type:nvarchar(1000)" json:"keywords"` // Palavras-chave para busca

	// Status e visibilidade
	IsPublished bool              `gorm:"default:true" json:"is_published"`
	IsFeatured  bool              `gorm:"default:false" json:"is_featured"` // Destaque

	// Controle de versão
	Version     int               `gorm:"default:1" json:"version"`
	LastReviewedAt *time.Time     `json:"last_reviewed_at,omitempty"`
	LastReviewedBy *string        `gorm:"type:nvarchar(36)" json:"last_reviewed_by,omitempty"`

	// Autor (opcional para artigos do sistema)
	AuthorID    *string           `gorm:"type:nvarchar(36)" json:"author_id,omitempty"`
	Author      *User             `gorm:"foreignKey:AuthorID" json:"author,omitempty"`

	// Estatísticas
	ViewCount   int               `gorm:"default:0" json:"view_count"`
	HelpfulCount int              `gorm:"default:0" json:"helpful_count"`

	// Relacionamentos
	RelatedArticles string        `gorm:"type:nvarchar(500)" json:"related_articles,omitempty"` // IDs separados por vírgula
}

// BeforeCreate gera UUID
func (k *KnowledgeArticle) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (KnowledgeArticle) TableName() string {
	return "knowledge_articles"
}

// KnowledgeFeedback representa feedback sobre um artigo
type KnowledgeFeedback struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ArticleID string `gorm:"type:nvarchar(36);not null;index" json:"article_id"`
	UserID    string `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	IsHelpful bool   `gorm:"not null" json:"is_helpful"`
	Comment   string `gorm:"type:nvarchar(500)" json:"comment,omitempty"`
}

// BeforeCreate gera UUID
func (kf *KnowledgeFeedback) BeforeCreate(tx *gorm.DB) error {
	if kf.ID == "" {
		kf.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (KnowledgeFeedback) TableName() string {
	return "knowledge_feedbacks"
}

// ==================== DTOs ====================

// KnowledgeSearchResult resultado de busca
type KnowledgeSearchResult struct {
	Article   KnowledgeArticle `json:"article"`
	Score     float64          `json:"score"`     // Relevância da busca
	Snippet   string           `json:"snippet"`   // Trecho relevante
}

// KnowledgeSearchRequest requisição de busca
type KnowledgeSearchRequest struct {
	Query    string            `json:"query" validate:"required,min=2"`
	Category KnowledgeCategory `json:"category,omitempty"`
	Limit    int               `json:"limit,omitempty"`
}

// KnowledgeCreateRequest requisição de criação
type KnowledgeCreateRequest struct {
	Title    string            `json:"title" validate:"required,min=3,max=255"`
	Summary  string            `json:"summary,omitempty"`
	Content  string            `json:"content" validate:"required"`
	Category KnowledgeCategory `json:"category" validate:"required"`
	Tags     string            `json:"tags,omitempty"`
	Keywords string            `json:"keywords,omitempty"`
}

// KnowledgeUpdateRequest requisição de atualização
type KnowledgeUpdateRequest struct {
	Title       *string            `json:"title,omitempty"`
	Summary     *string            `json:"summary,omitempty"`
	Content     *string            `json:"content,omitempty"`
	Category    *KnowledgeCategory `json:"category,omitempty"`
	Tags        *string            `json:"tags,omitempty"`
	Keywords    *string            `json:"keywords,omitempty"`
	IsPublished *bool              `json:"is_published,omitempty"`
	IsFeatured  *bool              `json:"is_featured,omitempty"`
}

// Categorias disponíveis para o frontend
var KnowledgeCategories = []struct {
	Value       KnowledgeCategory `json:"value"`
	Label       string            `json:"label"`
	Description string            `json:"description"`
	Icon        string            `json:"icon"`
}{
	{KnowledgeCategoryPolicies, "Políticas", "Políticas gerais da empresa", "policy"},
	{KnowledgeCategoryBenefits, "Benefícios", "Benefícios e vantagens", "card_giftcard"},
	{KnowledgeCategoryVacation, "Férias", "Férias, folgas e ausências", "beach_access"},
	{KnowledgeCategoryPayroll, "Folha", "Holerite e remuneração", "payments"},
	{KnowledgeCategoryCompliance, "Compliance", "Ética e compliance", "verified_user"},
	{KnowledgeCategoryHR, "RH", "Recursos Humanos", "people"},
	{KnowledgeCategoryIT, "TI", "Tecnologia e segurança", "computer"},
	{KnowledgeCategorySafety, "Segurança", "Segurança do trabalho", "health_and_safety"},
	{KnowledgeCategoryCareer, "Carreira", "Desenvolvimento de carreira", "trending_up"},
	{KnowledgeCategoryGeneral, "Geral", "Informações gerais", "info"},
}

