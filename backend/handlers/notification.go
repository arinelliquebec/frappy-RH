package handlers

import (
	"strconv"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
)

// GetMyNotifications retorna as notificações do usuário logado
func GetMyNotifications(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	// Parâmetros de paginação e filtro
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	unreadOnly := c.Query("unread", "") == "true"
	category := c.Query("category", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Query base
	query := config.DB.Model(&models.Notification{}).
		Where("user_id = ?", userID).
		Where("archived = ?", false).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now())

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	// Contar total
	var total int64
	query.Count(&total)

	// Contar não lidas
	var unreadCount int64
	config.DB.Model(&models.Notification{}).
		Where("user_id = ?", userID).
		Where("archived = ?", false).
		Where("is_read = ?", false).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now()).
		Count(&unreadCount)

	// Buscar notificações
	var notifications []models.Notification
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar notificações: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"notifications": notifications,
		"unread_count":  unreadCount,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetUnreadCount retorna apenas a contagem de notificações não lidas
func GetUnreadCount(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	var count int64
	config.DB.Model(&models.Notification{}).
		Where("user_id = ?", userID).
		Where("archived = ?", false).
		Where("is_read = ?", false).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now()).
		Count(&count)

	return c.JSON(fiber.Map{
		"success": true,
		"count":   count,
	})
}

// MarkAsRead marca uma notificação como lida
func MarkAsRead(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	notificationID := c.Params("id")

	var notification models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", notificationID, userID).First(&notification).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notificação não encontrada",
		})
	}

	now := time.Now()
	notification.Read = true
	notification.ReadAt = &now

	if err := config.DB.Save(&notification).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar notificação",
		})
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"notification": notification,
	})
}

// MarkAllAsRead marca todas as notificações como lidas
func MarkAllAsRead(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	now := time.Now()
	result := config.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar notificações",
		})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "Todas as notificações foram marcadas como lidas",
		"affected": result.RowsAffected,
	})
}

// ArchiveNotification arquiva uma notificação
func ArchiveNotification(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	notificationID := c.Params("id")

	var notification models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", notificationID, userID).First(&notification).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notificação não encontrada",
		})
	}

	notification.Archived = true

	if err := config.DB.Save(&notification).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao arquivar notificação",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Notificação arquivada",
	})
}

// DeleteNotification deleta uma notificação
func DeleteNotification(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)
	notificationID := c.Params("id")

	result := config.DB.Where("id = ? AND user_id = ?", notificationID, userID).Delete(&models.Notification{})

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar notificação",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Notificação não encontrada",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Notificação excluída",
	})
}

// GetNotificationPreferences retorna as preferências de notificação do usuário
func GetNotificationPreferences(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	var preferences models.NotificationPreference
	if err := config.DB.Where("user_id = ?", userID).First(&preferences).Error; err != nil {
		// Criar preferências padrão se não existirem
		preferences = models.NotificationPreference{
			UserID:                userID,
			EmailNotifications:    true,
			PushNotifications:     true,
			VacationNotifications: true,
			DocumentNotifications: true,
			NewsNotifications:     true,
			ReminderNotifications: true,
		}
		config.DB.Create(&preferences)
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"preferences": preferences,
	})
}

// UpdateNotificationPreferences atualiza as preferências de notificação
func UpdateNotificationPreferences(c *fiber.Ctx) error {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Usuário não autenticado",
		})
	}
	userID := userIDInterface.(string)

	var input struct {
		EmailNotifications    *bool `json:"email_notifications"`
		PushNotifications     *bool `json:"push_notifications"`
		VacationNotifications *bool `json:"vacation_notifications"`
		DocumentNotifications *bool `json:"document_notifications"`
		NewsNotifications     *bool `json:"news_notifications"`
		ReminderNotifications *bool `json:"reminder_notifications"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	var preferences models.NotificationPreference
	if err := config.DB.Where("user_id = ?", userID).First(&preferences).Error; err != nil {
		// Criar se não existir
		preferences = models.NotificationPreference{UserID: userID}
		config.DB.Create(&preferences)
	}

	// Atualizar apenas os campos enviados
	if input.EmailNotifications != nil {
		preferences.EmailNotifications = *input.EmailNotifications
	}
	if input.PushNotifications != nil {
		preferences.PushNotifications = *input.PushNotifications
	}
	if input.VacationNotifications != nil {
		preferences.VacationNotifications = *input.VacationNotifications
	}
	if input.DocumentNotifications != nil {
		preferences.DocumentNotifications = *input.DocumentNotifications
	}
	if input.NewsNotifications != nil {
		preferences.NewsNotifications = *input.NewsNotifications
	}
	if input.ReminderNotifications != nil {
		preferences.ReminderNotifications = *input.ReminderNotifications
	}

	if err := config.DB.Save(&preferences).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao atualizar preferências",
		})
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"preferences": preferences,
	})
}

// ========== ADMIN HANDLERS ==========

// AdminCreateNotification cria uma notificação para um ou mais usuários
func AdminCreateNotification(c *fiber.Ctx) error {
	var input struct {
		UserIDs  []string `json:"user_ids"`  // Lista de IDs ou vazio para todos
		AllUsers bool     `json:"all_users"` // Enviar para todos os usuários
		Title    string   `json:"title"`
		Message  string   `json:"message"`
		Type     string   `json:"type"`
		Category string   `json:"category"`
		Link     string   `json:"link"`
		Icon     string   `json:"icon"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Dados inválidos",
		})
	}

	if input.Title == "" || input.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Título e mensagem são obrigatórios",
		})
	}

	var userIDs []string

	if input.AllUsers {
		// Buscar todos os usuários
		var users []models.User
		config.DB.Select("id").Find(&users)
		for _, u := range users {
			userIDs = append(userIDs, u.ID)
		}
	} else if len(input.UserIDs) > 0 {
		userIDs = input.UserIDs
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Especifique os usuários ou marque 'all_users'",
		})
	}

	// Criar notificações
	created := 0
	for _, uid := range userIDs {
		notification := models.Notification{
			UserID:   uid,
			Title:    input.Title,
			Message:  input.Message,
			Type:     models.NotificationType(input.Type),
			Category: models.NotificationCategory(input.Category),
			Link:     input.Link,
			Icon:     input.Icon,
		}

		if notification.Type == "" {
			notification.Type = models.NotificationTypeInfo
		}
		if notification.Category == "" {
			notification.Category = models.NotificationCategoryGeneral
		}

		if err := config.DB.Create(&notification).Error; err == nil {
			created++
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Notificações criadas",
		"created": created,
	})
}

// AdminGetAllNotifications retorna todas as notificações (para admin)
func AdminGetAllNotifications(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	userID := c.Query("user_id", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	query := config.DB.Model(&models.Notification{})

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	var total int64
	query.Count(&total)

	var notifications []models.Notification
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao buscar notificações",
		})
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"notifications": notifications,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminDeleteNotification deleta uma notificação (admin)
func AdminDeleteNotification(c *fiber.Ctx) error {
	notificationID := c.Params("id")

	result := config.DB.Where("id = ?", notificationID).Delete(&models.Notification{})

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Erro ao deletar notificação",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Notificação excluída",
	})
}

// ========== HELPER FUNCTIONS ==========

// CreateNotification é uma função helper para criar notificações de outros handlers
func CreateNotification(userID, title, message string, notifType models.NotificationType, category models.NotificationCategory, link string) error {
	notification := models.Notification{
		UserID:   userID,
		Title:    title,
		Message:  message,
		Type:     notifType,
		Category: category,
		Link:     link,
	}

	return config.DB.Create(&notification).Error
}

// CreateNotificationForAdmins cria notificação para todos os admins
func CreateNotificationForAdmins(title, message string, notifType models.NotificationType, category models.NotificationCategory, link string) error {
	var admins []models.User
	if err := config.DB.Where("role = ?", "admin").Find(&admins).Error; err != nil {
		return err
	}

	for _, admin := range admins {
		notification := models.Notification{
			UserID:   admin.ID,
			Title:    title,
			Message:  message,
			Type:     notifType,
			Category: category,
			Link:     link,
		}
		config.DB.Create(&notification)
	}

	return nil
}
