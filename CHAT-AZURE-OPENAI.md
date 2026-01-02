# 🤖 Integração Azure OpenAI Chat - FrappYOU

> **Guia completo** para integrar chat inteligente com Azure OpenAI no sistema de RH
> **Stack**: Go (Fiber) + Azure OpenAI SDK + Next.js + Streaming

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Azure](#configuração-azure)
3. [Backend - Go](#backend-go)
4. [Frontend - Next.js](#frontend-nextjs)
5. [Casos de Uso RH](#casos-de-uso-rh)
6. [Segurança](#segurança)

---

## 🎯 Visão Geral

### O que vamos construir?

Um assistente de IA integrado ao FrappYOU que ajuda colaboradores e gestores com:

- 📝 Dúvidas sobre políticas de RH
- 📊 Análise de dados (férias, ponto, folha)
- 🎓 Recomendações de cursos
- 💬 Suporte automatizado 24/7
- 📈 Insights sobre carreira

### Arquitetura

```
Frontend (Next.js)
    ↓ WebSocket/SSE
Backend (Go + Fiber)
    ↓ Azure OpenAI SDK
Azure OpenAI Service
    ↓ GPT-4
Resposta em streaming
```

---

## ⚙️ Configuração Azure

### 1. Criar recurso Azure OpenAI

```bash
# Via Azure CLI
az cognitiveservices account create \
  --name frappyou-openai \
  --resource-group frappyou-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus
```

### 2. Deploy do modelo GPT-4

No portal Azure:
1. Acesse o recurso OpenAI criado
2. Vá em "Model deployments"
3. Clique em "Create new deployment"
4. Escolha: **gpt-4** ou **gpt-4-turbo**
5. Nome do deployment: `gpt-4-frappyou`

### 3. Obter credenciais

```bash
# Endpoint
https://frappyou-openai.openai.azure.com/

# API Key (copiar do portal)
# Keys and Endpoint → Key 1
```

### 4. Adicionar ao .env

```bash
# backend/.env
AZURE_OPENAI_ENDPOINT=https://frappyou-openai.openai.azure.com/
AZURE_OPENAI_KEY=sua-chave-aqui
AZURE_OPENAI_DEPLOYMENT=gpt-4-frappyou
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

---

## 🔧 Backend - Go

### 1. Instalar dependências

```bash
cd backend
go get github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai
go get github.com/Azure/azure-sdk-for-go/sdk/azcore
```

### 2. Criar cliente Azure OpenAI

```go
// config/openai.go
package config

import (
    "os"
    "github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
    "github.com/Azure/azure-sdk-for-go/sdk/azcore"
)

var OpenAIClient *azopenai.Client

func InitOpenAI() error {
    endpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
    apiKey := os.Getenv("AZURE_OPENAI_KEY")

    keyCredential := azcore.NewKeyCredential(apiKey)

    client, err := azopenai.NewClientWithKeyCredential(endpoint, keyCredential, nil)
    if err != nil {
        return err
    }

    OpenAIClient = client
    return nil
}
```

### 3. Modelos de dados

```go
// models/chat.go
package models

import "time"

type ChatConversation struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Title     string    `json:"title"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type ChatMessage struct {
    ID             string    `json:"id"`
    ConversationID string    `json:"conversation_id"`
    Role           string    `json:"role"` // user, assistant, system
    Content        string    `json:"content"`
    Timestamp      time.Time `json:"timestamp"`
    TokensUsed     int       `json:"tokens_used,omitempty"`
}

type ChatRequest struct {
    ConversationID string `json:"conversation_id,omitempty"`
    Message        string `json:"message"`
    Context        string `json:"context,omitempty"` // Contexto adicional (ex: dados do usuário)
}

type ChatResponse struct {
    ConversationID string `json:"conversation_id"`
    Message        string `json:"message"`
    TokensUsed     int    `json:"tokens_used"`
}
```

### 4. Service de Chat

```go
// services/chat_service.go
package services

import (
    "context"
    "fmt"
    "os"

    "github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
    "github.com/frappyou/backend/config"
    "github.com/frappyou/backend/models"
    "github.com/google/uuid"
)

type ChatService struct{}

func NewChatService() *ChatService {
    return &ChatService{}
}

// Gera resposta do chat (sem streaming)
func (s *ChatService) GenerateResponse(userID string, req models.ChatRequest) (*models.ChatResponse, error) {
    ctx := context.Background()

    // Busca histórico da conversa
    messages := s.buildMessages(userID, req)

    // Chama Azure OpenAI
    deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
    resp, err := config.OpenAIClient.GetChatCompletions(ctx, azopenai.ChatCompletionsOptions{
        Messages:    messages,
        DeploymentName: &deployment,
        MaxTokens:   toPtr(int32(800)),
        Temperature: toPtr(float32(0.7)),
    }, nil)

    if err != nil {
        return nil, fmt.Errorf("erro ao chamar OpenAI: %w", err)
    }

    // Extrai resposta
    content := *resp.Choices[0].Message.Content
    tokensUsed := int(*resp.Usage.TotalTokens)

    // Salva mensagens no banco
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

// Constrói mensagens com contexto
func (s *ChatService) buildMessages(userID string, req models.ChatRequest) []azopenai.ChatRequestMessageClassification {
    messages := []azopenai.ChatRequestMessageClassification{}

    // System prompt - Define comportamento do assistente
    systemPrompt := s.getSystemPrompt(userID)
    messages = append(messages, &azopenai.ChatRequestSystemMessage{
        Content: &systemPrompt,
    })

    // Histórico da conversa (últimas 10 mensagens)
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

    return messages
}
```

// System prompt personalizado para RH
func (s *ChatService) getSystemPrompt(userID string) string {
    user := getUserData(userID) // Busca dados do usuário

    return fmt.Sprintf(`Você é o assistente virtual do FrappYOU, um sistema de RH profissional.

Seu papel:
- Ajudar colaboradores com dúvidas sobre RH (férias, ponto, benefícios, folha)
- Fornecer informações sobre políticas da empresa
- Recomendar cursos e desenvolvimento
- Analisar dados e gerar insights

Contexto do usuário:
- Nome: %s
- Cargo: %s
- Departamento: %s
- Data de admissão: %s

Diretrizes:
1. Seja profissional, mas amigável
2. Use linguagem clara e objetiva
3. Cite políticas quando relevante
4. Proteja dados sensíveis (não revele salários de outros)
5. Se não souber, seja honesto e sugira contatar RH
6. Use emojis moderadamente para tornar a conversa mais leve

Responda sempre em português do Brasil.`,
        user.Name,
        user.Position,
        user.Department,
        user.HireDate.Format("02/01/2006"),
    )
}

// Helpers
func toPtr[T any](v T) *T {
    return &v
}

func (s *ChatService) createConversation(userID, conversationID, firstMessage string) {
    // Implementar: salvar no banco
}

func (s *ChatService) saveMessage(conversationID, role, content string, tokens int) {
    // Implementar: salvar no banco
}

func (s *ChatService) getConversationHistory(conversationID string, limit int) []models.ChatMessage {
    // Implementar: buscar do banco
    return []models.ChatMessage{}
}

func getUserData(userID string) *models.User {
    // Implementar: buscar do banco
    return &models.User{}
}
```

### 5. Handler com Streaming (SSE)

```go
// handlers/chat.go
package handlers

import (
    "bufio"
    "context"
    "fmt"
    "os"
    "time"

    "github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
    "github.com/frappyou/backend/config"
    "github.com/frappyou/backend/models"
    "github.com/frappyou/backend/services"
    "github.com/gofiber/fiber/v2"
)

var chatService = services.NewChatService()

// Chat sem streaming (mais simples)
func SendChatMessage(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    var req models.ChatRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Requisição inválida"})
    }

    if req.Message == "" {
        return c.Status(400).JSON(fiber.Map{"error": "Mensagem não pode ser vazia"})
    }

    // Gera resposta
    response, err := chatService.GenerateResponse(userID, req)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(response)
}

// Chat com streaming (SSE - Server-Sent Events)
func StreamChatMessage(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    var req models.ChatRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Requisição inválida"})
    }

    // Configura SSE
    c.Set("Content-Type", "text/event-stream")
    c.Set("Cache-Control", "no-cache")
    c.Set("Connection", "keep-alive")
    c.Set("Transfer-Encoding", "chunked")

    c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
        ctx := context.Background()

        // Constrói mensagens
        messages := chatService.buildMessages(userID, req)

        // Chama OpenAI com streaming
        deployment := os.Getenv("AZURE_OPENAI_DEPLOYMENT")
        stream, err := config.OpenAIClient.GetChatCompletionsStream(ctx, azopenai.ChatCompletionsStreamOptions{
            Messages:       messages,
            DeploymentName: &deployment,
            MaxTokens:      toPtr(int32(800)),
            Temperature:    toPtr(float32(0.7)),
        }, nil)

        if err != nil {
            fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", err.Error())
            w.Flush()
            return
        }
        defer stream.ChatCompletionsStream.Close()

        fullResponse := ""

        // Stream de tokens
        for {
            completion, err := stream.ChatCompletionsStream.Read()
            if err != nil {
                break // Fim do stream
            }

            for _, choice := range completion.Choices {
                if choice.Delta.Content != nil {
                    token := *choice.Delta.Content
                    fullResponse += token

                    // Envia token via SSE
                    fmt.Fprintf(w, "data: {\"token\": \"%s\"}\n\n", escapeJSON(token))
                    w.Flush()
                }
            }
        }

        // Salva conversa no banco
        conversationID := req.ConversationID
        if conversationID == "" {
            conversationID = generateUUID()
            chatService.createConversation(userID, conversationID, req.Message)
        }

        chatService.saveMessage(conversationID, "user", req.Message, 0)
        chatService.saveMessage(conversationID, "assistant", fullResponse, len(fullResponse)/4) // Estimativa de tokens

        // Envia evento de conclusão
        fmt.Fprintf(w, "data: {\"done\": true, \"conversation_id\": \"%s\"}\n\n", conversationID)
        w.Flush()
    })

    return nil
}
```

// Listar conversas do usuário
func GetMyConversations(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    conversations := getConversationsByUser(userID)

    return c.JSON(conversations)
}

// Buscar mensagens de uma conversa
func GetConversationMessages(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)
    conversationID := c.Params("id")

    // Verifica se a conversa pertence ao usuário
    if !isConversationOwner(conversationID, userID) {
        return c.Status(403).JSON(fiber.Map{"error": "Acesso negado"})
    }

    messages := getMessagesByConversation(conversationID)

    return c.JSON(messages)
}

// Deletar conversa
func DeleteConversation(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)
    conversationID := c.Params("id")

    if !isConversationOwner(conversationID, userID) {
        return c.Status(403).JSON(fiber.Map{"error": "Acesso negado"})
    }

    deleteConversation(conversationID)

    return c.JSON(fiber.Map{"success": true})
}

// Helpers
func escapeJSON(s string) string {
    // Escapa caracteres especiais para JSON
    s = strings.ReplaceAll(s, "\\", "\\\\")
    s = strings.ReplaceAll(s, "\"", "\\\"")
    s = strings.ReplaceAll(s, "\n", "\\n")
    s = strings.ReplaceAll(s, "\r", "\\r")
    s = strings.ReplaceAll(s, "\t", "\\t")
    return s
}

func toPtr[T any](v T) *T {
    return &v
}
```

### 6. Adicionar rotas

```go
// routes/routes.go (adicionar no SetupRoutes)

// Rotas de Chat (protegidas)
chat := api.Group("/chat", middleware.AuthMiddleware)
chat.Post("/message", handlers.SendChatMessage)           // Sem streaming
chat.Post("/stream", handlers.StreamChatMessage)          // Com streaming (SSE)
chat.Get("/conversations", handlers.GetMyConversations)
chat.Get("/conversations/:id", handlers.GetConversationMessages)
chat.Delete("/conversations/:id", handlers.DeleteConversation)
```

### 7. Inicializar no main.go

```go
// main.go (adicionar após ConnectDB)

// Inicializa Azure OpenAI
if err := config.InitOpenAI(); err != nil {
    log.Fatal("Falha ao inicializar Azure OpenAI:", err)
}
log.Println("✅ Azure OpenAI conectado")
```

---

## 🎨 Frontend - Next.js

### 1. Criar componente de Chat

```typescript
// app/chat/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2, Plus } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Usando SSE (Server-Sent Events) para streaming
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: input,
          conversation_id: conversationId
        })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.token) {
              // Atualiza mensagem com novo token
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1].content += data.token
                return updated
              })
            }

            if (data.done) {
              setConversationId(data.conversation_id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }
```

  const newConversation = () => {
    setMessages([])
    setConversationId(null)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Histórico de conversas */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <button
          onClick={newConversation}
          className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
        >
          <Plus size={20} />
          Nova Conversa
        </button>

        <div className="space-y-2">
          {/* Lista de conversas anteriores */}
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Conversas Recentes</h3>
          {/* Implementar: buscar conversas do backend */}
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">
            🤖 Assistente FrappYOU
          </h1>
          <p className="text-sm text-gray-500">
            Tire suas dúvidas sobre RH, férias, benefícios e muito mais
          </p>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-semibold mb-2">Como posso ajudar?</h2>
              <p className="text-gray-400">
                Pergunte sobre férias, ponto, benefícios, cursos e mais
              </p>

              {/* Sugestões */}
              <div className="grid grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto">
                {[
                  '📅 Quantos dias de férias tenho?',
                  '⏰ Como funciona o banco de horas?',
                  '💰 Quais são meus benefícios?',
                  '🎓 Que cursos você recomenda?'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion.slice(2))}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                <Loader2 className="animate-spin text-blue-600" size={20} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
```

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex gap-3"></div> <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 2. Alternativa: Chat sem streaming (mais simples)

```typescript
// Versão simplificada sem SSE
const sendMessageSimple = async () => {
  if (!input.trim() || loading) return

  const userMessage: Message = {
    role: 'user',
    content: input,
    timestamp: new Date()
  }

  setMessages(prev => [...prev, userMessage])
  setInput('')
  setLoading(true)

  try {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        message: input,
        conversation_id: conversationId
      })
    })

    const data = await response.json()

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.message,
      timestamp: new Date()
    }])

    setConversationId(data.conversation_id)
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    setLoading(false)
  }
}
```

### 3. Componente de Chat Widget (flutuante)

```typescript
// components/ChatWidget.tsx
'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center z-50"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Janela do chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Assistente FrappYOU</h3>
              <p className="text-xs text-blue-100">Online</p>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm">Olá! Como posso ajudar?</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

### 4. Adicionar widget ao layout

```typescript
// app/layout.tsx
import ChatWidget from '@/components/ChatWidget'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
```
