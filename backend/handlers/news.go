package handlers

import (
	"strconv"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetNews retorna lista de notícias publicadas para o usuário
func GetNews(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	// Parâmetros de paginação e filtro
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	category := c.Query("category", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Buscar filial do usuário
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	// Query base: notícias publicadas, não expiradas
	query := config.DB.Model(&models.News{}).
		Where("published = ?", true).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now())

	// Filtrar por filial (vazio = todas as filiais)
	if user.Company != "" {
		query = query.Where("(filial = '' OR filial IS NULL OR filial = ?)", user.Company)
	}

	// Filtrar por categoria
	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Contar total
	var total int64
	query.Count(&total)

	// Buscar notícias ordenadas: pinned primeiro, depois por data
	var news []models.News
	err := query.Order("pinned DESC, published_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&news).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar notícias: " + err.Error(),
		})
	}

	// Preparar response com informações de visualização
	var newsResponse []fiber.Map
	for _, n := range news {
		// Verificar se usuário já viu
		var viewCount int64
		config.DB.Model(&models.NewsView{}).Where("news_id = ? AND user_id = ?", n.ID, userID).Count(&viewCount)

		// Contar reações
		var reactions []struct {
			Reaction string
			Count    int64
		}
		config.DB.Model(&models.NewsReaction{}).
			Select("reaction, count(*) as count").
			Where("news_id = ?", n.ID).
			Group("reaction").
			Scan(&reactions)

		reactionsMap := make(map[string]int64)
		for _, r := range reactions {
			reactionsMap[r.Reaction] = r.Count
		}

		// Verificar reação do usuário
		var userReaction models.NewsReaction
		hasReaction := config.DB.Where("news_id = ? AND user_id = ?", n.ID, userID).First(&userReaction).Error == nil

		newsResponse = append(newsResponse, fiber.Map{
			"id":            n.ID,
			"title":         n.Title,
			"summary":       n.Summary,
			"content":       n.Content,
			"category":      n.Category,
			"priority":      n.Priority,
			"image_url":     n.ImageURL,
			"author_name":   n.AuthorName,
			"filial":        n.Filial,
			"published_at":  n.PublishedAt,
			"pinned":        n.Pinned,
			"view_count":    n.ViewCount,
			"viewed":        viewCount > 0,
			"reactions":     reactionsMap,
			"user_reaction": func() string { if hasReaction { return userReaction.Reaction } else { return "" } }(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"news":    newsResponse,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetNewsById retorna uma notícia específica
func GetNewsById(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	newsID := c.Params("id")

	var news models.News
	if err := config.DB.First(&news, "id = ?", newsID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notícia não encontrada",
		})
	}

	// Registrar visualização
	var existingView models.NewsView
	if config.DB.Where("news_id = ? AND user_id = ?", newsID, userID).First(&existingView).Error != nil {
		// Não existe, criar
		view := models.NewsView{
			NewsID:   newsID,
			UserID:   userID,
			ViewedAt: time.Now(),
		}
		config.DB.Create(&view)

		// Incrementar contador
		config.DB.Model(&news).Update("view_count", news.ViewCount+1)
		news.ViewCount++
	}

	// Buscar reações
	var reactions []struct {
		Reaction string
		Count    int64
	}
	config.DB.Model(&models.NewsReaction{}).
		Select("reaction, count(*) as count").
		Where("news_id = ?", newsID).
		Group("reaction").
		Scan(&reactions)

	reactionsMap := make(map[string]int64)
	for _, r := range reactions {
		reactionsMap[r.Reaction] = r.Count
	}

	// Verificar reação do usuário
	var userReaction models.NewsReaction
	hasReaction := config.DB.Where("news_id = ? AND user_id = ?", newsID, userID).First(&userReaction).Error == nil

	return c.JSON(fiber.Map{
		"success": true,
		"news": fiber.Map{
			"id":            news.ID,
			"title":         news.Title,
			"summary":       news.Summary,
			"content":       news.Content,
			"category":      news.Category,
			"priority":      news.Priority,
			"image_url":     news.ImageURL,
			"author_name":   news.AuthorName,
			"filial":        news.Filial,
			"published_at":  news.PublishedAt,
			"pinned":        news.Pinned,
			"view_count":    news.ViewCount,
			"reactions":     reactionsMap,
			"user_reaction": func() string { if hasReaction { return userReaction.Reaction } else { return "" } }(),
		},
	})
}

// ReactToNews adiciona/remove reação de uma notícia
func ReactToNews(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	newsID := c.Params("id")

	var input struct {
		Reaction string `json:"reaction"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Verificar se notícia existe
	var news models.News
	if err := config.DB.First(&news, "id = ?", newsID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notícia não encontrada",
		})
	}

	// Verificar se já tem reação
	var existingReaction models.NewsReaction
	hasReaction := config.DB.Where("news_id = ? AND user_id = ?", newsID, userID).First(&existingReaction).Error == nil

	if input.Reaction == "" {
		// Remover reação
		if hasReaction {
			config.DB.Delete(&existingReaction)
		}
	} else if hasReaction {
		// Atualizar reação
		existingReaction.Reaction = input.Reaction
		config.DB.Save(&existingReaction)
	} else {
		// Criar nova reação
		reaction := models.NewsReaction{
			NewsID:   newsID,
			UserID:   userID,
			Reaction: input.Reaction,
		}
		config.DB.Create(&reaction)
	}

	// Buscar reações atualizadas
	var reactions []struct {
		Reaction string
		Count    int64
	}
	config.DB.Model(&models.NewsReaction{}).
		Select("reaction, count(*) as count").
		Where("news_id = ?", newsID).
		Group("reaction").
		Scan(&reactions)

	reactionsMap := make(map[string]int64)
	for _, r := range reactions {
		reactionsMap[r.Reaction] = r.Count
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"reactions":     reactionsMap,
		"user_reaction": input.Reaction,
	})
}

// ========== ADMIN HANDLERS ==========

// AdminGetAllNews retorna todas as notícias para admin
func AdminGetAllNews(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	status := c.Query("status", "") // published, draft, expired
	category := c.Query("category", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := config.DB.Model(&models.News{})

	// Filtrar por status
	switch status {
	case "published":
		query = query.Where("published = ?", true)
	case "draft":
		query = query.Where("published = ?", false)
	case "expired":
		query = query.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now())
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	var total int64
	query.Count(&total)

	var news []models.News
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&news).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar notícias: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"news":    news,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminCreateNews cria uma nova notícia
func AdminCreateNews(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	// Buscar nome do autor
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	var input struct {
		Title     string `json:"title"`
		Summary   string `json:"summary"`
		Content   string `json:"content"`
		Category  string `json:"category"`
		Priority  string `json:"priority"`
		ImageURL  string `json:"image_url"`
		Filial    string `json:"filial"`
		Published bool   `json:"published"`
		Pinned    bool   `json:"pinned"`
		ExpiresAt string `json:"expires_at"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	if input.Title == "" || input.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Título e conteúdo são obrigatórios",
		})
	}

	news := models.News{
		Title:      input.Title,
		Summary:    input.Summary,
		Content:    input.Content,
		Category:   models.NewsCategory(input.Category),
		Priority:   models.NewsPriority(input.Priority),
		ImageURL:   input.ImageURL,
		AuthorID:   userID,
		AuthorName: user.Name,
		Filial:     input.Filial,
		Published:  input.Published,
		Pinned:     input.Pinned,
	}

	if input.Published {
		now := time.Now()
		news.PublishedAt = &now
	}

	if input.ExpiresAt != "" {
		expiresAt, err := time.Parse("2006-01-02", input.ExpiresAt)
		if err == nil {
			news.ExpiresAt = &expiresAt
		}
	}

	if news.Category == "" {
		news.Category = models.NewsCategoryGeral
	}
	if news.Priority == "" {
		news.Priority = models.NewsPriorityNormal
	}

	if err := config.DB.Create(&news).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar notícia: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"news":    news,
	})
}

// AdminUpdateNews atualiza uma notícia
func AdminUpdateNews(c *fiber.Ctx) error {
	newsID := c.Params("id")

	var news models.News
	if err := config.DB.First(&news, "id = ?", newsID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notícia não encontrada",
		})
	}

	var input struct {
		Title     string `json:"title"`
		Summary   string `json:"summary"`
		Content   string `json:"content"`
		Category  string `json:"category"`
		Priority  string `json:"priority"`
		ImageURL  string `json:"image_url"`
		Filial    string `json:"filial"`
		Published bool   `json:"published"`
		Pinned    bool   `json:"pinned"`
		ExpiresAt string `json:"expires_at"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Atualizar campos
	if input.Title != "" {
		news.Title = input.Title
	}
	news.Summary = input.Summary
	if input.Content != "" {
		news.Content = input.Content
	}
	if input.Category != "" {
		news.Category = models.NewsCategory(input.Category)
	}
	if input.Priority != "" {
		news.Priority = models.NewsPriority(input.Priority)
	}
	news.ImageURL = input.ImageURL
	news.Filial = input.Filial
	news.Pinned = input.Pinned

	// Publicar se ainda não estava publicado
	if input.Published && !news.Published {
		now := time.Now()
		news.PublishedAt = &now
	}
	news.Published = input.Published

	if input.ExpiresAt != "" {
		expiresAt, err := time.Parse("2006-01-02", input.ExpiresAt)
		if err == nil {
			news.ExpiresAt = &expiresAt
		}
	} else {
		news.ExpiresAt = nil
	}

	if err := config.DB.Save(&news).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar notícia: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"news":    news,
	})
}

// AdminDeleteNews exclui uma notícia
func AdminDeleteNews(c *fiber.Ctx) error {
	newsID := c.Params("id")

	var news models.News
	if err := config.DB.First(&news, "id = ?", newsID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notícia não encontrada",
		})
	}

	// Deletar reações e visualizações
	config.DB.Where("news_id = ?", newsID).Delete(&models.NewsReaction{})
	config.DB.Where("news_id = ?", newsID).Delete(&models.NewsView{})

	// Deletar notícia
	if err := config.DB.Delete(&news).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar notícia: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Notícia excluída com sucesso",
	})
}

// AdminPublishNews publica/despublica uma notícia
func AdminPublishNews(c *fiber.Ctx) error {
	newsID := c.Params("id")

	var news models.News
	if err := config.DB.First(&news, "id = ?", newsID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notícia não encontrada",
		})
	}

	var input struct {
		Published bool `json:"published"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	news.Published = input.Published
	if input.Published && news.PublishedAt == nil {
		now := time.Now()
		news.PublishedAt = &now
	}

	if err := config.DB.Save(&news).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar notícia: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"news":    news,
	})
}

// GetNewsStats retorna estatísticas das notícias
func GetNewsStats(c *fiber.Ctx) error {
	var totalNews int64
	var publishedNews int64
	var draftNews int64
	var totalViews int64
	var totalReactions int64

	config.DB.Model(&models.News{}).Count(&totalNews)
	config.DB.Model(&models.News{}).Where("published = ?", true).Count(&publishedNews)
	config.DB.Model(&models.News{}).Where("published = ?", false).Count(&draftNews)
	config.DB.Model(&models.NewsView{}).Count(&totalViews)
	config.DB.Model(&models.NewsReaction{}).Count(&totalReactions)

	// Top 5 notícias mais vistas
	var topNews []models.News
	config.DB.Model(&models.News{}).
		Where("published = ?", true).
		Order("view_count DESC").
		Limit(5).
		Find(&topNews)

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"total_news":      totalNews,
			"published":       publishedNews,
			"drafts":          draftNews,
			"total_views":     totalViews,
			"total_reactions": totalReactions,
			"top_news":        topNews,
		},
	})
}

