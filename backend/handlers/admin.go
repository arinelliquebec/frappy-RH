package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// CreateAuditLog cria um registro de auditoria
func CreateAuditLog(adminID, adminName, adminEmail, action, entityType, entityID, entityName, fieldName, oldValue, newValue, description, ipAddress, userAgent string) {
	auditLog := models.AuditLog{
		AdminID:     adminID,
		AdminName:   adminName,
		AdminEmail:  adminEmail,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		EntityName:  entityName,
		FieldName:   fieldName,
		OldValue:    oldValue,
		NewValue:    newValue,
		Description: description,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
	}

	if err := config.DB.Create(&auditLog).Error; err != nil {
		log.Printf("Erro ao criar log de auditoria: %v", err)
	}
}

// GetDashboardStats retorna estatísticas do dashboard admin
func GetDashboardStats(c *fiber.Ctx) error {
	var totalUsers int64
	var totalAdmins int64
	var recentLogs int64

	config.DB.Model(&models.User{}).Count(&totalUsers)
	config.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&totalAdmins)
	config.DB.Model(&models.AuditLog{}).Where("created_at >= DATEADD(day, -7, GETDATE())").Count(&recentLogs)

	// Usuários recentes (últimos 7 dias)
	var recentUsers int64
	config.DB.Model(&models.User{}).Where("created_at >= DATEADD(day, -7, GETDATE())").Count(&recentUsers)

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"total_users":  totalUsers,
			"total_admins": totalAdmins,
			"recent_logs":  recentLogs,
			"recent_users": recentUsers,
			"active_users": totalUsers - totalAdmins,
		},
	})
}

// GetAllUsers retorna todos os colaboradores de dbo.ColaboradoresFradema em ordem alfabética
func GetAllUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	search := c.Query("search", "")
	role := c.Query("role", "")
	filial := c.Query("filial", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 500 {
		limit = 100
	}

	offset := (page - 1) * limit

	// Estrutura para colaboradores do banco (JOIN entre ColaboradoresFradema e PessoasFisicasFradema)
	type Colaborador struct {
		Id               int     `json:"id"`
		Cpf              *string `json:"cpf"`
		Nome             *string `json:"nome"`
		EmailEmpresarial *string `json:"email_empresarial"`
		Cargo            *string `json:"cargo"`
		Ativo            *bool   `json:"ativo"`
		Filial           *string `json:"filial"`
		DataNascimento   *string `json:"data_nascimento"`
	}

	var colaboradores []Colaborador
	var total int64

	// Construir cláusula WHERE dinamicamente
	whereConditions := []string{}
	queryParams := []interface{}{}

	if search != "" {
		whereConditions = append(whereConditions, "(p.Nome LIKE @search OR p.Cpf LIKE @search OR p.EmailEmpresarial LIKE @search)")
		queryParams = append(queryParams, sql.Named("search", "%"+search+"%"))
	}

	if filial != "" {
		whereConditions = append(whereConditions, "c.Filial = @filial")
		queryParams = append(queryParams, sql.Named("filial", filial))
	}

	// Filtro de role - precisa fazer LEFT JOIN com tabela de usuários
	roleJoin := ""
	if role != "" {
		roleJoin = "LEFT JOIN users u ON REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(u.cpf, '.', ''), '-', ''), ' ', '')"
		if role == "admin" {
			whereConditions = append(whereConditions, "u.role = @role")
		} else {
			// Para role="user", incluir quem tem role='user' OU quem não tem registro na tabela users
			whereConditions = append(whereConditions, "(u.role = @role OR u.id IS NULL)")
		}
		queryParams = append(queryParams, sql.Named("role", role))
	}

	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	// Query para contar total (com JOIN)
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		%s
		%s
	`, roleJoin, whereClause)

	config.DB.Raw(countQuery, queryParams...).Scan(&total)

	// Query principal - JOIN entre ColaboradoresFradema e PessoasFisicasFradema
	mainQuery := fmt.Sprintf(`
		SELECT c.Id, p.Cpf, p.Nome, p.EmailEmpresarial, c.Cargo, c.Ativo, c.Filial, CONVERT(varchar(10), p.DataNascimento, 120) as DataNascimento
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		%s
		%s
		ORDER BY p.Nome ASC
		OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
	`, roleJoin, whereClause)

	// Adiciona parâmetros de paginação
	queryParams = append(queryParams, sql.Named("offset", offset), sql.Named("limit", limit))

	// Executa query
	err := config.DB.Raw(mainQuery, queryParams...).Scan(&colaboradores).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar colaboradores: " + err.Error(),
		})
	}

	// Converte para response, vinculando com usuários do sistema se existirem
	var usersResponse []fiber.Map
	for _, colab := range colaboradores {
		cpf := ""
		if colab.Cpf != nil {
			cpf = *colab.Cpf
		}

		email := ""
		if colab.EmailEmpresarial != nil {
			email = *colab.EmailEmpresarial
		}

		nome := ""
		if colab.Nome != nil {
			nome = *colab.Nome
		}

		cargo := ""
		if colab.Cargo != nil {
			cargo = *colab.Cargo
		}

		ativo := true
		if colab.Ativo != nil {
			ativo = *colab.Ativo
		}

		filialValue := ""
		if colab.Filial != nil {
			filialValue = *colab.Filial
		}

		dataNascimento := ""
		if colab.DataNascimento != nil {
			dataNascimento = *colab.DataNascimento
		}

		// Busca se existe usuário no sistema com esse CPF (busca flexível com/sem formatação)
		var user models.User
		hasSystemUser := false
		userID := ""
		userRole := "user"
		if cpf != "" {
			// Limpa o CPF de formatação para comparação
			cleanCPF := cpf
			for _, char := range []string{".", "-", " "} {
				cleanCPF = strings.ReplaceAll(cleanCPF, char, "")
			}
			// Busca com CPF formatado ou limpo
			if err := config.DB.Where("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?", cleanCPF).First(&user).Error; err == nil {
				hasSystemUser = true
				userID = user.ID
				userRole = user.Role
				// Usa o cargo do user se existir, senão usa o do colaborador
				if user.Position != "" {
					cargo = user.Position
				}
			}
		}

		userResp := fiber.Map{
			"id":                userID,
			"colaborador_id":    colab.Id,
			"name":              nome,
			"email":             email,
			"email_empresarial": email,
			"cpf":               cpf,
			"position":          cargo,
			"role":              userRole,
			"has_system_user":   hasSystemUser,
			"ativo":             ativo,
			"filial":            filialValue,
			"data_nascimento":   dataNascimento,
			"created_at":        nil,
		}

		if hasSystemUser {
			userResp["created_at"] = user.CreatedAt
		}

		usersResponse = append(usersResponse, userResp)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"users":   usersResponse,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetFiliais retorna todas as filiais da tabela dbo.Filiais
func GetFiliais(c *fiber.Ctx) error {
	var filiais []string
	err := config.DB.Raw(`
		SELECT Nome
		FROM dbo.Filiais
		WHERE Nome IS NOT NULL AND LTRIM(RTRIM(Nome)) != ''
		ORDER BY Nome
	`).Scan(&filiais).Error

	if err != nil {
		// Se der erro, tenta buscar da coluna Filial
		err = config.DB.Raw(`
			SELECT Filial
			FROM dbo.Filiais
			WHERE Filial IS NOT NULL AND LTRIM(RTRIM(Filial)) != ''
			ORDER BY Filial
		`).Scan(&filiais).Error

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Erro ao buscar filiais: " + err.Error(),
			})
		}
	}

	// Log para debug
	log.Printf("Filiais encontradas: %d - %v", len(filiais), filiais)

	return c.JSON(fiber.Map{
		"success": true,
		"filiais": filiais,
	})
}

// SearchColaboradores busca colaboradores por CPF ou Nome na tabela PessoasFisicasFradema
func SearchColaboradores(c *fiber.Ctx) error {
	search := c.Query("search", "")

	if len(search) < 2 {
		return c.JSON(fiber.Map{
			"success":       true,
			"colaboradores": []interface{}{},
		})
	}

	type ColaboradorResult struct {
		Id               int     `json:"id"`
		Nome             *string `json:"nome"`
		Cpf              *string `json:"cpf"`
		EmailEmpresarial *string `json:"email_empresarial"`
		EmailPessoal     *string `json:"email_pessoal"`
		Codinome         *string `json:"codinome"`
		Sexo             *string `json:"sexo"`
		DataNascimento   *string `json:"data_nascimento"`
		EstadoCivil      *string `json:"estado_civil"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		Telefone1        *string `json:"telefone1"`
		Telefone2        *string `json:"telefone2"`
		HasSystemUser    bool    `json:"has_system_user"`
	}

	var colaboradores []ColaboradorResult

	// Limpa a busca para CPF (remove pontos e traços)
	cleanSearch := search
	for _, char := range []string{".", "-", " "} {
		cleanSearch = strings.ReplaceAll(cleanSearch, char, "")
	}

	query := `
		SELECT TOP 10
			p.Id,
			p.Nome,
			p.Cpf,
			p.EmailEmpresarial,
			p.EmailPessoal,
			p.Codinome,
			p.Sexo,
			CONVERT(varchar(10), p.DataNascimento, 120) as DataNascimento,
			p.EstadoCivil,
			p.Rg,
			p.Cnh,
			p.Telefone1,
			p.Telefone2
		FROM dbo.PessoasFisicasFradema p
		WHERE p.Nome LIKE @search
		   OR REPLACE(REPLACE(REPLACE(p.Cpf, '.', ''), '-', ''), ' ', '') LIKE @cleanSearch
		ORDER BY p.Nome
	`

	rows, err := config.DB.Raw(query,
		sql.Named("search", "%"+search+"%"),
		sql.Named("cleanSearch", "%"+cleanSearch+"%"),
	).Rows()

	if err != nil {
		log.Printf("Erro ao buscar colaboradores: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar colaboradores",
		})
	}
	defer rows.Close()

	for rows.Next() {
		var col ColaboradorResult
		if err := rows.Scan(
			&col.Id,
			&col.Nome,
			&col.Cpf,
			&col.EmailEmpresarial,
			&col.EmailPessoal,
			&col.Codinome,
			&col.Sexo,
			&col.DataNascimento,
			&col.EstadoCivil,
			&col.Rg,
			&col.Cnh,
			&col.Telefone1,
			&col.Telefone2,
		); err != nil {
			log.Printf("Erro ao escanear colaborador: %v", err)
			continue
		}

		// Verifica se já tem usuário no sistema
		if col.Cpf != nil {
			cleanCPF := *col.Cpf
			for _, char := range []string{".", "-", " "} {
				cleanCPF = strings.ReplaceAll(cleanCPF, char, "")
			}
			var existingUser models.User
			if err := config.DB.Where("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?", cleanCPF).First(&existingUser).Error; err == nil {
				col.HasSystemUser = true
			}
		}

		colaboradores = append(colaboradores, col)
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"colaboradores": colaboradores,
	})
}

// AdminCreateUser cria um novo usuário no sistema (admin ou colaborador)
func AdminCreateUser(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)

	var req struct {
		Name           string  `json:"name"`
		Email          string  `json:"email"`
		CPF            string  `json:"cpf"`
		Password       string  `json:"password"`
		Role           string  `json:"role"`
		EmailPessoal   *string `json:"email_pessoal"`
		Codinome       *string `json:"codinome"`
		Sexo           *string `json:"sexo"`
		DataNascimento *string `json:"data_nascimento"`
		EstadoCivil    *string `json:"estado_civil"`
		RG             *string `json:"rg"`
		CNH            *string `json:"cnh"`
		Telefone1      *string `json:"telefone1"`
		Telefone2      *string `json:"telefone2"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Validações
	if req.Name == "" || req.Email == "" || req.CPF == "" || req.Password == "" || req.DataNascimento == nil || *req.DataNascimento == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Preencha os campos obrigatórios (Nome, Email, CPF, Senha e Data de Nascimento)",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "A senha deve ter pelo menos 6 caracteres",
		})
	}

	// Limpa CPF
	cleanCPF := req.CPF
	for _, char := range []string{".", "-", " "} {
		cleanCPF = strings.ReplaceAll(cleanCPF, char, "")
	}

	// Verifica se CPF já existe na tabela users
	var existingUser models.User
	if err := config.DB.Where("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?", cleanCPF).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "Já existe um usuário com este CPF",
		})
	}

	// Verifica se email já existe
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   "Já existe um usuário com este email",
		})
	}

	// Hash da senha
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao processar senha",
		})
	}

	// Define role
	role := "user"
	if req.Role == "admin" {
		role = "admin"
	}

	// Verifica se já existe uma pessoa física com este CPF na tabela PessoasFisicasFradema
	var pessoaFisicaId int
	err = config.DB.Raw(`
		SELECT Id FROM dbo.PessoasFisicasFradema
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, cleanCPF).Scan(&pessoaFisicaId).Error

	if err != nil || pessoaFisicaId == 0 {
		// Pessoa física não existe, criar uma nova
		insertQuery := `
			INSERT INTO dbo.PessoasFisicasFradema
			(Nome, Cpf, EmailEmpresarial, EmailPessoal, Codinome, Sexo, DataNascimento, EstadoCivil, Rg, Cnh, Telefone1, Telefone2, TipoPessoa, DataCadastro)
			VALUES (@nome, @cpf, @emailEmpresarial, @emailPessoal, @codinome, @sexo, @dataNascimento, @estadoCivil, @rg, @cnh, @telefone1, @telefone2, 1, GETDATE());
			SELECT SCOPE_IDENTITY();
		`
		var newId int
		err = config.DB.Raw(insertQuery,
			sql.Named("nome", req.Name),
			sql.Named("cpf", cleanCPF),
			sql.Named("emailEmpresarial", req.Email),
			sql.Named("emailPessoal", req.EmailPessoal),
			sql.Named("codinome", req.Codinome),
			sql.Named("sexo", req.Sexo),
			sql.Named("dataNascimento", req.DataNascimento),
			sql.Named("estadoCivil", req.EstadoCivil),
			sql.Named("rg", req.RG),
			sql.Named("cnh", req.CNH),
			sql.Named("telefone1", req.Telefone1),
			sql.Named("telefone2", req.Telefone2),
		).Scan(&newId).Error

		if err != nil {
			log.Printf("Erro ao criar pessoa física: %v", err)
			// Continua mesmo se falhar, pois o usuário principal ainda será criado
		} else {
			pessoaFisicaId = newId
		}
	} else {
		// Pessoa física existe, atualizar dados se fornecidos
		updateFields := make(map[string]interface{})
		if req.EmailPessoal != nil && *req.EmailPessoal != "" {
			updateFields["EmailPessoal"] = *req.EmailPessoal
		}
		if req.Codinome != nil && *req.Codinome != "" {
			updateFields["Codinome"] = *req.Codinome
		}
		if req.Sexo != nil && *req.Sexo != "" {
			updateFields["Sexo"] = *req.Sexo
		}
		if req.DataNascimento != nil && *req.DataNascimento != "" {
			updateFields["DataNascimento"] = *req.DataNascimento
		}
		if req.EstadoCivil != nil && *req.EstadoCivil != "" {
			updateFields["EstadoCivil"] = *req.EstadoCivil
		}
		if req.RG != nil && *req.RG != "" {
			updateFields["Rg"] = *req.RG
		}
		if req.CNH != nil && *req.CNH != "" {
			updateFields["Cnh"] = *req.CNH
		}
		if req.Telefone1 != nil && *req.Telefone1 != "" {
			updateFields["Telefone1"] = *req.Telefone1
		}
		if req.Telefone2 != nil && *req.Telefone2 != "" {
			updateFields["Telefone2"] = *req.Telefone2
		}

		if len(updateFields) > 0 {
			config.DB.Table("dbo.PessoasFisicasFradema").Where("Id = ?", pessoaFisicaId).Updates(updateFields)
		}
	}

	// Cria usuário
	newUser := models.User{
		Name:     req.Name,
		Email:    req.Email,
		CPF:      cleanCPF,
		Password: string(hashedPassword),
		Role:     role,
	}

	if err := config.DB.Create(&newUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar usuário: " + err.Error(),
		})
	}

	// Busca admin para log
	var admin models.User
	config.DB.First(&admin, "id = ?", adminID)

	// Log de auditoria
	CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionCreate, models.EntityUser, newUser.ID, newUser.Name, "", "", "", fmt.Sprintf("Criou %s", role), c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Usuário criado com sucesso",
		"user": fiber.Map{
			"id":    newUser.ID,
			"name":  newUser.Name,
			"email": newUser.Email,
			"cpf":   newUser.CPF,
			"role":  newUser.Role,
		},
	})
}

// GetUserByID retorna um usuário específico
func GetUserByID(c *fiber.Ctx) error {
	userID := c.Params("id")

	var user models.User
	if err := config.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Busca dados completos da pessoa física
	var pessoaFisica struct {
		Id               int     `json:"id"`
		Nome             string  `json:"nome"`
		EmailEmpresarial *string `json:"email_empresarial"`
		EmailPessoal     *string `json:"email_pessoal"`
		Codinome         *string `json:"codinome"`
		Sexo             *string `json:"sexo"`
		DataNascimento   *string `json:"data_nascimento"`
		EstadoCivil      *string `json:"estado_civil"`
		Cpf              *string `json:"cpf"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		Telefone1        *string `json:"telefone1"`
		Telefone2        *string `json:"telefone2"`
	}

	config.DB.Raw(`
		SELECT
			Id, Nome, EmailEmpresarial, EmailPessoal, Codinome, Sexo,
			CONVERT(varchar, DataNascimento, 103) as DataNascimento,
			EstadoCivil, Cpf, Rg, Cnh, Telefone1, Telefone2
		FROM dbo.PessoasFisicasFradema
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, user.CPF).Scan(&pessoaFisica)

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user.ToResponse(),
		"profile": pessoaFisica,
	})
}

// UpdateUserRole altera o role de um usuário
func UpdateUserRole(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	targetUserID := c.Params("id")

	// Busca o admin
	var admin models.User
	if err := config.DB.First(&admin, "id = ?", adminID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Admin não encontrado",
		})
	}

	// Busca o usuário alvo
	var targetUser models.User
	if err := config.DB.First(&targetUser, "id = ?", targetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Parse do body
	var req struct {
		Role string `json:"role" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Valida role
	if req.Role != "user" && req.Role != "admin" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Role inválido. Use 'user' ou 'admin'",
		})
	}

	// Não permite remover o próprio admin
	if targetUserID == adminID && req.Role == "user" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Você não pode remover seu próprio acesso de admin",
		})
	}

	oldRole := targetUser.Role
	targetUser.Role = req.Role

	if err := config.DB.Save(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar role",
		})
	}

	// Cria log de auditoria
	description := fmt.Sprintf("Alterou role de '%s' para '%s'", oldRole, req.Role)
	CreateAuditLog(
		adminID, admin.Name, admin.Email,
		models.ActionRoleChange, models.EntityUser,
		targetUserID, targetUser.Name,
		"role", oldRole, req.Role,
		description,
		c.IP(), c.Get("User-Agent"),
	)

	return c.JSON(fiber.Map{
		"success": true,
		"user":    targetUser.ToResponse(),
		"message": fmt.Sprintf("Role alterado para '%s' com sucesso", req.Role),
	})
}

// UpdateUserByAdmin permite admin editar qualquer campo do usuário
func UpdateUserByAdmin(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	targetUserID := c.Params("id")

	// Busca o admin
	var admin models.User
	if err := config.DB.First(&admin, "id = ?", adminID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Admin não encontrado",
		})
	}

	// Busca o usuário alvo
	var targetUser models.User
	if err := config.DB.First(&targetUser, "id = ?", targetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Parse do body
	var req struct {
		Name     *string `json:"name"`
		Email    *string `json:"email"`
		CPF      *string `json:"cpf"`
		Company  *string `json:"company"`
		Password *string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Atualiza campos e cria logs
	if req.Name != nil && *req.Name != targetUser.Name {
		CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "name", targetUser.Name, *req.Name, "Alterou nome do usuário", c.IP(), c.Get("User-Agent"))
		targetUser.Name = *req.Name
	}

	if req.Email != nil && *req.Email != targetUser.Email {
		CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "email", targetUser.Email, *req.Email, "Alterou email do usuário", c.IP(), c.Get("User-Agent"))
		targetUser.Email = *req.Email
	}

	if req.CPF != nil && *req.CPF != targetUser.CPF {
		CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "cpf", targetUser.CPF, *req.CPF, "Alterou CPF do usuário", c.IP(), c.Get("User-Agent"))
		targetUser.CPF = *req.CPF
	}

	if req.Company != nil && *req.Company != targetUser.Company {
		CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "company", targetUser.Company, *req.Company, "Alterou empresa do usuário", c.IP(), c.Get("User-Agent"))
		targetUser.Company = *req.Company
	}

	if req.Password != nil && *req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Erro ao processar senha",
			})
		}
		CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "password", "***", "***", "Resetou senha do usuário", c.IP(), c.Get("User-Agent"))
		targetUser.Password = string(hashedPassword)
	}

	if err := config.DB.Save(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar usuário",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    targetUser.ToResponse(),
		"message": "Usuário atualizado com sucesso",
	})
}

// UpdateProfileByAdmin permite admin editar perfil na tabela PessoasFisicasFradema
func UpdateProfileByAdmin(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	targetUserID := c.Params("id")

	// Busca o admin
	var admin models.User
	if err := config.DB.First(&admin, "id = ?", adminID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Admin não encontrado",
		})
	}

	// Busca o usuário alvo
	var targetUser models.User
	if err := config.DB.First(&targetUser, "id = ?", targetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Parse do body
	var req struct {
		Nome             *string `json:"nome"`
		Codinome         *string `json:"codinome"`
		EmailEmpresarial *string `json:"email_empresarial"`
		EmailPessoal     *string `json:"email_pessoal"`
		Telefone1        *string `json:"telefone1"`
		Telefone2        *string `json:"telefone2"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		Sexo             *string `json:"sexo"`
		EstadoCivil      *string `json:"estado_civil"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Busca dados atuais para comparação
	var currentProfile struct {
		Nome             *string
		Codinome         *string
		EmailEmpresarial *string
		EmailPessoal     *string
		Telefone1        *string
		Telefone2        *string
		Rg               *string
		Cnh              *string
		Sexo             *string
		EstadoCivil      *string
	}

	config.DB.Raw(`SELECT Nome, Codinome, EmailEmpresarial, EmailPessoal, Telefone1, Telefone2, Rg, Cnh, Sexo, EstadoCivil FROM dbo.PessoasFisicasFradema WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?`, targetUser.CPF).Scan(&currentProfile)

	// Cria logs para cada campo alterado
	logField := func(field string, oldVal, newVal *string) {
		old := ""
		new := ""
		if oldVal != nil {
			old = *oldVal
		}
		if newVal != nil {
			new = *newVal
		}
		if old != new {
			CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityProfile, targetUserID, targetUser.Name, field, old, new, fmt.Sprintf("Alterou %s do perfil", field), c.IP(), c.Get("User-Agent"))
		}
	}

	if req.Nome != nil {
		logField("nome", currentProfile.Nome, req.Nome)
	}
	if req.Codinome != nil {
		logField("codinome", currentProfile.Codinome, req.Codinome)
	}
	if req.EmailEmpresarial != nil {
		logField("email_empresarial", currentProfile.EmailEmpresarial, req.EmailEmpresarial)
	}
	if req.EmailPessoal != nil {
		logField("email_pessoal", currentProfile.EmailPessoal, req.EmailPessoal)
	}
	if req.Telefone1 != nil {
		logField("telefone1", currentProfile.Telefone1, req.Telefone1)
	}
	if req.Telefone2 != nil {
		logField("telefone2", currentProfile.Telefone2, req.Telefone2)
	}
	if req.Rg != nil {
		logField("rg", currentProfile.Rg, req.Rg)
	}
	if req.Cnh != nil {
		logField("cnh", currentProfile.Cnh, req.Cnh)
	}
	if req.Sexo != nil {
		logField("sexo", currentProfile.Sexo, req.Sexo)
	}
	if req.EstadoCivil != nil {
		logField("estado_civil", currentProfile.EstadoCivil, req.EstadoCivil)
	}

	// Atualiza na tabela - admin pode atualizar qualquer campo
	// Se o valor for NULL, mantém o atual. Se for string (vazia ou não), atualiza.
	err := config.DB.Exec(`
		UPDATE dbo.PessoasFisicasFradema
		SET Nome = CASE WHEN ? IS NOT NULL THEN ? ELSE Nome END,
			Codinome = CASE WHEN ? IS NOT NULL THEN ? ELSE Codinome END,
			EmailEmpresarial = CASE WHEN ? IS NOT NULL THEN ? ELSE EmailEmpresarial END,
			EmailPessoal = CASE WHEN ? IS NOT NULL THEN ? ELSE EmailPessoal END,
			Telefone1 = CASE WHEN ? IS NOT NULL THEN ? ELSE Telefone1 END,
			Telefone2 = CASE WHEN ? IS NOT NULL THEN ? ELSE Telefone2 END,
			Rg = CASE WHEN ? IS NOT NULL THEN ? ELSE Rg END,
			Cnh = CASE WHEN ? IS NOT NULL THEN ? ELSE Cnh END,
			Sexo = CASE WHEN ? IS NOT NULL THEN ? ELSE Sexo END,
			EstadoCivil = CASE WHEN ? IS NOT NULL THEN ? ELSE EstadoCivil END,
			DataAtualizacao = GETDATE()
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`,
		req.Nome, req.Nome,
		req.Codinome, req.Codinome,
		req.EmailEmpresarial, req.EmailEmpresarial,
		req.EmailPessoal, req.EmailPessoal,
		req.Telefone1, req.Telefone1,
		req.Telefone2, req.Telefone2,
		req.Rg, req.Rg,
		req.Cnh, req.Cnh,
		req.Sexo, req.Sexo,
		req.EstadoCivil, req.EstadoCivil,
		targetUser.CPF).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar perfil: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Perfil atualizado com sucesso",
	})
}

// GetColaboradorById busca os dados de um colaborador pelo colaborador_id (mesmo sem cadastro no sistema)
func GetColaboradorById(c *fiber.Ctx) error {
	colaboradorID := c.Params("id")

	type ColaboradorProfile struct {
		Id               int     `json:"id"`
		Cpf              *string `json:"cpf"`
		Nome             *string `json:"nome"`
		Codinome         *string `json:"codinome"`
		EmailEmpresarial *string `json:"email_empresarial"`
		EmailPessoal     *string `json:"email_pessoal"`
		Telefone1        *string `json:"telefone1"`
		Telefone2        *string `json:"telefone2"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		Sexo             *string `json:"sexo"`
		EstadoCivil      *string `json:"estado_civil"`
		DataNascimento   *string `json:"data_nascimento"`
		Cargo            *string `json:"cargo"`
		Filial           *string `json:"filial"`
		Ativo            *bool   `json:"ativo"`
	}

	var profile ColaboradorProfile
	err := config.DB.Raw(`
		SELECT c.Id, p.Cpf, p.Nome, p.Codinome, p.EmailEmpresarial, p.EmailPessoal,
			   p.Telefone1, p.Telefone2, p.Rg, p.Cnh, p.Sexo, p.EstadoCivil,
			   CONVERT(varchar(10), p.DataNascimento, 120) as DataNascimento,
			   c.Cargo, c.Filial, c.Ativo
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE c.Id = ?
	`, colaboradorID).Scan(&profile).Error

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Colaborador não encontrado",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"profile": profile,
	})
}

// UpdateColaboradorProfile atualiza os dados de uma pessoa física pelo colaborador_id
func UpdateColaboradorProfile(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	colaboradorID := c.Params("id")

	var req struct {
		Nome             *string `json:"nome"`
		Codinome         *string `json:"codinome"`
		EmailEmpresarial *string `json:"email_empresarial"`
		EmailPessoal     *string `json:"email_pessoal"`
		Telefone1        *string `json:"telefone1"`
		Telefone2        *string `json:"telefone2"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		Sexo             *string `json:"sexo"`
		EstadoCivil      *string `json:"estado_civil"`
		DataNascimento   *string `json:"data_nascimento"`
		Cargo            *string `json:"cargo"`
		Filial           *string `json:"filial"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Busca o PessoaFisicaId do colaborador
	var pessoaFisicaId int
	var colaboradorNome string
	err := config.DB.Raw(`
		SELECT c.PessoaFisicaId, p.Nome
		FROM dbo.ColaboradoresFradema c
		INNER JOIN dbo.PessoasFisicasFradema p ON c.PessoaFisicaId = p.Id
		WHERE c.Id = ?
	`, colaboradorID).Row().Scan(&pessoaFisicaId, &colaboradorNome)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Colaborador não encontrado",
		})
	}

	// Atualiza dados da pessoa física - permite atualizar para valores vazios
	err = config.DB.Exec(`
		UPDATE dbo.PessoasFisicasFradema
		SET Nome = CASE WHEN ? IS NOT NULL THEN ? ELSE Nome END,
			Codinome = CASE WHEN ? IS NOT NULL THEN ? ELSE Codinome END,
			EmailEmpresarial = CASE WHEN ? IS NOT NULL THEN ? ELSE EmailEmpresarial END,
			EmailPessoal = CASE WHEN ? IS NOT NULL THEN ? ELSE EmailPessoal END,
			Telefone1 = CASE WHEN ? IS NOT NULL THEN ? ELSE Telefone1 END,
			Telefone2 = CASE WHEN ? IS NOT NULL THEN ? ELSE Telefone2 END,
			Rg = CASE WHEN ? IS NOT NULL THEN ? ELSE Rg END,
			Cnh = CASE WHEN ? IS NOT NULL THEN ? ELSE Cnh END,
			Sexo = CASE WHEN ? IS NOT NULL THEN ? ELSE Sexo END,
			EstadoCivil = CASE WHEN ? IS NOT NULL THEN ? ELSE EstadoCivil END,
			DataNascimento = CASE WHEN ? IS NOT NULL THEN TRY_CONVERT(date, ?) ELSE DataNascimento END,
			DataAtualizacao = GETDATE()
		WHERE Id = ?
	`,
		req.Nome, req.Nome,
		req.Codinome, req.Codinome,
		req.EmailEmpresarial, req.EmailEmpresarial,
		req.EmailPessoal, req.EmailPessoal,
		req.Telefone1, req.Telefone1,
		req.Telefone2, req.Telefone2,
		req.Rg, req.Rg,
		req.Cnh, req.Cnh,
		req.Sexo, req.Sexo,
		req.EstadoCivil, req.EstadoCivil,
		req.DataNascimento, req.DataNascimento,
		pessoaFisicaId).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar pessoa física: " + err.Error(),
		})
	}

	// Atualiza dados do colaborador (Cargo, Filial)
	if req.Cargo != nil || req.Filial != nil {
		err = config.DB.Exec(`
			UPDATE dbo.ColaboradoresFradema
			SET Cargo = COALESCE(?, Cargo),
				Filial = COALESCE(?, Filial)
			WHERE Id = ?
		`, req.Cargo, req.Filial, colaboradorID).Error

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Erro ao atualizar colaborador: " + err.Error(),
			})
		}
	}

	// Busca dados do admin para o log
	var admin models.User
	config.DB.First(&admin, "id = ?", adminID)

	// Registra no log
	log := models.AuditLog{
		AdminID:     adminID,
		AdminName:   admin.Name,
		AdminEmail:  admin.Email,
		Action:      "update_colaborador_profile",
		EntityType:  "colaborador",
		EntityID:    colaboradorID,
		EntityName:  colaboradorNome,
		Description: "Perfil do colaborador atualizado pelo admin",
		IPAddress:   c.IP(),
	}
	config.DB.Create(&log)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Perfil do colaborador atualizado com sucesso",
	})
}

// AdminResetPassword permite que um admin resete a senha de um usuário
func AdminResetPassword(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	targetUserID := c.Params("id")

	var req struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "A senha deve ter pelo menos 6 caracteres",
		})
	}

	// Busca o admin
	var admin models.User
	if err := config.DB.First(&admin, "id = ?", adminID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Admin não encontrado",
		})
	}

	// Busca o usuário alvo
	var targetUser models.User
	if err := config.DB.First(&targetUser, "id = ?", targetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Hash da nova senha
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao processar senha",
		})
	}

	// Atualiza a senha
	if err := config.DB.Model(&targetUser).Update("password", string(hashedPassword)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar senha",
		})
	}

	// Log de auditoria
	CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionUpdate, models.EntityUser, targetUserID, targetUser.Name, "password", "***", "***", "Resetou senha do usuário", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Senha alterada com sucesso",
	})
}

// DeleteUser deleta um usuário (soft delete)
func DeleteUser(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	targetUserID := c.Params("id")

	// Busca o admin
	var admin models.User
	if err := config.DB.First(&admin, "id = ?", adminID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Admin não encontrado",
		})
	}

	// Não permite deletar a si mesmo
	if targetUserID == adminID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Você não pode deletar sua própria conta",
		})
	}

	// Busca o usuário alvo
	var targetUser models.User
	if err := config.DB.First(&targetUser, "id = ?", targetUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Soft delete
	if err := config.DB.Delete(&targetUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar usuário",
		})
	}

	// Log de auditoria
	CreateAuditLog(adminID, admin.Name, admin.Email, models.ActionDelete, models.EntityUser, targetUserID, targetUser.Name, "", "", "", "Deletou usuário do sistema", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Usuário deletado com sucesso",
	})
}

// GetAuditLogs retorna o histórico de alterações com paginação e filtros
func GetAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	search := c.Query("search", "")
	action := c.Query("action", "")
	entityType := c.Query("entityType", "")
	adminID := c.Query("adminId", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	var logs []models.AuditLog
	var total int64

	query := config.DB.Model(&models.AuditLog{})

	// Filtros
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("admin_name LIKE ? OR entity_name LIKE ? OR description LIKE ?", searchPattern, searchPattern, searchPattern)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}
	if adminID != "" {
		query = query.Where("admin_id = ?", adminID)
	}

	// Contagem total
	query.Count(&total)

	// Ordenação (mais recentes primeiro)
	query = query.Order("created_at DESC")

	// Paginação
	if err := query.Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar logs",
		})
	}

	// Converte para response
	var logsResponse []models.AuditLogResponse
	for _, log := range logs {
		logsResponse = append(logsResponse, log.ToResponse())
	}

	totalPages := (int(total) + limit - 1) / limit

	return c.JSON(fiber.Map{
		"success": true,
		"logs":    logsResponse,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}
