package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Tipos de documentos permitidos
var allowedDocumentTypes = map[string]bool{
	"rg":                     true,
	"cpf":                    true,
	"cnh":                    true,
	"comprovante_residencia": true,
	"certidao":               true,
	"titulo_eleitor":         true,
	"carteira_trabalho":      true,
	"certificado":            true,
	"diploma":                true,
	"atestado":               true,
	"contrato":               true,
	"outros":                 true,
}

// Extensões permitidas
var allowedExtensions = map[string]bool{
	".pdf":  true,
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".doc":  true,
	".docx": true,
}

// Tamanho máximo do arquivo (20MB)
const maxFileSize = 20 * 1024 * 1024

// GetMyDocuments retorna os documentos do usuário logado
func GetMyDocuments(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var documents []models.Document
	if err := config.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&documents).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar documentos",
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"documents": documents,
	})
}

// UploadDocument faz upload de um documento
func UploadDocument(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Pega o tipo do documento
	docType := c.FormValue("type")
	if docType == "" {
		docType = "outros"
	}
	if !allowedDocumentTypes[docType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Tipo de documento inválido",
		})
	}

	description := c.FormValue("description")

	// Pega o arquivo
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Arquivo não encontrado",
		})
	}

	// Valida tamanho
	if file.Size > maxFileSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Arquivo muito grande. Máximo permitido: 20MB",
		})
	}

	// Valida extensão
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Tipo de arquivo não permitido. Permitidos: PDF, JPG, PNG, GIF, DOC, DOCX",
		})
	}

	// Cria diretório de uploads se não existir
	uploadDir := "./uploads/documents/" + userID
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao criar diretório de upload",
		})
	}

	// Gera nome único para o arquivo
	fileID := uuid.New().String()
	fileName := fmt.Sprintf("%s_%s%s", docType, fileID, ext)
	filePath := filepath.Join(uploadDir, fileName)

	// Salva o arquivo
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao salvar arquivo",
		})
	}

	// Determina o mime type
	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Cria o registro no banco com status pendente
	document := models.Document{
		UserID:       userID,
		Name:         fmt.Sprintf("%s - %s", getDocumentTypeLabel(docType), time.Now().Format("02/01/2006")),
		OriginalName: file.Filename,
		Type:         docType,
		MimeType:     mimeType,
		Size:         file.Size,
		Path:         filePath,
		Description:  description,
		IsPublic:     false,
		Status:       models.DocumentStatusPending, // Inicia como pendente
	}

	if err := config.DB.Create(&document).Error; err != nil {
		// Remove arquivo se falhar ao salvar no banco
		os.Remove(filePath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao registrar documento",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":  true,
		"document": document,
		"message":  "Documento enviado com sucesso!",
	})
}

// DownloadDocument baixa um documento
func DownloadDocument(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	docID := c.Params("id")

	var document models.Document
	if err := config.DB.Where("id = ? AND user_id = ?", docID, userID).First(&document).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	// Verifica se o arquivo existe
	if _, err := os.Stat(document.Path); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Arquivo não encontrado no servidor",
		})
	}

	return c.Download(document.Path, document.OriginalName)
}

// DeleteDocument deleta um documento
func DeleteDocument(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	docID := c.Params("id")

	var document models.Document
	if err := config.DB.Where("id = ? AND user_id = ?", docID, userID).First(&document).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	// Remove o arquivo físico
	os.Remove(document.Path)

	// Remove do banco (soft delete)
	if err := config.DB.Delete(&document).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar documento",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Documento removido com sucesso!",
	})
}

// GetDocumentTypes retorna os tipos de documentos disponíveis
func GetDocumentTypes(c *fiber.Ctx) error {
	types := []map[string]string{
		{"value": "rg", "label": "RG"},
		{"value": "cpf", "label": "CPF"},
		{"value": "cnh", "label": "CNH"},
		{"value": "comprovante_residencia", "label": "Comprovante de Residência"},
		{"value": "certidao", "label": "Certidão (Nascimento/Casamento)"},
		{"value": "titulo_eleitor", "label": "Título de Eleitor"},
		{"value": "carteira_trabalho", "label": "Carteira de Trabalho"},
		{"value": "certificado", "label": "Certificado"},
		{"value": "diploma", "label": "Diploma"},
		{"value": "atestado", "label": "Atestado"},
		{"value": "contrato", "label": "Contrato"},
		{"value": "outros", "label": "Outros"},
	}

	return c.JSON(fiber.Map{
		"success": true,
		"types":   types,
	})
}

// Helper: retorna o label do tipo de documento
func getDocumentTypeLabel(docType string) string {
	labels := map[string]string{
		"rg":                     "RG",
		"cpf":                    "CPF",
		"cnh":                    "CNH",
		"comprovante_residencia": "Comprovante de Residência",
		"certidao":               "Certidão",
		"titulo_eleitor":         "Título de Eleitor",
		"carteira_trabalho":      "Carteira de Trabalho",
		"certificado":            "Certificado",
		"diploma":                "Diploma",
		"atestado":               "Atestado",
		"contrato":               "Contrato",
		"outros":                 "Outros",
	}
	if label, ok := labels[docType]; ok {
		return label
	}
	return "Documento"
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

// AdminGetAllDocuments retorna todos os documentos do sistema (para admin)
func AdminGetAllDocuments(c *fiber.Ctx) error {
	status := c.Query("status") // pending, approved, rejected
	userID := c.Query("user_id")

	query := config.DB.Preload("User").Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var documents []models.Document
	if err := query.Find(&documents).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar documentos",
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"documents": documents,
	})
}

// AdminGetPendingDocuments retorna documentos pendentes de aprovação
func AdminGetPendingDocuments(c *fiber.Ctx) error {
	var documents []models.Document
	if err := config.DB.Preload("User").
		Where("status = ?", models.DocumentStatusPending).
		Order("created_at ASC").
		Find(&documents).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar documentos pendentes",
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"documents": documents,
	})
}

// AdminApproveDocument aprova um documento
func AdminApproveDocument(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	docID := c.Params("id")

	var document models.Document
	if err := config.DB.First(&document, "id = ?", docID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	now := time.Now()
	document.Status = models.DocumentStatusApproved
	document.ReviewedBy = &adminID
	document.ReviewedAt = &now
	document.RejectReason = ""

	if err := config.DB.Save(&document).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao aprovar documento",
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "Documento aprovado com sucesso!",
		"document": document,
	})
}

// AdminRejectDocument rejeita um documento
func AdminRejectDocument(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	docID := c.Params("id")

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	var document models.Document
	if err := config.DB.First(&document, "id = ?", docID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	now := time.Now()
	document.Status = models.DocumentStatusRejected
	document.ReviewedBy = &adminID
	document.ReviewedAt = &now
	document.RejectReason = req.Reason

	if err := config.DB.Save(&document).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao rejeitar documento",
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "Documento rejeitado",
		"document": document,
	})
}

// AdminDownloadDocument permite admin baixar qualquer documento
func AdminDownloadDocument(c *fiber.Ctx) error {
	docID := c.Params("id")

	var document models.Document
	if err := config.DB.First(&document, "id = ?", docID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	// Verifica se o arquivo existe
	if _, err := os.Stat(document.Path); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Arquivo não encontrado no servidor",
		})
	}

	return c.Download(document.Path, document.OriginalName)
}

// AdminDeleteDocument permite admin deletar qualquer documento
func AdminDeleteDocument(c *fiber.Ctx) error {
	docID := c.Params("id")

	var document models.Document
	if err := config.DB.First(&document, "id = ?", docID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Documento não encontrado",
		})
	}

	// Remove o arquivo físico
	os.Remove(document.Path)

	// Remove do banco (soft delete)
	if err := config.DB.Delete(&document).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar documento",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Documento removido com sucesso!",
	})
}

// AdminGetDocumentStats retorna estatísticas de documentos
func AdminGetDocumentStats(c *fiber.Ctx) error {
	var pending, approved, rejected int64

	config.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusPending).Count(&pending)
	config.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusApproved).Count(&approved)
	config.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusRejected).Count(&rejected)

	return c.JSON(fiber.Map{
		"success": true,
		"stats": fiber.Map{
			"pending":  pending,
			"approved": approved,
			"rejected": rejected,
			"total":    pending + approved + rejected,
		},
	})
}
