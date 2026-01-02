package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ChatMessage representa uma mensagem no histórico do chat
type ChatMessage struct {
	ID        string    `json:"id" gorm:"type:nvarchar(36);primaryKey"`
	SessionID string    `json:"session_id" gorm:"type:nvarchar(36);not null;index"`
	UserID    string    `json:"user_id" gorm:"type:nvarchar(36);not null;index"`
	Role      string    `json:"role" gorm:"type:nvarchar(20);not null"` // user, assistant, system
	Content   string    `json:"content" gorm:"type:nvarchar(max);not null"`
	Tokens    int       `json:"tokens" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// ChatSession representa uma sessão de conversa
type ChatSession struct {
	ID        string    `json:"id" gorm:"type:nvarchar(36);primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:nvarchar(36);not null;index"`
	Title     string    `json:"title" gorm:"type:nvarchar(255)"`
	Context   string    `json:"context" gorm:"type:nvarchar(50)"` // general, vacation, learning, pdi, payslip
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	Messages []ChatMessage `json:"messages,omitempty" gorm:"foreignKey:SessionID;references:ID"`
	User     *User         `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
}

// ChatUsageStats estatísticas de uso do chat por usuário
type ChatUsageStats struct {
	ID            string    `json:"id" gorm:"type:nvarchar(36);primaryKey"`
	UserID        string    `json:"user_id" gorm:"type:nvarchar(36);not null;uniqueIndex"`
	TotalMessages int       `json:"total_messages" gorm:"default:0"`
	TotalTokens   int       `json:"total_tokens" gorm:"default:0"`
	LastUsedAt    time.Time `json:"last_used_at"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// BeforeCreate hook para gerar UUID
func (c *ChatMessage) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (c *ChatSession) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (c *ChatUsageStats) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// ==================== Request/Response DTOs ====================

// ChatRequest representa uma requisição de chat
type ChatRequest struct {
	Message   string `json:"message" validate:"required,min=1,max=4000"`
	SessionID string `json:"session_id,omitempty"`
	Context   string `json:"context,omitempty"` // general, vacation, learning, pdi, payslip
}

// ChatResponse representa uma resposta do chat
type ChatResponse struct {
	Message   string `json:"message"`
	SessionID string `json:"session_id"`
	Tokens    int    `json:"tokens,omitempty"`
}

// ChatSessionResponse resposta com dados da sessão
type ChatSessionResponse struct {
	ID        string        `json:"id"`
	Title     string        `json:"title"`
	Context   string        `json:"context"`
	Messages  []ChatMessage `json:"messages"`
	CreatedAt time.Time     `json:"created_at"`
}

// QuickAction ação rápida sugerida pelo assistente
type QuickAction struct {
	Label string `json:"label"`
	Query string `json:"query"`
	Icon  string `json:"icon,omitempty"`
}

// ChatSuggestion sugestões contextuais
type ChatSuggestion struct {
	Title       string        `json:"title"`
	Description string        `json:"description,omitempty"`
	Actions     []QuickAction `json:"actions"`
}
