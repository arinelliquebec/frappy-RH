package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NewsCategory representa a categoria da notícia
type NewsCategory string

const (
	NewsCategoryGeral       NewsCategory = "geral"
	NewsCategoryRH          NewsCategory = "rh"
	NewsCategoryBeneficios  NewsCategory = "beneficios"
	NewsCategoryEventos     NewsCategory = "eventos"
	NewsCategoryTreinamento NewsCategory = "treinamento"
	NewsCategoryUrgente     NewsCategory = "urgente"
)

// NewsPriority representa a prioridade da notícia
type NewsPriority string

const (
	NewsPriorityNormal NewsPriority = "normal"
	NewsPriorityHigh   NewsPriority = "high"
	NewsPriorityUrgent NewsPriority = "urgent"
)

// News representa uma notícia/comunicado da empresa
type News struct {
	ID          string       `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	Title       string       `gorm:"type:nvarchar(255);not null" json:"title"`
	Summary     string       `gorm:"type:nvarchar(500)" json:"summary"`
	Content     string       `gorm:"type:nvarchar(max);not null" json:"content"`
	Category    NewsCategory `gorm:"type:nvarchar(50);default:'geral'" json:"category"`
	Priority    NewsPriority `gorm:"type:nvarchar(20);default:'normal'" json:"priority"`
	ImageURL    string       `gorm:"type:nvarchar(500)" json:"image_url"`
	AuthorID    string       `gorm:"type:nvarchar(36);not null" json:"author_id"`
	AuthorName  string       `gorm:"type:nvarchar(255)" json:"author_name"`
	Filial      string       `gorm:"type:nvarchar(100)" json:"filial"` // Vazio = todas as filiais
	Published   bool         `gorm:"default:false" json:"published"`
	PublishedAt *time.Time   `json:"published_at"`
	ExpiresAt   *time.Time   `json:"expires_at"`                  // Notícia expira nesta data
	Pinned      bool         `gorm:"default:false" json:"pinned"` // Fixar no topo
	ViewCount   int          `gorm:"default:0" json:"view_count"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// BeforeCreate gera UUID antes de criar
func (n *News) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}

// NewsView registra visualizações de notícias por usuário
type NewsView struct {
	ID        string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	NewsID    string    `gorm:"type:nvarchar(36);not null;index" json:"news_id"`
	UserID    string    `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	ViewedAt  time.Time `json:"viewed_at"`
	CreatedAt time.Time `json:"created_at"`
}

// BeforeCreate gera UUID antes de criar
func (nv *NewsView) BeforeCreate(tx *gorm.DB) error {
	if nv.ID == "" {
		nv.ID = uuid.New().String()
	}
	return nil
}

// NewsReaction representa reações às notícias
type NewsReaction struct {
	ID        string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	NewsID    string    `gorm:"type:nvarchar(36);not null;index" json:"news_id"`
	UserID    string    `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	Reaction  string    `gorm:"type:nvarchar(20);not null" json:"reaction"` // like, love, celebrate, etc.
	CreatedAt time.Time `json:"created_at"`
}

// BeforeCreate gera UUID antes de criar
func (nr *NewsReaction) BeforeCreate(tx *gorm.DB) error {
	if nr.ID == "" {
		nr.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (News) TableName() string {
	return "news"
}

func (NewsView) TableName() string {
	return "news_views"
}

func (NewsReaction) TableName() string {
	return "news_reactions"
}
