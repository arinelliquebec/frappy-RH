package handlers

import (
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// ===============================
// PEOPLE ANALYTICS
// ===============================

// GetPeopleAnalytics retorna métricas de People Analytics
func GetPeopleAnalytics(c *fiber.Ctx) error {
	now := time.Now()

	// Total de colaboradores ativos
	var totalColaboradores int64
	config.DB.Raw(`SELECT COUNT(*) FROM dbo.ColaboradoresFradema WHERE Ativo = 1`).Scan(&totalColaboradores)

	// Total de usuários no sistema
	var totalUsers int64
	config.DB.Model(&models.User{}).Count(&totalUsers)

	// Admins
	var totalAdmins int64
	config.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&totalAdmins)

	// ====== TURNOVER ANALYSIS ======
	// Colaboradores que saíram nos últimos 12 meses
	oneYearAgo := now.AddDate(-1, 0, 0)
	var turnoverCount int64
	config.DB.Raw(`
		SELECT COUNT(*)
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 0 AND DataDesligamento >= ?
	`, oneYearAgo).Scan(&turnoverCount)

	// Taxa de turnover (saídas / média de colaboradores * 100)
	var avgColaboradores float64
	if totalColaboradores > 0 {
		avgColaboradores = float64(totalColaboradores+turnoverCount) / 2
	}
	turnoverRate := 0.0
	if avgColaboradores > 0 {
		turnoverRate = (float64(turnoverCount) / avgColaboradores) * 100
	}

	// Turnover por mês (últimos 12 meses)
	type MonthTurnover struct {
		Month string  `json:"month"`
		Count int64   `json:"count"`
		Rate  float64 `json:"rate"`
	}
	var turnoverByMonth []MonthTurnover
	config.DB.Raw(`
		SELECT
			FORMAT(DataDesligamento, 'MMM/yy') as month,
			COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 0 AND DataDesligamento >= DATEADD(MONTH, -12, GETDATE())
		GROUP BY FORMAT(DataDesligamento, 'MMM/yy'), YEAR(DataDesligamento), MONTH(DataDesligamento)
		ORDER BY YEAR(DataDesligamento), MONTH(DataDesligamento)
	`).Scan(&turnoverByMonth)

	// ====== TEMPO DE CASA ======
	type TenureGroup struct {
		Range string `json:"range"`
		Count int64  `json:"count"`
	}
	var tenureDistribution []TenureGroup
	config.DB.Raw(`
		SELECT
			CASE
				WHEN DATEDIFF(MONTH, DataAdmissao, GETDATE()) < 6 THEN '0-6 meses'
				WHEN DATEDIFF(MONTH, DataAdmissao, GETDATE()) < 12 THEN '6-12 meses'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 2 THEN '1-2 anos'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 5 THEN '2-5 anos'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 10 THEN '5-10 anos'
				ELSE '10+ anos'
			END as range,
			COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 1 AND DataAdmissao IS NOT NULL
		GROUP BY
			CASE
				WHEN DATEDIFF(MONTH, DataAdmissao, GETDATE()) < 6 THEN '0-6 meses'
				WHEN DATEDIFF(MONTH, DataAdmissao, GETDATE()) < 12 THEN '6-12 meses'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 2 THEN '1-2 anos'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 5 THEN '2-5 anos'
				WHEN DATEDIFF(YEAR, DataAdmissao, GETDATE()) < 10 THEN '5-10 anos'
				ELSE '10+ anos'
			END
		ORDER BY
			CASE range
				WHEN '0-6 meses' THEN 1
				WHEN '6-12 meses' THEN 2
				WHEN '1-2 anos' THEN 3
				WHEN '2-5 anos' THEN 4
				WHEN '5-10 anos' THEN 5
				ELSE 6
			END
	`).Scan(&tenureDistribution)

	// Média de tempo de casa (em meses)
	var avgTenureMonths float64
	config.DB.Raw(`
		SELECT AVG(CAST(DATEDIFF(MONTH, DataAdmissao, GETDATE()) AS FLOAT))
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 1 AND DataAdmissao IS NOT NULL
	`).Scan(&avgTenureMonths)

	// ====== NOVAS CONTRATAÇÕES ======
	// Contratações por mês (últimos 12 meses)
	type HiringData struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var hiringByMonth []HiringData
	config.DB.Raw(`
		SELECT
			FORMAT(DataAdmissao, 'MMM/yy') as month,
			COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE DataAdmissao >= DATEADD(MONTH, -12, GETDATE())
		GROUP BY FORMAT(DataAdmissao, 'MMM/yy'), YEAR(DataAdmissao), MONTH(DataAdmissao)
		ORDER BY YEAR(DataAdmissao), MONTH(DataAdmissao)
	`).Scan(&hiringByMonth)

	// Total de novas contratações no ano
	var newHiresYear int64
	config.DB.Raw(`
		SELECT COUNT(*) FROM dbo.ColaboradoresFradema
		WHERE YEAR(DataAdmissao) = YEAR(GETDATE())
	`).Scan(&newHiresYear)

	// ====== RETENÇÃO ======
	// Taxa de retenção (100 - turnover)
	retentionRate := 100.0 - turnoverRate
	if retentionRate < 0 {
		retentionRate = 0
	}

	// Colaboradores por filial
	type FilialCount struct {
		Filial string `json:"filial"`
		Count  int64  `json:"count"`
	}
	var colaboradoresPorFilial []FilialCount
	config.DB.Raw(`
		SELECT TOP 10 ISNULL(Filial, 'Não informado') as filial, COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 1
		GROUP BY Filial
		ORDER BY count DESC
	`).Scan(&colaboradoresPorFilial)

	// Colaboradores por cargo
	type CargoCount struct {
		Cargo string `json:"cargo"`
		Count int64  `json:"count"`
	}
	var colaboradoresPorCargo []CargoCount
	config.DB.Raw(`
		SELECT TOP 10 ISNULL(Cargo, 'Não informado') as cargo, COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 1
		GROUP BY Cargo
		ORDER BY count DESC
	`).Scan(&colaboradoresPorCargo)

	// Distribuição por gênero
	var masculino, feminino, naoIdentificado int64
	config.DB.Raw(`
		SELECT COUNT(*)
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE c.Ativo = 1 AND p.Sexo = 'M'
	`).Scan(&masculino)
	config.DB.Raw(`
		SELECT COUNT(*)
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE c.Ativo = 1 AND p.Sexo = 'F'
	`).Scan(&feminino)
	naoIdentificado = totalColaboradores - masculino - feminino
	if naoIdentificado < 0 {
		naoIdentificado = 0
	}

	// Distribuição por faixa etária
	type FaixaEtaria struct {
		Faixa string `json:"faixa"`
		Count int64  `json:"count"`
	}
	var distribuicaoIdade []FaixaEtaria
	config.DB.Raw(`
		SELECT
			CASE
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 25 THEN '18-24'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 35 THEN '25-34'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 45 THEN '35-44'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 55 THEN '45-54'
				ELSE '55+'
			END as faixa,
			COUNT(*) as count
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE c.Ativo = 1 AND p.DataNascimento IS NOT NULL
		GROUP BY
			CASE
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 25 THEN '18-24'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 35 THEN '25-34'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 45 THEN '35-44'
				WHEN DATEDIFF(YEAR, p.DataNascimento, GETDATE()) < 55 THEN '45-54'
				ELSE '55+'
			END
		ORDER BY faixa
	`).Scan(&distribuicaoIdade)

	return c.JSON(fiber.Map{
		"success": true,
		"metrics": fiber.Map{
			"headcount": fiber.Map{
				"total":      totalColaboradores,
				"users":      totalUsers,
				"admins":     totalAdmins,
				"por_filial": colaboradoresPorFilial,
				"por_cargo":  colaboradoresPorCargo,
			},
			"turnover": fiber.Map{
				"count":    turnoverCount,
				"rate":     turnoverRate,
				"by_month": turnoverByMonth,
			},
			"retention": fiber.Map{
				"rate": retentionRate,
			},
			"tenure": fiber.Map{
				"average_months": avgTenureMonths,
				"distribution":   tenureDistribution,
			},
			"hiring": fiber.Map{
				"new_hires_year": newHiresYear,
				"by_month":       hiringByMonth,
			},
			"demographics": fiber.Map{
				"genero": fiber.Map{
					"masculino":        masculino,
					"feminino":         feminino,
					"nao_identificado": naoIdentificado,
				},
				"faixa_etaria": distribuicaoIdade,
			},
		},
	})
}

// ===============================
// ENGAGEMENT ANALYTICS
// ===============================

// GetEngagementAnalytics retorna métricas de engajamento
func GetEngagementAnalytics(c *fiber.Ctx) error {
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	sevenDaysAgo := now.AddDate(0, 0, -7)

	// ====== USUÁRIOS ATIVOS ======
	var activeUsers7d int64
	config.DB.Model(&models.User{}).Where("last_login >= ?", sevenDaysAgo).Count(&activeUsers7d)

	var activeUsers30d int64
	config.DB.Model(&models.User{}).Where("last_login >= ?", thirtyDaysAgo).Count(&activeUsers30d)

	var totalUsers int64
	config.DB.Model(&models.User{}).Count(&totalUsers)

	// Taxa de engajamento (usuários ativos / total)
	engagementRate7d := 0.0
	engagementRate30d := 0.0
	if totalUsers > 0 {
		engagementRate7d = (float64(activeUsers7d) / float64(totalUsers)) * 100
		engagementRate30d = (float64(activeUsers30d) / float64(totalUsers)) * 100
	}

	// ====== COMUNICADOS ======
	// Total de views em comunicados
	var totalNewsViews int64
	config.DB.Model(&models.News{}).Select("COALESCE(SUM(view_count), 0)").Scan(&totalNewsViews)

	// Total de reações
	var totalReactions int64
	config.DB.Model(&models.NewsReaction{}).Count(&totalReactions)

	// Views nos últimos 7 dias
	var recentViews int64
	config.DB.Model(&models.NewsView{}).Where("viewed_at >= ?", sevenDaysAgo).Count(&recentViews)

	// Reações nos últimos 7 dias
	var recentReactions int64
	config.DB.Model(&models.NewsReaction{}).Where("created_at >= ?", sevenDaysAgo).Count(&recentReactions)

	// Top comunicados por engajamento
	type TopNews struct {
		ID         string  `json:"id"`
		Title      string  `json:"title"`
		ViewCount  int64   `json:"view_count"`
		Reactions  int64   `json:"reactions"`
		Engagement float64 `json:"engagement"`
	}
	var topNews []TopNews
	config.DB.Raw(`
		SELECT TOP 5
			n.id,
			n.title,
			n.view_count,
			COALESCE((SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id), 0) as reactions,
			(n.view_count + COALESCE((SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id), 0) * 3) as engagement
		FROM news n
		WHERE n.published = 1
		ORDER BY engagement DESC
	`).Scan(&topNews)

	// Engajamento por categoria
	type CategoryEngagement struct {
		Category  string  `json:"category"`
		Views     int64   `json:"views"`
		Reactions int64   `json:"reactions"`
		Score     float64 `json:"score"`
	}
	var engagementByCategory []CategoryEngagement
	config.DB.Raw(`
		SELECT
			n.category,
			SUM(n.view_count) as views,
			COALESCE(SUM((SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id)), 0) as reactions,
			SUM(n.view_count) + COALESCE(SUM((SELECT COUNT(*) FROM news_reactions WHERE news_id = n.id)), 0) * 3 as score
		FROM news n
		WHERE n.published = 1
		GROUP BY n.category
		ORDER BY score DESC
	`).Scan(&engagementByCategory)

	// ====== FÉRIAS/AUSÊNCIAS ======
	var vacationRequests30d int64
	config.DB.Model(&models.Vacation{}).Where("created_at >= ?", thirtyDaysAgo).Count(&vacationRequests30d)

	// ====== DOCUMENTOS ======
	var documentsUploaded30d int64
	config.DB.Model(&models.Document{}).Where("created_at >= ?", thirtyDaysAgo).Count(&documentsUploaded30d)

	// ====== NOTIFICAÇÕES ======
	var notificationsSent30d int64
	config.DB.Model(&models.Notification{}).Where("created_at >= ?", thirtyDaysAgo).Count(&notificationsSent30d)

	var notificationsRead30d int64
	config.DB.Model(&models.Notification{}).Where("created_at >= ? AND is_read = ?", thirtyDaysAgo, true).Count(&notificationsRead30d)

	readRate := 0.0
	if notificationsSent30d > 0 {
		readRate = (float64(notificationsRead30d) / float64(notificationsSent30d)) * 100
	}

	// ====== ATIVIDADE POR DIA DA SEMANA ======
	type DayActivity struct {
		Day   string `json:"day"`
		Count int64  `json:"count"`
	}
	var activityByDay []DayActivity
	config.DB.Raw(`
		SELECT
			DATENAME(WEEKDAY, last_login) as day,
			COUNT(*) as count
		FROM users
		WHERE last_login >= DATEADD(DAY, -30, GETDATE())
		GROUP BY DATENAME(WEEKDAY, last_login), DATEPART(WEEKDAY, last_login)
		ORDER BY DATEPART(WEEKDAY, last_login)
	`).Scan(&activityByDay)

	// ====== LOGINS POR HORA ======
	type HourActivity struct {
		Hour  int   `json:"hour"`
		Count int64 `json:"count"`
	}
	var activityByHour []HourActivity
	config.DB.Raw(`
		SELECT
			DATEPART(HOUR, last_login) as hour,
			COUNT(*) as count
		FROM users
		WHERE last_login >= DATEADD(DAY, -7, GETDATE())
		GROUP BY DATEPART(HOUR, last_login)
		ORDER BY hour
	`).Scan(&activityByHour)

	return c.JSON(fiber.Map{
		"success": true,
		"metrics": fiber.Map{
			"users": fiber.Map{
				"total":               totalUsers,
				"active_7d":           activeUsers7d,
				"active_30d":          activeUsers30d,
				"engagement_rate_7d":  engagementRate7d,
				"engagement_rate_30d": engagementRate30d,
			},
			"news": fiber.Map{
				"total_views":      totalNewsViews,
				"total_reactions":  totalReactions,
				"recent_views":     recentViews,
				"recent_reactions": recentReactions,
				"top_news":         topNews,
				"by_category":      engagementByCategory,
			},
			"activity": fiber.Map{
				"vacation_requests_30d":   vacationRequests30d,
				"documents_uploaded_30d":  documentsUploaded30d,
				"notifications_sent_30d":  notificationsSent30d,
				"notifications_read_rate": readRate,
				"by_day_of_week":          activityByDay,
				"by_hour":                 activityByHour,
			},
		},
	})
}

// ===============================
// OVERVIEW (mantido para compatibilidade)
// ===============================

// GetOverviewAnalytics retorna visão geral do dashboard
func GetOverviewAnalytics(c *fiber.Ctx) error {
	// Headcount
	var totalColaboradores int64
	config.DB.Raw(`SELECT COUNT(*) FROM dbo.ColaboradoresFradema WHERE Ativo = 1`).Scan(&totalColaboradores)

	var totalUsers int64
	config.DB.Model(&models.User{}).Count(&totalUsers)

	// Férias pendentes
	var feriasPendentes int64
	config.DB.Model(&models.Vacation{}).Where("status = ?", "pending").Count(&feriasPendentes)

	// Documentos pendentes
	var docsPendentes int64
	config.DB.Model(&models.Document{}).Where("status = ?", "pending").Count(&docsPendentes)

	// Comunicados ativos
	var newsAtivos int64
	config.DB.Model(&models.News{}).
		Where("published = ?", true).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now()).
		Count(&newsAtivos)

	// Notificações não lidas (total)
	var notificacoesNaoLidas int64
	config.DB.Model(&models.Notification{}).Where("is_read = ?", false).Count(&notificacoesNaoLidas)

	// Atividade recente (últimos 7 dias)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)

	var novosUsuarios int64
	config.DB.Model(&models.User{}).Where("created_at >= ?", sevenDaysAgo).Count(&novosUsuarios)

	var novasFerias int64
	config.DB.Model(&models.Vacation{}).Where("created_at >= ?", sevenDaysAgo).Count(&novasFerias)

	var novosDocumentos int64
	config.DB.Model(&models.Document{}).Where("created_at >= ?", sevenDaysAgo).Count(&novosDocumentos)

	// Colaboradores por filial (top 5)
	type FilialCount struct {
		Filial string `json:"filial"`
		Count  int64  `json:"count"`
	}
	var topFiliais []FilialCount
	config.DB.Raw(`
		SELECT TOP 5 ISNULL(Filial, 'Não informado') as filial, COUNT(*) as count
		FROM dbo.ColaboradoresFradema
		WHERE Ativo = 1
		GROUP BY Filial
		ORDER BY count DESC
	`).Scan(&topFiliais)

	return c.JSON(fiber.Map{
		"success": true,
		"overview": fiber.Map{
			"headcount": fiber.Map{
				"colaboradores": totalColaboradores,
				"usuarios":      totalUsers,
			},
			"pendencias": fiber.Map{
				"ferias":     feriasPendentes,
				"documentos": docsPendentes,
			},
			"comunicados": fiber.Map{
				"ativos": newsAtivos,
			},
			"notificacoes": fiber.Map{
				"nao_lidas": notificacoesNaoLidas,
			},
			"atividade_recente": fiber.Map{
				"novos_usuarios":   novosUsuarios,
				"novas_ferias":     novasFerias,
				"novos_documentos": novosDocumentos,
			},
			"top_filiais": topFiliais,
		},
	})
}

// ===============================
// OUTRAS MÉTRICAS (mantidas)
// ===============================

// GetHRAnalytics - Redireciona para PeopleAnalytics
func GetHRAnalytics(c *fiber.Ctx) error {
	return GetPeopleAnalytics(c)
}

// GetVacationAnalytics retorna métricas de férias
func GetVacationAnalytics(c *fiber.Ctx) error {
	now := time.Now()
	currentYear := now.Year()

	var totalFerias int64
	config.DB.Model(&models.Vacation{}).
		Where("YEAR(start_date) = ? OR YEAR(end_date) = ?", currentYear, currentYear).
		Count(&totalFerias)

	var feriasAprovadas int64
	config.DB.Model(&models.Vacation{}).
		Where("status = ?", "approved").
		Where("YEAR(start_date) = ? OR YEAR(end_date) = ?", currentYear, currentYear).
		Count(&feriasAprovadas)

	var feriasPendentes int64
	config.DB.Model(&models.Vacation{}).
		Where("status = ?", "pending").
		Count(&feriasPendentes)

	type MonthCount struct {
		Month int   `json:"month"`
		Count int64 `json:"count"`
	}
	var feriasPorMes []MonthCount
	config.DB.Model(&models.Vacation{}).
		Select("MONTH(start_date) as month, COUNT(*) as count").
		Where("status = ?", "approved").
		Where("YEAR(start_date) = ?", currentYear).
		Group("MONTH(start_date)").
		Order("month").
		Scan(&feriasPorMes)

	monthMap := make(map[int]int64)
	for _, m := range feriasPorMes {
		monthMap[m.Month] = m.Count
	}
	var feriasPorMesCompleto []fiber.Map
	meses := []string{"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"}
	for i := 1; i <= 12; i++ {
		feriasPorMesCompleto = append(feriasPorMesCompleto, fiber.Map{
			"mes":   meses[i-1],
			"count": monthMap[i],
		})
	}

	type TypeCount struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	var feriasPorTipo []TypeCount
	config.DB.Model(&models.Vacation{}).
		Select("type, COUNT(*) as count").
		Where("YEAR(start_date) = ? OR YEAR(end_date) = ?", currentYear, currentYear).
		Group("type").
		Scan(&feriasPorTipo)

	var mediaDias float64
	config.DB.Model(&models.Vacation{}).
		Select("AVG(total_days)").
		Where("status = ?", "approved").
		Scan(&mediaDias)

	return c.JSON(fiber.Map{
		"success": true,
		"metrics": fiber.Map{
			"total":      totalFerias,
			"aprovadas":  feriasAprovadas,
			"pendentes":  feriasPendentes,
			"media_dias": mediaDias,
			"por_mes":    feriasPorMesCompleto,
			"por_tipo":   feriasPorTipo,
		},
	})
}

// GetDocumentAnalytics retorna métricas de documentos
func GetDocumentAnalytics(c *fiber.Ctx) error {
	var totalDocumentos int64
	config.DB.Model(&models.Document{}).Count(&totalDocumentos)

	var aprovados, pendentes, rejeitados int64
	config.DB.Model(&models.Document{}).Where("status = ?", "approved").Count(&aprovados)
	config.DB.Model(&models.Document{}).Where("status = ?", "pending").Count(&pendentes)
	config.DB.Model(&models.Document{}).Where("status = ?", "rejected").Count(&rejeitados)

	type TypeCount struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	var documentosPorTipo []TypeCount
	config.DB.Model(&models.Document{}).
		Select("type, COUNT(*) as count").
		Group("type").
		Order("count DESC").
		Scan(&documentosPorTipo)

	type MonthCount struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var documentosPorMes []MonthCount
	config.DB.Raw(`
		SELECT FORMAT(created_at, 'MMM/yy') as month, COUNT(*) as count
		FROM documents
		WHERE created_at >= DATEADD(MONTH, -6, GETDATE())
		GROUP BY FORMAT(created_at, 'MMM/yy'), YEAR(created_at), MONTH(created_at)
		ORDER BY YEAR(created_at), MONTH(created_at)
	`).Scan(&documentosPorMes)

	return c.JSON(fiber.Map{
		"success": true,
		"metrics": fiber.Map{
			"total":      totalDocumentos,
			"aprovados":  aprovados,
			"pendentes":  pendentes,
			"rejeitados": rejeitados,
			"por_tipo":   documentosPorTipo,
			"por_mes":    documentosPorMes,
		},
	})
}

// GetNewsAnalytics retorna métricas de comunicados
func GetNewsAnalytics(c *fiber.Ctx) error {
	var totalNews int64
	config.DB.Model(&models.News{}).Count(&totalNews)

	var publicados int64
	config.DB.Model(&models.News{}).Where("published = ?", true).Count(&publicados)

	var totalViews int64
	config.DB.Model(&models.News{}).Select("COALESCE(SUM(view_count), 0)").Scan(&totalViews)

	var totalReactions int64
	config.DB.Model(&models.NewsReaction{}).Count(&totalReactions)

	type CategoryCount struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var newsPorCategoria []CategoryCount
	config.DB.Model(&models.News{}).
		Select("category, COUNT(*) as count").
		Where("published = ?", true).
		Group("category").
		Order("count DESC").
		Scan(&newsPorCategoria)

	var topNews []models.News
	config.DB.Model(&models.News{}).
		Where("published = ?", true).
		Order("view_count DESC").
		Limit(5).
		Find(&topNews)

	return c.JSON(fiber.Map{
		"success": true,
		"metrics": fiber.Map{
			"total":         totalNews,
			"publicados":    publicados,
			"total_views":   totalViews,
			"total_reacoes": totalReactions,
			"por_categoria": newsPorCategoria,
			"top_news":      topNews,
		},
	})
}
