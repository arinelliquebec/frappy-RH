package handlers

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// cleanCPF remove caracteres não numéricos do CPF
func cleanCPF(cpf string) string {
	reg := regexp.MustCompile("[^0-9]+")
	return reg.ReplaceAllString(cpf, "")
}

// isEmailAllowed verifica se o domínio do email é permitido
func isEmailAllowed(email string) bool {
	allowedDomains := []string{
		"fradema.com.br",
		"frademaconstrucoes.com.br",
		"facilite.com.br",
		"cidimobiliaria.com.br",
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	domain := strings.ToLower(parts[1])

	for _, allowed := range allowedDomains {
		if domain == allowed {
			return true
		}
	}
	return false
}

// Signup processa o cadastro de um novo usuário
func Signup(c *fiber.Ctx) error {
	var req models.SignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Limpa CPF
	cpfClean := cleanCPF(req.CPF)

	// Validação básica
	if req.Name == "" || req.Email == "" || cpfClean == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Nome, email, CPF e senha são obrigatórios",
		})
	}

	// Validação de Domínio de Email
	if !isEmailAllowed(req.Email) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Domínio de email não autorizado. Use um email corporativo válido.",
		})
	}

	if len(cpfClean) != 11 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "CPF inválido",
		})
	}

	if len(req.Answers) != 35 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Todas as 35 perguntas devem ser respondidas",
		})
	}

	// Verifica se o CPF já existe
	var existingUserCPF models.User
	if result := config.DB.Where("cpf = ?", cpfClean).First(&existingUserCPF); result.Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "Este CPF já está cadastrado",
		})
	}

	// Verifica se o email já existe (opcional manter verificação se email ainda for único)
	var existingUserEmail models.User
	if result := config.DB.Where("email = ?", req.Email).First(&existingUserEmail); result.Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "Este email já está cadastrado",
		})
	}

	// Hash da senha fornecida
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao processar senha",
		})
	}

	// Cria o usuário
	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		CPF:      cpfClean,
		Company:  req.Company,
		Password: string(hashedPassword),
	}

	if result := config.DB.Create(&user); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar usuário: " + result.Error.Error(),
		})
	}

	// Calcula e salva as respostas do questionário
	answersJSON, _ := json.Marshal(req.Answers)
	score := models.CalculateSurveyScore(req.Answers)

	surveyResponse := models.SurveyResponse{
		UserID:  user.ID,
		Answers: string(answersJSON),
		Score:   score,
	}

	if result := config.DB.Create(&surveyResponse); result.Error != nil {
		// Log do erro mas não falha o cadastro
		println("Erro ao salvar respostas:", result.Error.Error())
	}

	// Gera o token JWT
	token, err := config.GenerateToken(user.ID, user.Role, false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao gerar token",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"token":   token,
		"user":    user.ToResponse(),
	})
}

// DebugYasmin busca informações sobre Yasmin Condé Arrighi (TEMPORÁRIO)
func DebugYasmin(c *fiber.Ctx) error {
	type Result struct {
		Tabela string
		Dados  interface{}
	}

	results := []Result{}

	// 1. Buscar na tabela users
	var users []map[string]interface{}
	config.DB.Raw(`
		SELECT id, name, email, cpf, role, CONVERT(varchar, created_at, 120) as created_at
		FROM users
		WHERE name LIKE '%Yasmin%' OR name LIKE '%Condé%' OR name LIKE '%Arrighi%'
	`).Scan(&users)
	results = append(results, Result{"users", users})

	// 2. Buscar na tabela PessoasFisicasFradema
	var pessoas []map[string]interface{}
	config.DB.Raw(`
		SELECT Id, Nome, Cpf, EmailEmpresarial, CONVERT(varchar, DataCadastro, 120) as DataCadastro
		FROM dbo.PessoasFisicasFradema
		WHERE Nome LIKE '%Yasmin%' OR Nome LIKE '%Condé%' OR Nome LIKE '%Arrighi%'
	`).Scan(&pessoas)
	results = append(results, Result{"pessoas_fisicas", pessoas})

	// 3. Buscar na tabela ColaboradoresFradema (com JOIN)
	var colaboradores []map[string]interface{}
	config.DB.Raw(`
		SELECT c.Id as ColaboradorID, p.Id as PessoaFisicaID, p.Nome, p.Cpf, c.Cargo, c.Filial, c.Ativo
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%'
	`).Scan(&colaboradores)
	results = append(results, Result{"colaboradores_com_join", colaboradores})

	// 4. Verificar se existe PessoaFisica sem Colaborador
	var pessoasSemColab []map[string]interface{}
	config.DB.Raw(`
		SELECT p.Id, p.Nome, p.Cpf, p.EmailEmpresarial
		FROM dbo.PessoasFisicasFradema p
		LEFT JOIN dbo.ColaboradoresFradema c ON c.PessoaFisicaId = p.Id
		WHERE (p.Nome LIKE '%Yasmin%' OR p.Nome LIKE '%Condé%' OR p.Nome LIKE '%Arrighi%')
		  AND c.Id IS NULL
	`).Scan(&pessoasSemColab)
	results = append(results, Result{"pessoas_sem_colaborador", pessoasSemColab})

	return c.JSON(fiber.Map{
		"success": true,
		"results": results,
	})
}

// ValidateCPF verifica se o CPF está na lista de colaboradores
func ValidateCPF(c *fiber.Ctx) error {
	var req struct {
		CPF string `json:"cpf"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	cpfClean := cleanCPF(req.CPF)

	if len(cpfClean) != 11 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"valid":   false,
			"error":   "CPF deve ter 11 dígitos",
		})
	}

	// Verifica se o CPF existe na lista de colaboradores (JOIN entre ColaboradoresFradema e PessoasFisicasFradema)
	// Tenta múltiplas formas de comparação
	var colaborador struct {
		Nome  string
		Email string
	}

	// Primeira tentativa: comparação direta (caso CPF já esteja limpo no banco)
	query := `
		SELECT TOP 1 p.Nome, p.EmailEmpresarial as Email
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE p.Cpf = ? OR REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') = ?
	`
	if err := config.DB.Raw(query, cpfClean, cpfClean).Scan(&colaborador).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"valid":   false,
			"error":   "Erro ao verificar CPF: " + err.Error(),
		})
	}

	if colaborador.Nome == "" {
		// Debug: verificar se o CPF existe diretamente na tabela PessoasFisicasFradema
		var debugResult struct {
			Total int
		}
		config.DB.Raw(`SELECT COUNT(*) as Total FROM dbo.PessoasFisicasFradema WHERE Cpf LIKE ?`, "%"+cpfClean[len(cpfClean)-4:]+"%").Scan(&debugResult)

		return c.JSON(fiber.Map{
			"success": true,
			"valid":   false,
			"message": "CPF não encontrado na lista de colaboradores",
			"debug":   debugResult.Total,
		})
	}

	// Verifica se já existe conta com este CPF
	var count int64
	config.DB.Model(&models.User{}).Where("cpf = ?", cpfClean).Count(&count)
	alreadyRegistered := count > 0

	return c.JSON(fiber.Map{
		"success":            true,
		"valid":              true,
		"already_registered": alreadyRegistered,
		"name":               colaborador.Nome,
	})
}

// ActivateAccount ativa uma conta verificando se o CPF existe na lista de colaboradores
func ActivateAccount(c *fiber.Ctx) error {
	var req struct {
		CPF      string `json:"cpf"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Limpa CPF
	cpfClean := cleanCPF(req.CPF)

	// Validação básica
	if cpfClean == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "CPF e senha são obrigatórios",
		})
	}

	if len(cpfClean) != 11 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "CPF inválido",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "A senha deve ter pelo menos 6 caracteres",
		})
	}

	// Verifica se o CPF existe na lista de colaboradores (JOIN entre ColaboradoresFradema e PessoasFisicasFradema)
	// Tenta múltiplas formas de comparação
	var colaborador struct {
		Nome  string
		Email string
	}
	query := `
		SELECT TOP 1 p.Nome, p.EmailEmpresarial as Email
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE p.Cpf = ? OR REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') = ?
	`
	if err := config.DB.Raw(query, cpfClean, cpfClean).Scan(&colaborador).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao verificar CPF: " + err.Error(),
		})
	}

	if colaborador.Nome == "" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "CPF não encontrado na lista de colaboradores. Entre em contato com o RH.",
		})
	}

	// Verifica se já existe usuário com este CPF (conta já criada)
	var existingUser models.User
	if result := config.DB.Where("cpf = ?", cpfClean).First(&existingUser); result.Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "Este CPF já possui uma conta. Faça login.",
		})
	}

	// Hash da senha fornecida
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao processar senha",
		})
	}

	// Determina o role (admin master para CPF específico)
	role := "user"
	adminMasterCPF := "12365382770"
	if cpfClean == adminMasterCPF {
		role = "admin"
	}

	// Cria o usuário com os dados da tabela de colaboradores
	user := models.User{
		Name:     colaborador.Nome,
		Email:    colaborador.Email,
		CPF:      cpfClean,
		Password: string(hashedPassword),
		Role:     role,
	}

	// Se não tiver nome na tabela, usa um placeholder
	if user.Name == "" {
		user.Name = "Usuário " + cpfClean[0:3] + "..." + cpfClean[8:11]
	}

	// Se não tiver email, cria um placeholder (pode ser atualizado depois)
	if user.Email == "" {
		user.Email = cpfClean + "@placeholder.local"
	}

	if result := config.DB.Create(&user); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar conta: " + result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Conta criada com sucesso! Faça login para continuar.",
	})
}

// Login processa a autenticação de um usuário
func Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Limpa CPF
	cpfClean := cleanCPF(req.CPF)

	// Validação básica
	if cpfClean == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "CPF e senha são obrigatórios",
		})
	}

	// Busca o usuário por CPF
	var user models.User
	if result := config.DB.Where("cpf = ?", cpfClean).First(&user); result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "CPF ou senha incorretos",
		})
	}

	// Verifica a senha
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "CPF ou senha incorretos",
		})
	}

	// Gera o token JWT
	token, err := config.GenerateToken(user.ID, user.Role, req.RememberMe)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao gerar token",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"token":   token,
		"user":    user.ToResponse(),
	})
}
