package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog representa o histórico de alterações do sistema
type AuditLog struct {
	ID           string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	AdminID      string    `gorm:"type:nvarchar(36);not null;index" json:"admin_id"`
	AdminName    string    `gorm:"type:nvarchar(255);not null" json:"admin_name"`
	AdminEmail   string    `gorm:"type:nvarchar(255);not null" json:"admin_email"`
	Action       string    `gorm:"type:nvarchar(100);not null;index" json:"action"`       // CREATE, UPDATE, DELETE, ROLE_CHANGE
	EntityType   string    `gorm:"type:nvarchar(100);not null;index" json:"entity_type"` // USER, PROFILE, SETTINGS, etc
	EntityID     string    `gorm:"type:nvarchar(36);not null;index" json:"entity_id"`
	EntityName   string    `gorm:"type:nvarchar(255)" json:"entity_name"`
	FieldName    string    `gorm:"type:nvarchar(100)" json:"field_name,omitempty"`
	OldValue     string    `gorm:"type:nvarchar(max)" json:"old_value,omitempty"`
	NewValue     string    `gorm:"type:nvarchar(max)" json:"new_value,omitempty"`
	Description  string    `gorm:"type:nvarchar(500)" json:"description"`
	IPAddress    string    `gorm:"type:nvarchar(45)" json:"ip_address,omitempty"`
	UserAgent    string    `gorm:"type:nvarchar(500)" json:"user_agent,omitempty"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

// BeforeCreate gera o UUID antes de criar
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

// AuditLogResponse para retorno na API
type AuditLogResponse struct {
	ID          string    `json:"id"`
	AdminID     string    `json:"admin_id"`
	AdminName   string    `json:"admin_name"`
	AdminEmail  string    `json:"admin_email"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entity_type"`
	EntityID    string    `json:"entity_id"`
	EntityName  string    `json:"entity_name"`
	FieldName   string    `json:"field_name,omitempty"`
	OldValue    string    `json:"old_value,omitempty"`
	NewValue    string    `json:"new_value,omitempty"`
	Description string    `json:"description"`
	IPAddress   string    `json:"ip_address,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// ToResponse converte AuditLog para AuditLogResponse
func (a *AuditLog) ToResponse() AuditLogResponse {
	return AuditLogResponse{
		ID:          a.ID,
		AdminID:     a.AdminID,
		AdminName:   a.AdminName,
		AdminEmail:  a.AdminEmail,
		Action:      a.Action,
		EntityType:  a.EntityType,
		EntityID:    a.EntityID,
		EntityName:  a.EntityName,
		FieldName:   a.FieldName,
		OldValue:    a.OldValue,
		NewValue:    a.NewValue,
		Description: a.Description,
		IPAddress:   a.IPAddress,
		CreatedAt:   a.CreatedAt,
	}
}

// Constantes para tipos de ação
const (
	ActionCreate     = "CREATE"
	ActionUpdate     = "UPDATE"
	ActionDelete     = "DELETE"
	ActionRoleChange = "ROLE_CHANGE"
	ActionLogin      = "LOGIN"
	ActionLogout     = "LOGOUT"
)

// Constantes para tipos de entidade
const (
	EntityUser     = "USER"
	EntityProfile  = "PROFILE"
	EntitySettings = "SETTINGS"
	EntitySystem   = "SYSTEM"
)

