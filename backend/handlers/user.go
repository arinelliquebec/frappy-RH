package handlers

import (
	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetProfile retorna o perfil do usuário autenticado
func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var user models.User
	if result := config.DB.First(&user, "id = ?", userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user.ToResponse(),
	})
}

// GetFullProfile retorna os dados completos do usuário da tabela PessoasFisicasFradema
func GetFullProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Busca o usuário para pegar o CPF
	var user models.User
	if result := config.DB.First(&user, "id = ?", userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Busca os dados completos da tabela PessoasFisicasFradema
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
		DataCadastro     *string `json:"data_cadastro"`
		DataAtualizacao  *string `json:"data_atualizacao"`
		TipoPessoa       *int    `json:"tipo_pessoa"`
	}

	err := config.DB.Raw(`
		SELECT
			Id, Nome, EmailEmpresarial, EmailPessoal, Codinome, Sexo,
			CONVERT(varchar, DataNascimento, 103) as DataNascimento,
			EstadoCivil, Cpf, Rg, Cnh, Telefone1, Telefone2,
			CONVERT(varchar, DataCadastro, 103) as DataCadastro,
			CONVERT(varchar, DataAtualizacao, 103) as DataAtualizacao,
			TipoPessoa
		FROM dbo.PessoasFisicasFradema
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, user.CPF).Scan(&pessoaFisica).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar dados: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user.ToResponse(),
		"profile": pessoaFisica,
	})
}

// UpdateFullProfile atualiza os campos editáveis do perfil na tabela PessoasFisicasFradema
func UpdateFullProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Busca o usuário para pegar o CPF
	var user models.User
	if result := config.DB.First(&user, "id = ?", userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Parse do body - campos editáveis (admins podem editar todos os campos exceto CPF)
	var updateData struct {
		Nome             *string `json:"nome"` // Editável por admin
		Codinome         *string `json:"codinome"`
		Rg               *string `json:"rg"`
		Cnh              *string `json:"cnh"`
		EmailEmpresarial *string `json:"email_empresarial"` // Editável por admin
		EmailPessoal     *string `json:"email_pessoal"`
		Telefone1        *string `json:"telefone1"` // Editável por admin
		Telefone2        *string `json:"telefone2"`
		DataNascimento   *string `json:"data_nascimento"` // Editável por admin
		Sexo             *string `json:"sexo"`
		EstadoCivil      *string `json:"estado_civil"`
	}

	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Verifica se o usuário é admin para permitir campos adicionais
	isAdmin := user.Role == "admin"

	// Se não for admin, limpa campos restritos
	if !isAdmin {
		updateData.Nome = nil
		updateData.EmailEmpresarial = nil
		updateData.Telefone1 = nil
		updateData.DataNascimento = nil
	}

	// Atualiza os campos permitidos na tabela PessoasFisicasFradema
	err := config.DB.Exec(`
		UPDATE dbo.PessoasFisicasFradema
		SET Nome = CASE WHEN ? IS NOT NULL THEN ? ELSE Nome END,
			Codinome = COALESCE(?, Codinome),
			Rg = COALESCE(?, Rg),
			Cnh = COALESCE(?, Cnh),
			EmailEmpresarial = CASE WHEN ? IS NOT NULL THEN ? ELSE EmailEmpresarial END,
			EmailPessoal = COALESCE(?, EmailPessoal),
			Telefone1 = CASE WHEN ? IS NOT NULL THEN ? ELSE Telefone1 END,
			Telefone2 = COALESCE(?, Telefone2),
			DataNascimento = CASE WHEN ? IS NOT NULL THEN TRY_CONVERT(date, ?, 103) ELSE DataNascimento END,
			Sexo = COALESCE(?, Sexo),
			EstadoCivil = COALESCE(?, EstadoCivil),
			DataAtualizacao = GETDATE()
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`,
		updateData.Nome, updateData.Nome,
		updateData.Codinome,
		updateData.Rg,
		updateData.Cnh,
		updateData.EmailEmpresarial, updateData.EmailEmpresarial,
		updateData.EmailPessoal,
		updateData.Telefone1, updateData.Telefone1,
		updateData.Telefone2,
		updateData.DataNascimento, updateData.DataNascimento,
		updateData.Sexo,
		updateData.EstadoCivil,
		user.CPF).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar perfil: " + err.Error(),
		})
	}

	// Busca os dados atualizados
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
		DataCadastro     *string `json:"data_cadastro"`
		DataAtualizacao  *string `json:"data_atualizacao"`
		TipoPessoa       *int    `json:"tipo_pessoa"`
	}

	config.DB.Raw(`
		SELECT
			Id, Nome, EmailEmpresarial, EmailPessoal, Codinome, Sexo,
			CONVERT(varchar, DataNascimento, 103) as DataNascimento,
			EstadoCivil, Cpf, Rg, Cnh, Telefone1, Telefone2,
			CONVERT(varchar, DataCadastro, 103) as DataCadastro,
			CONVERT(varchar, DataAtualizacao, 103) as DataAtualizacao,
			TipoPessoa
		FROM dbo.PessoasFisicasFradema
		WHERE REPLACE(REPLACE(REPLACE(Cpf, '.', ''), '-', ''), ' ', '') = ?
	`, user.CPF).Scan(&pessoaFisica)

	return c.JSON(fiber.Map{
		"success": true,
		"profile": pessoaFisica,
	})
}

// UpdateProfile atualiza o perfil do usuário
func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var user models.User
	if result := config.DB.First(&user, "id = ?", userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não encontrado",
		})
	}

	// Parse do body
	var updateData struct {
		Name    string `json:"name"`
		Company string `json:"company"`
	}

	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	// Atualiza os campos
	if updateData.Name != "" {
		user.Name = updateData.Name
	}
	if updateData.Company != "" {
		user.Company = updateData.Company
	}

	if result := config.DB.Save(&user); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar perfil",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"user":    user.ToResponse(),
	})
}
