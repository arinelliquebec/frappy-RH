# 🟠 PRIORIDADE ALTA - Implementação Estratégica

> **Prazo sugerido**: 3-6 meses (após críticas)
> **Investimento**: R$ 210.000
> **Impacto**: Meritocracia + Atração de talentos + Satisfação

---

## 4. 📈 Avaliação de Desempenho

**Complexidade**: 🟡 Média (4-6 semanas)
**Custo**: R$ 50.000
**ROI**: Alto - Melhora performance em 25%

### Por que é prioritário?
- 🎯 Meritocracia (promoções baseadas em dados)
- 📊 Identificar talentos e gaps
- 💰 Justificar aumentos salariais
- 🚀 Desenvolvimento de carreira

### Estrutura de Dados

```go
// models/performance.go
type PerformanceCycle struct {
    ID                  string    `json:"id"`
    Name                string    `json:"name"` // "Avaliação 2024"
    Year                int       `json:"year"`
    StartDate           time.Time `json:"start_date"`
    EndDate             time.Time `json:"end_date"`
    SelfEvalDeadline    time.Time `json:"self_eval_deadline"`
    ManagerEvalDeadline time.Time `json:"manager_eval_deadline"`
    Status              string    `json:"status"` // draft, active, calibration, closed
}

type Evaluation struct {
    ID              string              `json:"id"`
    CycleID         string              `json:"cycle_id"`
    EmployeeID      string              `json:"employee_id"`
    ManagerID       string              `json:"manager_id"`
    Type            string              `json:"type"` // self, manager, peer
    Status          string              `json:"status"` // pending, submitted, approved
    Competencies    []CompetencyScore   `json:"competencies"`
    Goals           []GoalScore         `json:"goals"`
    OverallScore    float64             `json:"overall_score"` // 0-5
    Strengths       string              `json:"strengths"`
    ImprovementAreas string             `json:"improvement_areas"`
    ActionPlan      string              `json:"action_plan"`
    SubmittedAt     *time.Time          `json:"submitted_at,omitempty"`
}

type CompetencyScore struct {
    CompetencyID    string  `json:"competency_id"`
    Name            string  `json:"name"`
    Score           int     `json:"score"` // 1-5
    Weight          float64 `json:"weight"` // 0-1
    Comments        string  `json:"comments"`
}

type GoalScore struct {
    GoalID          string  `json:"goal_id"`
    Description     string  `json:"description"`
    Achievement     int     `json:"achievement"` // 0-100%
    Weight          float64 `json:"weight"`
    Comments        string  `json:"comments"`
}
```

### Endpoints
```
POST   /api/performance/cycles              // Criar ciclo (admin)
GET    /api/performance/cycles/active       // Ciclo ativo
GET    /api/performance/my-evaluation       // Minha avaliação
POST   /api/performance/self-eval           // Autoavaliação
POST   /api/performance/manager-eval/:id    // Avaliar subordinado
GET    /api/performance/team                // Avaliações da equipe
POST   /api/performance/calibration         // Calibrar notas
GET    /api/performance/reports             // Relatórios
```

Ver detalhes completos em: `docs/performance-evaluation.md`

---

## 5. 👥 Recrutamento e Seleção (ATS)

**Complexidade**: 🔴 Alta (2-3 meses)
**Custo**: R$ 90.000
**ROI**: Médio-Alto - Reduz tempo de contratação em 40%

### Por que é prioritário?
- ⏱️ Reduz tempo de contratação (de 60 para 35 dias)
- 🎯 Melhora qualidade das contratações
- 💰 Reduz custo por contratação
- 📊 Métricas de recrutamento

### Funcionalidades Principais

1. **Portal de Vagas** (público)
2. **Aplicação Online** (upload de currículo)
3. **Triagem Automática** (keywords)
4. **Pipeline Kanban** (etapas customizáveis)
5. **Agendamento de Entrevistas**
6. **Avaliações** (formulários)
7. **Banco de Talentos**
8. **Integração LinkedIn**

Ver detalhes completos em: `docs/recruitment-ats.md`

---

## 6. 🎁 Gestão de Benefícios

**Complexidade**: 🟡 Média (3-4 semanas)
**Custo**: R$ 40.000
**ROI**: Médio - Melhora satisfação em 30%

### Por que é prioritário?
- 💰 Controle de custos com benefícios
- 😊 Satisfação dos colaboradores
- 📊 Transparência
- 🔄 Autoatendimento

### Funcionalidades

1. **Catálogo de Benefícios**
2. **Adesão/Cancelamento Online**
3. **Gestão de Dependentes**
4. **Cálculo de Descontos**
5. **Integração com Fornecedores**
6. **Relatórios de Custos**

Ver detalhes completos em: `docs/benefits-management.md`

---

## 7. 📱 Mobile App (MVP)

**Complexidade**: 🔴 Alta (2-3 meses)
**Custo**: R$ 30.000
**ROI**: Médio - Aumenta adoção em 60%

### Por que é prioritário?
- 📱 Colaboradores usam mais mobile que desktop
- ⏰ Ponto eletrônico precisa de app
- 🔔 Notificações push
- 🚀 Experiência moderna

### Funcionalidades MVP

1. Login
2. Registro de ponto
3. Consulta de holerite
4. Solicitação de férias
5. Comunicados
6. Notificações push
7. Perfil

**Stack**: React Native + Expo

Ver detalhes completos em: `docs/mobile-app.md`

---

## 📊 Resumo - Prioridade Alta

| Feature | Prazo | Custo | Impacto |
|---------|-------|-------|---------|
| Avaliação Desempenho | 1-1.5 meses | R$ 50.000 | Meritocracia |
| Recrutamento (ATS) | 2-3 meses | R$ 90.000 | Atração talentos |
| Gestão Benefícios | 1 mês | R$ 40.000 | Satisfação |
| Mobile App | 2-3 meses | R$ 30.000 | Adoção |
| **TOTAL** | **3 meses** | **R$ 210.000** | **Estratégico** |

---

**Próximo passo**: Após concluir, seguir para [PRIORIDADE-MEDIA.md](PRIORIDADE-MEDIA.md)
