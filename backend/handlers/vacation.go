package handlers

import (
	"math"
	"strconv"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetVacationBalance retorna o saldo de férias do usuário
func GetVacationBalance(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var balance models.VacationBalance
	result := config.DB.Where("user_id = ?", userID).First(&balance)

	// Se não existe, cria um saldo inicial baseado na data de admissão
	if result.Error != nil {
		// Buscar data de admissão do usuário
		var user models.User
		config.DB.First(&user, "id = ?", userID)

		var periodStart time.Time
		if user.HireDate != nil && !user.HireDate.IsZero() {
			periodStart = *user.HireDate
		} else {
			periodStart = user.CreatedAt
		}

		// Calcular período aquisitivo atual (cada ano a partir da admissão)
		now := time.Now()
		yearsWorked := now.Year() - periodStart.Year()
		if now.Month() < periodStart.Month() ||
			(now.Month() == periodStart.Month() && now.Day() < periodStart.Day()) {
			yearsWorked--
		}

		// Período aquisitivo atual
		currentPeriodStart := periodStart.AddDate(yearsWorked, 0, 0)
		currentPeriodEnd := currentPeriodStart.AddDate(1, 0, 0)

		balance = models.VacationBalance{
			UserID:        userID,
			TotalDays:     30,
			UsedDays:      0,
			PendingDays:   0,
			AvailableDays: 30,
			AbonoDays:     0, // Abono definido pelo RH/DP caso a caso
			UsedAbono:     0,
			PeriodStart:   currentPeriodStart,
			PeriodEnd:     currentPeriodEnd,
		}
		config.DB.Create(&balance)
	} else {
		// Verificar se precisa renovar o período aquisitivo
		balance = checkAndRenewVacationPeriod(balance)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"balance": balance,
	})
}

// checkAndRenewVacationPeriod verifica se o período aquisitivo expirou e renova
func checkAndRenewVacationPeriod(balance models.VacationBalance) models.VacationBalance {
	now := time.Now()

	// Se o período atual já terminou, renovar
	if now.After(balance.PeriodEnd) {
		// Calcular quantos períodos passaram
		daysSinceEnd := now.Sub(balance.PeriodEnd).Hours() / 24
		periodsElapsed := int(daysSinceEnd/365) + 1

		// Novo período aquisitivo
		newPeriodStart := balance.PeriodEnd
		newPeriodEnd := newPeriodStart.AddDate(periodsElapsed, 0, 0)

		// Renovar com 30 dias (os dias não usados do período anterior são perdidos conforme a CLT)
		balance.TotalDays = 30
		balance.UsedDays = 0
		balance.PendingDays = 0
		balance.AvailableDays = 30
		balance.AbonoDays = 0 // Abono definido pelo RH/DP caso a caso
		balance.UsedAbono = 0
		balance.PeriodStart = newPeriodStart
		balance.PeriodEnd = newPeriodEnd

		// Atualizar no banco
		config.DB.Save(&balance)
	}

	return balance
}

// CreateVacation cria uma nova solicitação de férias/ausência
func CreateVacation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.VacationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	// Parse das datas
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Data de início inválida",
		})
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Data de término inválida",
		})
	}

	// Validações
	if endDate.Before(startDate) {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Data de término deve ser posterior à data de início",
		})
	}

	if startDate.Before(time.Now().Truncate(24 * time.Hour)) {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Não é possível solicitar férias para datas passadas",
		})
	}

	// Calcula total de dias (incluindo fins de semana por simplicidade)
	totalDays := int(endDate.Sub(startDate).Hours()/24) + 1

	// Verifica saldo para férias
	if req.Type == models.VacationTypeFerias {
		var balance models.VacationBalance
		config.DB.Where("user_id = ?", userID).First(&balance)

		if balance.AvailableDays < totalDays {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"message": "Saldo insuficiente de férias",
			})
		}
	}

	// Verifica saldo para abono
	if req.Type == models.VacationTypeAbono {
		var balance models.VacationBalance
		config.DB.Where("user_id = ?", userID).First(&balance)

		remainingAbono := balance.AbonoDays - balance.UsedAbono
		if remainingAbono < totalDays {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"message": "Saldo insuficiente de abono",
			})
		}
	}

	// Verifica conflitos de datas
	var existingVacation models.Vacation
	conflictResult := config.DB.Where(
		"user_id = ? AND status IN ('pending', 'approved') AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
		userID, endDate, startDate, startDate, startDate, startDate, endDate,
	).First(&existingVacation)

	if conflictResult.Error == nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Já existe uma solicitação para este período",
		})
	}

	// Cria a solicitação
	vacation := models.Vacation{
		UserID:    userID,
		Type:      req.Type,
		StartDate: startDate,
		EndDate:   endDate,
		TotalDays: totalDays,
		Reason:    req.Reason,
		Notes:     req.Notes,
		Status:    models.VacationStatusPending,
	}

	if err := config.DB.Create(&vacation).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar solicitação",
		})
	}

	// Atualiza dias pendentes no saldo
	if req.Type == models.VacationTypeFerias {
		config.DB.Model(&models.VacationBalance{}).
			Where("user_id = ?", userID).
			Update("pending_days", config.DB.Raw("pending_days + ?", totalDays))
	}

	// Carrega dados do usuário
	config.DB.Preload("User").Where("id = ?", vacation.ID).First(&vacation)

	return c.Status(201).JSON(fiber.Map{
		"success":  true,
		"message":  "Solicitação criada com sucesso",
		"vacation": vacation,
	})
}

// GetMyVacations retorna as férias do usuário logado
func GetMyVacations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "10"))
	status := c.Query("status", "")
	vacationType := c.Query("type", "")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * perPage

	query := config.DB.Model(&models.Vacation{}).Where("user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if vacationType != "" {
		query = query.Where("type = ?", vacationType)
	}

	var total int64
	query.Count(&total)

	var vacations []models.Vacation
	query.Preload("Approver").
		Order("created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&vacations)

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))

	return c.JSON(models.VacationListResponse{
		Vacations:  vacations,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	})
}

// GetVacationByID retorna uma solicitação específica
func GetVacationByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	vacationID := c.Params("id")

	var vacation models.Vacation
	result := config.DB.Preload("User").Preload("Approver").
		Where("id = ? AND user_id = ?", vacationID, userID).
		First(&vacation)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada",
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"vacation": vacation,
	})
}

// CancelVacation cancela uma solicitação pendente ou aprovada
func CancelVacation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	vacationID := c.Params("id")

	var vacation models.Vacation
	// Permite cancelar férias pendentes OU aprovadas (desde que não tenham começado)
	result := config.DB.Where("id = ? AND user_id = ? AND status IN ?", vacationID, userID, []string{
		string(models.VacationStatusPending),
		string(models.VacationStatusApproved),
	}).First(&vacation)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada ou não pode ser cancelada",
		})
	}

	// Verifica se as férias já começaram
	if vacation.StartDate.Before(time.Now()) && vacation.Status == models.VacationStatusApproved {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Não é possível cancelar férias que já iniciaram",
		})
	}

	previousStatus := vacation.Status
	vacation.Status = models.VacationStatusCanceled
	config.DB.Save(&vacation)

	// Atualiza saldo de dias
	if vacation.Type == models.VacationTypeFerias {
		if previousStatus == models.VacationStatusPending {
			// Se estava pendente, diminui dias pendentes
			config.DB.Model(&models.VacationBalance{}).
				Where("user_id = ?", userID).
				Update("pending_days", config.DB.Raw("pending_days - ?", vacation.TotalDays))
		} else if previousStatus == models.VacationStatusApproved {
			// Se estava aprovada, devolve os dias usados
			config.DB.Model(&models.VacationBalance{}).
				Where("user_id = ?", userID).
				Update("used_days", config.DB.Raw("used_days - ?", vacation.TotalDays))
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Solicitação cancelada com sucesso",
	})
}

// InterruptVacation interrompe férias em andamento (admin)
func InterruptVacation(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	vacationID := c.Params("id")

	type InterruptRequest struct {
		Reason string `json:"reason"`
	}

	var req InterruptRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	var vacation models.Vacation
	result := config.DB.Where("id = ? AND status = ?", vacationID, models.VacationStatusApproved).First(&vacation)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Férias não encontradas ou não estão aprovadas",
		})
	}

	// Calcula dias efetivamente usados
	now := time.Now()
	startDate := vacation.StartDate

	var actualDays int
	if now.Before(startDate) {
		// Férias ainda não começaram
		actualDays = 0
	} else if now.After(vacation.EndDate) {
		// Férias já terminaram (não deveria acontecer, mas por segurança)
		actualDays = vacation.TotalDays
	} else {
		// Férias em andamento - calcula dias usados
		actualDays = int(now.Sub(startDate).Hours()/24) + 1 // +1 para incluir o dia atual
	}

	// Dias a devolver
	daysToReturn := vacation.TotalDays - actualDays

	// Atualiza a férias
	interruptedAt := now
	vacation.Status = models.VacationStatusInterrupted
	vacation.InterruptedAt = &interruptedAt
	vacation.InterruptedBy = &adminID
	vacation.ActualDays = actualDays
	vacation.InterruptReason = req.Reason
	config.DB.Save(&vacation)

	// Devolve os dias não usados ao saldo
	if vacation.Type == models.VacationTypeFerias && daysToReturn > 0 {
		config.DB.Model(&models.VacationBalance{}).
			Where("user_id = ?", vacation.UserID).
			Update("used_days", config.DB.Raw("used_days - ?", daysToReturn))
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"message":       "Férias interrompidas com sucesso",
		"actual_days":   actualDays,
		"days_returned": daysToReturn,
	})
}

// GetTeamVacations retorna as férias da equipe (para gestores)
func GetTeamVacations(c *fiber.Ctx) error {
	// Por enquanto, retorna todas as férias aprovadas/pendentes
	// No futuro, filtrar por equipe do gestor

	month := c.Query("month", "")
	year := c.Query("year", "")

	query := config.DB.Model(&models.Vacation{}).
		Where("status IN ('pending', 'approved')")

	if month != "" && year != "" {
		monthInt, _ := strconv.Atoi(month)
		yearInt, _ := strconv.Atoi(year)
		startOfMonth := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.UTC)
		endOfMonth := startOfMonth.AddDate(0, 1, -1)

		query = query.Where(
			"(start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?)",
			startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth,
		)
	}

	var vacations []models.Vacation
	query.Preload("User").Order("start_date ASC").Find(&vacations)

	// Mapeia para TeamVacation
	teamVacations := make([]models.TeamVacation, len(vacations))
	for i, v := range vacations {
		teamVacations[i] = models.TeamVacation{
			UserID:    v.UserID,
			UserName:  v.User.Name,
			Type:      string(v.Type),
			StartDate: v.StartDate,
			EndDate:   v.EndDate,
			Status:    string(v.Status),
		}
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"vacations": teamVacations,
	})
}

// GetPendingApprovals retorna solicitações pendentes para aprovação (gestores/admin)
func GetPendingApprovals(c *fiber.Ctx) error {
	var vacations []models.Vacation
	config.DB.Preload("User").
		Where("status = ?", models.VacationStatusPending).
		Order("created_at ASC").
		Find(&vacations)

	return c.JSON(fiber.Map{
		"success":   true,
		"vacations": vacations,
	})
}

// ApproveOrRejectVacation aprova ou rejeita uma solicitação
func ApproveOrRejectVacation(c *fiber.Ctx) error {
	approverID := c.Locals("user_id").(string)
	vacationID := c.Params("id")

	var req models.VacationApprovalRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	var vacation models.Vacation
	result := config.DB.Where("id = ? AND status = ?", vacationID, models.VacationStatusPending).First(&vacation)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada ou já processada",
		})
	}

	now := time.Now()
	vacation.Status = req.Status
	vacation.ApprovedBy = &approverID
	vacation.ApprovedAt = &now

	if req.Status == models.VacationStatusRejected {
		vacation.RejectReason = req.RejectReason
	}

	config.DB.Save(&vacation)

	// Atualiza saldo de férias
	if vacation.Type == models.VacationTypeFerias {
		var balance models.VacationBalance
		config.DB.Where("user_id = ?", vacation.UserID).First(&balance)

		if req.Status == models.VacationStatusApproved {
			// Move de pendente para usado
			balance.PendingDays -= vacation.TotalDays
			balance.UsedDays += vacation.TotalDays
			balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
		} else {
			// Apenas remove de pendente
			balance.PendingDays -= vacation.TotalDays
		}
		config.DB.Save(&balance)
	}

	// Atualiza saldo de abono
	if vacation.Type == models.VacationTypeAbono && req.Status == models.VacationStatusApproved {
		config.DB.Model(&models.VacationBalance{}).
			Where("user_id = ?", vacation.UserID).
			Update("used_abono", config.DB.Raw("used_abono + ?", vacation.TotalDays))
	}

	statusMsg := "aprovada"
	if req.Status == models.VacationStatusRejected {
		statusMsg = "rejeitada"
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Solicitação " + statusMsg + " com sucesso",
	})
}

// GetVacationStats retorna estatísticas de férias
func GetVacationStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var stats models.VacationStats

	config.DB.Model(&models.Vacation{}).Where("user_id = ?", userID).Count(&stats.TotalRequests)
	config.DB.Model(&models.Vacation{}).Where("user_id = ? AND status = ?", userID, models.VacationStatusPending).Count(&stats.PendingRequests)
	config.DB.Model(&models.Vacation{}).Where("user_id = ? AND status = ?", userID, models.VacationStatusApproved).Count(&stats.ApprovedRequests)
	config.DB.Model(&models.Vacation{}).Where("user_id = ? AND status = ?", userID, models.VacationStatusRejected).Count(&stats.RejectedRequests)

	// Total de dias utilizados
	var totalDays struct {
		Total int
	}
	config.DB.Model(&models.Vacation{}).
		Select("COALESCE(SUM(total_days), 0) as total").
		Where("user_id = ? AND status = ?", userID, models.VacationStatusApproved).
		Scan(&totalDays)
	stats.TotalDaysUsed = totalDays.Total

	return c.JSON(fiber.Map{
		"success": true,
		"stats":   stats,
	})
}

// ==================== ADMIN FUNCTIONS ====================

// AdminCreateVacation permite admin criar férias/ausência para qualquer usuário
func AdminCreateVacation(c *fiber.Ctx) error {
	var req struct {
		UserID    string                `json:"user_id"`
		Type      models.VacationType   `json:"type"`
		StartDate string                `json:"start_date"`
		EndDate   string                `json:"end_date"`
		Status    models.VacationStatus `json:"status"`
		Reason    string                `json:"reason"`
		Notes     string                `json:"notes"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	// Verifica se usuário existe
	var user models.User
	if err := config.DB.Where("id = ?", req.UserID).First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Usuário não encontrado",
		})
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)
	totalDays := int(endDate.Sub(startDate).Hours()/24) + 1

	adminID := c.Locals("user_id").(string)
	now := time.Now()

	vacation := models.Vacation{
		UserID:    req.UserID,
		Type:      req.Type,
		StartDate: startDate,
		EndDate:   endDate,
		TotalDays: totalDays,
		Reason:    req.Reason,
		Notes:     req.Notes,
		Status:    req.Status,
	}

	// Se já aprovado, marca quem aprovou
	if req.Status == models.VacationStatusApproved {
		vacation.ApprovedBy = &adminID
		vacation.ApprovedAt = &now
	}

	if err := config.DB.Create(&vacation).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar solicitação",
		})
	}

	// Atualiza saldo se aprovado
	if req.Status == models.VacationStatusApproved && req.Type == models.VacationTypeFerias {
		var balance models.VacationBalance
		if config.DB.Where("user_id = ?", req.UserID).First(&balance).Error != nil {
			balance = models.VacationBalance{
				UserID:        req.UserID,
				TotalDays:     30,
				UsedDays:      totalDays,
				AvailableDays: 30 - totalDays,
				AbonoDays:     3,
			}
			config.DB.Create(&balance)
		} else {
			balance.UsedDays += totalDays
			balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
			config.DB.Save(&balance)
		}
	}

	config.DB.Preload("User").Where("id = ?", vacation.ID).First(&vacation)

	return c.Status(201).JSON(fiber.Map{
		"success":  true,
		"message":  "Solicitação criada com sucesso",
		"vacation": vacation,
	})
}

// AdminUpdateVacation permite admin editar férias/ausência
func AdminUpdateVacation(c *fiber.Ctx) error {
	vacationID := c.Params("id")

	var vacation models.Vacation
	if err := config.DB.Where("id = ?", vacationID).First(&vacation).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada",
		})
	}

	var req struct {
		Type      models.VacationType   `json:"type"`
		StartDate string                `json:"start_date"`
		EndDate   string                `json:"end_date"`
		Status    models.VacationStatus `json:"status"`
		Reason    string                `json:"reason"`
		Notes     string                `json:"notes"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	oldStatus := vacation.Status
	oldTotalDays := vacation.TotalDays

	if req.StartDate != "" && req.EndDate != "" {
		startDate, _ := time.Parse("2006-01-02", req.StartDate)
		endDate, _ := time.Parse("2006-01-02", req.EndDate)
		vacation.StartDate = startDate
		vacation.EndDate = endDate
		vacation.TotalDays = int(endDate.Sub(startDate).Hours()/24) + 1
	}

	if req.Type != "" {
		vacation.Type = req.Type
	}
	if req.Status != "" {
		vacation.Status = req.Status
		if req.Status == models.VacationStatusApproved && oldStatus != models.VacationStatusApproved {
			adminID := c.Locals("user_id").(string)
			now := time.Now()
			vacation.ApprovedBy = &adminID
			vacation.ApprovedAt = &now
		}
	}
	vacation.Reason = req.Reason
	vacation.Notes = req.Notes

	config.DB.Save(&vacation)

	// Atualiza saldo se mudou status ou dias
	if vacation.Type == models.VacationTypeFerias {
		var balance models.VacationBalance
		config.DB.Where("user_id = ?", vacation.UserID).First(&balance)

		// Remove dias antigos se estava aprovado
		if oldStatus == models.VacationStatusApproved {
			balance.UsedDays -= oldTotalDays
		}
		// Adiciona novos dias se está aprovado
		if vacation.Status == models.VacationStatusApproved {
			balance.UsedDays += vacation.TotalDays
		}
		balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
		config.DB.Save(&balance)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "Solicitação atualizada com sucesso",
		"vacation": vacation,
	})
}

// AdminDeleteVacation permite admin deletar férias/ausência
func AdminDeleteVacation(c *fiber.Ctx) error {
	vacationID := c.Params("id")

	var vacation models.Vacation
	if err := config.DB.Where("id = ?", vacationID).First(&vacation).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada",
		})
	}

	// Restaura saldo se estava aprovado
	if vacation.Status == models.VacationStatusApproved && vacation.Type == models.VacationTypeFerias {
		var balance models.VacationBalance
		if config.DB.Where("user_id = ?", vacation.UserID).First(&balance).Error == nil {
			balance.UsedDays -= vacation.TotalDays
			balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
			config.DB.Save(&balance)
		}
	}

	config.DB.Delete(&vacation)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Solicitação removida com sucesso",
	})
}

// AdminGetAllVacations retorna todas as férias/ausências
func AdminGetAllVacations(c *fiber.Ctx) error {
	month := c.Query("month", "")
	year := c.Query("year", "")
	userID := c.Query("user_id", "")
	status := c.Query("status", "")

	query := config.DB.Model(&models.Vacation{})

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if month != "" && year != "" {
		monthInt, _ := strconv.Atoi(month)
		yearInt, _ := strconv.Atoi(year)
		startOfMonth := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.UTC)
		endOfMonth := startOfMonth.AddDate(0, 1, -1)
		query = query.Where(
			"(start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?)",
			startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth,
		)
	}

	var vacations []models.Vacation
	query.Preload("User").Preload("Approver").Order("start_date ASC").Find(&vacations)

	return c.JSON(fiber.Map{
		"success":   true,
		"vacations": vacations,
	})
}

// GetAllUsersForAdmin retorna lista de usuários para seleção
func GetAllUsersForAdmin(c *fiber.Ctx) error {
	var users []models.User
	config.DB.Select("id", "name", "email", "cpf").Order("name ASC").Find(&users)

	return c.JSON(fiber.Map{
		"success": true,
		"users":   users,
	})
}

// ==================== CALENDAR EVENTS (METAS) ====================

// GetCalendarEvents retorna eventos do calendário
func GetCalendarEvents(c *fiber.Ctx) error {
	month := c.Query("month", "")
	year := c.Query("year", "")

	query := config.DB.Model(&models.CalendarEvent{})

	if month != "" && year != "" {
		monthInt, _ := strconv.Atoi(month)
		yearInt, _ := strconv.Atoi(year)
		startOfMonth := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.UTC)
		endOfMonth := startOfMonth.AddDate(0, 1, -1)
		query = query.Where(
			"(start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?)",
			startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth,
		)
	}

	var events []models.CalendarEvent
	query.Preload("CreatedByUser").Order("start_date ASC").Find(&events)

	return c.JSON(fiber.Map{
		"success": true,
		"events":  events,
	})
}

// CreateCalendarEvent cria evento no calendário
func CreateCalendarEvent(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Type        string `json:"type"` // meta, feriado, evento, treinamento
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Color       string `json:"color"`
		AllDay      bool   `json:"all_day"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	event := models.CalendarEvent{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		StartDate:   startDate,
		EndDate:     endDate,
		Color:       req.Color,
		AllDay:      req.AllDay,
		CreatedBy:   adminID,
	}

	if err := config.DB.Create(&event).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar evento",
		})
	}

	config.DB.Preload("CreatedByUser").Where("id = ?", event.ID).First(&event)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Evento criado com sucesso",
		"event":   event,
	})
}

// UpdateCalendarEvent atualiza evento do calendário
func UpdateCalendarEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")

	var event models.CalendarEvent
	if err := config.DB.Where("id = ?", eventID).First(&event).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Evento não encontrado",
		})
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Type        string `json:"type"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Color       string `json:"color"`
		AllDay      bool   `json:"all_day"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	if req.Title != "" {
		event.Title = req.Title
	}
	event.Description = req.Description
	if req.Type != "" {
		event.Type = req.Type
	}
	if req.StartDate != "" {
		event.StartDate, _ = time.Parse("2006-01-02", req.StartDate)
	}
	if req.EndDate != "" {
		event.EndDate, _ = time.Parse("2006-01-02", req.EndDate)
	}
	if req.Color != "" {
		event.Color = req.Color
	}
	event.AllDay = req.AllDay

	config.DB.Save(&event)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Evento atualizado com sucesso",
		"event":   event,
	})
}

// DeleteCalendarEvent deleta evento do calendário
func DeleteCalendarEvent(c *fiber.Ctx) error {
	eventID := c.Params("id")

	var event models.CalendarEvent
	if err := config.DB.Where("id = ?", eventID).First(&event).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Evento não encontrado",
		})
	}

	config.DB.Delete(&event)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Evento removido com sucesso",
	})
}

// ==================== VENDA DE FÉRIAS ====================

// CreateVacationSellRequest cria uma solicitação de venda de férias
func CreateVacationSellRequest(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req struct {
		DaysToSell int    `json:"days_to_sell"`
		Reason     string `json:"reason"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	// Validações
	if req.DaysToSell < 1 || req.DaysToSell > 30 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Você pode vender entre 1 e 30 dias de férias",
		})
	}

	// Verifica saldo disponível
	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Saldo de férias não encontrado",
		})
	}

	if balance.AvailableDays < req.DaysToSell {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Saldo insuficiente de férias para vender",
		})
	}

	// Verifica se já existe solicitação pendente
	var existingRequest models.VacationSellRequest
	if err := config.DB.Where("user_id = ? AND status = ? AND period_year = ?",
		userID, models.VacationSellStatusPending, time.Now().Year()).
		First(&existingRequest).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Já existe uma solicitação de venda de férias pendente para este ano",
		})
	}

	// Cria a solicitação
	sellRequest := models.VacationSellRequest{
		UserID:     userID,
		DaysToSell: req.DaysToSell,
		Reason:     req.Reason,
		Status:     models.VacationSellStatusPending,
		PeriodYear: time.Now().Year(),
	}

	if err := config.DB.Create(&sellRequest).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar solicitação",
		})
	}

	// Carrega dados do usuário para notificação
	config.DB.Preload("User").Where("id = ?", sellRequest.ID).First(&sellRequest)

	// Cria notificação para administradores
	var admins []models.User
	config.DB.Where("role = ?", "admin").Find(&admins)

	for _, admin := range admins {
		notification := models.Notification{
			UserID:  admin.ID,
			Title:   "Nova Solicitação de Venda de Férias",
			Message: sellRequest.User.Name + " solicitou vender " + strconv.Itoa(req.DaysToSell) + " dias de férias",
			Type:    "vacation_sell",
		}
		config.DB.Create(&notification)
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Solicitação de venda de férias enviada com sucesso",
		"request": sellRequest,
	})
}

// GetMyVacationSellRequests retorna solicitações de venda do usuário
func GetMyVacationSellRequests(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var requests []models.VacationSellRequest
	config.DB.Preload("Approver").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&requests)

	return c.JSON(fiber.Map{
		"success":  true,
		"requests": requests,
	})
}

// GetPendingVacationSellRequests retorna solicitações pendentes (admin)
func GetPendingVacationSellRequests(c *fiber.Ctx) error {
	var requests []models.VacationSellRequest
	config.DB.Preload("User").
		Where("status = ?", models.VacationSellStatusPending).
		Order("created_at ASC").
		Find(&requests)

	return c.JSON(fiber.Map{
		"success":  true,
		"requests": requests,
	})
}

// GetAllVacationSellRequests retorna todas as solicitações de venda (admin)
func GetAllVacationSellRequests(c *fiber.Ctx) error {
	userID := c.Query("user_id", "")

	query := config.DB.Model(&models.VacationSellRequest{}).Preload("User").Preload("Approver")

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var requests []models.VacationSellRequest
	query.Order("created_at DESC").Find(&requests)

	return c.JSON(fiber.Map{
		"success":  true,
		"requests": requests,
	})
}

// ApproveOrRejectVacationSell aprova ou rejeita venda de férias
func ApproveOrRejectVacationSell(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	requestID := c.Params("id")

	var req struct {
		Status       models.VacationSellStatus `json:"status"`
		RejectReason string                    `json:"reject_reason"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	var sellRequest models.VacationSellRequest
	if err := config.DB.Preload("User").Where("id = ? AND status = ?",
		requestID, models.VacationSellStatusPending).First(&sellRequest).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada ou já processada",
		})
	}

	now := time.Now()
	sellRequest.Status = req.Status
	sellRequest.ApprovedBy = &adminID
	sellRequest.ApprovedAt = &now

	if req.Status == models.VacationSellStatusRejected {
		sellRequest.RejectReason = req.RejectReason
	}

	config.DB.Save(&sellRequest)

	// Se aprovado, atualiza o saldo de férias
	if req.Status == models.VacationSellStatusApproved {
		var balance models.VacationBalance
		if config.DB.Where("user_id = ?", sellRequest.UserID).First(&balance).Error == nil {
			balance.TotalDays -= sellRequest.DaysToSell
			balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
			config.DB.Save(&balance)
		}
	}

	// Notifica o usuário
	statusMsg := "aprovada"
	if req.Status == models.VacationSellStatusRejected {
		statusMsg = "rejeitada"
	}

	notification := models.Notification{
		UserID:  sellRequest.UserID,
		Title:   "Venda de Férias " + statusMsg,
		Message: "Sua solicitação de venda de " + strconv.Itoa(sellRequest.DaysToSell) + " dias de férias foi " + statusMsg,
		Type:    "vacation_sell",
	}
	config.DB.Create(&notification)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Solicitação " + statusMsg + " com sucesso",
	})
}

// AdminUpdateVacationSell atualiza a quantidade de dias de uma venda de férias
func AdminUpdateVacationSell(c *fiber.Ctx) error {
	requestID := c.Params("id")

	var req struct {
		DaysToSell int `json:"days_to_sell"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	if req.DaysToSell < 1 || req.DaysToSell > 30 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dias para vender deve ser entre 1 e 30",
		})
	}

	var sellRequest models.VacationSellRequest
	if err := config.DB.Preload("User").Where("id = ?", requestID).First(&sellRequest).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Solicitação não encontrada",
		})
	}

	// Atualiza a quantidade de dias
	sellRequest.DaysToSell = req.DaysToSell
	config.DB.Save(&sellRequest)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Solicitação atualizada com sucesso",
		"request": sellRequest,
	})
}

// ==================== ADMIN: Gerenciamento de Saldos de Férias ====================

// AdminGetAllVacationBalances retorna todos os saldos de férias (admin)
func AdminGetAllVacationBalances(c *fiber.Ctx) error {
	type BalanceWithUser struct {
		models.VacationBalance
		UserName  string `json:"user_name"`
		UserEmail string `json:"user_email"`
	}

	var balances []BalanceWithUser
	config.DB.Raw(`
		SELECT
			vb.*,
			u.name as user_name,
			u.email as user_email
		FROM vacation_balances vb
		JOIN users u ON vb.user_id = u.id
		WHERE u.deleted_at IS NULL
		ORDER BY u.name
	`).Scan(&balances)

	return c.JSON(fiber.Map{
		"success":  true,
		"balances": balances,
	})
}

// AdminGetVacationBalance retorna saldo de férias de um usuário específico (admin)
func AdminGetVacationBalance(c *fiber.Ctx) error {
	userID := c.Params("user_id")

	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Saldo não encontrado para este usuário",
		})
	}

	var user models.User
	config.DB.First(&user, "id = ?", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"balance": balance,
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

// AdminUpdateVacationBalance atualiza saldo de férias de um usuário (admin)
func AdminUpdateVacationBalance(c *fiber.Ctx) error {
	userID := c.Params("user_id")

	var req struct {
		TotalDays     *int    `json:"total_days"`
		UsedDays      *int    `json:"used_days"`
		PendingDays   *int    `json:"pending_days"`
		AvailableDays *int    `json:"available_days"`
		AbonoDays     *int    `json:"abono_days"`
		UsedAbono     *int    `json:"used_abono"`
		PeriodStart   *string `json:"period_start"`
		PeriodEnd     *string `json:"period_end"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos: " + err.Error(),
		})
	}

	var balance models.VacationBalance
	result := config.DB.Where("user_id = ?", userID).First(&balance)

	// Se não existe, cria
	if result.Error != nil {
		balance = models.VacationBalance{
			UserID:        userID,
			TotalDays:     30,
			UsedDays:      0,
			PendingDays:   0,
			AvailableDays: 30,
			AbonoDays:     0,
			UsedAbono:     0,
			PeriodStart:   time.Now().AddDate(-1, 0, 0),
			PeriodEnd:     time.Now(),
		}
	}

	// Atualiza campos fornecidos
	if req.TotalDays != nil {
		balance.TotalDays = *req.TotalDays
	}
	if req.UsedDays != nil {
		balance.UsedDays = *req.UsedDays
	}
	if req.PendingDays != nil {
		balance.PendingDays = *req.PendingDays
	}
	if req.AvailableDays != nil {
		balance.AvailableDays = *req.AvailableDays
	}
	if req.AbonoDays != nil {
		balance.AbonoDays = *req.AbonoDays
	}
	if req.UsedAbono != nil {
		balance.UsedAbono = *req.UsedAbono
	}
	// Parse period_start como string para time.Time
	if req.PeriodStart != nil && *req.PeriodStart != "" {
		parsedDate, err := time.Parse("2006-01-02", *req.PeriodStart)
		if err == nil {
			balance.PeriodStart = parsedDate
		}
	}
	// Parse period_end como string para time.Time
	if req.PeriodEnd != nil && *req.PeriodEnd != "" {
		parsedDate, err := time.Parse("2006-01-02", *req.PeriodEnd)
		if err == nil {
			balance.PeriodEnd = parsedDate
		}
	}

	// Recalcular available_days se não foi fornecido explicitamente
	if req.AvailableDays == nil {
		balance.AvailableDays = balance.TotalDays - balance.UsedDays - balance.PendingDays
		if balance.AvailableDays < 0 {
			balance.AvailableDays = 0
		}
	}

	if result.Error != nil {
		config.DB.Create(&balance)
	} else {
		config.DB.Save(&balance)
	}

	// Buscar nome do usuário para log
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Saldo de férias atualizado com sucesso",
		"balance": balance,
		"user": fiber.Map{
			"id":   user.ID,
			"name": user.Name,
		},
	})
}

// AdminSearchUsersForVacation busca usuários para seleção no admin (admin)
func AdminSearchUsersForVacation(c *fiber.Ctx) error {
	search := c.Query("q", "")

	var users []struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}

	query := config.DB.Table("users").Select("id, name, email").Where("deleted_at IS NULL")

	if search != "" {
		query = query.Where("name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Order("name").Limit(20).Scan(&users)

	return c.JSON(fiber.Map{
		"success": true,
		"users":   users,
	})
}

// ==================== CONFIGURAÇÕES DE FÉRIAS ====================

// GetVacationSettings retorna as configurações de férias
func GetVacationSettings(c *fiber.Ctx) error {
	var settings models.VacationSettings
	result := config.DB.First(&settings)

	// Se não existe, cria configurações padrão
	if result.Error != nil {
		settings = models.VacationSettings{
			TotalDaysPerYear:      30,
			MinDaysPerRequest:     5,
			MaxDaysPerRequest:     30,
			MaxSplits:             3,
			MinAdvanceDays:        30,
			AllowWeekendStart:     false,
			AllowSellVacation:     true,
			MaxSellDays:           10,
			MinSellDays:           1,
			AllowAbono:            true,
			MaxAbonoDays:          3,
			AbonoRequiresApproval: true,
			PeriodMonths:          12,
			AllowCarryOver:        false,
			MaxCarryOverDays:      10,
			WelcomeMessage:        "Bem-vindo ao sistema de férias! Aqui você pode solicitar, acompanhar e gerenciar suas férias.",
			RulesMessage:          "• Mínimo de 5 dias por solicitação\n• Máximo de 3 fracionamentos por período\n• Antecedência mínima de 30 dias\n• Férias devem ser tiradas dentro do período aquisitivo",
		}
		config.DB.Create(&settings)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"settings": settings,
	})
}

// UpdateVacationSettings atualiza as configurações de férias (admin)
func UpdateVacationSettings(c *fiber.Ctx) error {
	var req models.VacationSettings
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	var settings models.VacationSettings
	result := config.DB.First(&settings)

	if result.Error != nil {
		// Cria novas configurações
		req.ID = ""
		config.DB.Create(&req)
		settings = req
	} else {
		// Atualiza campos
		settings.TotalDaysPerYear = req.TotalDaysPerYear
		settings.MinDaysPerRequest = req.MinDaysPerRequest
		settings.MaxDaysPerRequest = req.MaxDaysPerRequest
		settings.MaxSplits = req.MaxSplits
		settings.MinAdvanceDays = req.MinAdvanceDays
		settings.AllowWeekendStart = req.AllowWeekendStart
		settings.AllowSellVacation = req.AllowSellVacation
		settings.MaxSellDays = req.MaxSellDays
		settings.MinSellDays = req.MinSellDays
		settings.AllowAbono = req.AllowAbono
		settings.MaxAbonoDays = req.MaxAbonoDays
		settings.AbonoRequiresApproval = req.AbonoRequiresApproval
		settings.PeriodMonths = req.PeriodMonths
		settings.AllowCarryOver = req.AllowCarryOver
		settings.MaxCarryOverDays = req.MaxCarryOverDays
		settings.WelcomeMessage = req.WelcomeMessage
		settings.RulesMessage = req.RulesMessage

		config.DB.Save(&settings)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "Configurações atualizadas com sucesso",
		"settings": settings,
	})
}
