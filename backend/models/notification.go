package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NotificationType representa o tipo de notificação
type NotificationType string

const (
	NotificationTypeInfo     NotificationType = "info"
	NotificationTypeSuccess  NotificationType = "success"
	NotificationTypeWarning  NotificationType = "warning"
	NotificationTypeError    NotificationType = "error"
	NotificationTypeVacation NotificationType = "vacation"
	NotificationTypeDocument NotificationType = "document"
	NotificationTypeNews     NotificationType = "news"
	NotificationTypeSystem   NotificationType = "system"
)

// NotificationCategory representa a categoria da notificação
type NotificationCategory string

const (
	NotificationCategoryGeneral  NotificationCategory = "general"
	NotificationCategoryVacation NotificationCategory = "vacation"
	NotificationCategoryDocument NotificationCategory = "document"
	NotificationCategoryNews     NotificationCategory = "news"
	NotificationCategoryApproval NotificationCategory = "approval"
	NotificationCategoryReminder NotificationCategory = "reminder"
	NotificationCategoryAlert    NotificationCategory = "alert"
)

// Notification representa uma notificação para um usuário
type Notification struct {
	ID        string               `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID    string               `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	Title     string               `gorm:"type:nvarchar(255);not null" json:"title"`
	Message   string               `gorm:"type:nvarchar(1000);not null" json:"message"`
	Type      NotificationType     `gorm:"type:nvarchar(50);default:'info'" json:"type"`
	Category  NotificationCategory `gorm:"type:nvarchar(50);default:'general'" json:"category"`
	Link      string               `gorm:"type:nvarchar(500)" json:"link"`           // Link para redirecionar ao clicar
	Icon      string               `gorm:"type:nvarchar(100)" json:"icon"`           // Ícone da notificação
	Read      bool                 `gorm:"column:is_read;default:false" json:"read"` // Se foi lida
	ReadAt    *time.Time           `json:"read_at"`                                  // Quando foi lida
	Archived  bool                 `gorm:"default:false" json:"archived"`            // Se foi arquivada
	ExpiresAt *time.Time           `json:"expires_at"`                               // Expira nesta data
	Metadata  string               `gorm:"type:nvarchar(max)" json:"metadata"`       // JSON com dados extras
	CreatedAt time.Time            `json:"created_at"`
	UpdatedAt time.Time            `json:"updated_at"`
}

// BeforeCreate gera UUID antes de criar
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (Notification) TableName() string {
	return "notifications"
}

// NotificationPreference representa as preferências de notificação do usuário
type NotificationPreference struct {
	ID                    string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID                string    `gorm:"type:nvarchar(36);not null;uniqueIndex" json:"user_id"`
	EmailNotifications    bool      `gorm:"default:true" json:"email_notifications"`
	PushNotifications     bool      `gorm:"default:true" json:"push_notifications"`
	VacationNotifications bool      `gorm:"default:true" json:"vacation_notifications"`
	DocumentNotifications bool      `gorm:"default:true" json:"document_notifications"`
	NewsNotifications     bool      `gorm:"default:true" json:"news_notifications"`
	ReminderNotifications bool      `gorm:"default:true" json:"reminder_notifications"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// BeforeCreate gera UUID antes de criar
func (np *NotificationPreference) BeforeCreate(tx *gorm.DB) error {
	if np.ID == "" {
		np.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (NotificationPreference) TableName() string {
	return "notification_preferences"
}
