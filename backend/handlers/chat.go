package handlers

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/frappyou/backend/services"
	"github.com/gofiber/fiber/v2"
)

// ==================== Azure OpenAI Types ====================

type AzureMessage struct {
	Role         string            `json:"role"`
	Content      string            `json:"content,omitempty"`
	FunctionCall *AzureFunctionCall `json:"function_call,omitempty"`
	Name         string            `json:"name,omitempty"` // Para respostas de função
}

type AzureFunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type AzureFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

type AzureChatRequest struct {
	Messages            []AzureMessage  `json:"messages"`
	MaxCompletionTokens int             `json:"max_completion_tokens,omitempty"`
	Stream              bool            `json:"stream,omitempty"`
	Functions           []AzureFunction `json:"functions,omitempty"`
	FunctionCall        interface{}     `json:"function_call,omitempty"` // "auto", "none", ou {"name": "func_name"}
}

type AzureChoice struct {
	Index        int          `json:"index"`
	Message      AzureMessage `json:"message"`
	FinishReason string       `json:"finish_reason"`
}

type AzureUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type AzureChatResponse struct {
	ID      string        `json:"id"`
	Choices []AzureChoice `json:"choices"`
	Usage   AzureUsage    `json:"usage"`
}

// StreamChoice para streaming
type StreamChoice struct {
	Delta        StreamDelta `json:"delta"`
	Index        int         `json:"index"`
	FinishReason *string     `json:"finish_reason"`
}

type StreamDelta struct {
	Role         string            `json:"role,omitempty"`
	Content      string            `json:"content,omitempty"`
	FunctionCall *AzureFunctionCall `json:"function_call,omitempty"`
}

type StreamResponse struct {
	ID      string         `json:"id"`
	Choices []StreamChoice `json:"choices"`
}

// ==================== System Prompts ====================

// getSystemPromptWithContext busca contexto completo do usuário e monta prompt enriquecido
func getSystemPromptWithContext(userID string, chatContext string) string {
	return getSystemPromptWithContextAndRAG(userID, chatContext, "")
}

// getSystemPromptWithContextAndRAG busca contexto do usuário + RAG para a query
func getSystemPromptWithContextAndRAG(userID string, chatContext string, userQuery string) string {
	// Busca contexto completo do usuário
	userCtx, err := services.GetUserContext(userID)
	if err != nil {
		log.Printf("Erro ao buscar contexto do usuário: %v", err)
		// Fallback para prompt básico
		return getBasicSystemPrompt(chatContext)
	}

	return services.BuildEnhancedSystemPromptWithRAG(userCtx, chatContext, userQuery)
}

// getBasicSystemPrompt retorna prompt básico quando não consegue carregar contexto
func getBasicSystemPrompt(context string) string {
	basePrompt := `Você é a Frappy, assistente virtual inteligente do FrappYOU - sistema de gestão de RH da Frapp.
Você ajuda colaboradores com dúvidas sobre RH, benefícios, políticas da empresa e carreira.

Diretrizes:
- Seja cordial, profissional e empático
- Responda em português brasileiro
- Use linguagem clara e acessível
- Se não souber algo, diga que vai verificar e direcione ao RH
- Proteja dados sensíveis - nunca revele informações de outros colaboradores
- Para assuntos críticos (demissão, assédio, etc), direcione ao RH humano
- Use emojis moderadamente para tornar a conversa mais amigável
`

	// Adiciona contexto específico
	switch context {
	case "vacation":
		basePrompt += `
Contexto: Férias e Ausências
Você está especializado em ajudar com:
- Saldo de férias e como consultar
- Como solicitar férias
- Venda de férias (abono pecuniário)
- Políticas de férias da empresa
- Atestados e ausências
- Antecipação de feriados
`
	case "learning":
		basePrompt += `
Contexto: E-Learning e Desenvolvimento
Você está especializado em ajudar com:
- Cursos disponíveis na plataforma
- Como se inscrever em cursos
- Certificados e progressão
- Trilhas de aprendizado
- Recomendações de cursos
`
	case "pdi":
		basePrompt += `
Contexto: PDI - Plano de Desenvolvimento Individual
Você está especializado em ajudar com:
- Como criar um PDI eficaz
- Definição de metas SMART
- Acompanhamento de progresso
- Feedback e check-ins
- Desenvolvimento de carreira
`
	case "payslip":
		basePrompt += `
Contexto: Holerite e Remuneração
Você está especializado em ajudar com:
- Como acessar holerites
- Entender os descontos
- Benefícios e adicionais
- INSS e Imposto de Renda
- 13º salário e férias
`
	default:
		basePrompt += `
Você pode ajudar com diversos assuntos de RH:
- Férias e ausências
- Holerite e benefícios
- Cursos e desenvolvimento
- PDI e carreira
- Políticas da empresa
- Dúvidas gerais
`
	}

	return basePrompt
}

// Mantido para compatibilidade, mas deprecated
func getSystemPrompt(context string, user *models.User) string {
	if user != nil {
		return getSystemPromptWithContext(user.ID, context)
	}
	return getBasicSystemPrompt(context)
}

// ==================== Handlers ====================

// SendMessage processa uma mensagem do chat
// @Summary Enviar mensagem para o assistente
// @Tags Chat
// @Accept json
// @Produce json
// @Param body body models.ChatRequest true "Mensagem"
// @Success 200 {object} models.ChatResponse
// @Router /api/chat [post]
func SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	cache := services.NewChatCache()

	var req models.ChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Dados inválidos",
		})
	}

	if strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Mensagem não pode estar vazia",
		})
	}

	// Rate limiting por usuário (50 msgs por hora)
	if cache.IsAvailable() {
		allowed, remaining, _ := cache.CheckRateLimit(userID, 50, time.Hour)
		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":     "Limite de mensagens atingido. Aguarde alguns minutos.",
				"remaining": remaining,
			})
		}
	}

	chatContext := req.Context
	if chatContext == "" {
		chatContext = "general"
	}

	// 1. Tenta buscar resposta em cache (para perguntas comuns)
	if cachedResp, _ := cache.GetCachedResponse(req.Message, chatContext); cachedResp != nil {
		// Cache hit! Retorna resposta cacheada
		// Cria sessão e salva mensagens para histórico
		var session models.ChatSession
		if req.SessionID != "" {
			config.DB.Where("id = ? AND user_id = ?", req.SessionID, userID).First(&session)
		}
		if session.ID == "" {
			session = models.ChatSession{
				UserID:   userID,
				Title:    generateSessionTitle(req.Message),
				Context:  chatContext,
				IsActive: true,
			}
			config.DB.Create(&session)
		}

		// Salva mensagens
		config.DB.Create(&models.ChatMessage{
			SessionID: session.ID,
			UserID:    userID,
			Role:      "user",
			Content:   req.Message,
		})
		config.DB.Create(&models.ChatMessage{
			SessionID: session.ID,
			UserID:    userID,
			Role:      "assistant",
			Content:   cachedResp.Response,
			Tokens:    0, // Sem tokens consumidos
		})

		return c.JSON(models.ChatResponse{
			Message:   cachedResp.Response,
			SessionID: session.ID,
			Tokens:    0,
		})
	}

	// Busca dados do usuário para contexto
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	// Busca ou cria sessão
	var session models.ChatSession
	if req.SessionID != "" {
		config.DB.Where("id = ? AND user_id = ?", req.SessionID, userID).First(&session)
	}

	if session.ID == "" {
		session = models.ChatSession{
			UserID:   userID,
			Title:    generateSessionTitle(req.Message),
			Context:  chatContext,
			IsActive: true,
		}
		config.DB.Create(&session)
	}

	// Salva mensagem do usuário
	userMessage := models.ChatMessage{
		SessionID: session.ID,
		UserID:    userID,
		Role:      "user",
		Content:   req.Message,
	}
	config.DB.Create(&userMessage)

	// Busca histórico recente (últimas 10 mensagens)
	var recentMessages []models.ChatMessage
	config.DB.Where("session_id = ?", session.ID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentMessages)

	// Inverte para ordem cronológica
	for i, j := 0, len(recentMessages)-1; i < j; i, j = i+1, j-1 {
		recentMessages[i], recentMessages[j] = recentMessages[j], recentMessages[i]
	}

	// Chama Azure OpenAI com contexto enriquecido
	response, tokens, err := callAzureOpenAI(recentMessages, session.Context, userID)
	if err != nil {
		log.Printf("Erro Azure OpenAI: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes.",
		})
	}

	// Cacheia a resposta se for pergunta comum
	go cache.SetCachedResponse(req.Message, response, session.Context)

	// Salva resposta do assistente
	assistantMessage := models.ChatMessage{
		SessionID: session.ID,
		UserID:    userID,
		Role:      "assistant",
		Content:   response,
		Tokens:    tokens,
	}
	config.DB.Create(&assistantMessage)

	// Atualiza estatísticas de uso
	updateChatUsageStats(userID, tokens)

	return c.JSON(models.ChatResponse{
		Message:   response,
		SessionID: session.ID,
		Tokens:    tokens,
	})
}

// SendMessageStream envia mensagem com resposta em streaming (SSE)
// @Summary Enviar mensagem com streaming
// @Tags Chat
// @Accept json
// @Produce text/event-stream
// @Param body body models.ChatRequest true "Mensagem"
// @Router /api/chat/stream [post]
func SendMessageStream(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req models.ChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Dados inválidos",
		})
	}

	if strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Mensagem não pode estar vazia",
		})
	}

	// Busca dados do usuário
	var user models.User
	config.DB.First(&user, "id = ?", userID)

	// Busca ou cria sessão
	var session models.ChatSession
	if req.SessionID != "" {
		config.DB.Where("id = ? AND user_id = ?", req.SessionID, userID).First(&session)
	}

	if session.ID == "" {
		context := req.Context
		if context == "" {
			context = "general"
		}
		session = models.ChatSession{
			UserID:   userID,
			Title:    generateSessionTitle(req.Message),
			Context:  context,
			IsActive: true,
		}
		config.DB.Create(&session)
	}

	// Salva mensagem do usuário
	userMessage := models.ChatMessage{
		SessionID: session.ID,
		UserID:    userID,
		Role:      "user",
		Content:   req.Message,
	}
	config.DB.Create(&userMessage)

	// Busca histórico
	var recentMessages []models.ChatMessage
	config.DB.Where("session_id = ?", session.ID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentMessages)

	for i, j := 0, len(recentMessages)-1; i < j; i, j = i+1, j-1 {
		recentMessages[i], recentMessages[j] = recentMessages[j], recentMessages[i]
	}

	// Configura SSE
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	// Stream da resposta com contexto enriquecido
	fullResponse, err := streamAzureOpenAI(c, recentMessages, session.Context, userID, session.ID)
	if err != nil {
		log.Printf("Erro streaming: %v", err)
		return nil
	}

	// Salva resposta completa
	if fullResponse != "" {
		assistantMessage := models.ChatMessage{
			SessionID: session.ID,
			UserID:    userID,
			Role:      "assistant",
			Content:   fullResponse,
		}
		config.DB.Create(&assistantMessage)
		updateChatUsageStats(userID, 0)
	}

	return nil
}

// GetChatSessions retorna sessões de chat do usuário
// @Summary Listar sessões de chat
// @Tags Chat
// @Produce json
// @Success 200 {array} models.ChatSessionResponse
// @Router /api/chat/sessions [get]
func GetChatSessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var sessions []models.ChatSession
	config.DB.Where("user_id = ? AND is_active = ?", userID, true).
		Order("updated_at DESC").
		Limit(20).
		Find(&sessions)

	return c.JSON(sessions)
}

// GetChatHistory retorna histórico de uma sessão
// @Summary Obter histórico de chat
// @Tags Chat
// @Produce json
// @Param id path string true "ID da sessão"
// @Success 200 {object} models.ChatSessionResponse
// @Router /api/chat/sessions/{id} [get]
func GetChatHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	sessionID := c.Params("id")

	var session models.ChatSession
	if err := config.DB.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sessão não encontrada",
		})
	}

	var messages []models.ChatMessage
	config.DB.Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&messages)

	return c.JSON(models.ChatSessionResponse{
		ID:        session.ID,
		Title:     session.Title,
		Context:   session.Context,
		Messages:  messages,
		CreatedAt: session.CreatedAt,
	})
}

// DeleteChatSession deleta uma sessão
// @Summary Deletar sessão de chat
// @Tags Chat
// @Param id path string true "ID da sessão"
// @Success 200 {object} map[string]string
// @Router /api/chat/sessions/{id} [delete]
func DeleteChatSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	sessionID := c.Params("id")

	result := config.DB.Where("id = ? AND user_id = ?", sessionID, userID).
		Delete(&models.ChatSession{})

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sessão não encontrada",
		})
	}

	// Deleta mensagens da sessão
	config.DB.Where("session_id = ?", sessionID).Delete(&models.ChatMessage{})

	return c.JSON(fiber.Map{
		"message": "Sessão deletada com sucesso",
	})
}

// GetChatSuggestions retorna sugestões contextuais
// @Summary Obter sugestões de perguntas
// @Tags Chat
// @Produce json
// @Param context query string false "Contexto (vacation, learning, pdi, payslip)"
// @Success 200 {array} models.ChatSuggestion
// @Router /api/chat/suggestions [get]
func GetChatSuggestions(c *fiber.Ctx) error {
	context := c.Query("context", "general")

	suggestions := []models.ChatSuggestion{}

	switch context {
	case "vacation":
		suggestions = []models.ChatSuggestion{
			{
				Title: "Férias",
				Actions: []models.QuickAction{
					{Label: "Qual meu saldo de férias?", Query: "Qual é meu saldo de férias disponível?", Icon: "beach"},
					{Label: "Como solicitar férias?", Query: "Como faço para solicitar férias?", Icon: "calendar"},
					{Label: "Posso vender férias?", Query: "Como funciona a venda de férias?", Icon: "money"},
				},
			},
		}
	case "learning":
		suggestions = []models.ChatSuggestion{
			{
				Title: "Cursos",
				Actions: []models.QuickAction{
					{Label: "Cursos disponíveis", Query: "Quais cursos estão disponíveis?", Icon: "school"},
					{Label: "Recomendações", Query: "Quais cursos você recomenda para mim?", Icon: "star"},
					{Label: "Meus certificados", Query: "Como vejo meus certificados?", Icon: "badge"},
				},
			},
		}
	case "pdi":
		suggestions = []models.ChatSuggestion{
			{
				Title: "PDI",
				Actions: []models.QuickAction{
					{Label: "Criar meu PDI", Query: "Como criar um PDI eficaz?", Icon: "target"},
					{Label: "Metas SMART", Query: "O que são metas SMART?", Icon: "lightbulb"},
					{Label: "Acompanhamento", Query: "Como faço o acompanhamento do meu PDI?", Icon: "chart"},
				},
			},
		}
	case "payslip":
		suggestions = []models.ChatSuggestion{
			{
				Title: "Holerite",
				Actions: []models.QuickAction{
					{Label: "Entender holerite", Query: "Pode me explicar os itens do holerite?", Icon: "receipt"},
					{Label: "Descontos", Query: "Quais são os descontos obrigatórios?", Icon: "calculator"},
					{Label: "13º salário", Query: "Como funciona o 13º salário?", Icon: "gift"},
				},
			},
		}
	default:
		suggestions = []models.ChatSuggestion{
			{
				Title:       "Início Rápido",
				Description: "Perguntas frequentes",
				Actions: []models.QuickAction{
					{Label: "Saldo de férias", Query: "Qual meu saldo de férias?", Icon: "beach"},
					{Label: "Cursos disponíveis", Query: "Quais cursos posso fazer?", Icon: "school"},
					{Label: "Entender holerite", Query: "Pode explicar meu holerite?", Icon: "receipt"},
					{Label: "Criar PDI", Query: "Como criar meu PDI?", Icon: "target"},
				},
			},
		}
	}

	return c.JSON(suggestions)
}

// ==================== Azure OpenAI Functions ====================

// getAzureFunctions converte nossas funções para o formato Azure
func getAzureFunctions() []AzureFunction {
	functionDefs := services.GetAvailableFunctions()
	azureFunctions := make([]AzureFunction, len(functionDefs))

	for i, fn := range functionDefs {
		azureFunctions[i] = AzureFunction{
			Name:        fn.Name,
			Description: fn.Description,
			Parameters:  fn.Parameters,
		}
	}

	return azureFunctions
}

// processFunctionCall executa uma função chamada pela IA e retorna o resultado
func processFunctionCall(userID string, functionCall *AzureFunctionCall) (string, error) {
	cache := services.NewChatCache()

	// Tenta buscar do cache primeiro
	if cached, _ := cache.GetFunctionResult(functionCall.Name, userID, functionCall.Arguments); cached != nil {
		log.Printf("✅ Cache HIT: função %s", functionCall.Name)
		resultJSON, _ := json.Marshal(cached.Result)
		return string(resultJSON), nil
	}

	// Executa a função
	log.Printf("🔧 Executando função: %s com args: %s", functionCall.Name, functionCall.Arguments)
	result, err := services.ExecuteFunction(userID, functionCall.Name, functionCall.Arguments)
	if err != nil {
		return "", err
	}

	// Cacheia o resultado
	go cache.SetFunctionResult(functionCall.Name, userID, functionCall.Arguments, result)

	resultJSON, _ := json.Marshal(result)
	return string(resultJSON), nil
}

func callAzureOpenAI(messages []models.ChatMessage, context string, userID string) (string, int, error) {
	endpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
	apiKey := os.Getenv("AZURE_OPENAI_KEY")
	deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
	apiVersion := os.Getenv("AZURE_OPENAI_API_VERSION")

	if endpoint == "" || apiKey == "" || deployment == "" {
		return "", 0, fmt.Errorf("Azure OpenAI não configurado")
	}

	if apiVersion == "" {
		apiVersion = "2024-02-15-preview"
	}

	// Extrai a última mensagem do usuário para busca RAG
	userQuery := ""
	if len(messages) > 0 {
		userQuery = messages[len(messages)-1].Content
	}

	// Monta mensagens para a API com contexto enriquecido + RAG
	systemPrompt := getSystemPromptWithContextAndRAG(userID, context, userQuery)
	azureMessages := []AzureMessage{
		{Role: "system", Content: systemPrompt},
	}

	for _, msg := range messages {
		azureMessages = append(azureMessages, AzureMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Inclui funções disponíveis
	functions := getAzureFunctions()

	reqBody := AzureChatRequest{
		Messages:            azureMessages,
		MaxCompletionTokens: 1000,
		Functions:           functions,
		FunctionCall:        "auto", // Deixa a IA decidir quando chamar funções
	}

	jsonBody, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s",
		strings.TrimSuffix(endpoint, "/"), deployment, apiVersion)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", 0, fmt.Errorf("Azure OpenAI error: %s - %s", resp.Status, string(body))
	}

	var azureResp AzureChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&azureResp); err != nil {
		return "", 0, err
	}

	if len(azureResp.Choices) == 0 {
		return "", 0, fmt.Errorf("resposta vazia do Azure OpenAI")
	}

	totalTokens := azureResp.Usage.TotalTokens
	choice := azureResp.Choices[0]

	// Verifica se a IA quer chamar uma função
	if choice.FinishReason == "function_call" && choice.Message.FunctionCall != nil {
		log.Printf("🔧 IA solicitou função: %s", choice.Message.FunctionCall.Name)

		// Executa a função
		functionResult, err := processFunctionCall(userID, choice.Message.FunctionCall)
		if err != nil {
			log.Printf("❌ Erro ao executar função: %v", err)
			return "Desculpe, não consegui processar sua solicitação. Tente novamente.", totalTokens, nil
		}

		// Adiciona a chamada da função e o resultado às mensagens
		azureMessages = append(azureMessages, AzureMessage{
			Role:         "assistant",
			FunctionCall: choice.Message.FunctionCall,
		})
		azureMessages = append(azureMessages, AzureMessage{
			Role:    "function",
			Name:    choice.Message.FunctionCall.Name,
			Content: functionResult,
		})

		// Segunda chamada para a IA processar o resultado da função
		reqBody2 := AzureChatRequest{
			Messages:            azureMessages,
			MaxCompletionTokens: 1000,
		}

		jsonBody2, _ := json.Marshal(reqBody2)
		req2, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody2))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("api-key", apiKey)

		resp2, err := client.Do(req2)
		if err != nil {
			return "", totalTokens, err
		}
		defer resp2.Body.Close()

		if resp2.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp2.Body)
			return "", totalTokens, fmt.Errorf("Azure OpenAI error (function response): %s - %s", resp2.Status, string(body))
		}

		var azureResp2 AzureChatResponse
		if err := json.NewDecoder(resp2.Body).Decode(&azureResp2); err != nil {
			return "", totalTokens, err
		}

		if len(azureResp2.Choices) == 0 {
			return "", totalTokens, fmt.Errorf("resposta vazia do Azure OpenAI após função")
		}

		totalTokens += azureResp2.Usage.TotalTokens
		return azureResp2.Choices[0].Message.Content, totalTokens, nil
	}

	return choice.Message.Content, totalTokens, nil
}

func streamAzureOpenAI(c *fiber.Ctx, messages []models.ChatMessage, context string, userID string, sessionID string) (string, error) {
	endpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
	apiKey := os.Getenv("AZURE_OPENAI_KEY")
	deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
	apiVersion := os.Getenv("AZURE_OPENAI_API_VERSION")

	log.Printf("Azure OpenAI - Endpoint: %s, Deployment: %s, API Version: %s", endpoint, deployment, apiVersion)

	if endpoint == "" || apiKey == "" || deployment == "" {
		errMsg := "Azure OpenAI não configurado"
		log.Printf("Erro: %s", errMsg)
		c.WriteString(fmt.Sprintf("data: {\"error\": \"%s\"}\n\n", errMsg))
		c.WriteString("data: [DONE]\n\n")
		return "", fmt.Errorf(errMsg)
	}

	if apiVersion == "" {
		apiVersion = "2024-02-15-preview"
	}

	// Extrai a última mensagem do usuário para busca RAG
	userQuery := ""
	if len(messages) > 0 {
		userQuery = messages[len(messages)-1].Content
	}

	// Monta mensagens com contexto enriquecido do usuário + RAG
	systemPrompt := getSystemPromptWithContextAndRAG(userID, context, userQuery)
	azureMessages := []AzureMessage{
		{Role: "system", Content: systemPrompt},
	}

	for _, msg := range messages {
		azureMessages = append(azureMessages, AzureMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Inclui funções disponíveis
	functions := getAzureFunctions()

	reqBody := AzureChatRequest{
		Messages:            azureMessages,
		MaxCompletionTokens: 1000,
		Stream:              true,
		Functions:           functions,
		FunctionCall:        "auto",
	}

	jsonBody, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s",
		strings.TrimSuffix(endpoint, "/"), deployment, apiVersion)

	log.Printf("Azure OpenAI URL: %s", url)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Erro ao chamar Azure OpenAI: %v", err)
		c.WriteString(fmt.Sprintf("data: {\"error\": \"%s\"}\n\n", err.Error()))
		c.WriteString("data: [DONE]\n\n")
		return "", err
	}
	defer resp.Body.Close()

	log.Printf("Azure OpenAI Response Status: %d", resp.StatusCode)

	// Verifica se houve erro na resposta
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		errMsg := fmt.Sprintf("Azure OpenAI error: %s - %s", resp.Status, string(body))
		log.Printf("Erro Azure OpenAI: %s", errMsg)
		c.WriteString(fmt.Sprintf("data: {\"error\": \"%s\"}\n\n", resp.Status))
		c.WriteString("data: [DONE]\n\n")
		return "", fmt.Errorf(errMsg)
	}

	// Envia session_id primeiro
	c.WriteString(fmt.Sprintf("data: {\"session_id\": \"%s\"}\n\n", sessionID))

	var fullResponse strings.Builder
	var functionName strings.Builder
	var functionArgs strings.Builder
	var isFunctionCall bool
	var finishReason string

	scanner := bufio.NewScanner(resp.Body)

	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")

			if data == "[DONE]" {
				// Verifica se era uma function_call
				if isFunctionCall && functionName.Len() > 0 {
					// Executa a função
					log.Printf("🔧 Streaming: Executando função %s", functionName.String())

					funcCall := &AzureFunctionCall{
						Name:      functionName.String(),
						Arguments: functionArgs.String(),
					}

					functionResult, err := processFunctionCall(userID, funcCall)
					if err != nil {
						log.Printf("❌ Erro ao executar função: %v", err)
						c.WriteString("data: {\"content\": \"Desculpe, não consegui processar sua solicitação.\"}\n\n")
						c.WriteString("data: [DONE]\n\n")
						return "Erro ao executar função", nil
					}

					// Segunda chamada para processar o resultado (sem streaming para simplificar)
					azureMessages = append(azureMessages, AzureMessage{
						Role:         "assistant",
						FunctionCall: funcCall,
					})
					azureMessages = append(azureMessages, AzureMessage{
						Role:    "function",
						Name:    funcCall.Name,
						Content: functionResult,
					})

					// Faz segunda chamada em streaming
					reqBody2 := AzureChatRequest{
						Messages:            azureMessages,
						MaxCompletionTokens: 1000,
						Stream:              true,
					}

					jsonBody2, _ := json.Marshal(reqBody2)
					req2, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody2))
					req2.Header.Set("Content-Type", "application/json")
					req2.Header.Set("api-key", apiKey)

					resp2, err := client.Do(req2)
					if err != nil {
						log.Printf("Erro na segunda chamada: %v", err)
						c.WriteString("data: [DONE]\n\n")
						return fullResponse.String(), nil
					}
					defer resp2.Body.Close()

					// Processa segunda resposta
					scanner2 := bufio.NewScanner(resp2.Body)
					for scanner2.Scan() {
						line2 := scanner2.Text()
						if strings.HasPrefix(line2, "data: ") {
							data2 := strings.TrimPrefix(line2, "data: ")
							if data2 == "[DONE]" {
								continue
							}
							var streamResp2 StreamResponse
							if err := json.Unmarshal([]byte(data2), &streamResp2); err == nil {
								if len(streamResp2.Choices) > 0 {
									content := streamResp2.Choices[0].Delta.Content
									if content != "" {
										fullResponse.WriteString(content)
										escaped, _ := json.Marshal(content)
										c.WriteString(fmt.Sprintf("data: {\"content\": %s}\n\n", string(escaped)))
									}
								}
							}
						}
					}
				}
				c.WriteString("data: [DONE]\n\n")
				continue
			}

			var streamResp StreamResponse
			if err := json.Unmarshal([]byte(data), &streamResp); err == nil {
				if len(streamResp.Choices) > 0 {
					choice := streamResp.Choices[0]

					// Verifica finish_reason
					if choice.FinishReason != nil {
						finishReason = *choice.FinishReason
						if finishReason == "function_call" {
							isFunctionCall = true
						}
					}

					// Conteúdo normal
					if choice.Delta.Content != "" {
						fullResponse.WriteString(choice.Delta.Content)
						escaped, _ := json.Marshal(choice.Delta.Content)
						c.WriteString(fmt.Sprintf("data: {\"content\": %s}\n\n", string(escaped)))
					}

					// Function call
					if choice.Delta.FunctionCall != nil {
						isFunctionCall = true
						if choice.Delta.FunctionCall.Name != "" {
							functionName.WriteString(choice.Delta.FunctionCall.Name)
						}
						if choice.Delta.FunctionCall.Arguments != "" {
							functionArgs.WriteString(choice.Delta.FunctionCall.Arguments)
						}
					}
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Erro ao ler stream: %v", err)
	}

	return fullResponse.String(), nil
}

// ==================== Helper Functions ====================

func generateSessionTitle(firstMessage string) string {
	// Gera um título baseado na primeira mensagem
	title := firstMessage
	if len(title) > 50 {
		title = title[:47] + "..."
	}
	return title
}

func updateChatUsageStats(userID string, tokens int) {
	var stats models.ChatUsageStats
	result := config.DB.Where("user_id = ?", userID).First(&stats)

	if result.Error != nil {
		// Cria novo registro
		stats = models.ChatUsageStats{
			UserID:        userID,
			TotalMessages: 1,
			TotalTokens:   tokens,
			LastUsedAt:    time.Now(),
		}
		config.DB.Create(&stats)
	} else {
		// Atualiza existente
		config.DB.Model(&stats).Updates(map[string]interface{}{
			"total_messages": stats.TotalMessages + 1,
			"total_tokens":   stats.TotalTokens + tokens,
			"last_used_at":   time.Now(),
		})
	}
}

// ==================== Cache Stats Handler ====================

// GetChatCacheStats retorna estatísticas do cache
// @Summary Obter estatísticas do cache
// @Tags Chat Admin
// @Produce json
// @Success 200 {object} services.CacheStats
// @Router /api/admin/chat/cache/stats [get]
func GetChatCacheStats(c *fiber.Ctx) error {
	cache := services.NewChatCache()
	stats, err := cache.GetStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao buscar estatísticas do cache",
		})
	}

	return c.JSON(stats)
}

// ClearChatCache limpa todo o cache do chat
// @Summary Limpar cache do chat
// @Tags Chat Admin
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/admin/chat/cache/clear [post]
func ClearChatCache(c *fiber.Ctx) error {
	cache := services.NewChatCache()
	if err := cache.ClearAll(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao limpar cache",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Cache limpo com sucesso",
	})
}

// InvalidateUserCache invalida o cache de um usuário específico
// @Summary Invalidar cache do usuário
// @Tags Chat Admin
// @Param id path string true "ID do usuário"
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/admin/chat/cache/user/{id} [delete]
func InvalidateUserCache(c *fiber.Ctx) error {
	userID := c.Params("id")

	cache := services.NewChatCache()
	if err := cache.InvalidateUserContext(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao invalidar cache do usuário",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Cache do usuário invalidado",
		"user_id": userID,
	})
}

