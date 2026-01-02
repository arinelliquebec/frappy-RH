package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetMyPayslips retorna os holerites do colaborador logado
func GetMyPayslips(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	// Busca o usuário e seu CPF
	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Busca o colaborador_id pelo CPF
	var colaboradorID int
	cpfLimpo := user.CPF
	for _, char := range []string{".", "-", " "} {
		cpfLimpo = strings.ReplaceAll(cpfLimpo, char, "")
	}
	config.DB.Raw(`
		SELECT c.Id FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, cpfLimpo).Scan(&colaboradorID)

	// Parâmetros de filtro
	year := c.Query("year", "")
	
	// Query base - busca por user_id, cpf ou colaborador_id
	query := config.DB.Model(&models.Payslip{}).Where("user_id = ? OR employee_cpf = ? OR colaborador_id = ?", userID, user.CPF, colaboradorID)
	
	if year != "" {
		yearInt, _ := strconv.Atoi(year)
		query = query.Where("reference_year = ?", yearInt)
	}

	// Busca os holerites (resumo)
	var payslips []models.PayslipSummary
	err := query.Select("id, reference_month, reference_year, payslip_type, gross_total, deduction_total, net_total, payment_date, status").
		Order("reference_year DESC, reference_month DESC, created_at DESC").
		Find(&payslips).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar holerites: " + err.Error(),
		})
	}

	// Anos disponíveis
	var years []int
	config.DB.Model(&models.Payslip{}).
		Where("user_id = ? OR employee_cpf = ? OR colaborador_id = ?", userID, user.CPF, colaboradorID).
		Distinct("reference_year").
		Order("reference_year DESC").
		Pluck("reference_year", &years)

	return c.JSON(fiber.Map{
		"success":  true,
		"payslips": payslips,
		"years":    years,
	})
}

// GetPayslipByID retorna um holerite específico com todos os detalhes
func GetPayslipByID(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	payslipID := c.Params("id")

	// Busca o usuário e seu CPF
	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Busca o colaborador_id pelo CPF
	var colaboradorID int
	cpfLimpo := user.CPF
	for _, char := range []string{".", "-", " "} {
		cpfLimpo = strings.ReplaceAll(cpfLimpo, char, "")
	}
	config.DB.Raw(`
		SELECT c.Id FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, cpfLimpo).Scan(&colaboradorID)

	// Busca o holerite com os itens
	var payslip models.Payslip
	err := config.DB.Preload("Items").
		Where("id = ? AND (user_id = ? OR employee_cpf = ? OR colaborador_id = ?)", payslipID, userID, user.CPF, colaboradorID).
		First(&payslip).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Holerite não encontrado",
		})
	}

	// Separa itens em proventos e descontos
	var earnings []models.PayslipItem
	var deductions []models.PayslipItem
	for _, item := range payslip.Items {
		if item.Type == "earning" {
			earnings = append(earnings, item)
		} else {
			deductions = append(deductions, item)
		}
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"payslip":    payslip,
		"earnings":   earnings,
		"deductions": deductions,
	})
}

// ==================== ADMIN HANDLERS ====================

// AdminGetAllPayslips retorna todos os holerites (admin)
func AdminGetAllPayslips(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	year := c.Query("year", "")
	month := c.Query("month", "")
	colaboradorID := c.Query("colaborador_id", "")
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	query := config.DB.Model(&models.Payslip{})

	if year != "" {
		yearInt, _ := strconv.Atoi(year)
		query = query.Where("reference_year = ?", yearInt)
	}
	if month != "" {
		monthInt, _ := strconv.Atoi(month)
		query = query.Where("reference_month = ?", monthInt)
	}
	if colaboradorID != "" {
		query = query.Where("colaborador_id = ?", colaboradorID)
	}
	if search != "" {
		query = query.Where("employee_name LIKE ? OR employee_cpf LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var payslips []models.Payslip
	err := query.Order("reference_year DESC, reference_month DESC, employee_name ASC").
		Offset(offset).
		Limit(limit).
		Find(&payslips).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar holerites",
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"payslips": payslips,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminCreatePayslip cria um novo holerite (admin)
func AdminCreatePayslip(c *fiber.Ctx) error {
	var input struct {
		ColaboradorID  int       `json:"colaborador_id"`
		UserID         string    `json:"user_id"`
		EmployeeName   string    `json:"employee_name"`
		EmployeeCPF    string    `json:"employee_cpf"`
		Position       string    `json:"position"`
		Department     string    `json:"department"`
		Branch         string    `json:"branch"`
		AdmissionDate  *time.Time `json:"admission_date"`
		ReferenceMonth int       `json:"reference_month"`
		ReferenceYear  int       `json:"reference_year"`
		PaymentDate    *time.Time `json:"payment_date"`
		PayslipType    string    `json:"payslip_type"`
		BaseSalary     float64   `json:"base_salary"`
		WorkedDays     int       `json:"worked_days"`
		INSSBase       float64   `json:"inss_base"`
		IRRFBase       float64   `json:"irrf_base"`
		FGTSBase       float64   `json:"fgts_base"`
		FGTSAmount     float64   `json:"fgts_amount"`
		Items          []struct {
			Type        string  `json:"type"`
			Code        string  `json:"code"`
			Description string  `json:"description"`
			Reference   float64 `json:"reference"`
			Amount      float64 `json:"amount"`
		} `json:"items"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Calcula totais
	var grossTotal, deductionTotal float64
	for _, item := range input.Items {
		if item.Type == "earning" {
			grossTotal += item.Amount
		} else {
			deductionTotal += item.Amount
		}
	}
	netTotal := grossTotal - deductionTotal

	// Cria o holerite
	payslip := models.Payslip{
		ColaboradorID:  input.ColaboradorID,
		UserID:         input.UserID,
		EmployeeName:   input.EmployeeName,
		EmployeeCPF:    input.EmployeeCPF,
		Position:       input.Position,
		Department:     input.Department,
		Branch:         input.Branch,
		AdmissionDate:  input.AdmissionDate,
		ReferenceMonth: input.ReferenceMonth,
		ReferenceYear:  input.ReferenceYear,
		PaymentDate:    input.PaymentDate,
		PayslipType:    input.PayslipType,
		BaseSalary:     input.BaseSalary,
		WorkedDays:     input.WorkedDays,
		GrossTotal:     grossTotal,
		DeductionTotal: deductionTotal,
		NetTotal:       netTotal,
		INSSBase:       input.INSSBase,
		IRRFBase:       input.IRRFBase,
		FGTSBase:       input.FGTSBase,
		FGTSAmount:     input.FGTSAmount,
		Status:         "disponivel",
	}

	if payslip.PayslipType == "" {
		payslip.PayslipType = "mensal"
	}

	if err := config.DB.Create(&payslip).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar holerite: " + err.Error(),
		})
	}

	// Cria os itens
	for _, item := range input.Items {
		payslipItem := models.PayslipItem{
			PayslipID:   payslip.ID,
			Type:        item.Type,
			Code:        item.Code,
			Description: item.Description,
			Reference:   item.Reference,
			Amount:      item.Amount,
		}
		config.DB.Create(&payslipItem)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"payslip": payslip,
		"message": "Holerite criado com sucesso",
	})
}

// AdminImportPayslips importa holerites em lote (admin)
func AdminImportPayslips(c *fiber.Ctx) error {
	var input struct {
		Payslips []struct {
			ColaboradorID  int       `json:"colaborador_id"`
			EmployeeName   string    `json:"employee_name"`
			EmployeeCPF    string    `json:"employee_cpf"`
			Position       string    `json:"position"`
			Department     string    `json:"department"`
			Branch         string    `json:"branch"`
			ReferenceMonth int       `json:"reference_month"`
			ReferenceYear  int       `json:"reference_year"`
			PaymentDate    *time.Time `json:"payment_date"`
			PayslipType    string    `json:"payslip_type"`
			BaseSalary     float64   `json:"base_salary"`
			WorkedDays     int       `json:"worked_days"`
			GrossTotal     float64   `json:"gross_total"`
			DeductionTotal float64   `json:"deduction_total"`
			NetTotal       float64   `json:"net_total"`
			INSSBase       float64   `json:"inss_base"`
			IRRFBase       float64   `json:"irrf_base"`
			FGTSBase       float64   `json:"fgts_base"`
			FGTSAmount     float64   `json:"fgts_amount"`
			Items          []struct {
				Type        string  `json:"type"`
				Code        string  `json:"code"`
				Description string  `json:"description"`
				Reference   float64 `json:"reference"`
				Amount      float64 `json:"amount"`
			} `json:"items"`
		} `json:"payslips"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	created := 0
	errors := []string{}

	for i, p := range input.Payslips {
		// Tenta encontrar o user_id pelo CPF
		var userID string
		var user models.User
		cpfLimpo := p.EmployeeCPF
		for _, char := range []string{".", "-", " "} {
			cpfLimpo = strings.ReplaceAll(cpfLimpo, char, "")
		}
		if err := config.DB.Where("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?", cpfLimpo).First(&user).Error; err == nil {
			userID = user.ID
		}

		payslip := models.Payslip{
			ColaboradorID:  p.ColaboradorID,
			UserID:         userID,
			EmployeeName:   p.EmployeeName,
			EmployeeCPF:    p.EmployeeCPF,
			Position:       p.Position,
			Department:     p.Department,
			Branch:         p.Branch,
			ReferenceMonth: p.ReferenceMonth,
			ReferenceYear:  p.ReferenceYear,
			PaymentDate:    p.PaymentDate,
			PayslipType:    p.PayslipType,
			BaseSalary:     p.BaseSalary,
			WorkedDays:     p.WorkedDays,
			GrossTotal:     p.GrossTotal,
			DeductionTotal: p.DeductionTotal,
			NetTotal:       p.NetTotal,
			INSSBase:       p.INSSBase,
			IRRFBase:       p.IRRFBase,
			FGTSBase:       p.FGTSBase,
			FGTSAmount:     p.FGTSAmount,
			Status:         "disponivel",
		}

		if payslip.PayslipType == "" {
			payslip.PayslipType = "mensal"
		}

		if err := config.DB.Create(&payslip).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Linha %d: %s", i+1, err.Error()))
			continue
		}

		// Cria os itens
		for _, item := range p.Items {
			payslipItem := models.PayslipItem{
				PayslipID:   payslip.ID,
				Type:        item.Type,
				Code:        item.Code,
				Description: item.Description,
				Reference:   item.Reference,
				Amount:      item.Amount,
			}
			config.DB.Create(&payslipItem)
		}

		created++
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("%d holerites importados com sucesso", created),
		"created": created,
		"errors":  errors,
	})
}

// AdminDeletePayslip deleta um holerite (admin)
func AdminDeletePayslip(c *fiber.Ctx) error {
	payslipID := c.Params("id")

	// Deleta os itens primeiro
	config.DB.Where("payslip_id = ?", payslipID).Delete(&models.PayslipItem{})

	// Deleta o holerite
	result := config.DB.Where("id = ?", payslipID).Delete(&models.Payslip{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao excluir holerite",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Holerite excluído com sucesso",
	})
}

// AdminGetPayslipStats retorna estatísticas de holerites (admin)
func AdminGetPayslipStats(c *fiber.Ctx) error {
	year := c.Query("year", strconv.Itoa(time.Now().Year()))
	yearInt, _ := strconv.Atoi(year)

	var totalPayslips int64
	config.DB.Model(&models.Payslip{}).Where("reference_year = ?", yearInt).Count(&totalPayslips)

	var totalGross, totalDeductions, totalNet float64
	config.DB.Model(&models.Payslip{}).
		Where("reference_year = ?", yearInt).
		Select("COALESCE(SUM(gross_total), 0)").
		Scan(&totalGross)

	config.DB.Model(&models.Payslip{}).
		Where("reference_year = ?", yearInt).
		Select("COALESCE(SUM(deduction_total), 0)").
		Scan(&totalDeductions)

	config.DB.Model(&models.Payslip{}).
		Where("reference_year = ?", yearInt).
		Select("COALESCE(SUM(net_total), 0)").
		Scan(&totalNet)

	// Por mês
	type MonthStat struct {
		Month int     `json:"month"`
		Count int64   `json:"count"`
		Total float64 `json:"total"`
	}
	var monthlyStats []MonthStat
	config.DB.Model(&models.Payslip{}).
		Where("reference_year = ?", yearInt).
		Select("reference_month as month, COUNT(*) as count, COALESCE(SUM(net_total), 0) as total").
		Group("reference_month").
		Order("reference_month").
		Scan(&monthlyStats)

	// Anos disponíveis
	var years []int
	config.DB.Model(&models.Payslip{}).
		Distinct("reference_year").
		Order("reference_year DESC").
		Pluck("reference_year", &years)

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"year":            yearInt,
			"total_payslips":  totalPayslips,
			"total_gross":     totalGross,
			"total_deductions": totalDeductions,
			"total_net":       totalNet,
			"by_month":        monthlyStats,
		},
		"years": years,
	})
}
