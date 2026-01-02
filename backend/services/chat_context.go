package services

import (
	"fmt"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
)

// ==================== Context Structures ====================

// UserContext representa o contexto completo do usuário para o chat
type UserContext struct {
	User       *models.User
	Vacation   *VacationContext
	Learning   *LearningContext
	Payslip    *PayslipContext
	PDI        *PDIContext
	Badges     *BadgesContext
	TimeInfo   *TimeInfoContext
}

// VacationContext dados de férias do usuário
type VacationContext struct {
	Balance         int        `json:"balance"`
	UsedDays        int        `json:"used_days"`
	PendingDays     int        `json:"pending_days"`
	PeriodStart     time.Time  `json:"period_start"`
	PeriodEnd       time.Time  `json:"period_end"`
	DeadlineToUse   time.Time  `json:"deadline_to_use"`
	NextVacation    *VacationInfo `json:"next_vacation"`
	PendingRequest  bool       `json:"pending_request"`
	SellRequests    int        `json:"sell_requests"`
	SoldDays        int        `json:"sold_days"`
}

// VacationInfo informações sobre férias agendadas
type VacationInfo struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	Days      int       `json:"days"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
}

// LearningContext dados de aprendizado do usuário
type LearningContext struct {
	EnrolledCourses    []CourseInfo `json:"enrolled_courses"`
	CompletedCount     int          `json:"completed_count"`
	InProgressCount    int          `json:"in_progress_count"`
	TotalCertificates  int          `json:"total_certificates"`
	AvailableCourses   int          `json:"available_courses"`
	RecommendedCourses []CourseInfo `json:"recommended_courses"`
	TotalHoursLearning int          `json:"total_hours_learning"`
}

// CourseInfo informações resumidas de um curso
type CourseInfo struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Category string  `json:"category"`
	Progress float64 `json:"progress"`
	Duration int     `json:"duration"`
}

// PayslipContext dados de holerite do usuário
type PayslipContext struct {
	LastPayslip    *PayslipInfo `json:"last_payslip"`
	YTDGross       float64      `json:"ytd_gross"`
	YTDNet         float64      `json:"ytd_net"`
	AvailableCount int          `json:"available_count"`
}

// PayslipInfo informações resumidas do holerite
type PayslipInfo struct {
	Month      int       `json:"month"`
	Year       int       `json:"year"`
	Type       string    `json:"type"`
	GrossTotal float64   `json:"gross_total"`
	NetTotal   float64   `json:"net_total"`
	PaymentDate *time.Time `json:"payment_date"`
}

// PDIContext dados de PDI do usuário
type PDIContext struct {
	HasActivePDI    bool       `json:"has_active_pdi"`
	TotalGoals      int        `json:"total_goals"`
	CompletedGoals  int        `json:"completed_goals"`
	InProgressGoals int        `json:"in_progress_goals"`
	OverdueGoals    int        `json:"overdue_goals"`
	NextDeadline    *time.Time `json:"next_deadline"`
}

// BadgesContext dados de badges do usuário
type BadgesContext struct {
	TotalBadges  int `json:"total_badges"`
	EarnedBadges int `json:"earned_badges"`
	TotalPoints  int `json:"total_points"`
}

// TimeInfoContext informações de tempo na empresa
type TimeInfoContext struct {
	HireDate        *time.Time `json:"hire_date"`
	YearsInCompany  int        `json:"years_in_company"`
	MonthsInCompany int        `json:"months_in_company"`
	DaysInCompany   int        `json:"days_in_company"`
}

// ==================== Context Builder ====================

// GetUserContext busca todo o contexto do usuário
func GetUserContext(userID string) (*UserContext, error) {
	ctx := &UserContext{}

	// 1. Dados básicos do usuário
	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("usuário não encontrado: %w", err)
	}
	ctx.User = &user

	// 2. Dados de tempo na empresa
	ctx.TimeInfo = getTimeInfo(&user)

	// 3. Dados de férias
	ctx.Vacation = getVacationContext(userID)

	// 4. Dados de aprendizado
	ctx.Learning = getLearningContext(userID)

	// 5. Dados de holerite
	ctx.Payslip = getPayslipContext(userID)

	// 6. Dados de PDI
	ctx.PDI = getPDIContext(userID)

	// 7. Dados de badges
	ctx.Badges = getBadgesContext(userID)

	return ctx, nil
}

// getTimeInfo calcula informações de tempo na empresa
func getTimeInfo(user *models.User) *TimeInfoContext {
	info := &TimeInfoContext{
		HireDate: user.HireDate,
	}

	if user.HireDate != nil {
		duration := time.Since(*user.HireDate)
		totalDays := int(duration.Hours() / 24)

		info.DaysInCompany = totalDays
		info.YearsInCompany = totalDays / 365
		info.MonthsInCompany = (totalDays % 365) / 30
	}

	return info
}

// getVacationContext busca dados de férias
func getVacationContext(userID string) *VacationContext {
	ctx := &VacationContext{}

	// Busca saldo de férias
	var balance models.VacationBalance
	if err := config.DB.Where("user_id = ?", userID).First(&balance).Error; err == nil {
		ctx.Balance = balance.AvailableDays
		ctx.UsedDays = balance.UsedDays
		ctx.PendingDays = balance.PendingDays
		ctx.PeriodStart = balance.PeriodStart
		ctx.PeriodEnd = balance.PeriodEnd
		// Deadline é 12 meses após o fim do período aquisitivo (período concessivo)
		ctx.DeadlineToUse = balance.PeriodEnd.AddDate(1, 0, 0)
	}

	// Busca próximas férias aprovadas
	var nextVacation models.Vacation
	if err := config.DB.Where("user_id = ? AND status = 'approved' AND start_date > ?",
		userID, time.Now()).
		Order("start_date ASC").
		First(&nextVacation).Error; err == nil {
		ctx.NextVacation = &VacationInfo{
			StartDate: nextVacation.StartDate,
			EndDate:   nextVacation.EndDate,
			Days:      nextVacation.TotalDays,
			Type:      string(nextVacation.Type),
			Status:    string(nextVacation.Status),
		}
	}

	// Verifica se tem solicitação pendente
	var pendingCount int64
	config.DB.Model(&models.Vacation{}).
		Where("user_id = ? AND status = 'pending'", userID).
		Count(&pendingCount)
	ctx.PendingRequest = pendingCount > 0

	// Busca vendas de férias aprovadas
	var soldDays int
	config.DB.Model(&models.VacationSellRequest{}).
		Where("user_id = ? AND status = 'approved'", userID).
		Select("COALESCE(SUM(days_to_sell), 0)").
		Scan(&soldDays)
	ctx.SoldDays = soldDays

	return ctx
}

// getLearningContext busca dados de aprendizado
func getLearningContext(userID string) *LearningContext {
	ctx := &LearningContext{}

	// Busca matrículas do usuário
	var enrollments []models.Enrollment
	config.DB.Preload("Course").Where("user_id = ?", userID).Find(&enrollments)

	for _, e := range enrollments {
		courseInfo := CourseInfo{
			ID:       e.CourseID,
			Title:    e.Course.Title,
			Category: e.Course.Category,
			Progress: e.Progress,
			Duration: e.Course.Duration,
		}
		ctx.EnrolledCourses = append(ctx.EnrolledCourses, courseInfo)
		ctx.TotalHoursLearning += e.Course.Duration

		if e.Progress >= 100 {
			ctx.CompletedCount++
		} else {
			ctx.InProgressCount++
		}
	}

	// Conta certificados
	var certCount int64
	config.DB.Model(&models.Certificate{}).Where("user_id = ?", userID).Count(&certCount)
	ctx.TotalCertificates = int(certCount)

	// Conta cursos disponíveis
	var courseCount int64
	config.DB.Model(&models.Course{}).Where("published = ?", true).Count(&courseCount)
	ctx.AvailableCourses = int(courseCount)

	return ctx
}

// getPayslipContext busca dados de holerite
func getPayslipContext(userID string) *PayslipContext {
	ctx := &PayslipContext{}

	// Busca último holerite
	var lastPayslip models.Payslip
	if err := config.DB.Where("user_id = ?", userID).
		Order("reference_year DESC, reference_month DESC").
		First(&lastPayslip).Error; err == nil {
		ctx.LastPayslip = &PayslipInfo{
			Month:       lastPayslip.ReferenceMonth,
			Year:        lastPayslip.ReferenceYear,
			Type:        lastPayslip.PayslipType,
			GrossTotal:  lastPayslip.GrossTotal,
			NetTotal:    lastPayslip.NetTotal,
			PaymentDate: lastPayslip.PaymentDate,
		}
	}

	// Calcula YTD (Year to Date)
	currentYear := time.Now().Year()
	var ytdGross, ytdNet float64
	config.DB.Model(&models.Payslip{}).
		Where("user_id = ? AND reference_year = ?", userID, currentYear).
		Select("COALESCE(SUM(gross_total), 0), COALESCE(SUM(net_total), 0)").
		Row().Scan(&ytdGross, &ytdNet)
	ctx.YTDGross = ytdGross
	ctx.YTDNet = ytdNet

	// Conta holerites disponíveis
	var count int64
	config.DB.Model(&models.Payslip{}).Where("user_id = ?", userID).Count(&count)
	ctx.AvailableCount = int(count)

	return ctx
}

// getPDIContext busca dados de PDI
func getPDIContext(userID string) *PDIContext {
	ctx := &PDIContext{}

	// Busca PDI ativo do usuário (status in_progress ou approved)
	var pdi models.PDI
	if err := config.DB.Where("user_id = ? AND (status = 'in_progress' OR status = 'approved')", userID).First(&pdi).Error; err == nil {
		ctx.HasActivePDI = true

		// Busca metas do PDI
		var goals []models.PDIGoal
		config.DB.Where("pdi_id = ?", pdi.ID).Find(&goals)

		ctx.TotalGoals = len(goals)
		for _, goal := range goals {
			switch goal.Status {
			case models.GoalStatusCompleted:
				ctx.CompletedGoals++
			case models.GoalStatusInProgress:
				ctx.InProgressGoals++
			}

			// Verifica se está atrasada
			if goal.DueDate != nil && goal.DueDate.Before(time.Now()) && goal.Status != models.GoalStatusCompleted {
				ctx.OverdueGoals++
			}

			// Próximo deadline
			if goal.DueDate != nil && goal.Status != models.GoalStatusCompleted {
				if ctx.NextDeadline == nil || goal.DueDate.Before(*ctx.NextDeadline) {
					ctx.NextDeadline = goal.DueDate
				}
			}
		}
	}

	return ctx
}

// getBadgesContext busca dados de badges
func getBadgesContext(userID string) *BadgesContext {
	ctx := &BadgesContext{}

	// Total de badges disponíveis
	var totalBadges int64
	config.DB.Model(&models.Badge{}).Count(&totalBadges)
	ctx.TotalBadges = int(totalBadges)

	// Badges conquistados pelo usuário
	var userBadges []models.UserBadge
	config.DB.Preload("Badge").Where("user_id = ?", userID).Find(&userBadges)
	ctx.EarnedBadges = len(userBadges)

	// Soma pontos
	for _, ub := range userBadges {
		ctx.TotalPoints += ub.Badge.Points
	}

	return ctx
}

// ==================== System Prompt Builder ====================

// BuildEnhancedSystemPrompt constrói um system prompt rico com contexto do usuário
func BuildEnhancedSystemPrompt(userCtx *UserContext, chatContext string) string {
	return BuildEnhancedSystemPromptWithRAG(userCtx, chatContext, "")
}

// BuildEnhancedSystemPromptWithRAG constrói prompt com contexto do usuário e RAG
func BuildEnhancedSystemPromptWithRAG(userCtx *UserContext, chatContext string, userQuery string) string {
	basePrompt := `Você é a **Frappy**, assistente virtual inteligente do **FrappYOU** - sistema de gestão de RH da Frapp.

## 🎯 SUA MISSÃO
Ajudar colaboradores com dúvidas sobre RH, benefícios, políticas da empresa e carreira, usando os dados reais do sistema.

## 📋 DIRETRIZES
- Seja cordial, profissional e empática
- Responda SEMPRE em português brasileiro
- Use linguagem clara e acessível
- Use os DADOS REAIS do colaborador fornecidos abaixo
- Use emojis moderadamente para tornar a conversa amigável
- Formate datas no padrão brasileiro (DD/MM/YYYY)
- Formate valores monetários com R$ e 2 casas decimais
- Se não tiver uma informação específica, seja honesta e sugira contato com RH

## 🔒 SEGURANÇA
- Nunca revele informações de outros colaboradores
- Para assuntos críticos (demissão, assédio, etc), direcione ao RH humano
- Proteja dados sensíveis

`

	// Adiciona dados do colaborador
	if userCtx.User != nil {
		basePrompt += fmt.Sprintf(`
## 👤 DADOS DO COLABORADOR

### Informações Pessoais
- **Nome:** %s
- **E-mail:** %s
- **Cargo:** %s
- **Departamento:** %s
`,
			userCtx.User.Name,
			userCtx.User.Email,
			getOrDefault(userCtx.User.Position, "Não informado"),
			getOrDefault(userCtx.User.Department, "Não informado"),
		)

		// Tempo de casa
		if userCtx.TimeInfo != nil && userCtx.TimeInfo.HireDate != nil {
			basePrompt += fmt.Sprintf(`- **Data de Admissão:** %s
- **Tempo de Casa:** %s

`,
				userCtx.TimeInfo.HireDate.Format("02/01/2006"),
				formatTimeInCompany(userCtx.TimeInfo),
			)
		}
	}

	// Adiciona dados de férias
	if userCtx.Vacation != nil {
		basePrompt += fmt.Sprintf(`### 🏖️ Férias
- **Saldo Disponível:** %d dias
- **Dias Usados:** %d dias
- **Período Aquisitivo:** %s a %s
- **Prazo para Usar:** %s
- **Próximas Férias Agendadas:** %s
- **Solicitação Pendente:** %s
- **Dias Vendidos (Abono):** %d dias

`,
			userCtx.Vacation.Balance,
			userCtx.Vacation.UsedDays,
			userCtx.Vacation.PeriodStart.Format("02/01/2006"),
			userCtx.Vacation.PeriodEnd.Format("02/01/2006"),
			userCtx.Vacation.DeadlineToUse.Format("02/01/2006"),
			formatNextVacation(userCtx.Vacation.NextVacation),
			boolToSimNao(userCtx.Vacation.PendingRequest),
			userCtx.Vacation.SoldDays,
		)
	}

	// Adiciona dados de aprendizado
	if userCtx.Learning != nil {
		basePrompt += fmt.Sprintf(`### 📚 Cursos e Desenvolvimento
- **Cursos em Andamento:** %d
- **Cursos Concluídos:** %d
- **Certificados Obtidos:** %d
- **Cursos Disponíveis na Plataforma:** %d
- **Horas de Aprendizado:** %d minutos

`,
			userCtx.Learning.InProgressCount,
			userCtx.Learning.CompletedCount,
			userCtx.Learning.TotalCertificates,
			userCtx.Learning.AvailableCourses,
			userCtx.Learning.TotalHoursLearning,
		)

		if len(userCtx.Learning.EnrolledCourses) > 0 {
			basePrompt += "**Cursos Matriculados:**\n"
			for i, course := range userCtx.Learning.EnrolledCourses {
				if i >= 5 { // Limita a 5 cursos
					break
				}
				basePrompt += fmt.Sprintf("  - %s (%.0f%% concluído)\n", course.Title, course.Progress)
			}
			basePrompt += "\n"
		}
	}

	// Adiciona dados de holerite
	if userCtx.Payslip != nil && userCtx.Payslip.LastPayslip != nil {
		basePrompt += fmt.Sprintf(`### 💰 Holerite
- **Último Holerite:** %s/%d (%s)
- **Salário Bruto:** R$ %.2f
- **Salário Líquido:** R$ %.2f
- **Total Recebido no Ano:** R$ %.2f (bruto) / R$ %.2f (líquido)
- **Holerites Disponíveis:** %d

`,
			getMonthName(userCtx.Payslip.LastPayslip.Month),
			userCtx.Payslip.LastPayslip.Year,
			userCtx.Payslip.LastPayslip.Type,
			userCtx.Payslip.LastPayslip.GrossTotal,
			userCtx.Payslip.LastPayslip.NetTotal,
			userCtx.Payslip.YTDGross,
			userCtx.Payslip.YTDNet,
			userCtx.Payslip.AvailableCount,
		)
	}

	// Adiciona dados de PDI
	if userCtx.PDI != nil {
		pdiStatus := "Não possui PDI ativo"
		if userCtx.PDI.HasActivePDI {
			pdiStatus = "PDI ativo"
		}
		basePrompt += fmt.Sprintf(`### 🎯 PDI (Plano de Desenvolvimento Individual)
- **Status:** %s
- **Total de Metas:** %d
- **Metas Concluídas:** %d
- **Metas em Andamento:** %d
- **Metas Atrasadas:** %d
- **Próximo Deadline:** %s

`,
			pdiStatus,
			userCtx.PDI.TotalGoals,
			userCtx.PDI.CompletedGoals,
			userCtx.PDI.InProgressGoals,
			userCtx.PDI.OverdueGoals,
			formatDeadline(userCtx.PDI.NextDeadline),
		)
	}

	// Adiciona dados de badges
	if userCtx.Badges != nil {
		basePrompt += fmt.Sprintf(`### 🏆 Conquistas
- **Badges Conquistados:** %d de %d
- **Pontos Totais:** %d

`,
			userCtx.Badges.EarnedBadges,
			userCtx.Badges.TotalBadges,
			userCtx.Badges.TotalPoints,
		)
	}

	// Adiciona contexto específico baseado na área
	basePrompt += getContextSpecificInstructions(chatContext)

	// Adiciona contexto RAG se houver query do usuário
	if userQuery != "" {
		ragService := NewRAGService()
		ragContext := ragService.GetContextForQuery(userQuery)
		if ragContext != "" {
			basePrompt += ragContext
		}
	}

	return basePrompt
}

// ==================== Helper Functions ====================

func getOrDefault(value, defaultVal string) string {
	if value == "" {
		return defaultVal
	}
	return value
}

func formatTimeInCompany(info *TimeInfoContext) string {
	if info.YearsInCompany > 0 {
		if info.MonthsInCompany > 0 {
			return fmt.Sprintf("%d anos e %d meses", info.YearsInCompany, info.MonthsInCompany)
		}
		return fmt.Sprintf("%d anos", info.YearsInCompany)
	}
	if info.MonthsInCompany > 0 {
		return fmt.Sprintf("%d meses", info.MonthsInCompany)
	}
	return fmt.Sprintf("%d dias", info.DaysInCompany)
}

func formatNextVacation(v *VacationInfo) string {
	if v == nil {
		return "Nenhuma férias agendada"
	}
	return fmt.Sprintf("%s a %s (%d dias)",
		v.StartDate.Format("02/01/2006"),
		v.EndDate.Format("02/01/2006"),
		v.Days,
	)
}

func boolToSimNao(b bool) string {
	if b {
		return "Sim"
	}
	return "Não"
}

func formatDeadline(t *time.Time) string {
	if t == nil {
		return "Sem prazo definido"
	}
	return t.Format("02/01/2006")
}

func getMonthName(month int) string {
	months := []string{
		"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
		"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
	}
	if month >= 1 && month <= 12 {
		return months[month-1]
	}
	return "Mês"
}

func getContextSpecificInstructions(context string) string {
	switch context {
	case "vacation":
		return `
## 📌 CONTEXTO ESPECIALIZADO: FÉRIAS

Você está focada em ajudar com:
- Consultas de saldo de férias
- Solicitação de férias
- Venda de férias (abono pecuniário - até 1/3 ou 10 dias)
- Políticas de férias da empresa
- Período aquisitivo e concessivo
- Interrupção de férias
- Atestados e ausências

### Regras importantes:
- O colaborador pode vender até 10 dias (1/3) das férias
- O período concessivo é de 12 meses após o período aquisitivo
- Férias não tiradas no prazo podem causar multa à empresa
`

	case "learning":
		return `
## 📌 CONTEXTO ESPECIALIZADO: CURSOS E DESENVOLVIMENTO

Você está focada em ajudar com:
- Cursos disponíveis na plataforma
- Como se inscrever em cursos
- Acompanhamento de progresso
- Certificados e conquistas
- Trilhas de aprendizado recomendadas
- Dúvidas sobre conteúdo dos cursos
`

	case "pdi":
		return `
## 📌 CONTEXTO ESPECIALIZADO: PDI

Você está focada em ajudar com:
- Como criar um PDI eficaz
- Definição de metas SMART (Específicas, Mensuráveis, Atingíveis, Relevantes, Temporais)
- Acompanhamento de progresso
- Feedback e check-ins
- Desenvolvimento de carreira
- Competências a desenvolver
`

	case "payslip":
		return `
## 📌 CONTEXTO ESPECIALIZADO: HOLERITE E REMUNERAÇÃO

Você está focada em ajudar com:
- Explicar itens do holerite
- Descontos obrigatórios (INSS, IRRF)
- Benefícios e adicionais
- 13º salário
- Férias (adicional de 1/3)
- FGTS

### ⚠️ ATENÇÃO:
- Você pode explicar CONCEITOS de folha de pagamento
- Use os dados fornecidos para responder sobre o holerite do colaborador
- Para detalhamentos específicos, oriente procurar o RH
`

	default:
		return `
## 📌 CONTEXTO GERAL

Você pode ajudar com diversos assuntos de RH:
- Férias e ausências
- Holerite e benefícios
- Cursos e desenvolvimento
- PDI e carreira
- Políticas da empresa
- Dúvidas gerais sobre o sistema FrappYOU
`
	}
}

