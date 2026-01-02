package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
)

// ==================== Function Definitions ====================

// FunctionDefinition define uma função disponível para a IA
type FunctionDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// GetAvailableFunctions retorna as funções disponíveis para function calling
func GetAvailableFunctions() []FunctionDefinition {
	return []FunctionDefinition{
		// 1. Consultar saldo de férias
		{
			Name:        "get_vacation_balance",
			Description: "Consulta o saldo de férias atualizado do colaborador, incluindo período aquisitivo e prazo para uso",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 2. Listar cursos disponíveis
		{
			Name:        "list_available_courses",
			Description: "Lista cursos disponíveis na plataforma de e-learning, opcionalmente filtrados por categoria",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"category": map[string]interface{}{
						"type":        "string",
						"description": "Categoria do curso (opcional): Desenvolvimento Pessoal, Liderança, Tecnologia, Compliance, etc",
					},
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "Número máximo de cursos a retornar (padrão: 5)",
					},
				},
			},
		},

		// 3. Consultar progresso em cursos
		{
			Name:        "get_my_courses",
			Description: "Consulta os cursos em que o colaborador está matriculado e seu progresso",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 4. Consultar último holerite
		{
			Name:        "get_last_payslip",
			Description: "Consulta informações do último holerite disponível do colaborador",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 5. Consultar PDI
		{
			Name:        "get_pdi_status",
			Description: "Consulta o status do PDI (Plano de Desenvolvimento Individual) do colaborador",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 6. Solicitar férias
		{
			Name:        "request_vacation",
			Description: "Cria uma solicitação de férias para o colaborador",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"start_date": map[string]interface{}{
						"type":        "string",
						"description": "Data de início das férias no formato YYYY-MM-DD",
					},
					"end_date": map[string]interface{}{
						"type":        "string",
						"description": "Data de fim das férias no formato YYYY-MM-DD",
					},
					"reason": map[string]interface{}{
						"type":        "string",
						"description": "Motivo ou observação da solicitação (opcional)",
					},
				},
				"required": []string{"start_date", "end_date"},
			},
		},

		// 7. Vender férias
		{
			Name:        "sell_vacation_days",
			Description: "Solicita a venda de dias de férias (abono pecuniário). Máximo: 10 dias ou 1/3 das férias",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"days": map[string]interface{}{
						"type":        "integer",
						"description": "Número de dias a vender (1 a 10)",
					},
					"reason": map[string]interface{}{
						"type":        "string",
						"description": "Motivo da venda (opcional)",
					},
				},
				"required": []string{"days"},
			},
		},

		// 8. Matricular em curso
		{
			Name:        "enroll_in_course",
			Description: "Matricula o colaborador em um curso da plataforma",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"course_id": map[string]interface{}{
						"type":        "string",
						"description": "ID do curso para matrícula",
					},
				},
				"required": []string{"course_id"},
			},
		},

		// 9. Consultar badges/conquistas
		{
			Name:        "get_my_badges",
			Description: "Consulta os badges e conquistas do colaborador",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 10. Consultar aniversariantes
		{
			Name:        "get_birthdays",
			Description: "Consulta aniversariantes do mês atual na empresa",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 11. Histórico de férias
		{
			Name:        "get_vacation_history",
			Description: "Consulta o histórico de férias do colaborador nos últimos 2 anos",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 12. Cancelar férias
		{
			Name:        "cancel_vacation",
			Description: "Cancela uma solicitação de férias pendente",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"vacation_id": map[string]interface{}{
						"type":        "string",
						"description": "ID da solicitação de férias a cancelar",
					},
				},
				"required": []string{"vacation_id"},
			},
		},

		// 13. Membros da equipe (gestores)
		{
			Name:        "get_team_members",
			Description: "Lista os membros da equipe do gestor. Apenas gestores podem usar esta função",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 14. Aprovações pendentes (gestores)
		{
			Name:        "get_pending_approvals",
			Description: "Lista todas as aprovações pendentes (férias, justificativas). Apenas gestores podem usar esta função",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 15. Aprovar/Rejeitar férias (gestores)
		{
			Name:        "approve_vacation",
			Description: "Aprova ou rejeita uma solicitação de férias. Apenas gestores podem usar esta função",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"vacation_id": map[string]interface{}{
						"type":        "string",
						"description": "ID da solicitação de férias",
					},
					"action": map[string]interface{}{
						"type":        "string",
						"description": "Ação a tomar: approve ou reject",
						"enum":        []string{"approve", "reject"},
					},
					"comment": map[string]interface{}{
						"type":        "string",
						"description": "Comentário ou motivo (opcional para aprovação, obrigatório para rejeição)",
					},
				},
				"required": []string{"vacation_id", "action"},
			},
		},

		// 16. Histórico de holerites
		{
			Name:        "get_payroll_history",
			Description: "Consulta o histórico de holerites do colaborador",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"months": map[string]interface{}{
						"type":        "integer",
						"description": "Número de meses a consultar (padrão: 6)",
					},
				},
			},
		},

		// 17. Ganhos no ano (YTD)
		{
			Name:        "get_ytd_earnings",
			Description: "Consulta o total de ganhos no ano atual (Year-to-Date)",
			Parameters: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// 18. Buscar políticas
		{
			Name:        "search_policies",
			Description: "Busca políticas e documentos da empresa sobre um tema específico",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"topic": map[string]interface{}{
						"type":        "string",
						"description": "Tema a buscar (ex: home office, férias, benefícios, código de conduta)",
					},
				},
				"required": []string{"topic"},
			},
		},
	}
}

// ==================== Function Execution ====================

// FunctionResult resultado da execução de uma função
type FunctionResult struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// ExecuteFunction executa uma função chamada pela IA
func ExecuteFunction(userID string, functionName string, arguments string) (*FunctionResult, error) {
	switch functionName {
	case "get_vacation_balance":
		return executeGetVacationBalance(userID)

	case "list_available_courses":
		var params struct {
			Category string `json:"category"`
			Limit    int    `json:"limit"`
		}
		json.Unmarshal([]byte(arguments), &params)
		if params.Limit == 0 {
			params.Limit = 5
		}
		return executeListCourses(params.Category, params.Limit)

	case "get_my_courses":
		return executeGetMyCourses(userID)

	case "get_last_payslip":
		return executeGetLastPayslip(userID)

	case "get_pdi_status":
		return executeGetPDIStatus(userID)

	case "request_vacation":
		var params struct {
			StartDate string `json:"start_date"`
			EndDate   string `json:"end_date"`
			Reason    string `json:"reason"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeRequestVacation(userID, params.StartDate, params.EndDate, params.Reason)

	case "sell_vacation_days":
		var params struct {
			Days   int    `json:"days"`
			Reason string `json:"reason"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeSellVacation(userID, params.Days, params.Reason)

	case "enroll_in_course":
		var params struct {
			CourseID string `json:"course_id"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeEnrollInCourse(userID, params.CourseID)

	case "get_my_badges":
		return executeGetMyBadges(userID)

	case "get_birthdays":
		return executeGetBirthdays()

	case "get_vacation_history":
		return executeGetVacationHistory(userID)

	case "cancel_vacation":
		var params struct {
			VacationID string `json:"vacation_id"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeCancelVacation(userID, params.VacationID)

	case "get_team_members":
		return executeGetTeamMembers(userID)

	case "get_pending_approvals":
		return executeGetPendingApprovals(userID)

	case "approve_vacation":
		var params struct {
			VacationID string `json:"vacation_id"`
			Action     string `json:"action"`
			Comment    string `json:"comment"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeApproveVacation(userID, params.VacationID, params.Action, params.Comment)

	case "get_payroll_history":
		var params struct {
			Months int `json:"months"`
		}
		json.Unmarshal([]byte(arguments), &params)
		if params.Months == 0 {
			params.Months = 6
		}
		return executeGetPayrollHistory(userID, params.Months)

	case "get_ytd_earnings":
		return executeGetYTDEarnings(userID)

	case "search_policies":
		var params struct {
			Topic string `json:"topic"`
		}
		json.Unmarshal([]byte(arguments), &params)
		return executeSearchPolicies(params.Topic)

	default:
		return &FunctionResult{
			Success: false,
			Error:   fmt.Sprintf("Função não encontrada: %s", functionName),
		}, nil
	}
}

// ==================== Function Implementations ====================

func executeGetVacationBalance(userID string) (*FunctionResult, error) {
	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Saldo de férias não encontrado",
		}, nil
	}

	// Busca próximas férias
	var nextVacation models.Vacation
	hasNext := config.DB.Where("user_id = ? AND status = 'approved' AND start_date > ?",
		userID, time.Now()).
		Order("start_date ASC").
		First(&nextVacation).Error == nil

	data := map[string]interface{}{
		"available_days":    balance.AvailableDays,
		"used_days":         balance.UsedDays,
		"pending_days":      balance.PendingDays,
		"total_days":        balance.TotalDays,
		"period_start":      balance.PeriodStart.Format("02/01/2006"),
		"period_end":        balance.PeriodEnd.Format("02/01/2006"),
		"deadline_to_use":   balance.PeriodEnd.AddDate(1, 0, 0).Format("02/01/2006"),
		"has_next_vacation": hasNext,
	}

	if hasNext {
		data["next_vacation"] = map[string]interface{}{
			"start_date": nextVacation.StartDate.Format("02/01/2006"),
			"end_date":   nextVacation.EndDate.Format("02/01/2006"),
			"days":       nextVacation.TotalDays,
		}
	}

	return &FunctionResult{
		Success: true,
		Data:    data,
		Message: fmt.Sprintf("Saldo de férias: %d dias disponíveis", balance.AvailableDays),
	}, nil
}

func executeListCourses(category string, limit int) (*FunctionResult, error) {
	query := config.DB.Model(&models.Course{}).Where("published = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	var courses []models.Course
	query.Order("rating DESC, enrollment_count DESC").Limit(limit).Find(&courses)

	var result []map[string]interface{}
	for _, c := range courses {
		result = append(result, map[string]interface{}{
			"id":          c.ID,
			"title":       c.Title,
			"description": c.Description,
			"category":    c.Category,
			"level":       c.Level,
			"duration":    c.Duration,
			"rating":      c.Rating,
			"enrollments": c.EnrollmentCount,
		})
	}

	return &FunctionResult{
		Success: true,
		Data:    result,
		Message: fmt.Sprintf("Encontrados %d cursos disponíveis", len(result)),
	}, nil
}

func executeGetMyCourses(userID string) (*FunctionResult, error) {
	var enrollments []models.Enrollment
	config.DB.Preload("Course").Where("user_id = ?", userID).Find(&enrollments)

	var result []map[string]interface{}
	for _, e := range enrollments {
		status := "em_andamento"
		if e.Progress >= 100 {
			status = "concluido"
		}

		result = append(result, map[string]interface{}{
			"course_id":    e.CourseID,
			"course_title": e.Course.Title,
			"category":     e.Course.Category,
			"progress":     e.Progress,
			"status":       status,
			"enrolled_at":  e.CreatedAt.Format("02/01/2006"),
		})
	}

	return &FunctionResult{
		Success: true,
		Data:    result,
		Message: fmt.Sprintf("Você está matriculado em %d cursos", len(result)),
	}, nil
}

func executeGetLastPayslip(userID string) (*FunctionResult, error) {
	var payslip models.Payslip
	if err := config.DB.Preload("Items").
		Where("user_id = ?", userID).
		Order("reference_year DESC, reference_month DESC").
		First(&payslip).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Nenhum holerite encontrado",
		}, nil
	}

	// Separa proventos e descontos
	var earnings, deductions []map[string]interface{}
	for _, item := range payslip.Items {
		itemData := map[string]interface{}{
			"description": item.Description,
			"amount":      item.Amount,
			"reference":   item.Reference,
		}
		if item.Type == "earning" {
			earnings = append(earnings, itemData)
		} else {
			deductions = append(deductions, itemData)
		}
	}

	data := map[string]interface{}{
		"month":           payslip.ReferenceMonth,
		"year":            payslip.ReferenceYear,
		"type":            payslip.PayslipType,
		"gross_total":     payslip.GrossTotal,
		"deduction_total": payslip.DeductionTotal,
		"net_total":       payslip.NetTotal,
		"base_salary":     payslip.BaseSalary,
		"fgts_amount":     payslip.FGTSAmount,
		"earnings":        earnings,
		"deductions":      deductions,
	}

	return &FunctionResult{
		Success: true,
		Data:    data,
		Message: fmt.Sprintf("Holerite de %s/%d - Líquido: R$ %.2f",
			getMonthName(payslip.ReferenceMonth), payslip.ReferenceYear, payslip.NetTotal),
	}, nil
}

func executeGetPDIStatus(userID string) (*FunctionResult, error) {
	var pdi models.PDI
	if err := config.DB.Where("user_id = ? AND (status = 'in_progress' OR status = 'approved')", userID).First(&pdi).Error; err != nil {
		return &FunctionResult{
			Success: true,
			Data: map[string]interface{}{
				"has_pdi": false,
			},
			Message: "Você ainda não possui um PDI ativo",
		}, nil
	}

	var goals []models.PDIGoal
	config.DB.Where("pdi_id = ?", pdi.ID).Find(&goals)

	var completed, inProgress, pending, overdue int
	var goalList []map[string]interface{}

	for _, g := range goals {
		switch g.Status {
		case models.GoalStatusCompleted:
			completed++
		case models.GoalStatusInProgress:
			inProgress++
		default:
			pending++
		}

		if g.DueDate != nil && g.DueDate.Before(time.Now()) && g.Status != models.GoalStatusCompleted {
			overdue++
		}

		goalList = append(goalList, map[string]interface{}{
			"id":          g.ID,
			"title":       g.Title,
			"description": g.Description,
			"status":      g.Status,
			"progress":    g.Progress,
			"due_date":    formatDatePtr(g.DueDate),
		})
	}

	data := map[string]interface{}{
		"has_pdi":           true,
		"pdi_id":            pdi.ID,
		"pdi_title":         pdi.Title,
		"total_goals":       len(goals),
		"completed_goals":   completed,
		"in_progress_goals": inProgress,
		"pending_goals":     pending,
		"overdue_goals":     overdue,
		"goals":             goalList,
	}

	return &FunctionResult{
		Success: true,
		Data:    data,
		Message: fmt.Sprintf("PDI ativo com %d metas (%d concluídas, %d em andamento)",
			len(goals), completed, inProgress),
	}, nil
}

func executeRequestVacation(userID, startDate, endDate, reason string) (*FunctionResult, error) {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Data de início inválida. Use o formato YYYY-MM-DD",
		}, nil
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Data de fim inválida. Use o formato YYYY-MM-DD",
		}, nil
	}

	if start.After(end) {
		return &FunctionResult{
			Success: false,
			Error:   "Data de início não pode ser posterior à data de fim",
		}, nil
	}

	if start.Before(time.Now()) {
		return &FunctionResult{
			Success: false,
			Error:   "Não é possível solicitar férias para datas passadas",
		}, nil
	}

	days := int(end.Sub(start).Hours()/24) + 1

	// Verifica saldo
	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Saldo de férias não encontrado",
		}, nil
	}

	if days > balance.AvailableDays {
		return &FunctionResult{
			Success: false,
			Error: fmt.Sprintf("Saldo insuficiente. Você tem %d dias disponíveis e solicitou %d dias",
				balance.AvailableDays, days),
		}, nil
	}

	// Cria solicitação
	vacation := models.Vacation{
		UserID:    userID,
		Type:      models.VacationTypeFerias,
		StartDate: start,
		EndDate:   end,
		TotalDays: days,
		Reason:    reason,
		Status:    models.VacationStatusPending,
	}

	if err := config.DB.Create(&vacation).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Erro ao criar solicitação de férias",
		}, nil
	}

	// Atualiza saldo pendente
	config.DB.Model(&balance).Update("pending_days", balance.PendingDays+days)

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"vacation_id": vacation.ID,
			"start_date":  start.Format("02/01/2006"),
			"end_date":    end.Format("02/01/2006"),
			"days":        days,
			"status":      "pending",
		},
		Message: fmt.Sprintf("✅ Férias solicitadas com sucesso! %d dias de %s a %s. Aguarde aprovação do gestor.",
			days, start.Format("02/01/2006"), end.Format("02/01/2006")),
	}, nil
}

func executeSellVacation(userID string, days int, reason string) (*FunctionResult, error) {
	if days < 1 || days > 10 {
		return &FunctionResult{
			Success: false,
			Error:   "Você pode vender de 1 a 10 dias de férias",
		}, nil
	}

	// Verifica saldo
	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Saldo de férias não encontrado",
		}, nil
	}

	if days > balance.AvailableDays {
		return &FunctionResult{
			Success: false,
			Error:   fmt.Sprintf("Saldo insuficiente. Você tem %d dias disponíveis", balance.AvailableDays),
		}, nil
	}

	// Verifica se já tem solicitação pendente
	var pendingCount int64
	config.DB.Model(&models.VacationSellRequest{}).
		Where("user_id = ? AND status = 'pending'", userID).
		Count(&pendingCount)

	if pendingCount > 0 {
		return &FunctionResult{
			Success: false,
			Error:   "Você já tem uma solicitação de venda de férias pendente",
		}, nil
	}

	// Cria solicitação de venda
	sellRequest := models.VacationSellRequest{
		UserID:     userID,
		DaysToSell: days,
		Reason:     reason,
		Status:     models.VacationSellStatusPending,
		PeriodYear: time.Now().Year(),
	}

	if err := config.DB.Create(&sellRequest).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Erro ao criar solicitação de venda",
		}, nil
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"request_id": sellRequest.ID,
			"days":       days,
			"status":     "pending",
		},
		Message: fmt.Sprintf("✅ Solicitação de venda de %d dias criada com sucesso! Aguarde aprovação do gestor.", days),
	}, nil
}

func executeEnrollInCourse(userID, courseID string) (*FunctionResult, error) {
	// Verifica se curso existe e está publicado
	var course models.Course
	if err := config.DB.Where("id = ? AND published = ?", courseID, true).First(&course).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Curso não encontrado ou não está disponível",
		}, nil
	}

	// Verifica se já está matriculado
	var existingEnrollment models.Enrollment
	if err := config.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&existingEnrollment).Error; err == nil {
		return &FunctionResult{
			Success: false,
			Error:   "Você já está matriculado neste curso",
		}, nil
	}

	// Cria matrícula
	enrollment := models.Enrollment{
		UserID:   userID,
		CourseID: courseID,
		Progress: 0,
	}

	if err := config.DB.Create(&enrollment).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Erro ao realizar matrícula",
		}, nil
	}

	// Atualiza contador do curso
	config.DB.Model(&course).Update("enrollment_count", course.EnrollmentCount+1)

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"enrollment_id": enrollment.ID,
			"course_id":     courseID,
			"course_title":  course.Title,
		},
		Message: fmt.Sprintf("✅ Matrícula realizada com sucesso! Você agora está inscrito no curso: %s", course.Title),
	}, nil
}

func executeGetMyBadges(userID string) (*FunctionResult, error) {
	var userBadges []models.UserBadge
	config.DB.Preload("Badge").Where("user_id = ?", userID).Find(&userBadges)

	var badges []map[string]interface{}
	totalPoints := 0

	for _, ub := range userBadges {
		badges = append(badges, map[string]interface{}{
			"id":          ub.Badge.ID,
			"name":        ub.Badge.Name,
			"description": ub.Badge.Description,
			"icon":        ub.Badge.Icon,
			"color":       ub.Badge.Color,
			"category":    ub.Badge.Category,
			"points":      ub.Badge.Points,
			"earned_at":   ub.EarnedAt.Format("02/01/2006"),
		})
		totalPoints += ub.Badge.Points
	}

	// Total de badges disponíveis
	var totalAvailable int64
	config.DB.Model(&models.Badge{}).Count(&totalAvailable)

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"badges":          badges,
			"earned_count":    len(badges),
			"total_available": totalAvailable,
			"total_points":    totalPoints,
		},
		Message: fmt.Sprintf("Você conquistou %d de %d badges (Total: %d pontos)",
			len(badges), totalAvailable, totalPoints),
	}, nil
}

func executeGetBirthdays() (*FunctionResult, error) {
	currentMonth := time.Now().Month()

	var users []models.User
	config.DB.Where("MONTH(birth_date) = ?", int(currentMonth)).Find(&users)

	var birthdays []map[string]interface{}
	for _, u := range users {
		if u.BirthDate != nil {
			birthdays = append(birthdays, map[string]interface{}{
				"name":       u.Name,
				"department": u.Department,
				"birth_day":  u.BirthDate.Day(),
			})
		}
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"month":     int(currentMonth),
			"birthdays": birthdays,
			"count":     len(birthdays),
		},
		Message: fmt.Sprintf("%d aniversariantes em %s", len(birthdays), getMonthName(int(currentMonth))),
	}, nil
}

// ==================== New Function Implementations ====================

func executeGetVacationHistory(userID string) (*FunctionResult, error) {
	var vacations []models.Vacation
	twoYearsAgo := time.Now().AddDate(-2, 0, 0)

	config.DB.Where("user_id = ? AND created_at >= ?", userID, twoYearsAgo).
		Order("start_date DESC").
		Find(&vacations)

	var history []map[string]interface{}
	for _, v := range vacations {
		history = append(history, map[string]interface{}{
			"id":         v.ID,
			"type":       v.Type,
			"start_date": v.StartDate.Format("02/01/2006"),
			"end_date":   v.EndDate.Format("02/01/2006"),
			"days":       v.TotalDays,
			"status":     v.Status,
			"created_at": v.CreatedAt.Format("02/01/2006"),
		})
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"vacations": history,
			"count":     len(history),
		},
		Message: fmt.Sprintf("Histórico: %d registros de férias nos últimos 2 anos", len(history)),
	}, nil
}

func executeCancelVacation(userID, vacationID string) (*FunctionResult, error) {
	var vacation models.Vacation
	if err := config.DB.Where("id = ? AND user_id = ?", vacationID, userID).First(&vacation).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Solicitação de férias não encontrada",
		}, nil
	}

	if vacation.Status != models.VacationStatusPending {
		return &FunctionResult{
			Success: false,
			Error:   "Apenas solicitações pendentes podem ser canceladas",
		}, nil
	}

	// Atualiza status
	vacation.Status = models.VacationStatusCanceled
	config.DB.Save(&vacation)

	// Devolve dias ao saldo pendente
	var balance models.VacationBalance
	if config.DB.Where("user_id = ?", userID).First(&balance).Error == nil {
		newPending := balance.PendingDays - vacation.TotalDays
		if newPending < 0 {
			newPending = 0
		}
		config.DB.Model(&balance).Update("pending_days", newPending)
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"vacation_id": vacationID,
			"days":        vacation.TotalDays,
		},
		Message: fmt.Sprintf("✅ Férias canceladas com sucesso! %d dias devolvidos ao seu saldo.", vacation.TotalDays),
	}, nil
}

func executeGetTeamMembers(userID string) (*FunctionResult, error) {
	// Verifica se é gestor
	if !isManager(userID) {
		return &FunctionResult{
			Success: false,
			Error:   "Esta função está disponível apenas para gestores",
		}, nil
	}

	var manager models.User
	if err := config.DB.Where("id = ?", userID).First(&manager).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Usuário não encontrado",
		}, nil
	}

	// Busca membros do mesmo departamento
	var members []models.User
	config.DB.Where("department = ? AND id != ?", manager.Department, userID).Find(&members)

	var teamList []map[string]interface{}
	for _, m := range members {
		teamList = append(teamList, map[string]interface{}{
			"id":         m.ID,
			"name":       m.Name,
			"position":   m.Position,
			"email":      m.Email,
			"department": m.Department,
		})
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"department": manager.Department,
			"members":    teamList,
			"count":      len(teamList),
		},
		Message: fmt.Sprintf("Sua equipe tem %d membros no departamento %s", len(teamList), manager.Department),
	}, nil
}

func executeGetPendingApprovals(userID string) (*FunctionResult, error) {
	if !isManager(userID) {
		return &FunctionResult{
			Success: false,
			Error:   "Esta função está disponível apenas para gestores",
		}, nil
	}

	var manager models.User
	config.DB.Where("id = ?", userID).First(&manager)

	// Busca férias pendentes do departamento
	var pendingVacations []models.Vacation
	config.DB.Joins("JOIN users ON users.id = vacations.user_id").
		Where("users.department = ? AND vacations.status = ?", manager.Department, models.VacationStatusPending).
		Preload("User").
		Find(&pendingVacations)

	var vacationList []map[string]interface{}
	for _, v := range pendingVacations {
		vacationList = append(vacationList, map[string]interface{}{
			"id":           v.ID,
			"employee":     v.User.Name,
			"type":         v.Type,
			"start_date":   v.StartDate.Format("02/01/2006"),
			"end_date":     v.EndDate.Format("02/01/2006"),
			"days":         v.TotalDays,
			"requested_at": v.CreatedAt.Format("02/01/2006"),
		})
	}

	// Busca vendas de férias pendentes
	var pendingSells []models.VacationSellRequest
	config.DB.Joins("JOIN users ON users.id = vacation_sell_requests.user_id").
		Where("users.department = ? AND vacation_sell_requests.status = ?", manager.Department, models.VacationSellStatusPending).
		Preload("User").
		Find(&pendingSells)

	var sellList []map[string]interface{}
	for _, s := range pendingSells {
		sellList = append(sellList, map[string]interface{}{
			"id":           s.ID,
			"employee":     s.User.Name,
			"days":         s.DaysToSell,
			"reason":       s.Reason,
			"requested_at": s.CreatedAt.Format("02/01/2006"),
		})
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"vacations":       vacationList,
			"vacation_sells":  sellList,
			"total_vacations": len(vacationList),
			"total_sells":     len(sellList),
			"total":           len(vacationList) + len(sellList),
		},
		Message: fmt.Sprintf("Você tem %d férias e %d vendas de férias pendentes de aprovação",
			len(vacationList), len(sellList)),
	}, nil
}

func executeApproveVacation(managerID, vacationID, action, comment string) (*FunctionResult, error) {
	if !isManager(managerID) {
		return &FunctionResult{
			Success: false,
			Error:   "Esta função está disponível apenas para gestores",
		}, nil
	}

	var vacation models.Vacation
	if err := config.DB.Where("id = ?", vacationID).Preload("User").First(&vacation).Error; err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Solicitação de férias não encontrada",
		}, nil
	}

	if vacation.Status != models.VacationStatusPending {
		return &FunctionResult{
			Success: false,
			Error:   "Esta solicitação já foi processada",
		}, nil
	}

	if action == "reject" && comment == "" {
		return &FunctionResult{
			Success: false,
			Error:   "Por favor, forneça um motivo para a rejeição",
		}, nil
	}

	now := time.Now()
	if action == "approve" {
		vacation.Status = models.VacationStatusApproved
		vacation.ApprovedBy = &managerID
		vacation.ApprovedAt = &now

		// Atualiza saldo
		var balance models.VacationBalance
		if config.DB.Where("user_id = ?", vacation.UserID).First(&balance).Error == nil {
			config.DB.Model(&balance).Updates(map[string]interface{}{
				"used_days":      balance.UsedDays + vacation.TotalDays,
				"available_days": balance.AvailableDays - vacation.TotalDays,
				"pending_days":   balance.PendingDays - vacation.TotalDays,
			})
		}
	} else {
		vacation.Status = models.VacationStatusRejected
		vacation.RejectReason = comment
		vacation.ApprovedBy = &managerID
		vacation.ApprovedAt = &now

		// Devolve dias pendentes
		var balance models.VacationBalance
		if config.DB.Where("user_id = ?", vacation.UserID).First(&balance).Error == nil {
			newPending := balance.PendingDays - vacation.TotalDays
			if newPending < 0 {
				newPending = 0
			}
			config.DB.Model(&balance).Update("pending_days", newPending)
		}
	}

	config.DB.Save(&vacation)

	actionText := "aprovadas"
	if action == "reject" {
		actionText = "rejeitadas"
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"vacation_id": vacationID,
			"employee":    vacation.User.Name,
			"action":      action,
			"days":        vacation.TotalDays,
		},
		Message: fmt.Sprintf("✅ Férias de %s %s com sucesso! (%d dias)", vacation.User.Name, actionText, vacation.TotalDays),
	}, nil
}

func executeGetPayrollHistory(userID string, months int) (*FunctionResult, error) {
	startDate := time.Now().AddDate(0, -months, 0)

	var payslips []models.Payslip
	config.DB.Where("user_id = ? AND created_at >= ?", userID, startDate).
		Order("reference_year DESC, reference_month DESC").
		Find(&payslips)

	var history []map[string]interface{}
	for _, p := range payslips {
		history = append(history, map[string]interface{}{
			"month":       p.ReferenceMonth,
			"year":        p.ReferenceYear,
			"type":        p.PayslipType,
			"gross_total": p.GrossTotal,
			"net_total":   p.NetTotal,
		})
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"payslips": history,
			"count":    len(history),
			"months":   months,
		},
		Message: fmt.Sprintf("Histórico dos últimos %d meses: %d holerites", months, len(history)),
	}, nil
}

func executeGetYTDEarnings(userID string) (*FunctionResult, error) {
	currentYear := time.Now().Year()

	var payslips []models.Payslip
	config.DB.Where("user_id = ? AND reference_year = ?", userID, currentYear).Find(&payslips)

	var grossTotal, netTotal, deductionTotal float64
	for _, p := range payslips {
		grossTotal += p.GrossTotal
		netTotal += p.NetTotal
		deductionTotal += p.DeductionTotal
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"year":            currentYear,
			"months_paid":     len(payslips),
			"gross_total":     grossTotal,
			"net_total":       netTotal,
			"deduction_total": deductionTotal,
		},
		Message: fmt.Sprintf("Em %d você recebeu R$ %.2f líquido em %d meses", currentYear, netTotal, len(payslips)),
	}, nil
}

func executeSearchPolicies(topic string) (*FunctionResult, error) {
	ragService := NewRAGService()
	docs, err := ragService.Search(topic, "", 5)
	if err != nil {
		return &FunctionResult{
			Success: false,
			Error:   "Erro ao buscar políticas",
		}, nil
	}

	var results []map[string]interface{}
	for _, doc := range docs {
		results = append(results, map[string]interface{}{
			"id":       doc.Article.ID,
			"title":    doc.Article.Title,
			"category": doc.Article.Category,
			"summary":  truncateText(doc.Article.Content, 200),
			"score":    doc.Score,
		})
	}

	return &FunctionResult{
		Success: true,
		Data: map[string]interface{}{
			"topic":   topic,
			"results": results,
			"count":   len(results),
		},
		Message: fmt.Sprintf("Encontrados %d documentos sobre '%s'", len(results), topic),
	}, nil
}

// isManager verifica se o usuário é gestor
func isManager(userID string) bool {
	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false
	}
	// Considera gestor se role é admin ou manager, ou se cargo contém "gerente", "diretor", "coordenador", etc.
	if user.Role == "admin" || user.Role == "manager" {
		return true
	}
	position := strings.ToLower(user.Position)
	managerKeywords := []string{"gerente", "diretor", "coordenador", "supervisor", "líder", "head", "manager"}
	for _, keyword := range managerKeywords {
		if strings.Contains(position, keyword) {
			return true
		}
	}
	return false
}

func truncateText(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// ==================== Helper Functions ====================

func formatDatePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("02/01/2006")
}
