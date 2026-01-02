# 🧠 Frappy IA - Integração com Dados Reais do Sistema

> **Guia avançado** para fazer o Frappy IA ler e processar dados reais do FrappYOU
> **Objetivo**: IA contextualizada que responde com dados precisos do banco

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura de Dados](#arquitetura-de-dados)
3. [Context Injection](#context-injection)
4. [Function Calling](#function-calling)
5. [RAG - Base de Conhecimento](#rag-base-de-conhecimento)
6. [Cache Inteligente](#cache-inteligente)

---

## 🎯 Visão Geral

### Problema Atual

O chat básico do Azure OpenAI **não tem acesso** aos dados do sistema:
- ❌ Não sabe quantas férias o usuário tem
- ❌ Não conhece o saldo do banco de horas
- ❌ Não vê os cursos disponíveis
- ❌ Não acessa políticas da empresa

### Solução: 3 Estratégias

1. **Context Injection** - Injetar dados no system prompt
2. **Function Calling** - IA chama funções do backend
3. **RAG** - Busca em base de conhecimento

---

## 🏗️ Arquitetura de Dados

### Fluxo Completo

```
Usuário: "Quantas férias tenho?"
    ↓
Backend recebe pergunta
    ↓
Identifica contexto necessário (férias)
    ↓
Busca dados no banco SQL
    ↓
Injeta dados no prompt
    ↓
Envia para Azure OpenAI
    ↓
IA responde com dados reais
    ↓
Retorna para usuário
```

---

## 💉 Context Injection (Estratégia 1)

### Conceito

Buscar dados do banco **antes** de chamar a IA e injetar no system prompt.

### Implementação Completa

```go
// services/chat_context.go
package services

import (
    "fmt"
    "time"
    "github.com/frappyou/backend/models"
)

type ChatContext struct {
    UserData      *models.User
    VacationData  *VacationContext
    ClockData     *ClockContext
    PayrollData   *PayrollContext
    CoursesData   *CoursesContext
    TeamData      *TeamContext
}

type VacationContext struct {
    Balance        int       `json:"balance"`
    Period         string    `json:"period"`
    Deadline       time.Time `json:"deadline"`
    NextVacation   *models.Vacation `json:"next_vacation"`
    PendingRequest bool      `json:"pending_request"`
}

type ClockContext struct {
    TodayEntries   []models.ClockEntry `json:"today_entries"`
    MonthHours     int                 `json:"month_hours"`
    ExpectedHours  int                 `json:"expected_hours"`
    BankBalance    int                 `json:"bank_balance"` // minutos
    LastEntry      *models.ClockEntry  `json:"last_entry"`
}

type PayrollContext struct {
    LastPayroll    *models.Payroll `json:"last_payroll"`
    YTDEarnings    float64         `json:"ytd_earnings"`
    AvgSalary      float64         `json:"avg_salary"`
}

type CoursesContext struct {
    EnrolledCourses []models.Course `json:"enrolled"`
    AvailableCourses []models.Course `json:"available"`
    CompletedCount  int             `json:"completed_count"`
    InProgressCount int             `json:"in_progress_count"`
}

type TeamContext struct {
    Manager      *models.User   `json:"manager"`
    TeamMembers  []models.User  `json:"team_members"`
    Department   string         `json:"department"`
}
```

// Buscar contexto completo do usuário
func (s *ChatService) GetUserContext(userID string) (*ChatContext, error) {
    ctx := &ChatContext{}

    // 1. Dados básicos do usuário
    user, err := getUserByID(userID)
    if err != nil {
        return nil, err
    }
    ctx.UserData = user

    // 2. Dados de férias
    ctx.VacationData = &VacationContext{
        Balance:  getVacationBalance(userID),
        Period:   getVacationPeriod(userID),
        Deadline: getVacationDeadline(userID),
        NextVacation: getNextVacation(userID),
        PendingRequest: hasPendingVacationRequest(userID),
    }

    // 3. Dados de ponto
    ctx.ClockData = &ClockContext{
        TodayEntries:  getTodayClockEntries(userID),
        MonthHours:    getMonthWorkedHours(userID),
        ExpectedHours: getExpectedHours(userID),
        BankBalance:   getHourBankBalance(userID),
        LastEntry:     getLastClockEntry(userID),
    }

    // 4. Dados de folha
    ctx.PayrollData = &PayrollContext{
        LastPayroll: getLastPayroll(userID),
        YTDEarnings: getYTDEarnings(userID),
        AvgSalary:   getAvgSalary(userID),
    }

    // 5. Dados de cursos
    ctx.CoursesData = &CoursesContext{
        EnrolledCourses:  getEnrolledCourses(userID),
        AvailableCourses: getAvailableCourses(user.Department),
        CompletedCount:   getCompletedCoursesCount(userID),
        InProgressCount:  getInProgressCoursesCount(userID),
    }

    // 6. Dados da equipe
    ctx.TeamData = &TeamContext{
        Manager:     getManager(userID),
        TeamMembers: getTeamMembers(userID),
        Department:  user.Department,
    }

    return ctx, nil
}
```

// System prompt com contexto completo
func (s *ChatService) getSystemPromptWithContext(userID string) string {
    context, err := s.GetUserContext(userID)
    if err != nil {
        // Fallback para prompt básico
        return s.getBasicSystemPrompt(userID)
    }

    prompt := fmt.Sprintf(`Você é o Frappy IA, assistente virtual do FrappYOU.

## DADOS DO COLABORADOR

### Informações Pessoais
- Nome: %s
- Cargo: %s
- Departamento: %s
- Data de admissão: %s
- Tempo de casa: %s

### Férias
- Saldo disponível: %d dias
- Período aquisitivo: %s
- Prazo para usar: %s
- Próximas férias agendadas: %s
- Solicitação pendente: %v

### Ponto Eletrônico (Hoje)
- Registros de hoje: %d
- Horas trabalhadas no mês: %dh %dmin
- Horas esperadas: %dh
- Banco de horas: %s (%dh %dmin)
- Último registro: %s

### Folha de Pagamento
- Último holerite: %s
- Salário líquido: R$ %.2f
- Ganhos no ano: R$ %.2f

### Cursos e Desenvolvimento
- Cursos em andamento: %d
- Cursos concluídos: %d
- Cursos disponíveis: %d

### Equipe
- Gestor: %s
- Membros da equipe: %d pessoas
- Departamento: %s

## INSTRUÇÕES

1. Use SEMPRE os dados acima para responder perguntas
2. Seja específico e preciso com números e datas
3. Se o usuário perguntar sobre dados que você tem, responda diretamente
4. Se não tiver o dado, seja honesto e sugira contatar RH
5. Use emojis para deixar a conversa mais amigável
6. Formate datas no padrão brasileiro (DD/MM/YYYY)
7. Formate valores monetários com R$ e 2 casas decimais

## EXEMPLOS DE RESPOSTAS

Pergunta: "Quantas férias tenho?"
Resposta: "Você tem %d dias de férias disponíveis! 📅 Seu período aquisitivo é %s e você precisa usar até %s. %s"

Pergunta: "Como está meu banco de horas?"
Resposta: "Seu banco de horas está %s com %dh %dmin. Você trabalhou %dh %dmin este mês e o esperado era %dh. %s"

Responda sempre em português do Brasil.`,
        // Dados pessoais
        context.UserData.Name,
        context.UserData.Position,
        context.UserData.Department,
        context.UserData.HireDate.Format("02/01/2006"),
        calculateTimeInCompany(context.UserData.HireDate),

        // Férias
        context.VacationData.Balance,
        context.VacationData.Period,
        context.VacationData.Deadline.Format("02/01/2006"),
        formatNextVacation(context.VacationData.NextVacation),
        context.VacationData.PendingRequest,

        // Ponto
        len(context.ClockData.TodayEntries),
        context.ClockData.MonthHours/60,
        context.ClockData.MonthHours%60,
        context.ClockData.ExpectedHours/60,
        formatBankBalance(context.ClockData.BankBalance),
        abs(context.ClockData.BankBalance)/60,
        abs(context.ClockData.BankBalance)%60,
        formatLastEntry(context.ClockData.LastEntry),

        // Folha
        context.PayrollData.LastPayroll.Month.Format("01/2006"),
        context.PayrollData.LastPayroll.NetSalary,
        context.PayrollData.YTDEarnings,

        // Cursos
        context.CoursesData.InProgressCount,
        context.CoursesData.CompletedCount,
        len(context.CoursesData.AvailableCourses),

        // Equipe
        context.TeamData.Manager.Name,
        len(context.TeamData.TeamMembers),
        context.TeamData.Department,

        // Exemplos dinâmicos
        context.VacationData.Balance,
        context.VacationData.Period,
        context.VacationData.Deadline.Format("02/01/2006"),
        getVacationAdvice(context.VacationData),
        getBankBalanceStatus(context.ClockData.BankBalance),
        abs(context.ClockData.BankBalance)/60,
        abs(context.ClockData.BankBalance)%60,
        context.ClockData.MonthHours/60,
        context.ClockData.MonthHours%60,
        context.ClockData.ExpectedHours/60,
        getBankAdvice(context.ClockData.BankBalance),
    )

    return prompt
}
```

// Funções auxiliares de formatação
func calculateTimeInCompany(hireDate time.Time) string {
    duration := time.Since(hireDate)
    years := int(duration.Hours() / 24 / 365)
    months := int(duration.Hours()/24/30) % 12

    if years > 0 {
        return fmt.Sprintf("%d anos e %d meses", years, months)
    }
    return fmt.Sprintf("%d meses", months)
}

func formatNextVacation(vacation *models.Vacation) string {
    if vacation == nil {
        return "Nenhuma férias agendada"
    }
    return fmt.Sprintf("%s a %s (%d dias)",
        vacation.StartDate.Format("02/01/2006"),
        vacation.EndDate.Format("02/01/2006"),
        vacation.Days,
    )
}

func formatBankBalance(minutes int) string {
    if minutes >= 0 {
        return "positivo"
    }
    return "negativo"
}

func formatLastEntry(entry *models.ClockEntry) string {
    if entry == nil {
        return "Nenhum registro hoje"
    }
    return fmt.Sprintf("%s às %s",
        translateEntryType(entry.Type),
        entry.Timestamp.Format("15:04"),
    )
}

func translateEntryType(entryType string) string {
    types := map[string]string{
        "entrada":      "Entrada",
        "saida":        "Saída",
        "pausa_inicio": "Início de pausa",
        "pausa_fim":    "Fim de pausa",
    }
    return types[entryType]
}

func getVacationAdvice(vacation *VacationContext) string {
    daysUntilDeadline := int(time.Until(vacation.Deadline).Hours() / 24)

    if daysUntilDeadline < 30 {
        return "⚠️ ATENÇÃO: Você precisa usar suas férias em menos de 30 dias!"
    }
    if daysUntilDeadline < 90 {
        return "⏰ Lembre-se de agendar suas férias em breve."
    }
    return "Você tem bastante tempo para planejar."
}

func getBankBalanceStatus(minutes int) string {
    if minutes > 0 {
        return "positivo"
    } else if minutes < 0 {
        return "negativo"
    }
    return "zerado"
}

func getBankAdvice(minutes int) string {
    if minutes > 480 { // > 8h
        return "💡 Você pode compensar essas horas ou receber como hora extra."
    } else if minutes < -480 { // < -8h
        return "⚠️ Atenção ao saldo negativo. Converse com seu gestor sobre compensação."
    }
    return "Seu banco de horas está equilibrado! 👍"
}

func abs(n int) int {
    if n < 0 {
        return -n
    }
    return n
}
```

### Atualizar o ChatService

```go
// services/chat_service.go
func (s *ChatService) GenerateResponse(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    ctx := context.Background()

    // Busca contexto completo do usuário
    systemPrompt := s.getSystemPromptWithContext(userID)

    // Constrói mensagens
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

    // Chama Azure OpenAI
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
    resp, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:       messages,
        DeploymentName: &deployment,
        MaxTokens:      toPtr(int32(800)),
        Temperature:    toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro ao chamar OpenAI: %w", err)
    }

    // Extrai resposta
    content := *resp.Choices[0].Message.Content
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

### Exemplo de Conversa Real

```
Usuário: "Quantas férias eu tenho?"

Frappy IA: "Você tem 30 dias de férias disponíveis! 📅
Seu período aquisitivo é 01/03/2023 a 28/02/2024 e você
precisa usar até 28/02/2025. Você tem bastante tempo para planejar.

Quer que eu te ajude a agendar suas férias?"

---

Usuário: "Como está meu banco de horas?"

Frappy IA: "Seu banco de horas está positivo com 6h 30min! 💚

Você trabalhou 182h 30min este mês e o esperado era 176h.

💡 Você pode compensar essas horas ou receber como hora extra.
Quer saber mais sobre as opções?"

---

Usuário: "Qual foi meu último salário?"

Frappy IA: "Seu último holerite foi de 12/2024:

💰 Salário líquido: R$ 4.205,98

Detalhes:
- Salário bruto: R$ 5.654,55
- Descontos: R$ 1.448,57

Você ganhou R$ 50.471,76 no ano até agora.

Quer ver o detalhamento completo do holerite?"
```

---

## 🔧 Function Calling (Estratégia 2)

### Conceito

Permitir que a IA **chame funções** do backend para buscar dados sob demanda.

### Vantagens

- ✅ Mais eficiente (só busca dados quando necessário)
- ✅ Reduz tamanho do prompt (menos tokens = menor custo)
- ✅ IA decide quando precisa de dados
- ✅ Pode executar ações (solicitar férias, etc)

### Implementação

```go
// services/chat_functions.go
package services

import (
    "encoding/json"
    "fmt"
    "github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
)

// Define funções disponíveis para a IA
func (s *ChatService) GetAvailableFunctions() []azopenai.FunctionDefinition {
    return []azopenai.FunctionDefinition{
        // 1. Consultar férias
        {
            Name:        toPtr("get_vacation_balance"),
            Description: toPtr("Consulta o saldo de férias do usuário, período aquisitivo e prazo"),
            Parameters: map[string]interface{}{
                "type":       "object",
                "properties": map[string]interface{}{},
            },
        },

        // 2. Consultar banco de horas
        {
            Name:        toPtr("get_hour_bank"),
            Description: toPtr("Consulta o banco de horas do usuário no mês atual"),
            Parameters: map[string]interface{}{
                "type":       "object",
                "properties": map[string]interface{}{},
            },
        },

        // 3. Consultar holerite
        {
            Name:        toPtr("get_last_payroll"),
            Description: toPtr("Consulta o último holerite do usuário"),
            Parameters: map[string]interface{}{
                "type":       "object",
                "properties": map[string]interface{}{},
            },
        },

        // 4. Listar cursos disponíveis
        {
            Name:        toPtr("list_available_courses"),
            Description: toPtr("Lista cursos disponíveis para o usuário"),
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "category": map[string]string{
                        "type":        "string",
                        "description": "Categoria do curso (opcional)",
                    },
                },
            },
        },

        // 5. Solicitar férias
        {
            Name:        toPtr("request_vacation"),
            Description: toPtr("Solicita férias para o usuário"),
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "start_date": map[string]string{
                        "type":        "string",
                        "description": "Data de início no formato YYYY-MM-DD",
                    },
                    "days": map[string]string{
                        "type":        "number",
                        "description": "Número de dias de férias",
                    },
                },
                "required": []string{"start_date", "days"},
            },
        },

        // 6. Registrar ponto
        {
            Name:        toPtr("clock_punch"),
            Description: toPtr("Registra ponto do usuário"),
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "type": map[string]interface{}{
                        "type":        "string",
                        "description": "Tipo de registro: entrada, saida, pausa_inicio, pausa_fim",
                        "enum":        []string{"entrada", "saida", "pausa_inicio", "pausa_fim"},
                    },
                },
                "required": []string{"type"},
            },
        },

        // 7. Buscar políticas da empresa
        {
            Name:        toPtr("search_policies"),
            Description: toPtr("Busca políticas e regras da empresa"),
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "query": map[string]string{
                        "type":        "string",
                        "description": "Termo de busca (ex: home office, dress code)",
                    },
                },
                "required": []string{"query"},
            },
        },
    }
}
```

// Executar função chamada pela IA
func (s *ChatService) ExecuteFunction(userID, functionName, arguments string) (string, error) {
    switch functionName {
    case "get_vacation_balance":
        return s.executeGetVacationBalance(userID)

    case "get_hour_bank":
        return s.executeGetHourBank(userID)

    case "get_last_payroll":
        return s.executeGetLastPayroll(userID)

    case "list_available_courses":
        var params struct {
            Category string `json:"category"`
        }
        json.Unmarshal([]byte(arguments), &params)
        return s.executeListCourses(userID, params.Category)

    case "request_vacation":
        var params struct {
            StartDate string `json:"start_date"`
            Days      int    `json:"days"`
        }
        json.Unmarshal([]byte(arguments), &params)
        return s.executeRequestVacation(userID, params.StartDate, params.Days)

    case "clock_punch":
        var params struct {
            Type string `json:"type"`
        }
        json.Unmarshal([]byte(arguments), &params)
        return s.executeClockPunch(userID, params.Type)

    case "search_policies":
        var params struct {
            Query string `json:"query"`
        }
        json.Unmarshal([]byte(arguments), &params)
        return s.executeSearchPolicies(params.Query)

    default:
        return "", fmt.Errorf("função não encontrada: %s", functionName)
    }
}

// Implementações das funções

func (s *ChatService) executeGetVacationBalance(userID string) (string, error) {
    balance := getVacationBalance(userID)
    period := getVacationPeriod(userID)
    deadline := getVacationDeadline(userID)

    result := map[string]interface{}{
        "balance":  balance,
        "period":   period,
        "deadline": deadline.Format("2006-01-02"),
    }

    jsonResult, _ := json.Marshal(result)
    return string(jsonResult), nil
}

func (s *ChatService) executeGetHourBank(userID string) (string, error) {
    monthHours := getMonthWorkedHours(userID)
    expectedHours := getExpectedHours(userID)
    bankBalance := getHourBankBalance(userID)

    result := map[string]interface{}{
        "worked_hours":   monthHours,
        "expected_hours": expectedHours,
        "bank_balance":   bankBalance,
        "status":         getBankBalanceStatus(bankBalance),
    }

    jsonResult, _ := json.Marshal(result)
    return string(jsonResult), nil
}

func (s *ChatService) executeGetLastPayroll(userID string) (string, error) {
    payroll := getLastPayroll(userID)

    result := map[string]interface{}{
        "month":        payroll.Month.Format("2006-01"),
        "gross_salary": payroll.GrossSalary,
        "net_salary":   payroll.NetSalary,
        "inss":         payroll.INSS,
        "irrf":         payroll.IRRF,
        "overtime":     payroll.Overtime,
    }

    jsonResult, _ := json.Marshal(result)
    return string(jsonResult), nil
}

func (s *ChatService) executeListCourses(userID, category string) (string, error) {
    user := getUserByID(userID)
    courses := getAvailableCourses(user.Department)

    if category != "" {
        courses = filterCoursesByCategory(courses, category)
    }

    result := map[string]interface{}{
        "courses": courses,
        "count":   len(courses),
    }

    jsonResult, _ := json.Marshal(result)
    return string(jsonResult), nil
}

func (s *ChatService) executeRequestVacation(userID, startDate string, days int) (string, error) {
    err := createVacationRequest(userID, startDate, days)

    if err != nil {
        return fmt.Sprintf(`{"success": false, "error": "%s"}`, err.Error()), nil
    }

    return `{"success": true, "message": "Férias solicitadas com sucesso! Aguarde aprovação do gestor."}`, nil
}

func (s *ChatService) executeClockPunch(userID, punchType string) (string, error) {
    entry, err := createClockEntry(userID, punchType)

    if err != nil {
        return fmt.Sprintf(`{"success": false, "error": "%s"}`, err.Error()), nil
    }

    return fmt.Sprintf(`{"success": true, "type": "%s", "timestamp": "%s"}`,
        entry.Type,
        entry.Timestamp.Format("15:04"),
    ), nil
}

func (s *ChatService) executeSearchPolicies(query string) (string, error) {
    policies := searchCompanyPolicies(query)

    result := map[string]interface{}{
        "policies": policies,
        "count":    len(policies),
    }

    jsonResult, _ := json.Marshal(result)
    return string(jsonResult), nil
}
```

// Atualizar GenerateResponse para suportar function calling
func (s *ChatService) GenerateResponseWithFunctions(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    ctx := context.Background()

    // System prompt básico (sem dados pesados)
    systemPrompt := `Você é o Frappy IA, assistente do FrappYOU.

Você tem acesso a funções para buscar dados do sistema:
- get_vacation_balance: consultar férias
- get_hour_bank: consultar banco de horas
- get_last_payroll: consultar holerite
- list_available_courses: listar cursos
- request_vacation: solicitar férias
- clock_punch: registrar ponto
- search_policies: buscar políticas

Use essas funções quando o usuário perguntar sobre esses tópicos.
Responda sempre em português do Brasil.`

    // Constrói mensagens
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

    // Chama OpenAI com functions
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
    functions := s.GetAvailableFunctions()

    resp, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:       messages,
        DeploymentName: &deployment,
        Functions:      functions,
        MaxTokens:      toPtr(int32(800)),
        Temperature:    toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro ao chamar OpenAI: %w", err)
    }

    choice := resp.Choices[0]

    // Verifica se a IA quer chamar uma função
    if choice.FinishReason != nil && *choice.FinishReason == "function_call" {
        functionCall := choice.Message.FunctionCall

        // Executa a função
        functionResult, err := s.ExecuteFunction(
            userID,
            *functionCall.Name,
            *functionCall.Arguments,
        )

        if err != nil {
            return nil, fmt.Errorf("erro ao executar função: %w", err)
        }

        // Adiciona resultado da função às mensagens
        messages = append(messages, &azopenai.ChatRequestAssistantMessage{
            Content:      choice.Message.Content,
            FunctionCall: functionCall,
        })

        messages = append(messages, &azopenai.ChatRequestFunctionMessage{
            Name:    functionCall.Name,
            Content: &functionResult,
        })

        // Segunda chamada para a IA processar o resultado
        resp2, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
            Messages:       messages,
            DeploymentName: &deployment,
            MaxTokens:      toPtr(int32(800)),
            Temperature:    toPtr(float32(0.7)),
        }, nil)

        if err != nil {
            return nil, fmt.Errorf("erro na segunda chamada: %w", err)
        }

        content := *resp2.Choices[0].Message.Content
        tokensUsed := int(*resp.Usage.TotalTokens + *resp2.Usage.TotalTokens)

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

    // Resposta normal (sem function call)
    content := *choice.Message.Content
    tokensUsed := int(*resp.Usage.TotalTokens)

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

### Exemplo de Conversa com Function Calling

```
Usuário: "Quantas férias eu tenho?"

[IA decide chamar get_vacation_balance()]
[Backend executa função e retorna: {"balance": 30, "period": "01/03/2023 a 28/02/2024", "deadline": "2025-02-28"}]
[IA processa resultado]

Frappy IA: "Você tem 30 dias de férias disponíveis! 📅
Seu período aquisitivo é de 01/03/2023 a 28/02/2024 e você
precisa usar até 28/02/2025. Quer que eu te ajude a agendar?"

---

Usuário: "Sim, quero tirar 15 dias a partir de 10/01/2025"

[IA decide chamar request_vacation("2025-01-10", 15)]
[Backend cria solicitação]

Frappy IA: "Pronto! ✅ Suas férias foram solicitadas:
- Período: 10/01/2025 a 24/01/2025 (15 dias)
- Status: Aguardando aprovação do gestor

Você receberá uma notificação quando for aprovado!"
```

---

## 📚 RAG - Base de Conhecimento (Estratégia 3)

### Conceito

Criar uma base de conhecimento com documentos da empresa e buscar informações relevantes antes de responder.

### Casos de Uso

- Políticas da empresa
- FAQs
- Manuais e procedimentos
- Histórico de conversas similares

### Implementação

```go
// models/knowledge_base.go
package models

type KnowledgeDocument struct {
    ID          string    `json:"id"`
    Title       string    `json:"title"`
    Content     string    `json:"content"`
    Category    string    `json:"category"` // policy, faq, manual
    Tags        []string  `json:"tags"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// services/rag_service.go
package services

type RAGService struct{}

func NewRAGService() *RAGService {
    return &RAGService{}
}

// Buscar documentos relevantes
func (r *RAGService) SearchRelevantDocuments(query string, limit int) ([]models.KnowledgeDocument, error) {
    // Implementação simples com busca de texto
    // Em produção, usar embeddings + vector database

    docs := []models.KnowledgeDocument{}

    // Busca em políticas
    policies := r.searchInCategory(query, "policy", limit/3)
    docs = append(docs, policies...)

    // Busca em FAQs
    faqs := r.searchInCategory(query, "faq", limit/3)
    docs = append(docs, faqs...)

    // Busca em manuais
    manuals := r.searchInCategory(query, "manual", limit/3)
    docs = append(docs, manuals...)

    return docs, nil
}

func (r *RAGService) searchInCategory(query string, category string, limit int) []models.KnowledgeDocument {
    // Busca simples por palavras-chave
    keywords := extractKeywords(query)

    var docs []models.KnowledgeDocument
    db.Where("category = ?", category).Find(&docs)

    // Ranqueia por relevância
    scored := []struct {
        doc   models.KnowledgeDocument
        score int
    }{}

    for _, doc := range docs {
        score := 0
        content := strings.ToLower(doc.Title + " " + doc.Content)

        for _, keyword := range keywords {
            if strings.Contains(content, keyword) {
                score++
            }
        }

        if score > 0 {
            scored = append(scored, struct {
                doc   models.KnowledgeDocument
                score int
            }{doc, score})
        }
    }

    // Ordena por score
    sort.Slice(scored, func(i, j int) bool {
        return scored[i].score > scored[j].score
    })

    // Retorna top N
    result := []models.KnowledgeDocument{}
    for i := 0; i < len(scored) && i < limit; i++ {
        result = append(result, scored[i].doc)
    }

    return result
}

func extractKeywords(query string) []string {
    // Remove stopwords e extrai palavras-chave
    stopwords := map[string]bool{
        "o": true, "a": true, "de": true, "para": true,
        "com": true, "em": true, "é": true, "como": true,
    }

    words := strings.Fields(strings.ToLower(query))
    keywords := []string{}

    for _, word := range words {
        if !stopwords[word] && len(word) > 3 {
            keywords = append(keywords, word)
        }
    }

    return keywords
}
```

// Integrar RAG no ChatService
func (s *ChatService) GenerateResponseWithRAG(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    ctx := context.Background()
    ragService := NewRAGService()

    // Busca documentos relevantes
    relevantDocs, _ := ragService.SearchRelevantDocuments(req.Message, 3)

    // System prompt com contexto do usuário
    systemPrompt := s.getBasicSystemPrompt(userID)

    // Adiciona documentos relevantes ao contexto
    if len(relevantDocs) > 0 {
        systemPrompt += "\n\n## DOCUMENTOS RELEVANTES\n\n"

        for i, doc := range relevantDocs {
            systemPrompt += fmt.Sprintf("### Documento %d: %s\n\n%s\n\n",
                i+1,
                doc.Title,
                doc.Content,
            )
        }

        systemPrompt += "Use as informações acima para responder a pergunta do usuário.\n"
    }

    // Constrói mensagens
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

    // Chama Azure OpenAI
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
    resp, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:       messages,
        DeploymentName: &deployment,
        MaxTokens:      toPtr(int32(1000)), // Mais tokens para processar documentos
        Temperature:    toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro ao chamar OpenAI: %w", err)
    }

    content := *resp.Choices[0].Message.Content
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

### Exemplo de Conversa com RAG

```
Usuário: "Como funciona o home office?"

[Sistema busca documentos sobre "home office"]
[Encontra: "Política de Home Office", "FAQ - Trabalho Remoto"]
[Injeta documentos no prompt]

Frappy IA: "A política de home office da empresa funciona assim:

🏠 **Modalidades:**
- Híbrido: 2 dias/semana em casa (terça e quinta)
- Remoto: Aprovação do gestor + RH necessária

📋 **Requisitos:**
- Internet mínima: 10 Mbps
- Espaço adequado de trabalho
- Disponibilidade no horário comercial (9h-18h)

⏰ **Registro de Ponto:**
- Obrigatório mesmo em home office
- Usar o sistema normalmente

📞 **Reuniões:**
- Câmera ligada em reuniões de equipe
- Responder mensagens em até 30 minutos

Quer solicitar home office? Posso te ajudar com o processo!"
```

### Criar Base de Conhecimento

```sql
-- Tabela de documentos
CREATE TABLE knowledge_documents (
    id VARCHAR(36) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    category VARCHAR(50) NOT NULL, -- policy, faq, manual
    tags NVARCHAR(500), -- JSON array
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Índices para busca
CREATE INDEX idx_knowledge_category ON knowledge_documents(category);
CREATE FULLTEXT INDEX idx_knowledge_content ON knowledge_documents(title, content);

-- Inserir documentos de exemplo
INSERT INTO knowledge_documents (id, title, content, category, tags) VALUES
('1', 'Política de Home Office',
'A empresa permite trabalho remoto nas seguintes modalidades:
1. Híbrido: 2 dias por semana (terça e quinta)
2. Remoto total: Mediante aprovação do gestor e RH

Requisitos:
- Internet mínima de 10 Mbps
- Espaço adequado de trabalho
- Disponibilidade no horário comercial

O registro de ponto é obrigatório mesmo em home office.',
'policy',
'["home office", "trabalho remoto", "híbrido"]'),

('2', 'Como solicitar férias',
'Para solicitar férias:
1. Acesse o sistema FrappYOU
2. Vá em Férias > Solicitar
3. Escolha as datas
4. Aguarde aprovação do gestor

Regras:
- Mínimo 5 dias corridos
- Avisar com 30 dias de antecedência
- Não pode ter solicitação pendente',
'faq',
'["férias", "solicitação", "aprovação"]');
```

---

## ⚡ Cache Inteligente (Otimização)

### Problema

Buscar dados do banco a cada mensagem é custoso e lento.

### Solução

Implementar cache com Redis para dados que mudam pouco.

### Implementação

```go
// services/chat_cache.go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/go-redis/redis/v8"
)

type ChatCache struct {
    client *redis.Client
}

func NewChatCache() *ChatCache {
    client := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_URL"),
    })

    return &ChatCache{client: client}
}

// Cache de contexto do usuário
func (c *ChatCache) GetUserContext(userID string) (*ChatContext, error) {
    ctx := context.Background()
    key := fmt.Sprintf("chat:context:%s", userID)

    val, err := c.client.Get(ctx, key).Result()
    if err == redis.Nil {
        return nil, nil // Cache miss
    }
    if err != nil {
        return nil, err
    }

    var context ChatContext
    err = json.Unmarshal([]byte(val), &context)
    return &context, err
}

func (c *ChatCache) SetUserContext(userID string, context *ChatContext, ttl time.Duration) error {
    ctx := context.Background()
    key := fmt.Sprintf("chat:context:%s", userID)

    data, err := json.Marshal(context)
    if err != nil {
        return err
    }

    return c.client.Set(ctx, key, data, ttl).Err()
}

// Cache de respostas comuns
func (c *ChatCache) GetCachedResponse(query string) (string, error) {
    ctx := context.Background()
    key := fmt.Sprintf("chat:response:%s", hashQuery(query))

    return c.client.Get(ctx, key).Result()
}

func (c *ChatCache) SetCachedResponse(query, response string, ttl time.Duration) error {
    ctx := context.Background()
    key := fmt.Sprintf("chat:response:%s", hashQuery(query))

    return c.client.Set(ctx, key, response, ttl).Err()
}

func hashQuery(query string) string {
    // Normaliza e cria hash da query
    normalized := strings.ToLower(strings.TrimSpace(query))
    hash := sha256.Sum256([]byte(normalized))
    return hex.EncodeToString(hash[:])
}
```

### Atualizar ChatService com Cache

```go
func (s *ChatService) GenerateResponseWithCache(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    cache := NewChatCache()

    // 1. Tenta buscar resposta em cache
    if cachedResponse, err := cache.GetCachedResponse(req.Message); err == nil {
        return &models.ChatResponse{
            Message:    cachedResponse,
            TokensUsed: 0, // Não usou tokens
        }, nil
    }

    // 2. Tenta buscar contexto em cache
    context, err := cache.GetUserContext(userID)
    if err != nil || context == nil {
        // Cache miss - busca do banco
        context, err = s.GetUserContext(userID)
        if err != nil {
            return nil, err
        }

        // Salva em cache (5 minutos)
        cache.SetUserContext(userID, context, 5*time.Minute)
    }

    // 3. Gera resposta normalmente
    response, err := s.GenerateResponse(userID, req)
    if err != nil {
        return nil, err
    }

    // 4. Cacheia respostas para perguntas comuns
    if isCommonQuestion(req.Message) {
        cache.SetCachedResponse(req.Message, response.Message, 1*time.Hour)
    }

    return response, nil
}

func isCommonQuestion(message string) bool {
    commonPatterns := []string{
        "quantas férias",
        "banco de horas",
        "último salário",
        "como funciona",
        "política de",
    }

    lower := strings.ToLower(message)
    for _, pattern := range commonPatterns {
        if strings.Contains(lower, pattern) {
            return true
        }
    }

    return false
}
```

### Configurar Redis

```bash
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

```bash
# backend/.env
REDIS_URL=localhost:6379
```

```go
// go.mod
require github.com/go-redis/redis/v8 v8.11.5
```

---

## 🎯 Estratégia Híbrida (Recomendado)

### Combinar as 3 Estratégias

Para melhor resultado, use todas as estratégias juntas:

```go
// services/chat_service.go
func (s *ChatService) GenerateSmartResponse(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    cache := NewChatCache()
    ragService := NewRAGService()

    // 1. CACHE: Tenta buscar resposta em cache
    if cachedResponse, err := cache.GetCachedResponse(req.Message); err == nil {
        log.Printf("✅ Cache hit para: %s", req.Message)
        return &models.ChatResponse{
            Message:    cachedResponse,
            TokensUsed: 0,
        }, nil
    }

    // 2. CONTEXT INJECTION: Busca contexto do usuário (com cache)
    context, err := cache.GetUserContext(userID)
    if err != nil || context == nil {
        context, err = s.GetUserContext(userID)
        if err != nil {
            return nil, err
        }
        cache.SetUserContext(userID, context, 5*time.Minute)
    }

    // 3. RAG: Busca documentos relevantes
    relevantDocs, _ := ragService.SearchRelevantDocuments(req.Message, 3)

    // 4. Monta system prompt com contexto + documentos
    systemPrompt := s.buildHybridSystemPrompt(context, relevantDocs)

    // 5. FUNCTION CALLING: Define funções disponíveis
    functions := s.GetAvailableFunctions()

    // 6. Chama Azure OpenAI
    ctx := context.Background()
    messages := s.buildMessages(systemPrompt, req)

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

    // 7. Processa function calling se necessário
    if choice.FinishReason != nil && *choice.FinishReason == "function_call" {
        return s.handleFunctionCall(userID, req, messages, choice)
    }

    // 8. Resposta normal
    content := *choice.Message.Content
    tokensUsed := int(*resp.Usage.TotalTokens)

    // 9. Cacheia se for pergunta comum
    if isCommonQuestion(req.Message) {
        cache.SetCachedResponse(req.Message, content, 1*time.Hour)
    }

    // 10. Salva conversa
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

func (s *ChatService) buildHybridSystemPrompt(context *ChatContext, docs []models.KnowledgeDocument) string {
    prompt := fmt.Sprintf(`Você é o Frappy IA, assistente do FrappYOU.

## DADOS DO COLABORADOR
- Nome: %s
- Cargo: %s
- Departamento: %s
- Férias disponíveis: %d dias
- Banco de horas: %s (%dh %dmin)
`,
        context.UserData.Name,
        context.UserData.Position,
        context.UserData.Department,
        context.VacationData.Balance,
        getBankBalanceStatus(context.ClockData.BankBalance),
        abs(context.ClockData.BankBalance)/60,
        abs(context.ClockData.BankBalance)%60,
    )

    // Adiciona documentos relevantes
    if len(docs) > 0 {
        prompt += "\n## DOCUMENTOS RELEVANTES\n\n"
        for i, doc := range docs {
            prompt += fmt.Sprintf("### %d. %s\n%s\n\n", i+1, doc.Title, doc.Content)
        }
    }

    prompt += `
## INSTRUÇÕES
1. Use os dados acima para responder
2. Se precisar de mais dados, use as funções disponíveis
3. Seja específico e preciso
4. Use emojis moderadamente
5. Responda em português do Brasil
`

    return prompt
}
```

### Fluxo Completo

```
Usuário: "Quantas férias tenho?"
    ↓
1. Verifica cache → Miss
    ↓
2. Busca contexto do usuário (cache ou DB)
    ↓
3. Busca documentos sobre férias (RAG)
    ↓
4. Monta prompt com contexto + documentos
    ↓
5. Define funções disponíveis
    ↓
6. Chama Azure OpenAI
    ↓
7. IA decide: usar dados do prompt ou chamar função?
    ↓
8. Gera resposta
    ↓
9. Cacheia resposta (1 hora)
    ↓
10. Retorna para usuário
```

---

## 📊 Comparação das Estratégias

| Estratégia | Vantagens | Desvantagens | Quando Usar |
|------------|-----------|--------------|-------------|
| **Context Injection** | ✅ Simples<br>✅ Dados sempre atualizados<br>✅ Não precisa function calling | ❌ Prompt grande<br>❌ Mais tokens<br>❌ Busca tudo sempre | Dados pequenos e frequentes |
| **Function Calling** | ✅ Eficiente<br>✅ Busca sob demanda<br>✅ Pode executar ações | ❌ Mais complexo<br>❌ 2 chamadas à IA<br>❌ Mais lento | Dados grandes ou ações |
| **RAG** | ✅ Escalável<br>✅ Base de conhecimento<br>✅ Documentos longos | ❌ Precisa manutenção<br>❌ Busca pode falhar<br>❌ Complexo | Políticas e documentos |
| **Cache** | ✅ Muito rápido<br>✅ Reduz custos<br>✅ Menos chamadas | ❌ Dados podem ficar velhos<br>❌ Precisa Redis | Perguntas comuns |

---

## 🚀 Implementação Passo a Passo

### Fase 1: Context Injection (1 semana)

```bash
✅ Criar GetUserContext()
✅ Criar getSystemPromptWithContext()
✅ Testar com dados reais
✅ Ajustar formatação de respostas
```

### Fase 2: Function Calling (2 semanas)

```bash
✅ Definir funções disponíveis
✅ Implementar ExecuteFunction()
✅ Atualizar GenerateResponse()
✅ Testar chamadas de função
✅ Adicionar mais funções (solicitar férias, etc)
```

### Fase 3: RAG (2 semanas)

```bash
✅ Criar tabela knowledge_documents
✅ Implementar SearchRelevantDocuments()
✅ Popular base com políticas
✅ Integrar no GenerateResponse()
✅ Testar busca de documentos
```

### Fase 4: Cache (1 semana)

```bash
✅ Configurar Redis
✅ Implementar ChatCache
✅ Adicionar cache de contexto
✅ Adicionar cache de respostas
✅ Monitorar hit rate
```

### Fase 5: Híbrido (1 semana)

```bash
✅ Combinar todas estratégias
✅ Otimizar fluxo
✅ Testes de carga
✅ Ajustes finais
```

---

## 💰 Impacto nos Custos

### Sem Otimização

```
100 usuários × 10 msgs/dia × 22 dias = 22.000 msgs/mês
Média 1.000 tokens/msg (prompt grande)
22M tokens × $0.045/1K = $990/mês
```

### Com Otimização (Cache + Function Calling)

```
Cache hit rate: 40% (8.800 msgs)
Restante: 13.200 msgs

Function calling: média 600 tokens/msg
13.2M tokens × $0.045/1K = $594/mês

Economia: $396/mês (40%)
```

---

## 📈 Métricas para Monitorar

```go
// handlers/chat_metrics.go
func GetChatMetrics(c *fiber.Ctx) error {
    metrics := map[string]interface{}{
        // Performance
        "avg_response_time":    getAvgResponseTime(),
        "cache_hit_rate":       getCacheHitRate(),
        "function_call_rate":   getFunctionCallRate(),

        // Qualidade
        "avg_user_rating":      getAvgUserRating(),
        "helpful_rate":         getHelpfulRate(),
        "error_rate":           getErrorRate(),

        // Custos
        "total_tokens_used":    getTotalTokensUsed(),
        "total_cost":           getTotalCost(),
        "cost_per_user":        getCostPerUser(),

        // Uso
        "total_conversations":  getTotalConversations(),
        "active_users":         getActiveUsers(),
        "most_asked_topics":    getMostAskedTopics(),
    }

    return c.JSON(metrics)
}
```

---

## ✅ Checklist Final

### Backend
- [ ] Context Injection implementado
- [ ] Function Calling implementado
- [ ] RAG implementado
- [ ] Cache implementado
- [ ] Estratégia híbrida funcionando
- [ ] Métricas configuradas
- [ ] Logs de auditoria
- [ ] Testes de carga

### Base de Dados
- [ ] Tabela knowledge_documents criada
- [ ] Políticas da empresa cadastradas
- [ ] FAQs cadastrados
- [ ] Índices criados
- [ ] Redis configurado

### Monitoramento
- [ ] Dashboard de métricas
- [ ] Alertas de custo
- [ ] Monitoramento de cache
- [ ] Logs de erros
- [ ] Feedback dos usuários

---

## 🎓 Próximos Passos

1. **Implementar Context Injection** (mais simples)
2. **Testar com usuários reais**
3. **Adicionar Function Calling** (mais poderoso)
4. **Popular base de conhecimento** (RAG)
5. **Otimizar com cache** (reduzir custos)
6. **Monitorar e ajustar**

---

**Criado para FrappYOU** | Última atualização: Dezembro 2024
