package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PDIStatus representa o status do PDI
type PDIStatus string

const (
	PDIStatusDraft      PDIStatus = "draft"       // Rascunho
	PDIStatusPending    PDIStatus = "pending"     // Aguardando aprovação do gestor
	PDIStatusApproved   PDIStatus = "approved"    // Aprovado
	PDIStatusInProgress PDIStatus = "in_progress" // Em andamento
	PDIStatusCompleted  PDIStatus = "completed"   // Concluído
	PDIStatusCancelled  PDIStatus = "cancelled"   // Cancelado
)

// GoalStatus representa o status de uma meta
type GoalStatus string

const (
	GoalStatusPending    GoalStatus = "pending"     // Pendente
	GoalStatusInProgress GoalStatus = "in_progress" // Em andamento
	GoalStatusCompleted  GoalStatus = "completed"   // Concluída
	GoalStatusCancelled  GoalStatus = "cancelled"   // Cancelada
)

// GoalPriority representa a prioridade de uma meta
type GoalPriority string

const (
	GoalPriorityLow    GoalPriority = "low"    // Baixa
	GoalPriorityMedium GoalPriority = "medium" // Média
	GoalPriorityHigh   GoalPriority = "high"   // Alta
)

// ActionStatus representa o status de uma ação
type ActionStatus string

const (
	ActionStatusPending    ActionStatus = "pending"     // Pendente
	ActionStatusInProgress ActionStatus = "in_progress" // Em andamento
	ActionStatusCompleted  ActionStatus = "completed"   // Concluída
	ActionStatusCancelled  ActionStatus = "cancelled"   // Cancelada
)

// PDI representa o Plano de Desenvolvimento Individual
type PDI struct {
	ID              string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID          string    `gorm:"type:varchar(36);not null;index" json:"user_id"`
	User            *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ManagerID       *string   `gorm:"type:varchar(36);index" json:"manager_id,omitempty"`
	Manager         *User     `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	Title           string    `gorm:"type:varchar(255);not null" json:"title"`
	Description     string    `gorm:"type:text" json:"description"`
	PeriodStart     time.Time `gorm:"not null" json:"period_start"`
	PeriodEnd       time.Time `gorm:"not null" json:"period_end"`
	Status          PDIStatus `gorm:"type:varchar(20);default:'draft'" json:"status"`
	OverallProgress int       `gorm:"default:0" json:"overall_progress"` // 0-100%

	// Feedback e comentários
	ManagerFeedback  string     `gorm:"type:text" json:"manager_feedback,omitempty"`
	EmployeeFeedback string     `gorm:"type:text" json:"employee_feedback,omitempty"`
	ApprovedAt       *time.Time `json:"approved_at,omitempty"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`

	// Relacionamentos
	Goals    []PDIGoal    `gorm:"foreignKey:PDIID" json:"goals,omitempty"`
	Checkins []PDICheckin `gorm:"foreignKey:PDIID" json:"checkins,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// PDIGoal representa uma meta/objetivo do PDI
type PDIGoal struct {
	ID          string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	PDIID       string       `gorm:"type:varchar(36);not null;index" json:"pdi_id"`
	Title       string       `gorm:"type:varchar(255);not null" json:"title"`
	Description string       `gorm:"type:text" json:"description"`
	Category    string       `gorm:"type:varchar(100)" json:"category"` // Técnica, Comportamental, Liderança, etc.
	Priority    GoalPriority `gorm:"type:varchar(20);default:'medium'" json:"priority"`
	Status      GoalStatus   `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Progress    int          `gorm:"default:0" json:"progress"` // 0-100%
	DueDate     *time.Time   `json:"due_date,omitempty"`
	CompletedAt *time.Time   `json:"completed_at,omitempty"`

	// Métricas de sucesso
	SuccessCriteria string `gorm:"type:text" json:"success_criteria"`

	// Relacionamentos
	Actions []PDIAction `gorm:"foreignKey:GoalID" json:"actions,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// PDIAction representa uma ação de desenvolvimento
type PDIAction struct {
	ID          string       `gorm:"primaryKey;type:varchar(36)" json:"id"`
	GoalID      string       `gorm:"type:varchar(36);not null;index" json:"goal_id"`
	Title       string       `gorm:"type:varchar(255);not null" json:"title"`
	Description string       `gorm:"type:text" json:"description"`
	ActionType  string       `gorm:"type:varchar(50)" json:"action_type"` // Curso, Livro, Mentoria, Projeto, Workshop, etc.
	Status      ActionStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	DueDate     *time.Time   `json:"due_date,omitempty"`
	CompletedAt *time.Time   `json:"completed_at,omitempty"`

	// Recursos
	ResourceURL  string `gorm:"type:varchar(500)" json:"resource_url,omitempty"`
	ResourceName string `gorm:"type:varchar(255)" json:"resource_name,omitempty"`

	// Notas e evidências
	Notes    string `gorm:"type:text" json:"notes,omitempty"`
	Evidence string `gorm:"type:text" json:"evidence,omitempty"` // Links ou descrição de evidências

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// PDICheckin representa um acompanhamento/check-in do PDI
type PDICheckin struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	PDIID       string    `gorm:"type:varchar(36);not null;index" json:"pdi_id"`
	AuthorID    string    `gorm:"type:varchar(36);not null" json:"author_id"`
	Author      *User     `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CheckinDate time.Time `gorm:"not null" json:"checkin_date"`
	CheckinType string    `gorm:"type:varchar(50)" json:"checkin_type"` // self, manager, meeting

	// Conteúdo do check-in
	Progress     string `gorm:"type:text" json:"progress"`      // O que foi alcançado
	Challenges   string `gorm:"type:text" json:"challenges"`    // Desafios encontrados
	NextSteps    string `gorm:"type:text" json:"next_steps"`    // Próximos passos
	ManagerNotes string `gorm:"type:text" json:"manager_notes"` // Notas do gestor

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hooks
func (p *PDI) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

func (g *PDIGoal) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.New().String()
	}
	return nil
}

func (a *PDIAction) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

func (c *PDICheckin) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// TableName define os nomes das tabelas
func (PDI) TableName() string {
	return "pdis"
}

func (PDIGoal) TableName() string {
	return "pdi_goals"
}

func (PDIAction) TableName() string {
	return "pdi_actions"
}

func (PDICheckin) TableName() string {
	return "pdi_checkins"
}

// PDISummary para listagens
type PDISummary struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	PeriodStart     time.Time `json:"period_start"`
	PeriodEnd       time.Time `json:"period_end"`
	Status          PDIStatus `json:"status"`
	OverallProgress int       `json:"overall_progress"`
	GoalsCount      int       `json:"goals_count"`
	GoalsCompleted  int       `json:"goals_completed"`
	UserName        string    `json:"user_name,omitempty"`
	ManagerName     string    `json:"manager_name,omitempty"`
}
