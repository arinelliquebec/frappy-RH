package services

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"unicode"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// ==================== RAG Service ====================

// RAGService serviço de Retrieval-Augmented Generation
type RAGService struct{}

// NewRAGService cria uma nova instância do serviço RAG
func NewRAGService() *RAGService {
	return &RAGService{}
}

// SearchResult resultado de busca com score
type SearchResult struct {
	Article  models.KnowledgeArticle
	Score    float64
	Snippets []string
}

// Search busca artigos relevantes para uma query
func (r *RAGService) Search(query string, category string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 5
	}

	// Normaliza e tokeniza a query
	queryTokens := r.tokenize(query)
	if len(queryTokens) == 0 {
		return []SearchResult{}, nil
	}

	// Busca artigos publicados
	var articles []models.KnowledgeArticle
	db := config.DB.Where("is_published = ?", true)

	if category != "" {
		db = db.Where("category = ?", category)
	}

	db.Find(&articles)

	// Calcula score para cada artigo
	var results []SearchResult
	for _, article := range articles {
		score, snippets := r.calculateRelevance(article, queryTokens, query)
		if score > 0 {
			results = append(results, SearchResult{
				Article:  article,
				Score:    score,
				Snippets: snippets,
			})
		}
	}

	// Ordena por relevância (maior score primeiro)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// Limita resultados
	if len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}

// SearchForChat busca artigos e retorna contexto formatado para o chat
func (r *RAGService) SearchForChat(query string, limit int) (string, []models.KnowledgeArticle) {
	results, err := r.Search(query, "", limit)
	if err != nil || len(results) == 0 {
		return "", nil
	}

	// Formata contexto para o prompt
	var contextBuilder strings.Builder
	contextBuilder.WriteString("\n## 📖 INFORMAÇÕES DA BASE DE CONHECIMENTO\n\n")
	contextBuilder.WriteString("Use as informações abaixo para responder à pergunta do colaborador:\n\n")

	var articles []models.KnowledgeArticle
	for i, result := range results {
		articles = append(articles, result.Article)

		contextBuilder.WriteString(fmt.Sprintf("### %d. %s\n", i+1, result.Article.Title))
		contextBuilder.WriteString(fmt.Sprintf("**Categoria:** %s\n", r.getCategoryLabel(result.Article.Category)))

		// Adiciona resumo se existir
		if result.Article.Summary != "" {
			contextBuilder.WriteString(fmt.Sprintf("**Resumo:** %s\n", result.Article.Summary))
		}

		// Adiciona conteúdo (limitado)
		content := result.Article.Content
		if len(content) > 1500 {
			content = content[:1500] + "..."
		}
		contextBuilder.WriteString(fmt.Sprintf("\n%s\n\n", content))

		// Adiciona snippets relevantes
		if len(result.Snippets) > 0 {
			contextBuilder.WriteString("**Trechos relevantes:**\n")
			for _, snippet := range result.Snippets {
				contextBuilder.WriteString(fmt.Sprintf("- %s\n", snippet))
			}
			contextBuilder.WriteString("\n")
		}

		contextBuilder.WriteString("---\n\n")
	}

	contextBuilder.WriteString(`
**INSTRUÇÕES PARA USO DA BASE DE CONHECIMENTO:**
1. Priorize as informações acima ao responder sobre políticas
2. Cite a fonte quando usar informações específicas
3. Se a informação não estiver na base, diga que vai verificar com o RH
4. Mantenha as respostas claras e objetivas
`)

	return contextBuilder.String(), articles
}

// GetArticlesByCategory busca artigos por categoria
func (r *RAGService) GetArticlesByCategory(category models.KnowledgeCategory, limit int) ([]models.KnowledgeArticle, error) {
	var articles []models.KnowledgeArticle

	query := config.DB.Where("is_published = ? AND category = ?", true, category)

	if limit > 0 {
		query = query.Limit(limit)
	}

	query.Order("is_featured DESC, view_count DESC").Find(&articles)

	return articles, nil
}

// GetFeaturedArticles busca artigos em destaque
func (r *RAGService) GetFeaturedArticles(limit int) ([]models.KnowledgeArticle, error) {
	var articles []models.KnowledgeArticle

	config.DB.Where("is_published = ? AND is_featured = ?", true, true).
		Order("updated_at DESC").
		Limit(limit).
		Find(&articles)

	return articles, nil
}

// IncrementViewCount incrementa contador de visualizações
func (r *RAGService) IncrementViewCount(articleID string) error {
	return config.DB.Model(&models.KnowledgeArticle{}).
		Where("id = ?", articleID).
		Update("view_count", config.DB.Raw("view_count + 1")).Error
}

// ==================== Algoritmo de Relevância ====================

// calculateRelevance calcula a relevância de um artigo para a query
func (r *RAGService) calculateRelevance(article models.KnowledgeArticle, queryTokens []string, originalQuery string) (float64, []string) {
	var score float64
	var snippets []string

	// Campos para buscar com seus pesos
	fields := map[string]float64{
		article.Title:    5.0, // Título tem maior peso
		article.Summary:  3.0, // Resumo
		article.Keywords: 4.0, // Keywords
		article.Tags:     3.0, // Tags
		article.Content:  1.0, // Conteúdo tem menor peso (muito texto)
	}

	// Calcula score para cada campo
	for fieldContent, weight := range fields {
		if fieldContent == "" {
			continue
		}

		fieldTokens := r.tokenize(fieldContent)
		fieldScore, foundSnippets := r.matchTokens(queryTokens, fieldTokens, fieldContent, originalQuery)
		score += fieldScore * weight
		snippets = append(snippets, foundSnippets...)
	}

	// Bonus para artigos em destaque
	if article.IsFeatured {
		score *= 1.2
	}

	// Bonus para artigos populares (normalizado)
	if article.ViewCount > 0 {
		popularityBonus := float64(article.ViewCount) / 1000.0
		if popularityBonus > 0.5 {
			popularityBonus = 0.5
		}
		score += popularityBonus
	}

	// Limita snippets
	if len(snippets) > 3 {
		snippets = snippets[:3]
	}

	return score, snippets
}

// matchTokens compara tokens da query com tokens do campo
func (r *RAGService) matchTokens(queryTokens, fieldTokens []string, originalField, originalQuery string) (float64, []string) {
	var score float64
	var snippets []string

	fieldLower := strings.ToLower(originalField)
	queryLower := strings.ToLower(originalQuery)

	// Match exato da query completa (maior pontuação)
	if strings.Contains(fieldLower, queryLower) {
		score += 10.0
		snippet := r.extractSnippet(originalField, originalQuery)
		if snippet != "" {
			snippets = append(snippets, snippet)
		}
	}

	// Match de tokens individuais
	matchedTokens := 0
	for _, qt := range queryTokens {
		for _, ft := range fieldTokens {
			// Match exato
			if qt == ft {
				score += 2.0
				matchedTokens++
				break
			}
			// Match parcial (prefixo)
			if len(qt) >= 3 && strings.HasPrefix(ft, qt) {
				score += 1.0
				matchedTokens++
				break
			}
			// Match por similaridade (Levenshtein simples)
			if len(qt) >= 4 && len(ft) >= 4 && r.similarStrings(qt, ft) {
				score += 0.5
				break
			}
		}
	}

	// Bonus por cobertura (quantos tokens da query foram encontrados)
	if len(queryTokens) > 0 {
		coverage := float64(matchedTokens) / float64(len(queryTokens))
		score *= (1.0 + coverage)
	}

	return score, snippets
}

// extractSnippet extrai um trecho relevante do texto
func (r *RAGService) extractSnippet(text, query string) string {
	textLower := strings.ToLower(text)
	queryLower := strings.ToLower(query)

	idx := strings.Index(textLower, queryLower)
	if idx == -1 {
		// Tenta encontrar primeiro token
		tokens := r.tokenize(query)
		if len(tokens) > 0 {
			idx = strings.Index(textLower, tokens[0])
		}
	}

	if idx == -1 {
		return ""
	}

	// Extrai contexto ao redor do match
	start := idx - 50
	if start < 0 {
		start = 0
	}

	end := idx + len(query) + 100
	if end > len(text) {
		end = len(text)
	}

	snippet := text[start:end]

	// Limpa início e fim para não cortar palavras
	if start > 0 {
		if spaceIdx := strings.Index(snippet, " "); spaceIdx > 0 && spaceIdx < 20 {
			snippet = "..." + snippet[spaceIdx+1:]
		}
	}
	if end < len(text) {
		if spaceIdx := strings.LastIndex(snippet, " "); spaceIdx > len(snippet)-30 {
			snippet = snippet[:spaceIdx] + "..."
		}
	}

	return strings.TrimSpace(snippet)
}

// ==================== Helpers ====================

// tokenize normaliza e tokeniza um texto
func (r *RAGService) tokenize(text string) []string {
	// Remove acentos
	text = r.removeAccents(text)

	// Converte para minúsculas
	text = strings.ToLower(text)

	// Remove caracteres especiais mantendo apenas letras, números e espaços
	reg := regexp.MustCompile(`[^a-z0-9\s]`)
	text = reg.ReplaceAllString(text, " ")

	// Split por espaços
	words := strings.Fields(text)

	// Remove stopwords e palavras muito curtas
	var tokens []string
	for _, word := range words {
		if len(word) >= 2 && !r.isStopword(word) {
			tokens = append(tokens, word)
		}
	}

	return tokens
}

// removeAccents remove acentos de um texto
func (r *RAGService) removeAccents(text string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, _ := transform.String(t, text)
	return result
}

// isStopword verifica se é uma stopword em português
func (r *RAGService) isStopword(word string) bool {
	stopwords := map[string]bool{
		"a": true, "o": true, "e": true, "de": true, "da": true, "do": true,
		"em": true, "um": true, "uma": true, "para": true, "com": true,
		"que": true, "se": true, "na": true, "no": true, "por": true,
		"os": true, "as": true, "dos": true, "das": true, "ao": true,
		"aos": true, "ou": true, "mas": true, "como": true, "mais": true,
		"seu": true, "sua": true, "esse": true, "essa": true, "este": true,
		"esta": true, "ele": true, "ela": true, "nos": true, "pelo": true,
		"pela": true, "ter": true, "ser": true, "foi": true, "sao": true,
		"tem": true, "ate": true, "ja": true, "sobre": true, "quando": true,
		"muito": true, "isso": true, "qual": true, "onde": true,
		"quem": true, "assim": true, "mesmo": true, "pode": true, "entre": true,
		"depois": true, "sem": true, "nao": true, "sim": true, "voce": true,
		"meu": true, "minha": true, "seus": true, "suas": true, "aqui": true,
	}
	return stopwords[word]
}

// similarStrings verifica similaridade básica entre strings
func (r *RAGService) similarStrings(s1, s2 string) bool {
	// Verifica se compartilham pelo menos 70% dos caracteres
	if len(s1) > len(s2) {
		s1, s2 = s2, s1
	}

	matches := 0
	for _, c := range s1 {
		if strings.ContainsRune(s2, c) {
			matches++
		}
	}

	similarity := float64(matches) / float64(len(s1))
	return similarity >= 0.7
}

// getCategoryLabel retorna o label da categoria
func (r *RAGService) getCategoryLabel(category models.KnowledgeCategory) string {
	labels := map[models.KnowledgeCategory]string{
		models.KnowledgeCategoryPolicies:   "Políticas",
		models.KnowledgeCategoryBenefits:   "Benefícios",
		models.KnowledgeCategoryVacation:   "Férias",
		models.KnowledgeCategoryPayroll:    "Folha de Pagamento",
		models.KnowledgeCategoryCompliance: "Compliance",
		models.KnowledgeCategoryHR:         "RH",
		models.KnowledgeCategoryIT:         "TI",
		models.KnowledgeCategorySafety:     "Segurança",
		models.KnowledgeCategoryCareer:     "Carreira",
		models.KnowledgeCategoryGeneral:    "Geral",
	}

	if label, ok := labels[category]; ok {
		return label
	}
	return string(category)
}

// ==================== Context Detection ====================

// DetectQueryIntent detecta a intenção da query para busca contextual
func (r *RAGService) DetectQueryIntent(query string) []models.KnowledgeCategory {
	queryLower := strings.ToLower(query)
	var categories []models.KnowledgeCategory

	// Mapeamento de palavras-chave para categorias
	categoryKeywords := map[models.KnowledgeCategory][]string{
		models.KnowledgeCategoryVacation: {
			"ferias", "férias", "folga", "ausencia", "ausência", "licenca", "licença",
			"atestado", "abono", "falta", "afastamento", "home office",
		},
		models.KnowledgeCategoryPayroll: {
			"holerite", "salario", "salário", "pagamento", "desconto", "inss",
			"irrf", "imposto", "fgts", "13", "decimo", "décimo", "adiantamento",
			"vale", "beneficio", "benefício", "hora extra",
		},
		models.KnowledgeCategoryBenefits: {
			"beneficio", "benefício", "plano de saude", "plano de saúde", "dental",
			"seguro", "vale refeicao", "vale refeição", "vale alimentacao",
			"vale alimentação", "vale transporte", "vt", "vr", "va", "gym", "academia",
		},
		models.KnowledgeCategoryCompliance: {
			"etica", "ética", "compliance", "assedio", "assédio", "denuncia", "denúncia",
			"conduta", "codigo", "código", "conflito de interesse", "corrupcao", "corrupção",
		},
		models.KnowledgeCategoryCareer: {
			"carreira", "promocao", "promoção", "avaliacao", "avaliação", "desempenho",
			"pdi", "desenvolvimento", "treinamento", "curso", "feedback", "mentoria",
		},
		models.KnowledgeCategorySafety: {
			"seguranca", "segurança", "epi", "acidente", "cipa", "ergonomia",
			"saude ocupacional", "saúde ocupacional", "nr", "brigada",
		},
		models.KnowledgeCategoryIT: {
			"senha", "acesso", "sistema", "computador", "notebook", "email",
			"vpn", "wifi", "software", "hardware", "suporte", "ti",
		},
		models.KnowledgeCategoryPolicies: {
			"politica", "política", "regra", "norma", "regulamento", "procedimento",
			"dresscode", "dress code", "horario", "horário", "ponto", "jornada",
		},
	}

	// Detecta categorias baseado nas keywords
	for category, keywords := range categoryKeywords {
		for _, keyword := range keywords {
			if strings.Contains(queryLower, keyword) {
				categories = append(categories, category)
				break
			}
		}
	}

	// Se não encontrou nenhuma categoria específica, usa geral
	if len(categories) == 0 {
		categories = append(categories, models.KnowledgeCategoryGeneral)
	}

	return categories
}

// ==================== Contexto Inteligente para Chat ====================

// GetContextForQuery busca contexto relevante para uma pergunta do chat
func (r *RAGService) GetContextForQuery(query string) string {
	// Detecta intenção
	categories := r.DetectQueryIntent(query)

	// Busca artigos relevantes
	results, err := r.Search(query, "", 3)
	if err != nil || len(results) == 0 {
		// Tenta buscar por categoria se não encontrar por busca direta
		if len(categories) > 0 {
			articles, _ := r.GetArticlesByCategory(categories[0], 2)
			if len(articles) > 0 {
				return r.formatArticlesAsContext(articles)
			}
		}
		return ""
	}

	// Formata resultados como contexto
	var contextBuilder strings.Builder
	contextBuilder.WriteString("\n## 📖 BASE DE CONHECIMENTO - INFORMAÇÕES RELEVANTES\n\n")

	for i, result := range results {
		if result.Score < 1.0 {
			continue // Ignora resultados com baixa relevância
		}

		contextBuilder.WriteString(fmt.Sprintf("### %d. %s\n", i+1, result.Article.Title))

		// Conteúdo limitado
		content := result.Article.Content
		if len(content) > 1000 {
			content = content[:1000] + "..."
		}
		contextBuilder.WriteString(fmt.Sprintf("%s\n\n", content))
	}

	if contextBuilder.Len() > 50 {
		contextBuilder.WriteString("---\n")
		contextBuilder.WriteString("*Use as informações acima para responder. Cite a fonte quando apropriado.*\n")
	}

	return contextBuilder.String()
}

// formatArticlesAsContext formata artigos como contexto
func (r *RAGService) formatArticlesAsContext(articles []models.KnowledgeArticle) string {
	if len(articles) == 0 {
		return ""
	}

	var builder strings.Builder
	builder.WriteString("\n## 📖 POLÍTICAS RELACIONADAS\n\n")

	for i, article := range articles {
		builder.WriteString(fmt.Sprintf("### %d. %s\n", i+1, article.Title))

		content := article.Content
		if len(content) > 800 {
			content = content[:800] + "..."
		}
		builder.WriteString(fmt.Sprintf("%s\n\n", content))
	}

	return builder.String()
}

