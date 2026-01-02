package handlers

import (
	"log"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ==================== COLABORADOR ====================

// GetMyPDIs retorna os PDIs do colaborador logado
func GetMyPDIs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	status := c.Query("status")
	year := c.QueryInt("year", 0)

	query := config.DB.Where("user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if year > 0 {
		query = query.Where("YEAR(period_start) = ? OR YEAR(period_end) = ?", year, year)
	}

	var pdis []models.PDI
	if err := query.Order("created_at DESC").Find(&pdis).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar PDIs"})
	}

	// Buscar resumo com contagem de metas
	var summaries []models.PDISummary
	for _, pdi := range pdis {
		var goalsCount, goalsCompleted int64
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ?", pdi.ID).Count(&goalsCount)
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ? AND status = ?", pdi.ID, models.GoalStatusCompleted).Count(&goalsCompleted)

		summaries = append(summaries, models.PDISummary{
			ID:              pdi.ID,
			Title:           pdi.Title,
			PeriodStart:     pdi.PeriodStart,
			PeriodEnd:       pdi.PeriodEnd,
			Status:          pdi.Status,
			OverallProgress: pdi.OverallProgress,
			GoalsCount:      int(goalsCount),
			GoalsCompleted:  int(goalsCompleted),
		})
	}

	// Anos disponíveis
	var years []int
	config.DB.Model(&models.PDI{}).
		Where("user_id = ?", userID).
		Select("DISTINCT YEAR(period_start)").
		Pluck("YEAR(period_start)", &years)

	return c.JSON(fiber.Map{
		"success": true,
		"pdis":    summaries,
		"years":   years,
	})
}

// GetPDIByID retorna um PDI específico com todos os detalhes
func GetPDIByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.
		Preload("Goals", func(db *gorm.DB) *gorm.DB {
			return db.Order("priority DESC, created_at ASC")
		}).
		Preload("Goals.Actions", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Checkins", func(db *gorm.DB) *gorm.DB {
			return db.Order("checkin_date DESC")
		}).
		Preload("Checkins.Author").
		Preload("Manager").
		Where("id = ? AND user_id = ?", pdiID, userID).
		First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"pdi":     pdi,
	})
}

// CreatePDI cria um novo PDI
func CreatePDI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		PeriodStart string  `json:"period_start"`
		PeriodEnd   string  `json:"period_end"`
		ManagerID   *string `json:"manager_id"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if input.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Título é obrigatório"})
	}

	if input.PeriodStart == "" || input.PeriodEnd == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Datas de início e fim são obrigatórias"})
	}

	// Parse das datas (aceita YYYY-MM-DD)
	periodStart, err := time.Parse("2006-01-02", input.PeriodStart)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Formato de data inválido para período inicial"})
	}

	periodEnd, err := time.Parse("2006-01-02", input.PeriodEnd)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Formato de data inválido para período final"})
	}

	pdi := models.PDI{
		UserID:      userID,
		Title:       input.Title,
		Description: input.Description,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		ManagerID:   input.ManagerID,
		Status:      models.PDIStatusDraft,
	}

	if err := config.DB.Create(&pdi).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar PDI"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"pdi":     pdi,
		"message": "PDI criado com sucesso",
	})
}

// UpdatePDI atualiza um PDI
func UpdatePDI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND user_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	// Só pode editar se estiver em rascunho
	if pdi.Status != models.PDIStatusDraft && pdi.Status != models.PDIStatusPending {
		return c.Status(400).JSON(fiber.Map{"error": "PDI não pode ser editado neste status"})
	}

	var input struct {
		Title            string `json:"title"`
		Description      string `json:"description"`
		PeriodStart      string `json:"period_start"`
		PeriodEnd        string `json:"period_end"`
		EmployeeFeedback string `json:"employee_feedback"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	updates := map[string]interface{}{}
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.PeriodStart != "" {
		if parsed, err := time.Parse("2006-01-02", input.PeriodStart); err == nil {
			updates["period_start"] = parsed
		}
	}
	if input.PeriodEnd != "" {
		if parsed, err := time.Parse("2006-01-02", input.PeriodEnd); err == nil {
			updates["period_end"] = parsed
		}
	}
	if input.EmployeeFeedback != "" {
		updates["employee_feedback"] = input.EmployeeFeedback
	}

	if err := config.DB.Model(&pdi).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar PDI"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "PDI atualizado com sucesso",
	})
}

// SubmitPDI envia o PDI para aprovação do gestor
func SubmitPDI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND user_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	if pdi.Status != models.PDIStatusDraft {
		return c.Status(400).JSON(fiber.Map{"error": "PDI já foi enviado"})
	}

	// Verificar se tem pelo menos uma meta
	var goalsCount int64
	config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ?", pdiID).Count(&goalsCount)
	if goalsCount == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Adicione pelo menos uma meta antes de enviar"})
	}

	pdi.Status = models.PDIStatusPending
	if err := config.DB.Save(&pdi).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao enviar PDI"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "PDI enviado para aprovação",
	})
}

// ==================== METAS ====================

// AddGoal adiciona uma meta ao PDI
func AddGoal(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	// Verificar se o PDI pertence ao usuário
	var pdi models.PDI
	if err := config.DB.Where("id = ? AND user_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	var input struct {
		Title           string              `json:"title"`
		Description     string              `json:"description"`
		Category        string              `json:"category"`
		Priority        models.GoalPriority `json:"priority"`
		DueDate         string              `json:"due_date"`
		SuccessCriteria string              `json:"success_criteria"`
	}

	log.Printf("AddGoal - Body recebido: %s", string(c.Body()))

	if err := c.BodyParser(&input); err != nil {
		log.Printf("AddGoal - Erro no BodyParser: %v", err)
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos: " + err.Error()})
	}

	log.Printf("AddGoal - Input parseado: %+v", input)

	if input.Title == "" {
		log.Printf("AddGoal - Título vazio!")
		return c.Status(400).JSON(fiber.Map{"error": "Título é obrigatório"})
	}

	priority := input.Priority
	if priority == "" {
		priority = models.GoalPriorityMedium
	}

	// Parse da data
	var dueDate *time.Time
	if input.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", input.DueDate); err == nil {
			dueDate = &parsed
		}
	}

	goal := models.PDIGoal{
		PDIID:           pdiID,
		Title:           input.Title,
		Description:     input.Description,
		Category:        input.Category,
		Priority:        priority,
		DueDate:         dueDate,
		SuccessCriteria: input.SuccessCriteria,
		Status:          models.GoalStatusPending,
	}

	if err := config.DB.Create(&goal).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar meta"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"goal":    goal,
		"message": "Meta adicionada com sucesso",
	})
}

// UpdateGoal atualiza uma meta
func UpdateGoal(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	goalID := c.Params("goalId")

	// Verificar se a meta pertence a um PDI do usuário
	var goal models.PDIGoal
	if err := config.DB.
		Joins("JOIN pdis ON pdi_goals.pdi_id = pdis.id").
		Where("pdi_goals.id = ? AND pdis.user_id = ?", goalID, userID).
		First(&goal).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Meta não encontrada"})
	}

	var input struct {
		Title           string              `json:"title"`
		Description     string              `json:"description"`
		Category        string              `json:"category"`
		Priority        models.GoalPriority `json:"priority"`
		Status          models.GoalStatus   `json:"status"`
		Progress        int                 `json:"progress"`
		DueDate         string              `json:"due_date"`
		SuccessCriteria string              `json:"success_criteria"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	updates := map[string]interface{}{}
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Category != "" {
		updates["category"] = input.Category
	}
	if input.Priority != "" {
		updates["priority"] = input.Priority
	}
	if input.Status != "" {
		updates["status"] = input.Status
		if input.Status == models.GoalStatusCompleted {
			now := time.Now()
			updates["completed_at"] = &now
			updates["progress"] = 100
		}
	}
	if input.Progress > 0 {
		updates["progress"] = input.Progress
	}
	if input.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", input.DueDate); err == nil {
			updates["due_date"] = &parsed
		}
	}
	if input.SuccessCriteria != "" {
		updates["success_criteria"] = input.SuccessCriteria
	}

	if err := config.DB.Model(&goal).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar meta"})
	}

	// Atualizar progresso geral do PDI
	updatePDIProgress(goal.PDIID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Meta atualizada com sucesso",
	})
}

// DeleteGoal remove uma meta
func DeleteGoal(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	goalID := c.Params("goalId")

	var goal models.PDIGoal
	if err := config.DB.
		Joins("JOIN pdis ON pdi_goals.pdi_id = pdis.id").
		Where("pdi_goals.id = ? AND pdis.user_id = ?", goalID, userID).
		First(&goal).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Meta não encontrada"})
	}

	// Deletar ações da meta
	config.DB.Where("goal_id = ?", goalID).Delete(&models.PDIAction{})

	// Deletar meta
	if err := config.DB.Delete(&goal).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao deletar meta"})
	}

	// Atualizar progresso geral do PDI
	updatePDIProgress(goal.PDIID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Meta removida com sucesso",
	})
}

// ==================== AÇÕES ====================

// AddAction adiciona uma ação a uma meta
func AddAction(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	goalID := c.Params("goalId")

	// Verificar se a meta pertence a um PDI do usuário
	var goal models.PDIGoal
	if err := config.DB.
		Joins("JOIN pdis ON pdi_goals.pdi_id = pdis.id").
		Where("pdi_goals.id = ? AND pdis.user_id = ?", goalID, userID).
		First(&goal).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Meta não encontrada"})
	}

	var input struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		ActionType   string `json:"action_type"`
		DueDate      string `json:"due_date"`
		ResourceURL  string `json:"resource_url"`
		ResourceName string `json:"resource_name"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if input.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Título é obrigatório"})
	}

	// Parse da data
	var dueDate *time.Time
	if input.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", input.DueDate); err == nil {
			dueDate = &parsed
		}
	}

	action := models.PDIAction{
		GoalID:       goalID,
		Title:        input.Title,
		Description:  input.Description,
		ActionType:   input.ActionType,
		DueDate:      dueDate,
		ResourceURL:  input.ResourceURL,
		ResourceName: input.ResourceName,
		Status:       models.ActionStatusPending,
	}

	if err := config.DB.Create(&action).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar ação"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"action":  action,
		"message": "Ação adicionada com sucesso",
	})
}

// UpdateAction atualiza uma ação
func UpdateAction(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	actionID := c.Params("actionId")

	var action models.PDIAction
	if err := config.DB.
		Joins("JOIN pdi_goals ON pdi_actions.goal_id = pdi_goals.id").
		Joins("JOIN pdis ON pdi_goals.pdi_id = pdis.id").
		Where("pdi_actions.id = ? AND pdis.user_id = ?", actionID, userID).
		First(&action).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Ação não encontrada"})
	}

	var input struct {
		Title        string              `json:"title"`
		Description  string              `json:"description"`
		ActionType   string              `json:"action_type"`
		Status       models.ActionStatus `json:"status"`
		DueDate      string              `json:"due_date"`
		ResourceURL  string              `json:"resource_url"`
		ResourceName string              `json:"resource_name"`
		Notes        string              `json:"notes"`
		Evidence     string              `json:"evidence"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	updates := map[string]interface{}{}
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.ActionType != "" {
		updates["action_type"] = input.ActionType
	}
	if input.Status != "" {
		updates["status"] = input.Status
		if input.Status == models.ActionStatusCompleted {
			now := time.Now()
			updates["completed_at"] = &now
		}
	}
	if input.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", input.DueDate); err == nil {
			updates["due_date"] = &parsed
		}
	}
	if input.ResourceURL != "" {
		updates["resource_url"] = input.ResourceURL
	}
	if input.ResourceName != "" {
		updates["resource_name"] = input.ResourceName
	}
	if input.Notes != "" {
		updates["notes"] = input.Notes
	}
	if input.Evidence != "" {
		updates["evidence"] = input.Evidence
	}

	if err := config.DB.Model(&action).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar ação"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ação atualizada com sucesso",
	})
}

// DeleteAction remove uma ação
func DeleteAction(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	actionID := c.Params("actionId")

	var action models.PDIAction
	if err := config.DB.
		Joins("JOIN pdi_goals ON pdi_actions.goal_id = pdi_goals.id").
		Joins("JOIN pdis ON pdi_goals.pdi_id = pdis.id").
		Where("pdi_actions.id = ? AND pdis.user_id = ?", actionID, userID).
		First(&action).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Ação não encontrada"})
	}

	if err := config.DB.Delete(&action).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao deletar ação"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ação removida com sucesso",
	})
}

// ==================== CHECK-INS ====================

// AddCheckin adiciona um check-in ao PDI
func AddCheckin(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND user_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	var input struct {
		Progress    string `json:"progress"`
		Challenges  string `json:"challenges"`
		NextSteps   string `json:"next_steps"`
		CheckinType string `json:"checkin_type"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	checkinType := input.CheckinType
	if checkinType == "" {
		checkinType = "self"
	}

	checkin := models.PDICheckin{
		PDIID:       pdiID,
		AuthorID:    userID,
		CheckinDate: time.Now(),
		CheckinType: checkinType,
		Progress:    input.Progress,
		Challenges:  input.Challenges,
		NextSteps:   input.NextSteps,
	}

	if err := config.DB.Create(&checkin).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar check-in"})
	}

	// Carregar autor
	config.DB.Preload("Author").First(&checkin, checkin.ID)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"checkin": checkin,
		"message": "Check-in registrado com sucesso",
	})
}

// ==================== ADMIN/GESTOR ====================

// AdminGetTeamPDIs retorna os PDIs da equipe (para gestores)
func AdminGetTeamPDIs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	status := c.Query("status")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	offset := (page - 1) * limit

	query := config.DB.Model(&models.PDI{}).Where("manager_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var pdis []models.PDI
	if err := query.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&pdis).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar PDIs"})
	}

	var summaries []models.PDISummary
	for _, pdi := range pdis {
		var goalsCount, goalsCompleted int64
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ?", pdi.ID).Count(&goalsCount)
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ? AND status = ?", pdi.ID, models.GoalStatusCompleted).Count(&goalsCompleted)

		userName := ""
		if pdi.User != nil {
			userName = pdi.User.Name
		}

		summaries = append(summaries, models.PDISummary{
			ID:              pdi.ID,
			Title:           pdi.Title,
			PeriodStart:     pdi.PeriodStart,
			PeriodEnd:       pdi.PeriodEnd,
			Status:          pdi.Status,
			OverallProgress: pdi.OverallProgress,
			GoalsCount:      int(goalsCount),
			GoalsCompleted:  int(goalsCompleted),
			UserName:        userName,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"pdis":    summaries,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminGetPDIByID retorna detalhes de um PDI (para gestor)
func AdminGetPDIByID(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.
		Preload("User").
		Preload("Goals", func(db *gorm.DB) *gorm.DB {
			return db.Order("priority DESC, created_at ASC")
		}).
		Preload("Goals.Actions").
		Preload("Checkins", func(db *gorm.DB) *gorm.DB {
			return db.Order("checkin_date DESC")
		}).
		Preload("Checkins.Author").
		Where("id = ? AND manager_id = ?", pdiID, userID).
		First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"pdi":     pdi,
	})
}

// AdminApprovePDI aprova um PDI
func AdminApprovePDI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND manager_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	if pdi.Status != models.PDIStatusPending {
		return c.Status(400).JSON(fiber.Map{"error": "PDI não está pendente de aprovação"})
	}

	var input struct {
		Feedback string `json:"feedback"`
	}
	c.BodyParser(&input)

	now := time.Now()
	updates := map[string]interface{}{
		"status":      models.PDIStatusApproved,
		"approved_at": &now,
	}
	if input.Feedback != "" {
		updates["manager_feedback"] = input.Feedback
	}

	if err := config.DB.Model(&pdi).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao aprovar PDI"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "PDI aprovado com sucesso",
	})
}

// AdminRejectPDI rejeita um PDI
func AdminRejectPDI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND manager_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	if pdi.Status != models.PDIStatusPending {
		return c.Status(400).JSON(fiber.Map{"error": "PDI não está pendente de aprovação"})
	}

	var input struct {
		Feedback string `json:"feedback"`
	}
	c.BodyParser(&input)

	updates := map[string]interface{}{
		"status": models.PDIStatusDraft,
	}
	if input.Feedback != "" {
		updates["manager_feedback"] = input.Feedback
	}

	if err := config.DB.Model(&pdi).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao rejeitar PDI"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "PDI retornado para revisão",
	})
}

// AdminAddCheckin adiciona um check-in do gestor
func AdminAddCheckin(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pdiID := c.Params("id")

	var pdi models.PDI
	if err := config.DB.Where("id = ? AND manager_id = ?", pdiID, userID).First(&pdi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "PDI não encontrado"})
	}

	var input struct {
		Progress     string `json:"progress"`
		Challenges   string `json:"challenges"`
		NextSteps    string `json:"next_steps"`
		ManagerNotes string `json:"manager_notes"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	checkin := models.PDICheckin{
		PDIID:        pdiID,
		AuthorID:     userID,
		CheckinDate:  time.Now(),
		CheckinType:  "manager",
		Progress:     input.Progress,
		Challenges:   input.Challenges,
		NextSteps:    input.NextSteps,
		ManagerNotes: input.ManagerNotes,
	}

	if err := config.DB.Create(&checkin).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar check-in"})
	}

	config.DB.Preload("Author").First(&checkin, checkin.ID)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"checkin": checkin,
		"message": "Check-in do gestor registrado",
	})
}

// AdminGetAllPDIs retorna todos os PDIs (para admin)
func AdminGetAllPDIs(c *fiber.Ctx) error {
	status := c.Query("status")
	search := c.Query("search")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	offset := (page - 1) * limit

	query := config.DB.Model(&models.PDI{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if search != "" {
		query = query.Joins("JOIN users ON pdis.user_id = users.id").
			Where("users.name LIKE ? OR pdis.title LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var pdis []models.PDI
	if err := query.
		Preload("User").
		Preload("Manager").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&pdis).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar PDIs"})
	}

	var summaries []models.PDISummary
	for _, pdi := range pdis {
		var goalsCount, goalsCompleted int64
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ?", pdi.ID).Count(&goalsCount)
		config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ? AND status = ?", pdi.ID, models.GoalStatusCompleted).Count(&goalsCompleted)

		userName := ""
		managerName := ""
		if pdi.User != nil {
			userName = pdi.User.Name
		}
		if pdi.Manager != nil {
			managerName = pdi.Manager.Name
		}

		summaries = append(summaries, models.PDISummary{
			ID:              pdi.ID,
			Title:           pdi.Title,
			PeriodStart:     pdi.PeriodStart,
			PeriodEnd:       pdi.PeriodEnd,
			Status:          pdi.Status,
			OverallProgress: pdi.OverallProgress,
			GoalsCount:      int(goalsCount),
			GoalsCompleted:  int(goalsCompleted),
			UserName:        userName,
			ManagerName:     managerName,
		})
	}

	// Estatísticas
	var stats struct {
		Total      int64 `json:"total"`
		Draft      int64 `json:"draft"`
		Pending    int64 `json:"pending"`
		Approved   int64 `json:"approved"`
		InProgress int64 `json:"in_progress"`
		Completed  int64 `json:"completed"`
	}
	config.DB.Model(&models.PDI{}).Count(&stats.Total)
	config.DB.Model(&models.PDI{}).Where("status = ?", models.PDIStatusDraft).Count(&stats.Draft)
	config.DB.Model(&models.PDI{}).Where("status = ?", models.PDIStatusPending).Count(&stats.Pending)
	config.DB.Model(&models.PDI{}).Where("status = ?", models.PDIStatusApproved).Count(&stats.Approved)
	config.DB.Model(&models.PDI{}).Where("status = ?", models.PDIStatusInProgress).Count(&stats.InProgress)
	config.DB.Model(&models.PDI{}).Where("status = ?", models.PDIStatusCompleted).Count(&stats.Completed)

	return c.JSON(fiber.Map{
		"success": true,
		"pdis":    summaries,
		"stats":   stats,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// ==================== HELPERS ====================

// updatePDIProgress atualiza o progresso geral do PDI
func updatePDIProgress(pdiID string) {
	var goals []models.PDIGoal
	config.DB.Where("pdi_id = ?", pdiID).Find(&goals)

	if len(goals) == 0 {
		return
	}

	var totalProgress int
	for _, goal := range goals {
		totalProgress += goal.Progress
	}

	overallProgress := totalProgress / len(goals)

	config.DB.Model(&models.PDI{}).Where("id = ?", pdiID).Update("overall_progress", overallProgress)

	// Se todas as metas estiverem completas, marcar PDI como concluído
	var completedGoals int64
	config.DB.Model(&models.PDIGoal{}).Where("pdi_id = ? AND status = ?", pdiID, models.GoalStatusCompleted).Count(&completedGoals)

	if int(completedGoals) == len(goals) {
		now := time.Now()
		config.DB.Model(&models.PDI{}).Where("id = ?", pdiID).Updates(map[string]interface{}{
			"status":       models.PDIStatusCompleted,
			"completed_at": &now,
		})
	}
}
