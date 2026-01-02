package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User representa um usuário do sistema
type User struct {
	ID          string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	Name        string         `gorm:"type:nvarchar(255);not null" json:"name"`
	Email       string         `gorm:"type:nvarchar(255);uniqueIndex;not null" json:"email"`
	CPF         string         `gorm:"type:nvarchar(14);uniqueIndex;default:''" json:"cpf"`
	Password    string         `gorm:"type:nvarchar(255);not null" json:"-"`
	Company     string         `gorm:"type:nvarchar(255)" json:"company,omitempty"`
	Position    string         `gorm:"type:nvarchar(100)" json:"position,omitempty"`
	Department  string         `gorm:"type:nvarchar(100)" json:"department,omitempty"`
	Role        string         `gorm:"type:nvarchar(50);default:'user'" json:"role"`
	AvatarURL   string         `gorm:"type:nvarchar(500)" json:"avatar_url,omitempty"`
	BirthDate   *time.Time     `gorm:"type:date" json:"birth_date,omitempty"`
	HireDate    *time.Time     `gorm:"type:date" json:"hire_date,omitempty"`
	Phone       string         `gorm:"type:nvarchar(20)" json:"phone,omitempty"`
	Bio         string         `gorm:"type:nvarchar(500)" json:"bio,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate gera o UUID antes de criar
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

// SignupRequest representa os dados de cadastro
type SignupRequest struct {
	Name     string      `json:"name" validate:"required"`
	Email    string      `json:"email" validate:"required,email"`
	CPF      string      `json:"cpf" validate:"required"`            // Novo campo
	Password string      `json:"password" validate:"required,min=6"` // Senha fornecida pelo usuário
	Company  string      `json:"company,omitempty"`
	Answers  map[int]int `json:"answers" validate:"required"`
}

// LoginRequest representa os dados de login
type LoginRequest struct {
	CPF        string `json:"cpf" validate:"required"` // Mudou de Email para CPF
	Password   string `json:"password" validate:"required"`
	RememberMe bool   `json:"remember_me"`
}

// AuthResponse representa a resposta de autenticação
type AuthResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token"`
	User    User   `json:"user"`
	Error   string `json:"error,omitempty"`
}

// UserResponse representa a resposta do usuário (sem senha)
type UserResponse struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Email      string     `json:"email"`
	CPF        string     `json:"cpf"`
	Company    string     `json:"company,omitempty"`
	Position   string     `json:"position,omitempty"`
	Department string     `json:"department,omitempty"`
	Role       string     `json:"role"`
	AvatarURL  string     `json:"avatar_url,omitempty"`
	BirthDate  *time.Time `json:"birth_date,omitempty"`
	HireDate   *time.Time `json:"hire_date,omitempty"`
	Phone      string     `json:"phone,omitempty"`
	Bio        string     `json:"bio,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ToResponse converte User para UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:         u.ID,
		Name:       u.Name,
		Email:      u.Email,
		CPF:        u.CPF,
		Company:    u.Company,
		Position:   u.Position,
		Department: u.Department,
		Role:       u.Role,
		AvatarURL:  u.AvatarURL,
		BirthDate:  u.BirthDate,
		HireDate:   u.HireDate,
		Phone:      u.Phone,
		Bio:        u.Bio,
		CreatedAt:  u.CreatedAt,
	}
}

// Badge representa uma conquista/badge do sistema
type Badge struct {
	ID          string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	Name        string         `gorm:"type:nvarchar(100);not null" json:"name"`
	Description string         `gorm:"type:nvarchar(500)" json:"description"`
	Icon        string         `gorm:"type:nvarchar(50)" json:"icon"`
	Color       string         `gorm:"type:nvarchar(20)" json:"color"`
	Category    string         `gorm:"type:nvarchar(50)" json:"category"` // tempo_casa, aprendizado, engajamento, etc
	Criteria    string         `gorm:"type:nvarchar(500)" json:"criteria"`
	Points      int            `gorm:"default:10" json:"points"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *Badge) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

// UserBadge representa a relação entre usuário e badges conquistados
type UserBadge struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID    string         `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	BadgeID   string         `gorm:"type:nvarchar(36);not null;index" json:"badge_id"`
	Badge     Badge          `gorm:"foreignKey:BadgeID" json:"badge,omitempty"`
	EarnedAt  time.Time      `json:"earned_at"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ub *UserBadge) BeforeCreate(tx *gorm.DB) error {
	if ub.ID == "" {
		ub.ID = uuid.New().String()
	}
	if ub.EarnedAt.IsZero() {
		ub.EarnedAt = time.Now()
	}
	return nil
}

// CareerEvent representa um evento na timeline de carreira
type CareerEvent struct {
	ID          string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID      string         `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	EventType   string         `gorm:"type:nvarchar(50);not null" json:"event_type"` // admissao, promocao, certificacao, projeto, reconhecimento
	Title       string         `gorm:"type:nvarchar(200);not null" json:"title"`
	Description string         `gorm:"type:nvarchar(1000)" json:"description"`
	EventDate   time.Time      `gorm:"type:date;not null" json:"event_date"`
	Icon        string         `gorm:"type:nvarchar(50)" json:"icon"`
	Color       string         `gorm:"type:nvarchar(20)" json:"color"`
	Metadata    string         `gorm:"type:nvarchar(max)" json:"metadata,omitempty"` // JSON para dados extras
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ce *CareerEvent) BeforeCreate(tx *gorm.DB) error {
	if ce.ID == "" {
		ce.ID = uuid.New().String()
	}
	return nil
}
