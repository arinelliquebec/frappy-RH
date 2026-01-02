package handlers

import (
	"log"
	"math"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetPortalDashboard retorna dados do dashboard do portal
func GetPortalDashboard(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Usuário não encontrado"})
	}

	// Buscar saldo de férias primeiro (precisa para tempo de casa também)
	var vacationBalance models.VacationBalance
	config.DB.Where("user_id = ?", userID).First(&vacationBalance)

	// Calcular tempo de casa (em anos) usando melhor data disponível
	var tempoDeCase int
	var referenceDate time.Time

	// NOVA LÓGICA: Buscar DataAdmissao da tabela ColaboradoresFradema (via JOIN com PessoasFisicasFradema pelo CPF)
	if user.CPF != "" {
		type AdmissaoResult struct {
			DataAdmissao *time.Time `gorm:"column:DataAdmissao"`
		}
		var admissaoResult AdmissaoResult
		err := config.DB.Raw(`
			SELECT c.DataAdmissao
			FROM dbo.ColaboradoresFradema c
			INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
			WHERE (p.CPF = ? OR REPLACE(REPLACE(REPLACE(p.CPF, '.', ''), '-', ''), ' ', '') = ?)
			AND c.DataAdmissao IS NOT NULL
		`, user.CPF, user.CPF).Scan(&admissaoResult).Error

		if err == nil && admissaoResult.DataAdmissao != nil && !admissaoResult.DataAdmissao.IsZero() {
			referenceDate = *admissaoResult.DataAdmissao
			log.Printf("📅 Usando DataAdmissao (ColaboradoresFradema): %v para usuário %s (CPF: %s)", referenceDate, user.Name, user.CPF)
		} else if err != nil {
			log.Printf("⚠️ Erro ao buscar DataAdmissao para CPF %s: %v", user.CPF, err)
		}
	}

	// Se não encontrou DataAdmissao, usa as opções anteriores
	if referenceDate.IsZero() {
		if user.HireDate != nil && !user.HireDate.IsZero() {
			// 1ª Opção: HireDate definido explicitamente
			referenceDate = *user.HireDate
			log.Printf("📅 Usando HireDate: %v para usuário %s", referenceDate, user.Name)
		} else if !user.CreatedAt.IsZero() {
			// 2ª Opção: Data de criação no sistema
			referenceDate = user.CreatedAt
			log.Printf("📅 Usando CreatedAt (fallback): %v para usuário %s", referenceDate, user.Name)
		} else {
			// 3ª Opção: Hoje (pior caso)
			referenceDate = time.Now()
			log.Printf("📅 Usando data atual (fallback extremo): %v para usuário %s", referenceDate, user.Name)
		}
	}

	// Calcula diferença em anos
	now := time.Now()
	years := now.Year() - referenceDate.Year()
	// Ajusta se ainda não completou o aniversário de contratação neste ano
	if now.Month() < referenceDate.Month() ||
	   (now.Month() == referenceDate.Month() && now.Day() < referenceDate.Day()) {
		years--
	}
	if years < 0 {
		years = 0
	}
	tempoDeCase = years
	log.Printf("📅 Tempo de casa calculado: %d anos (now: %v, ref: %v)", tempoDeCase, now, referenceDate)

	// Verificar e atribuir badges de tempo de casa automaticamente
	checkAndAwardTenureBadges(userID, tempoDeCase, referenceDate)

	// Corrigir datas de badges já atribuídos (se necessário)
	fixTenureBadgeDates(userID, referenceDate)

	// Buscar badges do usuário (depois de possíveis novas atribuições)
	var userBadges []models.UserBadge
	config.DB.Preload("Badge").Where("user_id = ?", userID).Order("earned_at DESC").Find(&userBadges)

	// Buscar timeline de carreira
	var careerEvents []models.CareerEvent
	config.DB.Where("user_id = ?", userID).Order("event_date DESC").Limit(10).Find(&careerEvents)

	// Buscar total de cursos concluídos
	var completedCourses int64
	config.DB.Model(&models.Enrollment{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&completedCourses)

	// Buscar certificados
	var certificates int64
	config.DB.Model(&models.Certificate{}).Where("user_id = ?", userID).Count(&certificates)

	// Calcular pontos totais
	var totalPoints int
	for _, ub := range userBadges {
		totalPoints += ub.Badge.Points
	}

	return c.JSON(fiber.Map{
		"success": true,
		"dashboard": fiber.Map{
			"user": fiber.Map{
				"id":         user.ID,
				"name":       user.Name,
				"email":      user.Email,
				"position":   user.Position,
				"department": user.Department,
				"avatar_url": user.AvatarURL,
				"hire_date":  user.HireDate,
				"birth_date": user.BirthDate,
				"bio":        user.Bio,
			},
			"stats": fiber.Map{
				"tempo_de_casa":      tempoDeCase,
				"ferias_disponiveis": vacationBalance.AvailableDays,
				"cursos_concluidos":  completedCourses,
				"certificados":       certificates,
				"badges":             len(userBadges),
				"pontos_totais":      totalPoints,
			},
			"badges":        userBadges,
			"career_events": careerEvents,
			// DEBUG: informações para depuração do tempo de casa
			"debug": fiber.Map{
				"reference_date":           referenceDate,
				"user_hire_date":           user.HireDate,
				"user_created_at":          user.CreatedAt,
				"vacation_balance_period_start": vacationBalance.PeriodStart,
				"calculated_years":         tempoDeCase,
			},
		},
	})
}

// GetBirthdays retorna aniversariantes do mês de TODOS os colaboradores
func GetBirthdays(c *fiber.Ctx) error {
	month := time.Now().Month()
	today := time.Now().Day()

	log.Printf("🎂 Buscando aniversariantes do mês %d de todos os colaboradores", int(month))

	// Buscar aniversariantes diretamente da tabela PessoasFisicasFradema (todos os 400+ colaboradores)
	type BirthdayResult struct {
		ID             int        `gorm:"column:id"`
		Nome           string     `gorm:"column:nome"`
		DataNascimento *time.Time `gorm:"column:data_nascimento"`
		Cargo          *string    `gorm:"column:cargo"`
		Departamento   *string    `gorm:"column:departamento"`
		EmailEmpresarial *string  `gorm:"column:email_empresarial"`
	}

	var results []BirthdayResult
	err := config.DB.Raw(`
		SELECT
			pf.Id as id,
			pf.Nome as nome,
			pf.DataNascimento as data_nascimento,
			c.Cargo as cargo,
			s.Setor as departamento,
			pf.EmailEmpresarial as email_empresarial
		FROM dbo.PessoasFisicasFradema pf
		LEFT JOIN dbo.Cargos c ON pf.IdCargo = c.Id
		LEFT JOIN dbo.Setores s ON pf.IdSetor = s.Id
		WHERE MONTH(pf.DataNascimento) = ?
		AND pf.DataNascimento IS NOT NULL
		AND pf.Ativo = 1
		ORDER BY DAY(pf.DataNascimento)
	`, int(month)).Scan(&results).Error

	if err != nil {
		log.Printf("❌ Erro ao buscar aniversariantes: %v", err)
		// Fallback: tentar query simplificada sem joins
		err = config.DB.Raw(`
			SELECT
				Id as id,
				Nome as nome,
				DataNascimento as data_nascimento,
				EmailEmpresarial as email_empresarial
			FROM dbo.PessoasFisicasFradema
			WHERE MONTH(DataNascimento) = ?
			AND DataNascimento IS NOT NULL
			ORDER BY DAY(DataNascimento)
		`, int(month)).Scan(&results).Error

		if err != nil {
			log.Printf("❌ Erro no fallback: %v", err)
		}
	}

	log.Printf("🎂 Aniversariantes encontrados no mês %d: %d pessoas", int(month), len(results))

	var birthdays []fiber.Map
	for _, r := range results {
		if r.DataNascimento == nil {
			continue
		}
		day := r.DataNascimento.Day()
		cargo := ""
		if r.Cargo != nil {
			cargo = *r.Cargo
		}
		departamento := ""
		if r.Departamento != nil {
			departamento = *r.Departamento
		}

		birthdays = append(birthdays, fiber.Map{
			"id":         r.ID,
			"name":       r.Nome,
			"position":   cargo,
			"department": departamento,
			"avatar_url": "", // Sem avatar para colaboradores não cadastrados
			"day":        day,
			"is_today":   day == today,
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"month":     int(month),
		"birthdays": birthdays,
	})
}

// GetNewEmployees retorna novos colaboradores (últimos 30 dias)
func GetNewEmployees(c *fiber.Ctx) error {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	var users []models.User
	config.DB.Where("hire_date >= ?", thirtyDaysAgo).Order("hire_date DESC").Find(&users)

	var newEmployees []fiber.Map
	for _, user := range users {
		daysAgo := int(math.Ceil(time.Since(*user.HireDate).Hours() / 24))
		newEmployees = append(newEmployees, fiber.Map{
			"id":         user.ID,
			"name":       user.Name,
			"position":   user.Position,
			"department": user.Department,
			"avatar_url": user.AvatarURL,
			"hire_date":  user.HireDate,
			"days_ago":   daysAgo,
		})
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"new_employees": newEmployees,
	})
}

// GetAllBadges retorna todos os badges disponíveis
func GetAllBadges(c *fiber.Ctx) error {
	var badges []models.Badge
	config.DB.Order("category, points DESC").Find(&badges)

	return c.JSON(fiber.Map{
		"success": true,
		"badges":  badges,
	})
}

// GetUserBadges retorna badges do usuário
func GetUserBadges(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var userBadges []models.UserBadge
	config.DB.Preload("Badge").Where("user_id = ?", userID).Order("earned_at DESC").Find(&userBadges)

	// Buscar todos os badges para mostrar quais faltam
	var allBadges []models.Badge
	config.DB.Find(&allBadges)

	earnedBadgeIDs := make(map[string]bool)
	for _, ub := range userBadges {
		earnedBadgeIDs[ub.BadgeID] = true
	}

	var lockedBadges []models.Badge
	for _, badge := range allBadges {
		if !earnedBadgeIDs[badge.ID] {
			lockedBadges = append(lockedBadges, badge)
		}
	}

	return c.JSON(fiber.Map{
		"success":        true,
		"earned_badges":  userBadges,
		"locked_badges":  lockedBadges,
		"total_earned":   len(userBadges),
		"total_available": len(allBadges),
	})
}

// GetCareerTimeline retorna timeline de carreira do usuário
func GetCareerTimeline(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var events []models.CareerEvent
	config.DB.Where("user_id = ?", userID).Order("event_date DESC").Find(&events)

	// Buscar data de admissão do usuário
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	// Se não tem eventos, criar evento de admissão automaticamente
	if len(events) == 0 && user.HireDate != nil {
		admissionEvent := models.CareerEvent{
			UserID:      userID,
			EventType:   "admissao",
			Title:       "Bem-vindo à " + user.Company,
			Description: "Início da jornada como " + user.Position,
			EventDate:   *user.HireDate,
			Icon:        "celebration",
			Color:       "#10B981",
		}
		config.DB.Create(&admissionEvent)
		events = append(events, admissionEvent)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"events":  events,
	})
}

// AddCareerEvent adiciona evento à timeline (admin)
func AddCareerEvent(c *fiber.Ctx) error {
	var input struct {
		UserID      string `json:"user_id"`
		EventType   string `json:"event_type"`
		Title       string `json:"title"`
		Description string `json:"description"`
		EventDate   string `json:"event_date"`
		Icon        string `json:"icon"`
		Color       string `json:"color"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	eventDate, _ := time.Parse("2006-01-02", input.EventDate)

	event := models.CareerEvent{
		UserID:      input.UserID,
		EventType:   input.EventType,
		Title:       input.Title,
		Description: input.Description,
		EventDate:   eventDate,
		Icon:        input.Icon,
		Color:       input.Color,
	}

	if err := config.DB.Create(&event).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar evento"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"event":   event,
	})
}

// AwardBadge atribui badge a um usuário (admin)
func AwardBadge(c *fiber.Ctx) error {
	var input struct {
		UserID  string `json:"user_id"`
		BadgeID string `json:"badge_id"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// Verificar se usuário já tem esse badge
	var existing models.UserBadge
	if config.DB.Where("user_id = ? AND badge_id = ?", input.UserID, input.BadgeID).First(&existing).Error == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Usuário já possui este badge"})
	}

	userBadge := models.UserBadge{
		UserID:   input.UserID,
		BadgeID:  input.BadgeID,
		EarnedAt: time.Now(),
	}

	if err := config.DB.Create(&userBadge).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atribuir badge"})
	}

	// Buscar badge completo
	config.DB.Preload("Badge").First(&userBadge, "id = ?", userBadge.ID)

	// Criar notificação para o usuário
	notification := models.Notification{
		UserID:  input.UserID,
		Type:    "badge",
		Title:   "🏆 Nova Conquista!",
		Message: "Você ganhou o badge: " + userBadge.Badge.Name,
	}
	config.DB.Create(&notification)

	return c.Status(201).JSON(fiber.Map{
		"success":    true,
		"user_badge": userBadge,
	})
}

// CreateBadge cria um novo badge (admin)
func CreateBadge(c *fiber.Ctx) error {
	var badge models.Badge
	if err := c.BodyParser(&badge); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if err := config.DB.Create(&badge).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar badge"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"badge":   badge,
	})
}

// UpdateUserProfile atualiza perfil do usuário
func UpdateUserProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var input struct {
		Phone     string `json:"phone"`
		Bio       string `json:"bio"`
		AvatarURL string `json:"avatar_url"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Usuário não encontrado"})
	}

	updates := map[string]interface{}{}
	if input.Phone != "" {
		updates["phone"] = input.Phone
	}
	if input.Bio != "" {
		updates["bio"] = input.Bio
	}
	if input.AvatarURL != "" {
		updates["avatar_url"] = input.AvatarURL
	}

	if len(updates) > 0 {
		config.DB.Model(&user).Updates(updates)
	}

	config.DB.First(&user, "id = ?", userID)

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user.ToResponse(),
	})
}

// GetTeamMembers retorna membros da equipe/departamento
func GetTeamMembers(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var currentUser models.User
	if err := config.DB.First(&currentUser, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Usuário não encontrado"})
	}

	var teamMembers []models.User
	if currentUser.Department != "" {
		config.DB.Where("department = ? AND id != ?", currentUser.Department, userID).Find(&teamMembers)
	}

	var members []fiber.Map
	for _, member := range teamMembers {
		members = append(members, fiber.Map{
			"id":         member.ID,
			"name":       member.Name,
			"position":   member.Position,
			"department": member.Department,
			"avatar_url": member.AvatarURL,
		})
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"department":  currentUser.Department,
		"team_members": members,
	})
}

// SeedDefaultBadges cria badges padrão do sistema
func SeedDefaultBadges() {
	defaultBadges := []models.Badge{
		// Tempo de Casa
		{Name: "Novato", Description: "Primeiro mês na empresa", Icon: "sprout", Color: "#10B981", Category: "tempo_casa", Criteria: "1 mês", Points: 10},
		{Name: "Veterano 1 Ano", Description: "1 ano de dedicação", Icon: "star", Color: "#F59E0B", Category: "tempo_casa", Criteria: "1 ano", Points: 50},
		{Name: "Veterano 3 Anos", Description: "3 anos de história", Icon: "star_half", Color: "#8B5CF6", Category: "tempo_casa", Criteria: "3 anos", Points: 100},
		{Name: "Veterano 5 Anos", Description: "5 anos de parceria", Icon: "star_rate", Color: "#EC4899", Category: "tempo_casa", Criteria: "5 anos", Points: 200},
		{Name: "Lenda", Description: "10+ anos de empresa", Icon: "workspace_premium", Color: "#EF4444", Category: "tempo_casa", Criteria: "10 anos", Points: 500},

		// Aprendizado
		{Name: "Primeiro Curso", Description: "Concluiu primeiro curso", Icon: "school", Color: "#3B82F6", Category: "aprendizado", Criteria: "1 curso", Points: 20},
		{Name: "Estudioso", Description: "5 cursos concluídos", Icon: "menu_book", Color: "#6366F1", Category: "aprendizado", Criteria: "5 cursos", Points: 50},
		{Name: "Expert", Description: "10 cursos concluídos", Icon: "psychology", Color: "#8B5CF6", Category: "aprendizado", Criteria: "10 cursos", Points: 100},
		{Name: "Mestre", Description: "20+ cursos concluídos", Icon: "military_tech", Color: "#A855F7", Category: "aprendizado", Criteria: "20 cursos", Points: 200},

		// Engajamento
		{Name: "Comunicador", Description: "Visualizou 50 comunicados", Icon: "campaign", Color: "#EC4899", Category: "engajamento", Criteria: "50 comunicados", Points: 30},
		{Name: "Participativo", Description: "Respondeu pesquisa de clima", Icon: "poll", Color: "#14B8A6", Category: "engajamento", Criteria: "pesquisa", Points: 25},
		{Name: "Pontuador", Description: "Acumulou 500 pontos", Icon: "emoji_events", Color: "#F59E0B", Category: "engajamento", Criteria: "500 pontos", Points: 0},

		// PDI
		{Name: "Planejador", Description: "Criou primeiro PDI", Icon: "track_changes", Color: "#10B981", Category: "pdi", Criteria: "1 PDI", Points: 30},
		{Name: "Focado", Description: "Completou 5 metas", Icon: "flag", Color: "#3B82F6", Category: "pdi", Criteria: "5 metas", Points: 50},
		{Name: "Realizador", Description: "Completou 10 metas", Icon: "verified", Color: "#8B5CF6", Category: "pdi", Criteria: "10 metas", Points: 100},
	}

	for _, badge := range defaultBadges {
		var existing models.Badge
		if config.DB.Where("name = ?", badge.Name).First(&existing).Error != nil {
			config.DB.Create(&badge)
		}
	}
}

// fixTenureBadgeDates corrige as datas dos badges de tempo de casa já atribuídos
func fixTenureBadgeDates(userID string, hireDate time.Time) {
	// Mapeamento de badges para meses
	badgeMonths := map[string]int{
		"Novato":           1,
		"Veterano 1 Ano":   12,
		"Veterano 3 Anos":  36,
		"Veterano 5 Anos":  60,
		"Lenda":            120,
	}

	// Buscar todos os badges de tempo de casa do usuário
	var userBadges []models.UserBadge
	config.DB.Preload("Badge").Where("user_id = ?", userID).Find(&userBadges)

	now := time.Now()
	for _, ub := range userBadges {
		if months, ok := badgeMonths[ub.Badge.Name]; ok {
			// Calcular data correta
			correctDate := hireDate.AddDate(0, months, 0)
			if correctDate.After(now) {
				correctDate = now
			}

			// Verificar se a data está errada (diferença maior que 1 dia)
			if math.Abs(ub.EarnedAt.Sub(correctDate).Hours()) > 24 {
				// Atualizar para data correta
				config.DB.Model(&ub).Update("earned_at", correctDate)
				log.Printf("📅 Data do badge '%s' corrigida para %s (usuário %s)",
					ub.Badge.Name, correctDate.Format("02/01/2006"), userID)
			}
		}
	}
}

// checkAndAwardTenureBadges verifica e atribui badges de tempo de casa automaticamente
func checkAndAwardTenureBadges(userID string, years int, hireDate time.Time) {
	// Estrutura para mapear badges de tempo de casa
	type tenureBadge struct {
		name      string
		minMonths int // Meses mínimos para elegibilidade
	}

	tenureBadges := []tenureBadge{
		{name: "Novato", minMonths: 1},              // 1 mês
		{name: "Veterano 1 Ano", minMonths: 12},     // 12 meses
		{name: "Veterano 3 Anos", minMonths: 36},    // 36 meses
		{name: "Veterano 5 Anos", minMonths: 60},    // 60 meses
		{name: "Lenda", minMonths: 120},             // 120 meses (10 anos)
	}

	// Calcular meses totais de casa
	now := time.Now()
	totalMonths := (now.Year()-hireDate.Year())*12 + int(now.Month()) - int(hireDate.Month())

	// Verificar badges elegíveis
	for _, tb := range tenureBadges {
		if totalMonths < tb.minMonths {
			continue // Ainda não elegível
		}

		// Buscar badge
		var badge models.Badge
		if err := config.DB.Where("name = ?", tb.name).First(&badge).Error; err != nil {
			continue // Badge não existe
		}

		// Verificar se usuário já tem esse badge
		var existing models.UserBadge
		if config.DB.Where("user_id = ? AND badge_id = ?", userID, badge.ID).First(&existing).Error == nil {
			continue // Já possui
		}

		// Calcular a data exata de quando o marco foi atingido
		earnedDate := hireDate.AddDate(0, tb.minMonths, 0)

		// Se a data calculada é no futuro (não deveria acontecer, mas por segurança)
		if earnedDate.After(now) {
			earnedDate = now
		}

		// Atribuir badge com a data correta de quando foi conquistado
		userBadge := models.UserBadge{
			UserID:   userID,
			BadgeID:  badge.ID,
			EarnedAt: earnedDate,
		}
		if err := config.DB.Create(&userBadge).Error; err != nil {
			log.Printf("❌ Erro ao atribuir badge %s ao usuário %s: %v", tb.name, userID, err)
			continue
		}

		log.Printf("🏆 Badge '%s' atribuído automaticamente ao usuário %s (conquistado em %s)",
			tb.name, userID, earnedDate.Format("02/01/2006"))

		// Criar notificação
		notification := models.Notification{
			UserID:  userID,
			Type:    "badge",
			Title:   "Nova Conquista! 🏆",
			Message: "Parabéns! Você ganhou o badge: " + badge.Name,
		}
		config.DB.Create(&notification)
	}
}

