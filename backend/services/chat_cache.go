package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
)

// ==================== Cache Configuration ====================

const (
	// TTLs de cache
	UserContextTTL    = 5 * time.Minute  // Contexto do usuário: 5 minutos
	CommonResponseTTL = 1 * time.Hour    // Respostas comuns: 1 hora
	RAGResultsTTL     = 30 * time.Minute // Resultados RAG: 30 minutos
	FunctionResultTTL = 5 * time.Minute  // Resultados de funções: 5 minutos

	// Prefixos de chave
	PrefixUserContext   = "chat:context:"
	PrefixResponse      = "chat:response:"
	PrefixRAG           = "chat:rag:"
	PrefixRateLimit     = "chat:ratelimit:"
	PrefixFunction      = "chat:function:"
)

// ==================== Chat Cache Service ====================

// ChatCache serviço de cache para o chat
type ChatCache struct{}

// NewChatCache cria uma nova instância do serviço de cache
func NewChatCache() *ChatCache {
	return &ChatCache{}
}

// IsAvailable verifica se o cache está disponível
func (c *ChatCache) IsAvailable() bool {
	return config.IsRedisAvailable()
}

// ==================== User Context Cache ====================

// CachedUserContext contexto do usuário cacheado
type CachedUserContext struct {
	UserName       string    `json:"user_name"`
	UserEmail      string    `json:"user_email"`
	UserPosition   string    `json:"user_position"`
	UserDepartment string    `json:"user_department"`
	VacationDays   int       `json:"vacation_days"`
	CoursesCount   int       `json:"courses_count"`
	BadgesCount    int       `json:"badges_count"`
	SystemPrompt   string    `json:"system_prompt"`
	CachedAt       time.Time `json:"cached_at"`
}

// GetUserContext busca o contexto do usuário no cache
func (c *ChatCache) GetUserContext(userID string) (*CachedUserContext, error) {
	if !c.IsAvailable() {
		return nil, nil // Cache indisponível
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixUserContext + userID
	val, err := config.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, nil // Cache miss ou erro
	}

	var cached CachedUserContext
	if err := json.Unmarshal([]byte(val), &cached); err != nil {
		return nil, err
	}

	log.Printf("✅ Cache HIT: contexto do usuário %s", userID)
	return &cached, nil
}

// SetUserContext salva o contexto do usuário no cache
func (c *ChatCache) SetUserContext(userID string, cached *CachedUserContext) error {
	if !c.IsAvailable() {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cached.CachedAt = time.Now()
	data, err := json.Marshal(cached)
	if err != nil {
		return err
	}

	key := PrefixUserContext + userID
	return config.RedisClient.Set(ctx, key, data, UserContextTTL).Err()
}

// InvalidateUserContext invalida o cache do contexto do usuário
func (c *ChatCache) InvalidateUserContext(userID string) error {
	if !c.IsAvailable() {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixUserContext + userID
	return config.RedisClient.Del(ctx, key).Err()
}

// ==================== Response Cache ====================

// CachedResponse resposta cacheada
type CachedResponse struct {
	Query    string    `json:"query"`
	Response string    `json:"response"`
	Context  string    `json:"context"`
	CachedAt time.Time `json:"cached_at"`
	HitCount int       `json:"hit_count"`
}

// GetCachedResponse busca resposta cacheada para uma query
func (c *ChatCache) GetCachedResponse(query string, chatContext string) (*CachedResponse, error) {
	if !c.IsAvailable() {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixResponse + hashQuery(query, chatContext)
	val, err := config.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, nil // Cache miss
	}

	var cached CachedResponse
	if err := json.Unmarshal([]byte(val), &cached); err != nil {
		return nil, err
	}

	// Incrementa contador de hits
	cached.HitCount++
	go c.updateHitCount(key, &cached)

	log.Printf("✅ Cache HIT: resposta para '%s...'", truncate(query, 30))
	return &cached, nil
}

// SetCachedResponse salva uma resposta no cache
func (c *ChatCache) SetCachedResponse(query, response, chatContext string) error {
	if !c.IsAvailable() {
		return nil
	}

	// Só cacheia respostas para perguntas comuns
	if !isCommonQuestion(query) {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cached := CachedResponse{
		Query:    query,
		Response: response,
		Context:  chatContext,
		CachedAt: time.Now(),
		HitCount: 0,
	}

	data, err := json.Marshal(cached)
	if err != nil {
		return err
	}

	key := PrefixResponse + hashQuery(query, chatContext)
	log.Printf("💾 Cacheando resposta para: '%s...'", truncate(query, 30))
	return config.RedisClient.Set(ctx, key, data, CommonResponseTTL).Err()
}

func (c *ChatCache) updateHitCount(key string, cached *CachedResponse) {
	if !c.IsAvailable() {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	data, _ := json.Marshal(cached)
	// Mantém o TTL restante
	config.RedisClient.Set(ctx, key, data, 0).Err()
}

// ==================== RAG Cache ====================

// CachedRAGResult resultado RAG cacheado
type CachedRAGResult struct {
	Query      string   `json:"query"`
	ArticleIDs []string `json:"article_ids"`
	Context    string   `json:"context"`
	CachedAt   time.Time `json:"cached_at"`
}

// GetRAGResults busca resultados RAG cacheados
func (c *ChatCache) GetRAGResults(query string) (*CachedRAGResult, error) {
	if !c.IsAvailable() {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixRAG + hashQuery(query, "")
	val, err := config.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, nil
	}

	var cached CachedRAGResult
	if err := json.Unmarshal([]byte(val), &cached); err != nil {
		return nil, err
	}

	log.Printf("✅ Cache HIT: RAG para '%s...'", truncate(query, 30))
	return &cached, nil
}

// SetRAGResults salva resultados RAG no cache
func (c *ChatCache) SetRAGResults(query string, articleIDs []string, ragContext string) error {
	if !c.IsAvailable() {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cached := CachedRAGResult{
		Query:      query,
		ArticleIDs: articleIDs,
		Context:    ragContext,
		CachedAt:   time.Now(),
	}

	data, err := json.Marshal(cached)
	if err != nil {
		return err
	}

	key := PrefixRAG + hashQuery(query, "")
	return config.RedisClient.Set(ctx, key, data, RAGResultsTTL).Err()
}

// ==================== Function Results Cache ====================

// CachedFunctionResult resultado de função cacheado
type CachedFunctionResult struct {
	FunctionName string      `json:"function_name"`
	Arguments    string      `json:"arguments"`
	Result       interface{} `json:"result"`
	CachedAt     time.Time   `json:"cached_at"`
}

// GetFunctionResult busca resultado de função no cache
func (c *ChatCache) GetFunctionResult(functionName, userID string, arguments string) (*CachedFunctionResult, error) {
	if !c.IsAvailable() {
		return nil, nil
	}

	// Funções de escrita não são cacheadas
	if isWriteFunction(functionName) {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixFunction + hashFunctionCall(functionName, userID, arguments)
	val, err := config.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, nil // Cache miss
	}

	var cached CachedFunctionResult
	if err := json.Unmarshal([]byte(val), &cached); err != nil {
		return nil, err
	}

	log.Printf("✅ Cache HIT: função %s para usuário %s", functionName, userID[:8])
	return &cached, nil
}

// SetFunctionResult salva resultado de função no cache
func (c *ChatCache) SetFunctionResult(functionName, userID string, arguments string, result interface{}) error {
	if !c.IsAvailable() {
		return nil
	}

	// Funções de escrita não são cacheadas
	if isWriteFunction(functionName) {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cached := CachedFunctionResult{
		FunctionName: functionName,
		Arguments:    arguments,
		Result:       result,
		CachedAt:     time.Now(),
	}

	data, err := json.Marshal(cached)
	if err != nil {
		return err
	}

	key := PrefixFunction + hashFunctionCall(functionName, userID, arguments)
	ttl := getFunctionCacheTTL(functionName)

	log.Printf("💾 Cacheando resultado da função %s", functionName)
	return config.RedisClient.Set(ctx, key, data, ttl).Err()
}

// InvalidateFunctionCache invalida cache de funções de um usuário
func (c *ChatCache) InvalidateFunctionCache(userID string) error {
	if !c.IsAvailable() {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Busca todas as chaves de função do usuário
	pattern := PrefixFunction + "*:" + userID + ":*"
	keys, err := config.RedisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		config.RedisClient.Del(ctx, keys...)
		log.Printf("🗑️ Invalidado cache de %d funções para usuário %s", len(keys), userID[:8])
	}

	return nil
}

// hashFunctionCall cria hash único para chamada de função
func hashFunctionCall(functionName, userID, arguments string) string {
	combined := functionName + ":" + userID + ":" + arguments
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:12])
}

// getFunctionCacheTTL retorna TTL baseado no tipo de função
func getFunctionCacheTTL(functionName string) time.Duration {
	// Funções com dados que mudam pouco: cache longo
	longCache := map[string]bool{
		"list_available_courses": true,
		"get_birthdays":          true,
		"get_team_members":       true,
	}

	// Funções com dados que mudam frequentemente: cache curto
	shortCache := map[string]bool{
		"get_today_clock_entries": true,
		"get_pending_approvals":   true,
		"get_hour_bank":           true,
	}

	if longCache[functionName] {
		return 30 * time.Minute
	}

	if shortCache[functionName] {
		return 1 * time.Minute
	}

	return FunctionResultTTL // 5 minutos padrão
}

// isWriteFunction verifica se é uma função de escrita (não cachear)
func isWriteFunction(functionName string) bool {
	writeFunctions := map[string]bool{
		"request_vacation":    true,
		"cancel_vacation":     true,
		"sell_vacation_days":  true,
		"clock_punch":         true,
		"justify_absence":     true,
		"enroll_in_course":    true,
		"approve_vacation":    true,
		"reject_vacation":     true,
	}
	return writeFunctions[functionName]
}

// ==================== Rate Limiting ====================

// CheckRateLimit verifica limite de requisições do usuário
func (c *ChatCache) CheckRateLimit(userID string, maxRequests int, window time.Duration) (bool, int, error) {
	if !c.IsAvailable() {
		return true, 0, nil // Sem cache, permite tudo
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	key := PrefixRateLimit + userID

	// Incrementa contador
	count, err := config.RedisClient.Incr(ctx, key).Result()
	if err != nil {
		return true, 0, err
	}

	// Se é primeira requisição, define TTL
	if count == 1 {
		config.RedisClient.Expire(ctx, key, window)
	}

	remaining := maxRequests - int(count)
	if remaining < 0 {
		remaining = 0
	}

	allowed := count <= int64(maxRequests)
	return allowed, remaining, nil
}

// ==================== Cache Stats ====================

// CacheStats estatísticas do cache
type CacheStats struct {
	Available      bool   `json:"available"`
	ContextKeys    int64  `json:"context_keys"`
	ResponseKeys   int64  `json:"response_keys"`
	RAGKeys        int64  `json:"rag_keys"`
	FunctionKeys   int64  `json:"function_keys"`
	TotalKeys      int64  `json:"total_keys"`
	MemoryUsed     string `json:"memory_used"`
	HitRate        string `json:"hit_rate"`
}

// GetStats retorna estatísticas do cache
func (c *ChatCache) GetStats() (*CacheStats, error) {
	stats := &CacheStats{
		Available: c.IsAvailable(),
	}

	if !c.IsAvailable() {
		return stats, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Conta chaves por tipo
	contextKeys, _ := config.RedisClient.Keys(ctx, PrefixUserContext+"*").Result()
	responseKeys, _ := config.RedisClient.Keys(ctx, PrefixResponse+"*").Result()
	ragKeys, _ := config.RedisClient.Keys(ctx, PrefixRAG+"*").Result()
	functionKeys, _ := config.RedisClient.Keys(ctx, PrefixFunction+"*").Result()

	stats.ContextKeys = int64(len(contextKeys))
	stats.ResponseKeys = int64(len(responseKeys))
	stats.RAGKeys = int64(len(ragKeys))
	stats.FunctionKeys = int64(len(functionKeys))
	stats.TotalKeys = stats.ContextKeys + stats.ResponseKeys + stats.RAGKeys + stats.FunctionKeys

	// Informações do Redis
	info, err := config.RedisClient.Info(ctx, "memory").Result()
	if err == nil {
		// Extrai used_memory_human
		for _, line := range strings.Split(info, "\r\n") {
			if strings.HasPrefix(line, "used_memory_human:") {
				stats.MemoryUsed = strings.TrimPrefix(line, "used_memory_human:")
				break
			}
		}
	}

	// Hit rate do Redis
	infoStats, err := config.RedisClient.Info(ctx, "stats").Result()
	if err == nil {
		var hits, misses int64
		for _, line := range strings.Split(infoStats, "\r\n") {
			if strings.HasPrefix(line, "keyspace_hits:") {
				val := strings.TrimPrefix(line, "keyspace_hits:")
				hits, _ = parseInt64(val)
			}
			if strings.HasPrefix(line, "keyspace_misses:") {
				val := strings.TrimPrefix(line, "keyspace_misses:")
				misses, _ = parseInt64(val)
			}
		}
		if hits+misses > 0 {
			rate := float64(hits) / float64(hits+misses) * 100
			stats.HitRate = strings.TrimRight(strings.TrimRight(
				strings.Replace(string(rune(int(rate*100)/100)), ".", ",", 1),
				"0"), ",") + "%"
		}
	}

	return stats, nil
}

// ClearAll limpa todo o cache do chat
func (c *ChatCache) ClearAll() error {
	if !c.IsAvailable() {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Busca e deleta todas as chaves do chat
	patterns := []string{
		PrefixUserContext + "*",
		PrefixResponse + "*",
		PrefixRAG + "*",
		PrefixRateLimit + "*",
		PrefixFunction + "*",
	}

	for _, pattern := range patterns {
		keys, err := config.RedisClient.Keys(ctx, pattern).Result()
		if err != nil {
			continue
		}
		if len(keys) > 0 {
			config.RedisClient.Del(ctx, keys...)
		}
	}

	log.Println("🗑️ Cache do chat limpo")
	return nil
}

// ==================== Helper Functions ====================

// hashQuery cria um hash único para a query
func hashQuery(query, context string) string {
	// Normaliza a query
	normalized := strings.ToLower(strings.TrimSpace(query))
	// Remove caracteres especiais e múltiplos espaços
	normalized = strings.Join(strings.Fields(normalized), " ")

	// Combina com contexto
	combined := normalized + "|" + context

	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:16]) // Usa apenas primeiros 16 bytes
}

// isCommonQuestion verifica se é uma pergunta comum que deve ser cacheada
func isCommonQuestion(message string) bool {
	lower := strings.ToLower(message)

	// Padrões de perguntas comuns
	commonPatterns := []string{
		// Férias
		"quantas férias", "quantos dias de férias", "saldo de férias",
		"como solicitar férias", "vender férias", "abono pecuniário",

		// Holerite
		"entender holerite", "explicar holerite", "o que é inss",
		"o que é irrf", "descontos do holerite",

		// Benefícios
		"plano de saúde", "vale refeição", "vale alimentação",
		"vale transporte", "benefícios",

		// Políticas
		"home office", "trabalho remoto", "dress code",
		"código de conduta", "política de",

		// Cursos
		"cursos disponíveis", "como fazer curso", "certificado",

		// PDI
		"o que é pdi", "como criar pdi", "metas smart",

		// Geral
		"como funciona", "o que é", "qual a política",
	}

	for _, pattern := range commonPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}

	return false
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func parseInt64(s string) (int64, error) {
	s = strings.TrimSpace(s)
	var result int64
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result = result*10 + int64(c-'0')
		}
	}
	return result, nil
}

