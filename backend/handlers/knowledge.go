package handlers

import (
	"regexp"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/frappyou/backend/services"
	"github.com/gofiber/fiber/v2"
)

// ==================== Knowledge Base Handlers ====================

var ragService = services.NewRAGService()

// SearchKnowledge busca artigos na base de conhecimento
// @Summary Buscar na base de conhecimento
// @Tags Knowledge
// @Accept json
// @Produce json
// @Param query query string true "Termo de busca"
// @Param category query string false "Categoria"
// @Param limit query int false "Limite de resultados"
// @Success 200 {array} models.KnowledgeSearchResult
// @Router /api/knowledge/search [get]
func SearchKnowledge(c *fiber.Ctx) error {
	query := c.Query("query")
	category := c.Query("category")
	limit := c.QueryInt("limit", 10)

	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Query é obrigatória",
		})
	}

	results, err := ragService.Search(query, category, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao buscar artigos",
		})
	}

	// Converte para response format
	var response []models.KnowledgeSearchResult
	for _, r := range results {
		snippet := ""
		if len(r.Snippets) > 0 {
			snippet = r.Snippets[0]
		}
		response = append(response, models.KnowledgeSearchResult{
			Article: r.Article,
			Score:   r.Score,
			Snippet: snippet,
		})
	}

	return c.JSON(fiber.Map{
		"results": response,
		"total":   len(response),
		"query":   query,
	})
}

// GetKnowledgeArticle busca um artigo específico
// @Summary Obter artigo
// @Tags Knowledge
// @Produce json
// @Param id path string true "ID do artigo"
// @Success 200 {object} models.KnowledgeArticle
// @Router /api/knowledge/articles/{id} [get]
func GetKnowledgeArticle(c *fiber.Ctx) error {
	articleID := c.Params("id")

	var article models.KnowledgeArticle
	if err := config.DB.Where("id = ? AND is_published = ?", articleID, true).
		First(&article).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	// Incrementa view count
	go ragService.IncrementViewCount(articleID)

	return c.JSON(article)
}

// GetKnowledgeByCategory lista artigos por categoria
// @Summary Listar artigos por categoria
// @Tags Knowledge
// @Produce json
// @Param category path string true "Categoria"
// @Param limit query int false "Limite"
// @Success 200 {array} models.KnowledgeArticle
// @Router /api/knowledge/category/{category} [get]
func GetKnowledgeByCategory(c *fiber.Ctx) error {
	category := models.KnowledgeCategory(c.Params("category"))
	limit := c.QueryInt("limit", 20)

	articles, err := ragService.GetArticlesByCategory(category, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao buscar artigos",
		})
	}

	return c.JSON(fiber.Map{
		"articles": articles,
		"total":    len(articles),
		"category": category,
	})
}

// GetFeaturedKnowledge lista artigos em destaque
// @Summary Listar artigos em destaque
// @Tags Knowledge
// @Produce json
// @Success 200 {array} models.KnowledgeArticle
// @Router /api/knowledge/featured [get]
func GetFeaturedKnowledge(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 5)

	articles, err := ragService.GetFeaturedArticles(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao buscar artigos em destaque",
		})
	}

	return c.JSON(fiber.Map{
		"articles": articles,
		"total":    len(articles),
	})
}

// GetKnowledgeCategories lista categorias disponíveis
// @Summary Listar categorias
// @Tags Knowledge
// @Produce json
// @Success 200 {array} object
// @Router /api/knowledge/categories [get]
func GetKnowledgeCategories(c *fiber.Ctx) error {
	// Conta artigos por categoria
	var categoryCounts []struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}

	config.DB.Model(&models.KnowledgeArticle{}).
		Select("category, COUNT(*) as count").
		Where("is_published = ?", true).
		Group("category").
		Scan(&categoryCounts)

	// Monta resposta com labels
	countMap := make(map[string]int64)
	for _, cc := range categoryCounts {
		countMap[cc.Category] = cc.Count
	}

	var response []fiber.Map
	for _, cat := range models.KnowledgeCategories {
		response = append(response, fiber.Map{
			"value":       cat.Value,
			"label":       cat.Label,
			"description": cat.Description,
			"icon":        cat.Icon,
			"count":       countMap[string(cat.Value)],
		})
	}

	return c.JSON(response)
}

// ==================== Admin Handlers ====================

// ListKnowledgeArticles lista todos os artigos (admin)
// @Summary Listar todos artigos
// @Tags Knowledge Admin
// @Produce json
// @Param page query int false "Página"
// @Param limit query int false "Limite"
// @Param category query string false "Categoria"
// @Param published query bool false "Publicados"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/knowledge [get]
func ListKnowledgeArticles(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	category := c.Query("category")
	published := c.Query("published")

	offset := (page - 1) * limit

	query := config.DB.Model(&models.KnowledgeArticle{})

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if published != "" {
		query = query.Where("is_published = ?", published == "true")
	}

	var total int64
	query.Count(&total)

	var articles []models.KnowledgeArticle
	query.Preload("Author").
		Order("updated_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&articles)

	return c.JSON(fiber.Map{
		"articles":    articles,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": (total + int64(limit) - 1) / int64(limit),
	})
}

// CreateKnowledgeArticle cria um novo artigo
// @Summary Criar artigo
// @Tags Knowledge Admin
// @Accept json
// @Produce json
// @Param body body models.KnowledgeCreateRequest true "Dados do artigo"
// @Success 201 {object} models.KnowledgeArticle
// @Router /api/admin/knowledge [post]
func CreateKnowledgeArticle(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.KnowledgeCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Dados inválidos",
		})
	}

	if req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Título e conteúdo são obrigatórios",
		})
	}

	// Gera slug
	slug := generateSlug(req.Title)

	// Gera keywords automáticas se não fornecidas
	keywords := req.Keywords
	if keywords == "" {
		keywords = generateKeywords(req.Title, req.Content)
	}

	article := models.KnowledgeArticle{
		Title:       req.Title,
		Slug:        slug,
		Summary:     req.Summary,
		Content:     req.Content,
		Category:    req.Category,
		Tags:        req.Tags,
		Keywords:    keywords,
		IsPublished: true,
		AuthorID:    &userID,
		Version:     1,
	}

	if err := config.DB.Create(&article).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao criar artigo",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(article)
}

// UpdateKnowledgeArticle atualiza um artigo
// @Summary Atualizar artigo
// @Tags Knowledge Admin
// @Accept json
// @Produce json
// @Param id path string true "ID do artigo"
// @Param body body models.KnowledgeUpdateRequest true "Dados do artigo"
// @Success 200 {object} models.KnowledgeArticle
// @Router /api/admin/knowledge/{id} [put]
func UpdateKnowledgeArticle(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	articleID := c.Params("id")

	var article models.KnowledgeArticle
	if err := config.DB.First(&article, "id = ?", articleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	var req models.KnowledgeUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Dados inválidos",
		})
	}

	// Atualiza campos
	if req.Title != nil {
		article.Title = *req.Title
		article.Slug = generateSlug(*req.Title)
	}
	if req.Summary != nil {
		article.Summary = *req.Summary
	}
	if req.Content != nil {
		article.Content = *req.Content
	}
	if req.Category != nil {
		article.Category = *req.Category
	}
	if req.Tags != nil {
		article.Tags = *req.Tags
	}
	if req.Keywords != nil {
		article.Keywords = *req.Keywords
	}
	if req.IsPublished != nil {
		article.IsPublished = *req.IsPublished
	}
	if req.IsFeatured != nil {
		article.IsFeatured = *req.IsFeatured
	}

	// Incrementa versão
	article.Version++
	now := time.Now()
	article.LastReviewedAt = &now
	article.LastReviewedBy = &userID

	if err := config.DB.Save(&article).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao atualizar artigo",
		})
	}

	return c.JSON(article)
}

// DeleteKnowledgeArticle deleta um artigo
// @Summary Deletar artigo
// @Tags Knowledge Admin
// @Param id path string true "ID do artigo"
// @Success 200 {object} map[string]string
// @Router /api/admin/knowledge/{id} [delete]
func DeleteKnowledgeArticle(c *fiber.Ctx) error {
	articleID := c.Params("id")

	result := config.DB.Delete(&models.KnowledgeArticle{}, "id = ?", articleID)
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Artigo deletado com sucesso",
	})
}

// ToggleKnowledgePublish alterna publicação
// @Summary Alternar publicação
// @Tags Knowledge Admin
// @Param id path string true "ID do artigo"
// @Success 200 {object} models.KnowledgeArticle
// @Router /api/admin/knowledge/{id}/toggle-publish [put]
func ToggleKnowledgePublish(c *fiber.Ctx) error {
	articleID := c.Params("id")

	var article models.KnowledgeArticle
	if err := config.DB.First(&article, "id = ?", articleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	article.IsPublished = !article.IsPublished
	config.DB.Save(&article)

	status := "despublicado"
	if article.IsPublished {
		status = "publicado"
	}

	return c.JSON(fiber.Map{
		"message":      "Artigo " + status + " com sucesso",
		"is_published": article.IsPublished,
	})
}

// ToggleKnowledgeFeatured alterna destaque
// @Summary Alternar destaque
// @Tags Knowledge Admin
// @Param id path string true "ID do artigo"
// @Success 200 {object} models.KnowledgeArticle
// @Router /api/admin/knowledge/{id}/toggle-featured [put]
func ToggleKnowledgeFeatured(c *fiber.Ctx) error {
	articleID := c.Params("id")

	var article models.KnowledgeArticle
	if err := config.DB.First(&article, "id = ?", articleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	article.IsFeatured = !article.IsFeatured
	config.DB.Save(&article)

	return c.JSON(fiber.Map{
		"message":     "Destaque alterado com sucesso",
		"is_featured": article.IsFeatured,
	})
}

// ==================== Feedback Handlers ====================

// SendKnowledgeFeedback envia feedback sobre artigo
// @Summary Enviar feedback
// @Tags Knowledge
// @Accept json
// @Produce json
// @Param id path string true "ID do artigo"
// @Param body body object true "Feedback"
// @Success 200 {object} map[string]string
// @Router /api/knowledge/articles/{id}/feedback [post]
func SendKnowledgeFeedback(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	articleID := c.Params("id")

	var req struct {
		IsHelpful bool   `json:"is_helpful"`
		Comment   string `json:"comment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Dados inválidos",
		})
	}

	// Verifica se artigo existe
	var article models.KnowledgeArticle
	if err := config.DB.First(&article, "id = ?", articleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Artigo não encontrado",
		})
	}

	// Verifica se já deu feedback
	var existing models.KnowledgeFeedback
	if err := config.DB.Where("article_id = ? AND user_id = ?", articleID, userID).
		First(&existing).Error; err == nil {
		// Atualiza feedback existente
		existing.IsHelpful = req.IsHelpful
		existing.Comment = req.Comment
		config.DB.Save(&existing)
	} else {
		// Cria novo feedback
		feedback := models.KnowledgeFeedback{
			ArticleID: articleID,
			UserID:    userID,
			IsHelpful: req.IsHelpful,
			Comment:   req.Comment,
		}
		config.DB.Create(&feedback)
	}

	// Atualiza contador
	if req.IsHelpful {
		config.DB.Model(&article).Update("helpful_count", article.HelpfulCount+1)
	}

	return c.JSON(fiber.Map{
		"message": "Feedback enviado com sucesso",
	})
}

// ==================== Helpers ====================

// generateSlug gera slug a partir do título
func generateSlug(title string) string {
	slug := strings.ToLower(title)

	// Remove acentos (simplificado)
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a",
		"é", "e", "ê", "e",
		"í", "i",
		"ó", "o", "õ", "o", "ô", "o",
		"ú", "u", "ü", "u",
		"ç", "c",
	)
	slug = replacer.Replace(slug)

	// Remove caracteres especiais
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	slug = reg.ReplaceAllString(slug, "")

	// Substitui espaços por hífens
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove hífens duplicados
	reg = regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	// Limita tamanho
	if len(slug) > 100 {
		slug = slug[:100]
	}

	return strings.Trim(slug, "-")
}

// generateKeywords gera keywords a partir do título e conteúdo
func generateKeywords(title, content string) string {
	text := strings.ToLower(title + " " + content)

	// Remove caracteres especiais
	reg := regexp.MustCompile(`[^a-záàãâéêíóõôúç\s]`)
	text = reg.ReplaceAllString(text, " ")

	// Split em palavras
	words := strings.Fields(text)

	// Conta frequência
	freq := make(map[string]int)
	stopwords := map[string]bool{
		"a": true, "o": true, "e": true, "de": true, "da": true, "do": true,
		"em": true, "um": true, "uma": true, "para": true, "com": true,
		"que": true, "se": true, "na": true, "no": true, "por": true,
		"os": true, "as": true, "dos": true, "das": true, "ao": true,
		"ou": true, "mas": true, "como": true, "mais": true,
	}

	for _, word := range words {
		if len(word) >= 3 && !stopwords[word] {
			freq[word]++
		}
	}

	// Pega as top 10 palavras mais frequentes
	type wordFreq struct {
		word  string
		count int
	}
	var wf []wordFreq
	for w, c := range freq {
		wf = append(wf, wordFreq{w, c})
	}

	// Ordena por frequência
	for i := 0; i < len(wf); i++ {
		for j := i + 1; j < len(wf); j++ {
			if wf[j].count > wf[i].count {
				wf[i], wf[j] = wf[j], wf[i]
			}
		}
	}

	// Pega top 10
	var keywords []string
	for i := 0; i < len(wf) && i < 10; i++ {
		keywords = append(keywords, wf[i].word)
	}

	return strings.Join(keywords, ", ")
}

