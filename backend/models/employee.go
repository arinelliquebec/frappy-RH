package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Employee representa um funcionário com histórico
type Employee struct {
	ID               string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID           string         `gorm:"type:nvarchar(36);uniqueIndex;not null" json:"user_id"`
	Department       string         `gorm:"type:nvarchar(100)" json:"department"`
	Position         string         `gorm:"type:nvarchar(100)" json:"position"`
	HireDate         time.Time      `gorm:"type:date" json:"hire_date"`
	ManagerID        *string        `gorm:"type:nvarchar(36)" json:"manager_id,omitempty"`
	Status           string         `gorm:"type:nvarchar(50);default:'active'" json:"status"` // active, inactive, on_leave
	Phone            string         `gorm:"type:nvarchar(20)" json:"phone,omitempty"`
	Address          string         `gorm:"type:nvarchar(500)" json:"address,omitempty"`
	EmergencyContact string         `gorm:"type:nvarchar(255)" json:"emergency_contact,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relacionamentos
	User    User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Manager *Employee `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
}

// BeforeCreate gera o UUID antes de criar
func (e *Employee) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// EmployeeHistory representa o histórico de alterações do funcionário
type EmployeeHistory struct {
	ID         string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	EmployeeID string    `gorm:"type:nvarchar(36);index;not null" json:"employee_id"`
	FieldName  string    `gorm:"type:nvarchar(100);not null" json:"field_name"`
	OldValue   string    `gorm:"type:nvarchar(500)" json:"old_value"`
	NewValue   string    `gorm:"type:nvarchar(500)" json:"new_value"`
	ChangedBy  string    `gorm:"type:nvarchar(36)" json:"changed_by"`
	ChangedAt  time.Time `json:"changed_at"`
}

// BeforeCreate gera o UUID antes de criar
func (h *EmployeeHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.New().String()
	}
	return nil
}
