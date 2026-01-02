package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PayslipItem representa um item (provento ou desconto) no holerite
type PayslipItem struct {
	ID          string  `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	PayslipID   string  `gorm:"type:nvarchar(36);not null;index" json:"payslip_id"`
	Type        string  `gorm:"type:nvarchar(20);not null" json:"type"` // earning (provento) ou deduction (desconto)
	Code        string  `gorm:"type:nvarchar(20)" json:"code"`          // Código da rubrica
	Description string  `gorm:"type:nvarchar(255);not null" json:"description"`
	Reference   float64 `gorm:"type:decimal(10,2)" json:"reference"` // Quantidade/Referência (horas, dias, %)
	Amount      float64 `gorm:"type:decimal(12,2);not null" json:"amount"`
	CreatedAt   time.Time `json:"created_at"`
}

// BeforeCreate gera UUID antes de criar
func (pi *PayslipItem) BeforeCreate(tx *gorm.DB) error {
	if pi.ID == "" {
		pi.ID = uuid.New().String()
	}
	return nil
}

// Payslip representa um holerite/contracheque
type Payslip struct {
	ID              string    `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	UserID          string    `gorm:"type:nvarchar(36);index" json:"user_id"`
	ColaboradorID   int       `gorm:"index" json:"colaborador_id"`
	
	// Dados do colaborador no momento do holerite
	EmployeeName    string    `gorm:"type:nvarchar(255)" json:"employee_name"`
	EmployeeCPF     string    `gorm:"type:nvarchar(20)" json:"employee_cpf"`
	Position        string    `gorm:"type:nvarchar(255)" json:"position"`
	Department      string    `gorm:"type:nvarchar(255)" json:"department"`
	Branch          string    `gorm:"type:nvarchar(255)" json:"branch"` // Filial
	AdmissionDate   *time.Time `json:"admission_date"`
	
	// Período de referência
	ReferenceMonth  int       `gorm:"not null" json:"reference_month"` // 1-12
	ReferenceYear   int       `gorm:"not null" json:"reference_year"`
	PaymentDate     *time.Time `json:"payment_date"`
	
	// Tipo de holerite
	PayslipType     string    `gorm:"type:nvarchar(50);default:'mensal'" json:"payslip_type"` // mensal, 13_primeira, 13_segunda, ferias, rescisao, adiantamento
	
	// Valores totais
	GrossTotal      float64   `gorm:"type:decimal(12,2)" json:"gross_total"`      // Total de proventos
	DeductionTotal  float64   `gorm:"type:decimal(12,2)" json:"deduction_total"`  // Total de descontos
	NetTotal        float64   `gorm:"type:decimal(12,2)" json:"net_total"`        // Líquido a receber
	
	// Bases de cálculo
	INSSBase        float64   `gorm:"type:decimal(12,2)" json:"inss_base"`
	IRRFBase        float64   `gorm:"type:decimal(12,2)" json:"irrf_base"`
	FGTSBase        float64   `gorm:"type:decimal(12,2)" json:"fgts_base"`
	FGTSAmount      float64   `gorm:"type:decimal(12,2)" json:"fgts_amount"` // Valor do FGTS (informativo)
	
	// Informações adicionais
	WorkedDays      int       `json:"worked_days"`
	BaseSalary      float64   `gorm:"type:decimal(12,2)" json:"base_salary"`
	
	// Status
	Status          string    `gorm:"type:nvarchar(20);default:'disponivel'" json:"status"` // disponivel, bloqueado
	
	// Itens do holerite
	Items           []PayslipItem `gorm:"foreignKey:PayslipID" json:"items"`
	
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// BeforeCreate gera UUID antes de criar
func (p *Payslip) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

// TableName define o nome da tabela
func (Payslip) TableName() string {
	return "payslips"
}

// TableName define o nome da tabela
func (PayslipItem) TableName() string {
	return "payslip_items"
}

// PayslipSummary é um resumo do holerite para listagem
type PayslipSummary struct {
	ID             string    `json:"id"`
	ReferenceMonth int       `json:"reference_month"`
	ReferenceYear  int       `json:"reference_year"`
	PayslipType    string    `json:"payslip_type"`
	GrossTotal     float64   `json:"gross_total"`
	DeductionTotal float64   `json:"deduction_total"`
	NetTotal       float64   `json:"net_total"`
	PaymentDate    *time.Time `json:"payment_date"`
	Status         string    `json:"status"`
}
