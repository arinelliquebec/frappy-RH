package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VacationType representa o tipo de ausência
type VacationType string

const (
	VacationTypeFerias      VacationType = "ferias"
	VacationTypeAbono       VacationType = "abono"
	VacationTypeLicenca     VacationType = "licenca"
	VacationTypeAtestado    VacationType = "atestado"
	VacationTypeFolga       VacationType = "folga"
	VacationTypeHomeOffice  VacationType = "home_office"
)

// VacationStatus representa o status da solicitação
type VacationStatus string

const (
	VacationStatusPending     VacationStatus = "pending"
	VacationStatusApproved    VacationStatus = "approved"
	VacationStatusRejected    VacationStatus = "rejected"
	VacationStatusCanceled    VacationStatus = "canceled"
	VacationStatusInterrupted VacationStatus = "interrupted"
)

// Vacation representa uma solicitação de férias ou ausência
type Vacation struct {
	ID          string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relacionamento com usuário
	UserID      string         `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Dados da solicitação
	Type        VacationType   `gorm:"type:varchar(20);not null" json:"type"`
	StartDate   time.Time      `gorm:"not null" json:"start_date"`
	EndDate     time.Time      `gorm:"not null" json:"end_date"`
	TotalDays   int            `gorm:"not null" json:"total_days"`
	Reason      string         `gorm:"type:nvarchar(max)" json:"reason"`

	// Status e aprovação
	Status      VacationStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ApprovedBy  *string        `gorm:"type:nvarchar(36)" json:"approved_by,omitempty"`
	Approver    *User          `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	ApprovedAt  *time.Time     `json:"approved_at,omitempty"`
	RejectReason string        `gorm:"type:nvarchar(max)" json:"reject_reason,omitempty"`

	// Interrupção
	InterruptedAt  *time.Time     `json:"interrupted_at,omitempty"`
	InterruptedBy  *string        `gorm:"type:nvarchar(36)" json:"interrupted_by,omitempty"`
	ActualDays     int            `gorm:"default:0" json:"actual_days"` // Dias efetivamente usados
	InterruptReason string        `gorm:"type:nvarchar(max)" json:"interrupt_reason,omitempty"`

	// Metadados
	Attachment  string         `gorm:"type:nvarchar(255)" json:"attachment,omitempty"`
	Notes       string         `gorm:"type:nvarchar(max)" json:"notes,omitempty"`
}

// BeforeCreate gera o UUID antes de criar
func (v *Vacation) BeforeCreate(tx *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.New().String()
	}
	return nil
}

// VacationBalance representa o saldo de férias do colaborador
type VacationBalance struct {
	ID            string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	UserID        string         `gorm:"type:nvarchar(36);uniqueIndex;not null" json:"user_id"`
	User          User           `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Saldos
	TotalDays     int            `gorm:"default:30" json:"total_days"`
	UsedDays      int            `gorm:"default:0" json:"used_days"`
	PendingDays   int            `gorm:"default:0" json:"pending_days"`
	AvailableDays int            `gorm:"default:30" json:"available_days"`

	// Período aquisitivo
	PeriodStart   time.Time      `json:"period_start"`
	PeriodEnd     time.Time      `json:"period_end"`

	// Abonos
	AbonoDays     int            `gorm:"default:3" json:"abono_days"`
	UsedAbono     int            `gorm:"default:0" json:"used_abono"`
}

// BeforeCreate gera o UUID antes de criar
func (vb *VacationBalance) BeforeCreate(tx *gorm.DB) error {
	if vb.ID == "" {
		vb.ID = uuid.New().String()
	}
	return nil
}

// VacationRequest representa o payload de criação de férias
type VacationRequest struct {
	Type      VacationType `json:"type" validate:"required"`
	StartDate string       `json:"start_date" validate:"required"`
	EndDate   string       `json:"end_date" validate:"required"`
	Reason    string       `json:"reason"`
	Notes     string       `json:"notes"`
}

// VacationApprovalRequest representa o payload de aprovação/rejeição
type VacationApprovalRequest struct {
	Status       VacationStatus `json:"status" validate:"required"`
	RejectReason string         `json:"reject_reason"`
}

// VacationListResponse para listagem de férias
type VacationListResponse struct {
	Vacations  []Vacation `json:"vacations"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PerPage    int        `json:"per_page"`
	TotalPages int        `json:"total_pages"`
}

// VacationStats estatísticas de férias para o dashboard
type VacationStats struct {
	TotalRequests    int64 `json:"total_requests"`
	PendingRequests  int64 `json:"pending_requests"`
	ApprovedRequests int64 `json:"approved_requests"`
	RejectedRequests int64 `json:"rejected_requests"`
	TotalDaysUsed    int   `json:"total_days_used"`
}

// TeamVacation para visualização de férias da equipe
type TeamVacation struct {
	UserID    string    `json:"user_id"`
	UserName  string    `json:"user_name"`
	Type      string    `json:"type"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	Status    string    `json:"status"`
}

// GetTypeLabel retorna o label amigável do tipo
func (v *Vacation) GetTypeLabel() string {
	labels := map[VacationType]string{
		VacationTypeFerias:     "Férias",
		VacationTypeAbono:      "Abono",
		VacationTypeLicenca:    "Licença",
		VacationTypeAtestado:   "Atestado Médico",
		VacationTypeFolga:      "Folga",
		VacationTypeHomeOffice: "Home Office",
	}
	return labels[v.Type]
}

// GetStatusLabel retorna o label amigável do status
func (v *Vacation) GetStatusLabel() string {
	labels := map[VacationStatus]string{
		VacationStatusPending:     "Pendente",
		VacationStatusApproved:    "Aprovado",
		VacationStatusRejected:    "Rejeitado",
		VacationStatusCanceled:    "Cancelado",
		VacationStatusInterrupted: "Interrompido",
	}
	return labels[v.Status]
}

// VacationSellStatus status da solicitação de venda de férias
type VacationSellStatus string

const (
	VacationSellStatusPending  VacationSellStatus = "pending"
	VacationSellStatusApproved VacationSellStatus = "approved"
	VacationSellStatusRejected VacationSellStatus = "rejected"
)

// VacationSellRequest representa uma solicitação de venda de férias (abono pecuniário)
type VacationSellRequest struct {
	ID          string             `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	DeletedAt   gorm.DeletedAt     `gorm:"index" json:"-"`

	UserID      string             `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	User        User               `gorm:"foreignKey:UserID" json:"user,omitempty"`

	DaysToSell  int                `gorm:"not null" json:"days_to_sell"` // Máximo: 10 dias (1/3 das férias)
	Reason      string             `gorm:"type:nvarchar(max)" json:"reason"`

	Status      VacationSellStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ApprovedBy  *string            `gorm:"type:nvarchar(36)" json:"approved_by,omitempty"`
	Approver    *User              `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	ApprovedAt  *time.Time         `json:"approved_at,omitempty"`
	RejectReason string            `gorm:"type:nvarchar(max)" json:"reject_reason,omitempty"`

	// Referência ao período aquisitivo
	PeriodYear  int                `gorm:"not null" json:"period_year"`
}

// BeforeCreate gera o UUID antes de criar
func (vsr *VacationSellRequest) BeforeCreate(tx *gorm.DB) error {
	if vsr.ID == "" {
		vsr.ID = uuid.New().String()
	}
	return nil
}

// CalendarEvent representa um evento no calendário (metas, feriados, etc)
type CalendarEvent struct {
	ID            string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	Title         string         `gorm:"type:nvarchar(255);not null" json:"title"`
	Description   string         `gorm:"type:nvarchar(max)" json:"description"`
	Type          string         `gorm:"type:nvarchar(50);not null" json:"type"` // meta, feriado, evento, treinamento
	StartDate     time.Time      `gorm:"not null" json:"start_date"`
	EndDate       time.Time      `gorm:"not null" json:"end_date"`
	Color         string         `gorm:"type:nvarchar(20)" json:"color"`
	AllDay        bool           `gorm:"default:true" json:"all_day"`
	CreatedBy     string         `gorm:"type:nvarchar(36)" json:"created_by"`
	CreatedByUser User           `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
}

// BeforeCreate gera o UUID antes de criar
func (ce *CalendarEvent) BeforeCreate(tx *gorm.DB) error {
	if ce.ID == "" {
		ce.ID = uuid.New().String()
	}
	return nil
}

// VacationSettings representa as configurações de férias (editável pelo admin)
type VacationSettings struct {
	ID        string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Configurações gerais de férias
	TotalDaysPerYear     int  `gorm:"default:30" json:"total_days_per_year"`      // Total de dias por período aquisitivo
	MinDaysPerRequest    int  `gorm:"default:5" json:"min_days_per_request"`      // Mínimo de dias por solicitação
	MaxDaysPerRequest    int  `gorm:"default:30" json:"max_days_per_request"`     // Máximo de dias por solicitação
	MaxSplits            int  `gorm:"default:3" json:"max_splits"`                // Máximo de fracionamentos permitidos
	MinAdvanceDays       int  `gorm:"default:30" json:"min_advance_days"`         // Antecedência mínima (dias)
	AllowWeekendStart    bool `gorm:"default:false" json:"allow_weekend_start"`   // Permitir início em fim de semana

	// Configurações de venda de férias
	AllowSellVacation    bool `gorm:"default:true" json:"allow_sell_vacation"`    // Permitir venda de férias
	MaxSellDays          int  `gorm:"default:10" json:"max_sell_days"`            // Máximo de dias que podem ser vendidos
	MinSellDays          int  `gorm:"default:1" json:"min_sell_days"`             // Mínimo de dias para vender

	// Configurações de abono
	AllowAbono           bool `gorm:"default:true" json:"allow_abono"`            // Permitir abono
	MaxAbonoDays         int  `gorm:"default:3" json:"max_abono_days"`            // Máximo de dias de abono
	AbonoRequiresApproval bool `gorm:"default:true" json:"abono_requires_approval"` // Abono precisa de aprovação

	// Configurações de período
	PeriodMonths         int  `gorm:"default:12" json:"period_months"`            // Duração do período aquisitivo em meses
	AllowCarryOver       bool `gorm:"default:false" json:"allow_carry_over"`      // Permitir acúmulo para próximo período
	MaxCarryOverDays     int  `gorm:"default:10" json:"max_carry_over_days"`      // Máximo de dias acumuláveis

	// Mensagens personalizadas
	WelcomeMessage       string `gorm:"type:nvarchar(max)" json:"welcome_message"`   // Mensagem de boas-vindas na página
	RulesMessage         string `gorm:"type:nvarchar(max)" json:"rules_message"`     // Regras/políticas de férias
}

// BeforeCreate gera o UUID antes de criar
func (vs *VacationSettings) BeforeCreate(tx *gorm.DB) error {
	if vs.ID == "" {
		vs.ID = uuid.New().String()
	}
	return nil
}
