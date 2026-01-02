package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DocumentStatus representa os possíveis status de um documento
type DocumentStatus string

const (
	DocumentStatusPending  DocumentStatus = "pending"  // Aguardando aprovação
	DocumentStatusApproved DocumentStatus = "approved" // Aprovado
	DocumentStatusRejected DocumentStatus = "rejected" // Rejeitado
)

// Document representa um documento do sistema
type Document struct {
	ID           string  `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID       string  `gorm:"type:nvarchar(36);index;not null" json:"user_id"`
	EmployeeID   *string `gorm:"type:nvarchar(36);index" json:"employee_id,omitempty"`
	Name         string  `gorm:"type:nvarchar(255);not null" json:"name"`
	OriginalName string  `gorm:"type:nvarchar(255);not null" json:"original_name"`
	Type         string  `gorm:"type:nvarchar(100)" json:"type"` // rg, cpf, cnh, etc
	MimeType     string  `gorm:"type:nvarchar(100)" json:"mime_type"`
	Size         int64   `json:"size"` // em bytes
	Path         string  `gorm:"type:nvarchar(500);not null" json:"path"`
	URL          string  `gorm:"type:nvarchar(500)" json:"url,omitempty"`
	Description  string  `gorm:"type:nvarchar(500)" json:"description,omitempty"`
	IsPublic     bool    `gorm:"default:false" json:"is_public"`

	// Campos de aprovação
	Status       DocumentStatus `gorm:"type:nvarchar(20);default:'pending'" json:"status"`
	ReviewedBy   *string        `gorm:"type:nvarchar(36)" json:"reviewed_by,omitempty"`
	ReviewedAt   *time.Time     `json:"reviewed_at,omitempty"`
	RejectReason string         `gorm:"type:nvarchar(500)" json:"reject_reason,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relacionamentos
	User     User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Employee *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	Reviewer *User     `gorm:"foreignKey:ReviewedBy" json:"reviewer,omitempty"`
}

// BeforeCreate gera o UUID antes de criar
func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	return nil
}

// DocumentUploadResponse representa a resposta de upload
type DocumentUploadResponse struct {
	Success  bool     `json:"success"`
	Document Document `json:"document"`
	Message  string   `json:"message"`
}
