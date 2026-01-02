# 🔴 PRIORIDADE CRÍTICA - Implementação Imediata

> **Prazo sugerido**: 0-3 meses
> **Investimento**: R$ 180.000
> **Impacto**: Compliance legal + Redução de custos operacionais

---

## 1. ⏰ Ponto Eletrônico

**Complexidade**: 🔴 Alta (2-3 meses)
**Custo**: R$ 90.000
**ROI**: Alto - Reduz fraudes, garante compliance trabalhista

### Por que é crítico?
- ⚖️ **Obrigação legal** (CLT Art. 74) para empresas com +20 funcionários
- 💰 Evita processos trabalhistas (horas extras não pagas)
- 📊 Base para cálculo de folha de pagamento
- 🚫 Elimina ponto manual (papel/planilhas)

### Funcionalidades Essenciais

#### Backend (Go)
```go
// models/clock.go
type ClockEntry struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    Type        string    `json:"type"` // entrada, saida, pausa_inicio, pausa_fim
    Timestamp   time.Time `json:"timestamp"`
    IPAddress   string    `json:"ip_address"`
    Device      string    `json:"device"`
    Location    *Location `json:"location,omitempty"`
    Status      string    `json:"status"` // normal, ajustado, justificado
    Justification string  `json:"justification,omitempty"`
    ApprovedBy  *string   `json:"approved_by,omitempty"`
    CreatedAt   time.Time `json:"created_at"`
}

type Location struct {
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
}

type WorkSchedule struct {
    ID           string    `json:"id"`
    UserID       string    `json:"user_id"`
    DayOfWeek    int       `json:"day_of_week"` // 0=domingo, 1=segunda...
    StartTime    string    `json:"start_time"`  // "08:00"
    EndTime      string    `json:"end_time"`    // "17:00"
    BreakMinutes int       `json:"break_minutes"` // 60
    IsActive     bool      `json:"is_active"`
}

type HourBank struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    Month       time.Time `json:"month"`
    Expected    int       `json:"expected"`    // minutos esperados
    Worked      int       `json:"worked"`      // minutos trabalhados
    Balance     int       `json:"balance"`     // diferença (+ ou -)
    Overtime    int       `json:"overtime"`    // horas extras
    Absences    int       `json:"absences"`    // faltas (minutos)
}

type Justification struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    Date        time.Time `json:"date"`
    Type        string    `json:"type"` // atestado, falta, atraso
    Reason      string    `json:"reason"`
    Attachment  string    `json:"attachment,omitempty"`
    Status      string    `json:"status"` // pendente, aprovado, rejeitado
    ReviewedBy  *string   `json:"reviewed_by,omitempty"`
    ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
}
```

#### Endpoints
```go
// routes/clock.go
POST   /api/clock/punch              // Registrar ponto
GET    /api/clock/today              // Pontos de hoje
GET    /api/clock/history            // Histórico (mês/período)
GET    /api/clock/bank               // Banco de horas
POST   /api/clock/justify            // Justificar ausência/atraso
GET    /api/clock/schedule           // Horário de trabalho

// Admin
GET    /api/clock/admin/pending      // Ajustes pendentes
PUT    /api/clock/admin/:id/approve  // Aprovar ajuste
GET    /api/clock/admin/report       // Relatório de ponto
POST   /api/clock/admin/schedule     // Definir horário
```

#### Frontend (Next.js)
```typescript
// app/ponto/page.tsx
'use client'

export default function PontoPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayEntries, setTodayEntries] = useState([])
  const [workingTime, setWorkingTime] = useState(0)

  const handlePunch = async (type: string) => {
    const location = await getLocation()
    await api.post('/clock/punch', {
      type,
      location,
      device: navigator.userAgent
    })
  }

  return (
    <div className="container">
      {/* Relógio grande */}
      <div className="text-6xl font-bold text-center">
        {currentTime.toLocaleTimeString()}
      </div>

      {/* Botões de ponto */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <Button onClick={() => handlePunch('entrada')}>
          Entrada
        </Button>
        <Button onClick={() => handlePunch('saida')}>
          Saída
        </Button>
        <Button onClick={() => handlePunch('pausa_inicio')}>
          Início Pausa
        </Button>
        <Button onClick={() => handlePunch('pausa_fim')}>
          Fim Pausa
        </Button>
      </div>

      {/* Tempo trabalhado hoje */}
      <div className="mt-8">
        <h3>Tempo trabalhado hoje</h3>
        <p className="text-4xl">{formatMinutes(workingTime)}</p>
      </div>

      {/* Histórico de hoje */}
      <div className="mt-8">
        <h3>Registros de hoje</h3>
        {todayEntries.map(entry => (
          <div key={entry.id}>
            {entry.type}: {entry.timestamp}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Regras de Negócio
1. **Tolerância**: 10 minutos de atraso sem desconto
2. **Intervalo mínimo**: 1 hora para jornadas > 6h
3. **Jornada máxima**: 10 horas/dia (incluindo extras)
4. **Banco de horas**: Compensação em até 6 meses
5. **Horas extras**: Máximo 2h/dia

### Validações
- ✅ Não permitir entrada duplicada no mesmo dia
- ✅ Saída só após entrada
- ✅ Pausa só durante jornada
- ✅ Alertar se esquecer de bater ponto
- ✅ Bloquear ajustes retroativos > 7 dias

### Relatórios Necessários
1. **Espelho de ponto** (mensal, por colaborador)
2. **Banco de horas** (saldo atual)
3. **Horas extras** (por período)
4. **Faltas e atrasos** (por colaborador)
5. **Consolidado** (para folha de pagamento)

---

## 2. 🔒 Segurança e LGPD

**Complexidade**: 🟡 Média (4-6 semanas)
**Custo**: R$ 60.000
**ROI**: Crítico - Evita multas de até R$ 50 milhões

### Por que é crítico?
- ⚖️ **Lei 13.709/2018** (LGPD) - Multas de até 2% do faturamento
- 🔐 Dados sensíveis (CPF, salário, saúde)
- 🎯 Alvo de ataques (dados de RH são valiosos)
- 📋 Auditoria obrigatória

### Implementações Obrigatórias

#### 1. Criptografia de Dados Sensíveis
```go
// utils/crypto.go
package utils

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "io"
)

var encryptionKey = []byte(os.Getenv("ENCRYPTION_KEY")) // 32 bytes

func Encrypt(plaintext string) (string, error) {
    block, err := aes.NewCipher(encryptionKey)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }

    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(ciphertext string) (string, error) {
    data, err := base64.StdEncoding.DecodeString(ciphertext)
    if err != nil {
        return "", err
    }

    block, err := aes.NewCipher(encryptionKey)
    if err != nil {
        return "", err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonceSize := gcm.NonceSize()
    nonce, ciphertext := data[:nonceSize], data[nonceSize:]

    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}
```

**Campos a criptografar:**
- CPF
- RG
- Salário
- Dados bancários (agência, conta)
- Endereço completo
- Telefone
- Dados de saúde (atestados)

#### 2. Logs de Auditoria Completos
```go
// models/audit.go
type AuditLog struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    UserName    string    `json:"user_name"`
    Action      string    `json:"action"` // view, create, update, delete
    Resource    string    `json:"resource"` // payroll, user, document
    ResourceID  string    `json:"resource_id"`
    Details     string    `json:"details"` // JSON com dados alterados
    IPAddress   string    `json:"ip_address"`
    UserAgent   string    `json:"user_agent"`
    Timestamp   time.Time `json:"timestamp"`
}

// middleware/audit.go
func AuditMiddleware(c *fiber.Ctx) error {
    // Captura request
    start := time.Now()

    // Processa request
    err := c.Next()

    // Loga ações sensíveis
    if isSensitiveAction(c.Path(), c.Method()) {
        log := AuditLog{
            UserID:     c.Locals("user_id").(string),
            Action:     c.Method(),
            Resource:   extractResource(c.Path()),
            ResourceID: c.Params("id"),
            IPAddress:  c.IP(),
            UserAgent:  c.Get("User-Agent"),
            Timestamp:  time.Now(),
        }
        saveAuditLog(log)
    }

    return err
}
```

**Ações a auditar:**
- ✅ Visualização de salários
- ✅ Alteração de dados pessoais
- ✅ Download de documentos
- ✅ Acesso a relatórios
- ✅ Criação/exclusão de usuários
- ✅ Aprovações (férias, ponto, etc)
- ✅ Login/logout

#### 3. LGPD Compliance
```go
// models/consent.go
type Consent struct {
    ID          string    `json:"id"`
    UserID      string    `json:"user_id"`
    Purpose     string    `json:"purpose"` // cadastro, folha, beneficios
    Description string    `json:"description"`
    ConsentDate time.Time `json:"consent_date"`
    RevokedDate *time.Time `json:"revoked_date,omitempty"`
    IPAddress   string    `json:"ip_address"`
}

// handlers/lgpd.go
func GetMyData(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    // Exporta TODOS os dados do usuário
    data := map[string]interface{}{
        "user": getUserData(userID),
        "payrolls": getPayrolls(userID),
        "documents": getDocuments(userID),
        "vacations": getVacations(userID),
        "clock_entries": getClockEntries(userID),
        "consents": getConsents(userID),
    }

    return c.JSON(data)
}

func DeleteMyData(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    // Anonimiza dados (não deleta por compliance trabalhista)
    anonymizeUser(userID)

    return c.JSON(fiber.Map{
        "success": true,
        "message": "Dados anonimizados com sucesso",
    })
}
```

**Funcionalidades LGPD:**
- ✅ Termo de consentimento no cadastro
- ✅ Direito de acesso (exportar dados)
- ✅ Direito ao esquecimento (anonimizar)
- ✅ Portabilidade (JSON/CSV)
- ✅ Revogação de consentimento
- ✅ Relatório de dados coletados

#### 4. Autenticação de Dois Fatores (2FA)
```go
// models/twofa.go
type TwoFactorAuth struct {
    ID          string   `json:"id"`
    UserID      string   `json:"user_id"`
    Secret      string   `json:"secret"` // Criptografado
    Enabled     bool     `json:"enabled"`
    BackupCodes []string `json:"backup_codes"` // Criptografados
    CreatedAt   time.Time `json:"created_at"`
}

// handlers/auth.go
import "github.com/pquerna/otp/totp"

func EnableTwoFactor(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(string)

    // Gera secret
    key, err := totp.Generate(totp.GenerateOpts{
        Issuer:      "FrappYOU",
        AccountName: user.Email,
    })

    // Gera backup codes
    backupCodes := generateBackupCodes(10)

    // Salva (criptografado)
    twoFA := TwoFactorAuth{
        UserID:      userID,
        Secret:      encrypt(key.Secret()),
        BackupCodes: encryptCodes(backupCodes),
        Enabled:     false, // Só ativa após validação
    }

    return c.JSON(fiber.Map{
        "qr_code": key.URL(),
        "backup_codes": backupCodes,
    })
}

func VerifyTwoFactor(c *fiber.Ctx) error {
    code := c.FormValue("code")
    secret := decrypt(twoFA.Secret)

    valid := totp.Validate(code, secret)
    if !valid {
        return c.Status(401).JSON(fiber.Map{
            "error": "Código inválido",
        })
    }

    // Ativa 2FA
    twoFA.Enabled = true
    db.Save(&twoFA)

    return c.JSON(fiber.Map{"success": true})
}
```

#### 5. Política de Senhas Fortes
```go
// utils/password.go
func ValidatePassword(password string) error {
    if len(password) < 8 {
        return errors.New("Senha deve ter no mínimo 8 caracteres")
    }

    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*]`).MatchString(password)

    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("Senha deve conter maiúsculas, minúsculas, números e caracteres especiais")
    }

    // Verifica senhas comuns
    if isCommonPassword(password) {
        return errors.New("Senha muito comum, escolha outra")
    }

    return nil
}

// Força troca de senha a cada 90 dias
func CheckPasswordExpiration(user User) bool {
    return time.Since(user.PasswordChangedAt) > 90*24*time.Hour
}
```

### Checklist de Segurança
- [ ] Criptografia AES-256 para dados sensíveis
- [ ] Logs de auditoria para todas ações críticas
- [ ] Termo de consentimento LGPD
- [ ] Exportação de dados (portabilidade)
- [ ] Anonimização (direito ao esquecimento)
- [ ] 2FA obrigatório para admins
- [ ] Política de senhas fortes
- [ ] Sessões com timeout (30 min)
- [ ] Rate limiting (proteção DDoS)
- [ ] HTTPS obrigatório
- [ ] Headers de segurança (CSP, HSTS)
- [ ] Backup diário automático
- [ ] Plano de resposta a incidentes

---

## 3. 💰 Folha de Pagamento - Cálculos Básicos

**Complexidade**: 🔴 Alta (2 meses)
**Custo**: R$ 30.000
**ROI**: Alto - Elimina erros, economiza 40h/mês

### Por que é crítico?
- 💸 Erros custam caro (recálculos, processos)
- ⏱️ Processo manual consome muito tempo
- 📊 Base para todas decisões financeiras
- ⚖️ Compliance fiscal (eSocial, SEFIP)

### Implementação Fase 1 (Básico)

#### Estrutura de Dados
```go
// models/payroll.go
type Payroll struct {
    ID              string    `json:"id"`
    UserID          string    `json:"user_id"`
    Month           time.Time `json:"month"`

    // Salário base
    BaseSalary      float64   `json:"base_salary"`

    // Proventos
    Overtime        float64   `json:"overtime"`        // Horas extras
    NightShift      float64   `json:"night_shift"`     // Adicional noturno
    DangerPay       float64   `json:"danger_pay"`      // Periculosidade
    Bonuses         float64   `json:"bonuses"`         // Bônus

    // Descontos
    INSS            float64   `json:"inss"`
    IRRF            float64   `json:"irrf"`
    TransportVoucher float64  `json:"transport_voucher"` // 6%
    MealVoucher     float64   `json:"meal_voucher"`
    HealthPlan      float64   `json:"health_plan"`
    DentalPlan      float64   `json:"dental_plan"`

    // Totais
    GrossSalary     float64   `json:"gross_salary"`    // Bruto
    TotalDeductions float64   `json:"total_deductions"`
    NetSalary       float64   `json:"net_salary"`      // Líquido

    Status          string    `json:"status"` // draft, calculated, approved, paid
    CalculatedAt    *time.Time `json:"calculated_at,omitempty"`
    ApprovedBy      *string   `json:"approved_by,omitempty"`
    PaidAt          *time.Time `json:"paid_at,omitempty"`
}
```

#### Cálculos (Tabelas 2024)
```go
// services/payroll_calculator.go

// INSS - Tabela Progressiva 2024
func CalculateINSS(salary float64) float64 {
    brackets := []struct {
        limit float64
        rate  float64
        deduction float64
    }{
        {1412.00, 0.075, 0},
        {2666.68, 0.09, 21.18},
        {4000.03, 0.12, 101.18},
        {7786.02, 0.14, 181.18},
    }

    for _, bracket := range brackets {
        if salary <= bracket.limit {
            return (salary * bracket.rate) - bracket.deduction
        }
    }

    // Teto do INSS
    return 908.85
}

// IRRF - Tabela Progressiva 2024
func CalculateIRRF(salary, inss float64, dependents int) float64 {
    // Base de cálculo = salário - INSS - dependentes
    base := salary - inss - (float64(dependents) * 189.59)

    brackets := []struct {
        limit float64
        rate  float64
        deduction float64
    }{
        {2259.20, 0, 0},
        {2826.65, 0.075, 169.44},
        {3751.05, 0.15, 381.44},
        {4664.68, 0.225, 662.77},
        {math.MaxFloat64, 0.275, 896.00},
    }

    for _, bracket := range brackets {
        if base <= bracket.limit {
            if bracket.rate == 0 {
                return 0
            }
            return (base * bracket.rate) - bracket.deduction
        }
    }

    return 0
}

// Horas Extras
func CalculateOvertime(baseSalary float64, hours float64, rate float64) float64 {
    hourlyRate := baseSalary / 220 // 220 horas/mês
    return hourlyRate * hours * rate // rate = 1.5 (50%) ou 2.0 (100%)
}

// Adicional Noturno (22h-5h)
func CalculateNightShift(baseSalary float64, hours float64) float64 {
    hourlyRate := baseSalary / 220
    return hourlyRate * hours * 1.2 // 20% de adicional
}

// Vale Transporte (6% de desconto, máximo)
func CalculateTransportVoucher(baseSalary float64, dailyCost float64, workDays int) float64 {
    totalCost := dailyCost * float64(workDays)
    maxDiscount := baseSalary * 0.06

    if totalCost <= maxDiscount {
        return totalCost
    }
    return maxDiscount
}

// Cálculo completo
func CalculatePayroll(userID string, month time.Time) (*Payroll, error) {
    user := getUser(userID)

    // Busca dados do mês
    overtime := getOvertimeHours(userID, month)
    nightShift := getNightShiftHours(userID, month)
    benefits := getUserBenefits(userID)

    payroll := &Payroll{
        UserID:     userID,
        Month:      month,
        BaseSalary: user.Salary,
    }

    // Proventos
    payroll.Overtime = CalculateOvertime(user.Salary, overtime, 1.5)
    payroll.NightShift = CalculateNightShift(user.Salary, nightShift)
    payroll.GrossSalary = payroll.BaseSalary + payroll.Overtime + payroll.NightShift

    // Descontos
    payroll.INSS = CalculateINSS(payroll.GrossSalary)
    payroll.IRRF = CalculateIRRF(payroll.GrossSalary, payroll.INSS, user.Dependents)
    payroll.TransportVoucher = CalculateTransportVoucher(user.Salary, benefits.TransportCost, 22)
    payroll.HealthPlan = benefits.HealthPlanCost
    payroll.DentalPlan = benefits.DentalPlanCost

    payroll.TotalDeductions = payroll.INSS + payroll.IRRF +
                              payroll.TransportVoucher +
                              payroll.HealthPlan + payroll.DentalPlan

    payroll.NetSalary = payroll.GrossSalary - payroll.TotalDeductions
    payroll.Status = "calculated"
    payroll.CalculatedAt = timeNow()

    return payroll, nil
}
```

### Endpoints
```go
POST   /api/payroll/calculate/:month     // Calcular folha do mês
GET    /api/payroll/:id                  // Ver holerite
GET    /api/payroll/my                   // Meus holerites
POST   /api/payroll/:id/approve          // Aprovar (admin)
POST   /api/payroll/:id/pay              // Marcar como pago
GET    /api/payroll/report/:month        // Relatório consolidado
```

### Validações
- ✅ Não permitir recálculo de folha paga
- ✅ Validar se todos colaboradores têm salário cadastrado
- ✅ Alertar se horas extras > 2h/dia
- ✅ Validar se banco de horas está zerado
- ✅ Conferir se todos benefícios estão cadastrados

---

## 📊 Resumo de Investimento - Prioridade Crítica

| Feature | Prazo | Custo | Impacto |
|---------|-------|-------|---------|
| Ponto Eletrônico | 2-3 meses | R$ 90.000 | Compliance + Controle |
| Segurança/LGPD | 1-1.5 meses | R$ 60.000 | Evita multas |
| Folha Básica | 2 meses | R$ 30.000 | Elimina erros |
| **TOTAL** | **3 meses** | **R$ 180.000** | **Crítico** |

## ✅ Checklist de Conclusão

Antes de passar para Prioridade Alta:

- [ ] Ponto eletrônico funcionando (web + mobile)
- [ ] Banco de horas calculado corretamente
- [ ] Relatórios de ponto gerados
- [ ] Dados sensíveis criptografados
- [ ] Logs de auditoria implementados
- [ ] LGPD compliance (termo + exportação)
- [ ] 2FA ativo para admins
- [ ] Folha calculando INSS e IRRF corretamente
- [ ] Holerite gerado em PDF
- [ ] Testes de carga realizados
- [ ] Documentação completa
- [ ] Treinamento de usuários realizado

---

**Próximo passo**: Após concluir estas 3 features críticas, seguir para [PRIORIDADE-ALTA.md](PRIORIDADE-ALTA.md)
