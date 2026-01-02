# 🔧 Frappy IA - Function Calling Completo

> **Guia de implementação** do Function Calling integrado com Redis e RAG
> **Status**: Redis ✅ | RAG ✅ | Function Calling 🚧

---

## 📋 Índice

1. [Arquitetura](#arquitetura)
2. [Funções Disponíveis](#funções-disponíveis)
3. [Implementação Backend](#implementação-backend)
4. [Integração com Redis](#integração-com-redis)
5. [Integração com RAG](#integração-com-rag)
6. [Testes](#testes)

---

## 🏗️ Arquitetura

### Fluxo Completo

```
Usuário: "Quantas férias tenho?"
    ↓
1. Verifica cache Redis → Miss
    ↓
2. Busca contexto básico (nome, cargo) → Cache
    ↓
3. Busca documentos RAG sobre "férias"
    ↓
4. Monta prompt com contexto + RAG
    ↓
5. Define funções disponíveis
    ↓
6. Envia para Azure OpenAI
    ↓
7. IA decide: "Preciso chamar get_vacation_balance()"
    ↓
8. Backend executa função → Busca no banco
    ↓
9. Retorna resultado para IA
    ↓
10. IA processa e responde
    ↓
11. Cacheia resposta no Redis (1h)
    ↓
12. Retorna para usuário
```

---

## 🎯 Funções Disponíveis

### Categoria: Férias

```go
✅ get_vacation_balance()
   - Retorna: saldo, período, prazo

✅ get_vacation_history()
   - Retorna: histórico de férias

✅ request_vacation(start_date, days)
   - Cria solicitação de férias

✅ cancel_vacation(vacation_id)
   - Cancela férias agendadas
```

### Categoria: Ponto

```go
✅ get_today_clock_entries()
   - Retorna: registros de hoje

✅ get_hour_bank()
   - Retorna: banco de horas do mês

✅ clock_punch(type)
   - Registra: entrada, saida, pausa_inicio, pausa_fim

✅ justify_absence(date, reason, attachment)
   - Justifica falta/atraso
```

### Categoria: Folha

```go
✅ get_last_payroll()
   - Retorna: último holerite

✅ get_payroll_history(months)
   - Retorna: histórico de holerites

✅ get_ytd_earnings()
   - Retorna: ganhos no ano
```

### Categoria: Cursos

```go
✅ list_available_courses(category)
   - Lista cursos disponíveis

✅ get_my_courses()
   - Retorna: cursos matriculados

✅ enroll_course(course_id)
   - Inscreve em curso

✅ get_course_progress(course_id)
   - Retorna: progresso do curso
```

### Categoria: Equipe (Gestores)

```go
✅ get_team_members()
   - Lista membros da equipe

✅ get_pending_approvals()
   - Lista aprovações pendentes

✅ approve_vacation(vacation_id)
   - Aprova férias

✅ get_team_performance()
   - Análise de performance
```

---

## 💻 Implementação Backend

### 1. Definir Funções

```go
// services/chat_functions.go
package services

import (
    "github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
)

type FunctionRegistry struct {
    functions map[string]FunctionDefinition
}

type FunctionDefinition struct {
    Name        string
    Description string
    Parameters  map[string]interface{}
    Handler     func(userID string, args map[string]interface{}) (interface{}, error)
}

func NewFunctionRegistry() *FunctionRegistry {
    registry := &FunctionRegistry{
        functions: make(map[string]FunctionDefinition),
    }

    // Registra todas as funções
    registry.registerVacationFunctions()
    registry.registerClockFunctions()
    registry.registerPayrollFunctions()
    registry.registerCourseFunctions()
    registry.registerTeamFunctions()

    return registry
}

// ==================== FÉRIAS ====================

func (r *FunctionRegistry) registerVacationFunctions() {
    // 1. Consultar saldo de férias
    r.functions["get_vacation_balance"] = FunctionDefinition{
        Name:        "get_vacation_balance",
        Description: "Consulta o saldo de férias do usuário, período aquisitivo e prazo para usar",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            balance := getVacationBalance(userID)
            period := getVacationPeriod(userID)
            deadline := getVacationDeadline(userID)
            nextVacation := getNextVacation(userID)

            return map[string]interface{}{
                "balance":       balance,
                "period":        period,
                "deadline":      deadline.Format("2006-01-02"),
                "next_vacation": nextVacation,
            }, nil
        },
    }

    // 2. Histórico de férias
    r.functions["get_vacation_history"] = FunctionDefinition{
        Name:        "get_vacation_history",
        Description: "Retorna o histórico de férias do usuário (últimos 2 anos)",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            history := getVacationHistory(userID, 2)
            return map[string]interface{}{
                "vacations": history,
                "count":     len(history),
            }, nil
        },
    }

    // 3. Solicitar férias
    r.functions["request_vacation"] = FunctionDefinition{
        Name:        "request_vacation",
        Description: "Solicita férias para o usuário. Requer data de início e número de dias",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "start_date": map[string]string{
                    "type":        "string",
                    "description": "Data de início no formato YYYY-MM-DD",
                },
                "days": map[string]interface{}{
                    "type":        "number",
                    "description": "Número de dias de férias (mínimo 5, máximo 30)",
                },
            },
            "required": []string{"start_date", "days"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            startDate := args["start_date"].(string)
            days := int(args["days"].(float64))

            // Valida
            if days < 5 {
                return map[string]interface{}{
                    "success": false,
                    "error":   "Mínimo de 5 dias corridos",
                }, nil
            }

            // Cria solicitação
            vacation, err := createVacationRequest(userID, startDate, days)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            return map[string]interface{}{
                "success":     true,
                "vacation_id": vacation.ID,
                "start_date":  vacation.StartDate.Format("02/01/2006"),
                "end_date":    vacation.EndDate.Format("02/01/2006"),
                "days":        vacation.Days,
                "status":      "Aguardando aprovação",
            }, nil
        },
    }

    // 4. Cancelar férias
    r.functions["cancel_vacation"] = FunctionDefinition{
        Name:        "cancel_vacation",
        Description: "Cancela uma solicitação de férias pendente",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "vacation_id": map[string]string{
                    "type":        "string",
                    "description": "ID da solicitação de férias",
                },
            },
            "required": []string{"vacation_id"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            vacationID := args["vacation_id"].(string)

            err := cancelVacation(userID, vacationID)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            return map[string]interface{}{
                "success": true,
                "message": "Férias canceladas com sucesso",
            }, nil
        },
    }
}
```

// ==================== PONTO ====================

func (r *FunctionRegistry) registerClockFunctions() {
    // 1. Registros de hoje
    r.functions["get_today_clock_entries"] = FunctionDefinition{
        Name:        "get_today_clock_entries",
        Description: "Retorna todos os registros de ponto de hoje",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            entries := getTodayClockEntries(userID)
            workedMinutes := calculateWorkedMinutes(entries)

            return map[string]interface{}{
                "entries":        entries,
                "count":          len(entries),
                "worked_minutes": workedMinutes,
                "worked_hours":   fmt.Sprintf("%dh %dmin", workedMinutes/60, workedMinutes%60),
            }, nil
        },
    }

    // 2. Banco de horas
    r.functions["get_hour_bank"] = FunctionDefinition{
        Name:        "get_hour_bank",
        Description: "Consulta o banco de horas do mês atual",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            bank := getHourBank(userID, time.Now())

            return map[string]interface{}{
                "month":           bank.Month.Format("01/2006"),
                "expected_hours":  bank.Expected / 60,
                "worked_hours":    bank.Worked / 60,
                "balance_minutes": bank.Balance,
                "balance_hours":   fmt.Sprintf("%dh %dmin", abs(bank.Balance)/60, abs(bank.Balance)%60),
                "status":          getBankStatus(bank.Balance),
                "overtime":        bank.Overtime / 60,
            }, nil
        },
    }

    // 3. Registrar ponto
    r.functions["clock_punch"] = FunctionDefinition{
        Name:        "clock_punch",
        Description: "Registra ponto do usuário (entrada, saída, pausa)",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "type": map[string]interface{}{
                    "type":        "string",
                    "description": "Tipo de registro",
                    "enum":        []string{"entrada", "saida", "pausa_inicio", "pausa_fim"},
                },
            },
            "required": []string{"type"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            punchType := args["type"].(string)

            entry, err := createClockEntry(userID, punchType)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            return map[string]interface{}{
                "success":   true,
                "type":      translatePunchType(entry.Type),
                "timestamp": entry.Timestamp.Format("15:04"),
                "message":   fmt.Sprintf("%s registrado às %s", translatePunchType(entry.Type), entry.Timestamp.Format("15:04")),
            }, nil
        },
    }

    // 4. Justificar ausência
    r.functions["justify_absence"] = FunctionDefinition{
        Name:        "justify_absence",
        Description: "Justifica uma falta ou atraso",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "date": map[string]string{
                    "type":        "string",
                    "description": "Data da ausência (YYYY-MM-DD)",
                },
                "reason": map[string]string{
                    "type":        "string",
                    "description": "Motivo da ausência",
                },
                "type": map[string]interface{}{
                    "type":        "string",
                    "description": "Tipo de justificativa",
                    "enum":        []string{"atestado", "falta", "atraso"},
                },
            },
            "required": []string{"date", "reason", "type"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            date := args["date"].(string)
            reason := args["reason"].(string)
            justType := args["type"].(string)

            justification, err := createJustification(userID, date, reason, justType)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            return map[string]interface{}{
                "success": true,
                "id":      justification.ID,
                "status":  "Aguardando aprovação",
                "message": "Justificativa enviada com sucesso",
            }, nil
        },
    }
}
```

// ==================== FOLHA ====================

func (r *FunctionRegistry) registerPayrollFunctions() {
    // 1. Último holerite
    r.functions["get_last_payroll"] = FunctionDefinition{
        Name:        "get_last_payroll",
        Description: "Retorna o último holerite do usuário com todos os detalhes",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            payroll := getLastPayroll(userID)

            return map[string]interface{}{
                "month":            payroll.Month.Format("01/2006"),
                "base_salary":      payroll.BaseSalary,
                "overtime":         payroll.Overtime,
                "night_shift":      payroll.NightShift,
                "bonuses":          payroll.Bonuses,
                "gross_salary":     payroll.GrossSalary,
                "inss":             payroll.INSS,
                "irrf":             payroll.IRRF,
                "transport_voucher": payroll.TransportVoucher,
                "health_plan":      payroll.HealthPlan,
                "total_deductions": payroll.TotalDeductions,
                "net_salary":       payroll.NetSalary,
            }, nil
        },
    }

    // 2. Histórico de holerites
    r.functions["get_payroll_history"] = FunctionDefinition{
        Name:        "get_payroll_history",
        Description: "Retorna histórico de holerites",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "months": map[string]interface{}{
                    "type":        "number",
                    "description": "Número de meses (padrão: 6)",
                },
            },
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            months := 6
            if m, ok := args["months"]; ok {
                months = int(m.(float64))
            }

            history := getPayrollHistory(userID, months)

            return map[string]interface{}{
                "payrolls": history,
                "count":    len(history),
            }, nil
        },
    }

    // 3. Ganhos no ano
    r.functions["get_ytd_earnings"] = FunctionDefinition{
        Name:        "get_ytd_earnings",
        Description: "Retorna total de ganhos no ano (Year-to-Date)",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            ytd := getYTDEarnings(userID)

            return map[string]interface{}{
                "year":          time.Now().Year(),
                "gross_total":   ytd.GrossTotal,
                "net_total":     ytd.NetTotal,
                "inss_total":    ytd.INSSTotal,
                "irrf_total":    ytd.IRRFTotal,
                "overtime_total": ytd.OvertimeTotal,
                "months_paid":   ytd.MonthsPaid,
            }, nil
        },
    }
}

// ==================== CURSOS ====================

func (r *FunctionRegistry) registerCourseFunctions() {
    // 1. Listar cursos disponíveis
    r.functions["list_available_courses"] = FunctionDefinition{
        Name:        "list_available_courses",
        Description: "Lista cursos disponíveis para o usuário, opcionalmente filtrados por categoria",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "category": map[string]string{
                    "type":        "string",
                    "description": "Categoria do curso (opcional)",
                },
            },
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            user := getUserByID(userID)
            courses := getAvailableCourses(user.Department)

            if category, ok := args["category"]; ok {
                courses = filterCoursesByCategory(courses, category.(string))
            }

            return map[string]interface{}{
                "courses": courses,
                "count":   len(courses),
            }, nil
        },
    }

    // 2. Meus cursos
    r.functions["get_my_courses"] = FunctionDefinition{
        Name:        "get_my_courses",
        Description: "Retorna cursos em que o usuário está matriculado",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            enrollments := getMyEnrollments(userID)

            return map[string]interface{}{
                "enrollments":    enrollments,
                "in_progress":    countByStatus(enrollments, "in_progress"),
                "completed":      countByStatus(enrollments, "completed"),
                "not_started":    countByStatus(enrollments, "not_started"),
            }, nil
        },
    }

    // 3. Inscrever em curso
    r.functions["enroll_course"] = FunctionDefinition{
        Name:        "enroll_course",
        Description: "Inscreve o usuário em um curso",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "course_id": map[string]string{
                    "type":        "string",
                    "description": "ID do curso",
                },
            },
            "required": []string{"course_id"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            courseID := args["course_id"].(string)

            enrollment, err := enrollInCourse(userID, courseID)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            return map[string]interface{}{
                "success":       true,
                "enrollment_id": enrollment.ID,
                "course_name":   enrollment.Course.Title,
                "message":       "Inscrição realizada com sucesso!",
            }, nil
        },
    }
}
```

// ==================== EQUIPE (GESTORES) ====================

func (r *FunctionRegistry) registerTeamFunctions() {
    // 1. Membros da equipe
    r.functions["get_team_members"] = FunctionDefinition{
        Name:        "get_team_members",
        Description: "Lista todos os membros da equipe do gestor",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            // Verifica se é gestor
            if !isManager(userID) {
                return map[string]interface{}{
                    "error": "Apenas gestores podem acessar esta função",
                }, nil
            }

            members := getTeamMembers(userID)

            return map[string]interface{}{
                "members": members,
                "count":   len(members),
            }, nil
        },
    }

    // 2. Aprovações pendentes
    r.functions["get_pending_approvals"] = FunctionDefinition{
        Name:        "get_pending_approvals",
        Description: "Lista todas as aprovações pendentes (férias, justificativas, etc)",
        Parameters: map[string]interface{}{
            "type":       "object",
            "properties": map[string]interface{}{},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            if !isManager(userID) {
                return map[string]interface{}{
                    "error": "Apenas gestores podem acessar esta função",
                }, nil
            }

            approvals := getPendingApprovals(userID)

            return map[string]interface{}{
                "vacations":       approvals.Vacations,
                "justifications":  approvals.Justifications,
                "total":           len(approvals.Vacations) + len(approvals.Justifications),
            }, nil
        },
    }

    // 3. Aprovar férias
    r.functions["approve_vacation"] = FunctionDefinition{
        Name:        "approve_vacation",
        Description: "Aprova ou rejeita uma solicitação de férias",
        Parameters: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "vacation_id": map[string]string{
                    "type":        "string",
                    "description": "ID da solicitação de férias",
                },
                "action": map[string]interface{}{
                    "type":        "string",
                    "description": "Ação a tomar",
                    "enum":        []string{"approve", "reject"},
                },
                "comment": map[string]string{
                    "type":        "string",
                    "description": "Comentário (opcional)",
                },
            },
            "required": []string{"vacation_id", "action"},
        },
        Handler: func(userID string, args map[string]interface{}) (interface{}, error) {
            if !isManager(userID) {
                return map[string]interface{}{
                    "success": false,
                    "error":   "Apenas gestores podem aprovar férias",
                }, nil
            }

            vacationID := args["vacation_id"].(string)
            action := args["action"].(string)
            comment := ""
            if c, ok := args["comment"]; ok {
                comment = c.(string)
            }

            err := approveOrRejectVacation(userID, vacationID, action, comment)
            if err != nil {
                return map[string]interface{}{
                    "success": false,
                    "error":   err.Error(),
                }, nil
            }

            message := "Férias aprovadas com sucesso"
            if action == "reject" {
                message = "Férias rejeitadas"
            }

            return map[string]interface{}{
                "success": true,
                "message": message,
            }, nil
        },
    }
}

// Converter para formato Azure OpenAI
func (r *FunctionRegistry) ToAzureFormat() []azopenai.FunctionDefinition {
    functions := []azopenai.FunctionDefinition{}

    for _, fn := range r.functions {
        functions = append(functions, azopenai.FunctionDefinition{
            Name:        toPtr(fn.Name),
            Description: toPtr(fn.Description),
            Parameters:  fn.Parameters,
        })
    }

    return functions
}

// Executar função
func (r *FunctionRegistry) Execute(functionName, userID string, args map[string]interface{}) (interface{}, error) {
    fn, exists := r.functions[functionName]
    if !exists {
        return nil, fmt.Errorf("função não encontrada: %s", functionName)
    }

    return fn.Handler(userID, args)
}

func toPtr(s string) *string {
    return &s
}
```

---

## 🔄 Integração com Redis

### Cache de Funções

```go
// services/chat_cache.go (adicionar)

// Cache de resultados de funções
func (c *ChatCache) GetFunctionResult(functionName, userID string, args map[string]interface{}) (interface{}, error) {
    // Cria chave única baseada em função + args
    argsJSON, _ := json.Marshal(args)
    key := fmt.Sprintf("function:%s:%s:%s", functionName, userID, hashString(string(argsJSON)))

    val, err := c.client.Get(context.Background(), key).Result()
    if err == redis.Nil {
        return nil, nil // Cache miss
    }
    if err != nil {
        return nil, err
    }

    var result interface{}
    json.Unmarshal([]byte(val), &result)
    return result, nil
}

func (c *ChatCache) SetFunctionResult(functionName, userID string, args map[string]interface{}, result interface{}, ttl time.Duration) error {
    argsJSON, _ := json.Marshal(args)
    key := fmt.Sprintf("function:%s:%s:%s", functionName, userID, hashString(string(argsJSON)))

    data, err := json.Marshal(result)
    if err != nil {
        return err
    }

    return c.client.Set(context.Background(), key, data, ttl).Err()
}

func hashString(s string) string {
    hash := sha256.Sum256([]byte(s))
    return hex.EncodeToString(hash[:8]) // Primeiros 8 bytes
}
```

### TTL por Tipo de Função

```go
func getFunctionCacheTTL(functionName string) time.Duration {
    // Funções que mudam raramente: cache longo
    longCache := map[string]bool{
        "list_available_courses": true,
        "get_team_members":       true,
    }

    // Funções que mudam frequentemente: cache curto
    shortCache := map[string]bool{
        "get_today_clock_entries": true,
        "get_pending_approvals":   true,
    }

    // Funções de escrita: sem cache
    noCache := map[string]bool{
        "request_vacation": true,
        "clock_punch":      true,
        "enroll_course":    true,
        "approve_vacation": true,
    }

    if noCache[functionName] {
        return 0 // Sem cache
    }

    if shortCache[functionName] {
        return 1 * time.Minute
    }

    if longCache[functionName] {
        return 1 * time.Hour
    }

    return 5 * time.Minute // Padrão
}
```

---

## 📚 Integração com RAG

### Buscar Documentos Antes de Chamar Funções

```go
// services/chat_service.go

func (s *ChatService) GenerateResponseWithFunctions(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    cache := NewChatCache()
    ragService := NewRAGService()
    registry := NewFunctionRegistry()

    // 1. Busca documentos relevantes (RAG)
    relevantDocs, _ := ragService.SearchRelevantDocuments(req.Message, 3)

    // 2. Monta system prompt com RAG
    systemPrompt := s.buildSystemPromptWithRAG(userID, relevantDocs)

    // 3. Define funções disponíveis
    functions := registry.ToAzureFormat()

    // 4. Constrói mensagens
    messages := []azopenai.ChatRequestMessageClassification{
        &azopenai.ChatRequestSystemMessage{
            Content: &systemPrompt,
        },
    }

    // Adiciona histórico
    if req.ConversationID != "" {
        history := s.getConversationHistory(req.ConversationID, 10)
        for _, msg := range history {
            if msg.Role == "user" {
                messages = append(messages, &azopenai.ChatRequestUserMessage{
                    Content: azopenai.NewChatRequestUserMessageContent(msg.Content),
                })
            } else if msg.Role == "assistant" {
                messages = append(messages, &azopenai.ChatRequestAssistantMessage{
                    Content: &msg.Content,
                })
            }
        }
    }

    // Mensagem atual
    messages = append(messages, &azopenai.ChatRequestUserMessage{
        Content: azopenai.NewChatRequestUserMessageContent(req.Message),
    })

    // 5. Chama Azure OpenAI
    ctx := context.Background()
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")

    resp, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:       messages,
        DeploymentName: &deployment,
        Functions:      functions,
        MaxTokens:      toPtr(int32(1000)),
        Temperature:    toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro ao chamar OpenAI: %w", err)
    }

    choice := resp.Choices[0]

    // 6. Verifica se IA quer chamar função
    if choice.FinishReason != nil && *choice.FinishReason == "function_call" {
        return s.handleFunctionCall(userID, req, messages, choice, registry, cache)
    }

    // 7. Resposta normal (sem function call)
    content := *choice.Message.Content
    tokensUsed := int(*resp.Usage.TotalTokens)

    // Salva conversa
    conversationID := req.ConversationID
    if conversationID == "" {
        conversationID = uuid.New().String()
        s.createConversation(userID, conversationID, req.Message)
    }

    s.saveMessage(conversationID, "user", req.Message, 0)
    s.saveMessage(conversationID, "assistant", content, tokensUsed)

    return &models.ChatResponse{
        ConversationID: conversationID,
        Message:        content,
        TokensUsed:     tokensUsed,
    }, nil
}
```

### Handler de Function Call

```go
func (s *ChatService) handleFunctionCall(
    userID string,
    req models.ChatRequest,
    messages []azopenai.ChatRequestMessageClassification,
    choice azopenai.ChatChoice,
    registry *FunctionRegistry,
    cache *ChatCache,
) (*models.ChatResponse, error) {

    functionCall := choice.Message.FunctionCall
    functionName := *functionCall.Name

    // Parse argumentos
    var args map[string]interface{}
    json.Unmarshal([]byte(*functionCall.Arguments), &args)

    log.Printf("🔧 IA chamou função: %s com args: %v", functionName, args)

    // 1. Verifica cache
    ttl := getFunctionCacheTTL(functionName)
    if ttl > 0 {
        if cachedResult, err := cache.GetFunctionResult(functionName, userID, args); err == nil && cachedResult != nil {
            log.Printf("✅ Cache hit para função: %s", functionName)

            // Pula execução e usa resultado em cache
            functionResult, _ := json.Marshal(cachedResult)
            return s.processFunctionResult(userID, req, messages, choice, string(functionResult))
        }
    }

    // 2. Executa função
    result, err := registry.Execute(functionName, userID, args)
    if err != nil {
        return nil, fmt.Errorf("erro ao executar função %s: %w", functionName, err)
    }

    // 3. Cacheia resultado (se aplicável)
    if ttl > 0 {
        cache.SetFunctionResult(functionName, userID, args, result, ttl)
    }

    // 4. Converte resultado para JSON
    functionResult, _ := json.Marshal(result)

    // 5. Processa resultado
    return s.processFunctionResult(userID, req, messages, choice, string(functionResult))
}

func (s *ChatService) processFunctionResult(
    userID string,
    req models.ChatRequest,
    messages []azopenai.ChatRequestMessageClassification,
    choice azopenai.ChatChoice,
    functionResult string,
) (*models.ChatResponse, error) {

    // Adiciona chamada da função às mensagens
    messages = append(messages, &azopenai.ChatRequestAssistantMessage{
        Content:      choice.Message.Content,
        FunctionCall: choice.Message.FunctionCall,
    })

    // Adiciona resultado da função
    messages = append(messages, &azopenai.ChatRequestFunctionMessage{
        Name:    choice.Message.FunctionCall.Name,
        Content: &functionResult,
    })

    // Segunda chamada para IA processar o resultado
    ctx := context.Background()
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")

    resp2, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:       messages,
        DeploymentName: &deployment,
        MaxTokens:      toPtr(int32(1000)),
        Temperature:    toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro na segunda chamada: %w", err)
    }

    content := *resp2.Choices[0].Message.Content
    tokensUsed := int(*resp2.Usage.TotalTokens)

    // Salva conversa
    conversationID := req.ConversationID
    if conversationID == "" {
        conversationID = uuid.New().String()
        s.createConversation(userID, conversationID, req.Message)
    }

    s.saveMessage(conversationID, "user", req.Message, 0)
    s.saveMessage(conversationID, "function_call", *choice.Message.FunctionCall.Name, 0)
    s.saveMessage(conversationID, "assistant", content, tokensUsed)

    return &models.ChatResponse{
        ConversationID: conversationID,
        Message:        content,
        TokensUsed:     tokensUsed,
    }, nil
}
```

### System Prompt com RAG

```go
func (s *ChatService) buildSystemPromptWithRAG(userID string, docs []models.KnowledgeDocument) string {
    user := getUserByID(userID)

    prompt := fmt.Sprintf(`Você é o Frappy IA, assistente do FrappYOU.

## CONTEXTO DO USUÁRIO
- Nome: %s
- Cargo: %s
- Departamento: %s
- É gestor: %v

## FUNÇÕES DISPONÍVEIS
Você tem acesso a funções para buscar dados e executar ações:

**Férias:**
- get_vacation_balance(): consultar saldo
- request_vacation(start_date, days): solicitar férias
- cancel_vacation(vacation_id): cancelar férias

**Ponto:**
- get_today_clock_entries(): registros de hoje
- get_hour_bank(): banco de horas
- clock_punch(type): registrar ponto
- justify_absence(date, reason, type): justificar falta

**Folha:**
- get_last_payroll(): último holerite
- get_ytd_earnings(): ganhos no ano

**Cursos:**
- list_available_courses(category): listar cursos
- get_my_courses(): meus cursos
- enroll_course(course_id): inscrever

**Equipe (apenas gestores):**
- get_team_members(): membros da equipe
- get_pending_approvals(): aprovações pendentes
- approve_vacation(vacation_id, action): aprovar/rejeitar
`,
        user.Name,
        user.Position,
        user.Department,
        isManager(userID),
    )

    // Adiciona documentos RAG
    if len(docs) > 0 {
        prompt += "\n## DOCUMENTOS RELEVANTES\n\n"
        for i, doc := range docs {
            prompt += fmt.Sprintf("### %d. %s\n%s\n\n", i+1, doc.Title, doc.Content)
        }
    }

    prompt += `
## INSTRUÇÕES
1. Use as funções quando o usuário pedir dados ou ações
2. Use os documentos acima para responder sobre políticas
3. Seja específico e objetivo
4. Use emojis moderadamente
5. Responda em português do Brasil
6. Se não tiver certeza, pergunte ao usuário

## EXEMPLOS

Usuário: "Quantas férias tenho?"
→ Chame get_vacation_balance()

Usuário: "Quero tirar 10 dias em janeiro"
→ Chame request_vacation("2025-01-10", 10)

Usuário: "Registrar entrada"
→ Chame clock_punch("entrada")

Usuário: "Como funciona o home office?"
→ Use os documentos relevantes para responder
`

    return prompt
}
```

---

## 🧪 Testes

### 1. Teste de Função Individual

```go
// services/chat_functions_test.go
package services

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestGetVacationBalance(t *testing.T) {
    registry := NewFunctionRegistry()

    // Executa função
    result, err := registry.Execute("get_vacation_balance", "user123", map[string]interface{}{})

    assert.NoError(t, err)
    assert.NotNil(t, result)

    data := result.(map[string]interface{})
    assert.Contains(t, data, "balance")
    assert.Contains(t, data, "period")
    assert.Contains(t, data, "deadline")
}

func TestRequestVacation(t *testing.T) {
    registry := NewFunctionRegistry()

    args := map[string]interface{}{
        "start_date": "2025-01-10",
        "days":       float64(15),
    }

    result, err := registry.Execute("request_vacation", "user123", args)

    assert.NoError(t, err)

    data := result.(map[string]interface{})
    assert.True(t, data["success"].(bool))
    assert.Contains(t, data, "vacation_id")
}

func TestClockPunch(t *testing.T) {
    registry := NewFunctionRegistry()

    args := map[string]interface{}{
        "type": "entrada",
    }

    result, err := registry.Execute("clock_punch", "user123", args)

    assert.NoError(t, err)

    data := result.(map[string]interface{})
    assert.True(t, data["success"].(bool))
    assert.Equal(t, "Entrada", data["type"])
}
```

### 2. Teste de Cache

```go
func TestFunctionCache(t *testing.T) {
    cache := NewChatCache()

    args := map[string]interface{}{}
    result := map[string]interface{}{
        "balance": 30,
        "period":  "01/03/2023 a 28/02/2024",
    }

    // Salva no cache
    err := cache.SetFunctionResult("get_vacation_balance", "user123", args, result, 5*time.Minute)
    assert.NoError(t, err)

    // Busca do cache
    cached, err := cache.GetFunctionResult("get_vacation_balance", "user123", args)
    assert.NoError(t, err)
    assert.NotNil(t, cached)

    cachedData := cached.(map[string]interface{})
    assert.Equal(t, float64(30), cachedData["balance"])
}
```

### 3. Teste End-to-End

```bash
# Testar via curl
curl -X POST http://localhost:8080/api/chat/message \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quantas férias eu tenho?"
  }'

# Resposta esperada:
{
  "conversation_id": "abc123",
  "message": "Você tem 30 dias de férias disponíveis! 📅\nSeu período aquisitivo é de 01/03/2023 a 28/02/2024 e você precisa usar até 28/02/2025.",
  "tokens_used": 450
}
```

### 4. Teste de Ação

```bash
# Solicitar férias
curl -X POST http://localhost:8080/api/chat/message \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quero tirar 15 dias de férias a partir de 10/01/2025"
  }'

# Resposta esperada:
{
  "message": "Pronto! ✅ Suas férias foram solicitadas:\n- Período: 10/01/2025 a 24/01/2025 (15 dias)\n- Status: Aguardando aprovação do gestor\n\nVocê receberá uma notificação quando for aprovado!"
}
```

---

## 📊 Monitoramento

### Métricas de Funções

```go
// handlers/chat_metrics.go

func GetFunctionMetrics(c *fiber.Ctx) error {
    metrics := map[string]interface{}{
        // Uso de funções
        "total_function_calls":    getTotalFunctionCalls(),
        "most_used_functions":     getMostUsedFunctions(10),
        "function_success_rate":   getFunctionSuccessRate(),
        "avg_function_time":       getAvgFunctionExecutionTime(),

        // Cache
        "function_cache_hit_rate": getFunctionCacheHitRate(),
        "cached_functions":        getCachedFunctionsCount(),

        // Erros
        "function_errors":         getFunctionErrors(),
        "failed_functions":        getFailedFunctions(),
    }

    return c.JSON(metrics)
}

func getMostUsedFunctions(limit int) []map[string]interface{} {
    // Busca do banco ou Redis
    var stats []struct {
        FunctionName string
        Count        int
    }

    db.Raw(`
        SELECT
            content as function_name,
            COUNT(*) as count
        FROM chat_messages
        WHERE role = 'function_call'
        GROUP BY content
        ORDER BY count DESC
        LIMIT ?
    `, limit).Scan(&stats)

    result := []map[string]interface{}{}
    for _, stat := range stats {
        result = append(result, map[string]interface{}{
            "function": stat.FunctionName,
            "count":    stat.Count,
        })
    }

    return result
}
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar `services/chat_functions.go`
- [ ] Implementar FunctionRegistry
- [ ] Registrar todas as funções (férias, ponto, folha, cursos, equipe)
- [ ] Integrar com cache Redis
- [ ] Integrar com RAG
- [ ] Atualizar ChatService
- [ ] Adicionar logs de auditoria
- [ ] Implementar métricas

### Testes
- [ ] Testes unitários de cada função
- [ ] Testes de cache
- [ ] Testes end-to-end
- [ ] Testes de permissões (gestor vs colaborador)
- [ ] Testes de erro

### Deploy
- [ ] Atualizar variáveis de ambiente
- [ ] Deploy em staging
- [ ] Testes com usuários reais
- [ ] Monitorar métricas
- [ ] Deploy em produção

---

## 🚀 Próximos Passos

1. **Implementar funções básicas** (férias, ponto, folha)
2. **Testar com usuários reais**
3. **Adicionar mais funções** (cursos, equipe)
4. **Otimizar cache**
5. **Monitorar e ajustar**

---

**Criado para FrappYOU** | Última atualização: Dezembro 2024
