package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/frappyou/backend/config"
	"github.com/frappyou/backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ==================== CURSOS (COLABORADOR) ====================

// GetCourses retorna cursos publicados
func GetCourses(c *fiber.Ctx) error {
	category := c.Query("category", "")
	level := c.Query("level", "")
	search := c.Query("search", "")
	featured := c.Query("featured", "")

	query := config.DB.Model(&models.Course{}).Where("published = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if level != "" {
		query = query.Where("level = ?", level)
	}
	if search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if featured == "true" {
		query = query.Where("featured = ?", true)
	}

	var courses []models.Course
	query.Order("featured DESC, enrollment_count DESC, created_at DESC").Find(&courses)

	return c.JSON(fiber.Map{
		"success": true,
		"courses": courses,
	})
}

// GetCourseByID retorna detalhes de um curso
func GetCourseByID(c *fiber.Ctx) error {
	courseID := c.Params("id")
	userID := c.Locals("user_id").(string)

	var course models.Course
	result := config.DB.Preload("Modules", func(db *gorm.DB) *gorm.DB {
		return db.Order("modules.sort_order ASC")
	}).Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
		return db.Order("lessons.sort_order ASC")
	}).First(&course, "id = ? AND published = ?", courseID, true)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Curso não encontrado",
		})
	}

	// Verificar se usuário está matriculado
	var enrollment models.Enrollment
	isEnrolled := config.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&enrollment).Error == nil

	// Se não está matriculado, esconder conteúdo das lições não gratuitas
	if !isEnrolled {
		for i := range course.Modules {
			for j := range course.Modules[i].Lessons {
				if !course.Modules[i].Lessons[j].IsFree {
					course.Modules[i].Lessons[j].Content = ""
					course.Modules[i].Lessons[j].VideoURL = ""
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"course":     course,
		"enrolled":   isEnrolled,
		"enrollment": enrollment,
	})
}

// EnrollInCourse matricula o usuário em um curso
func EnrollInCourse(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	courseID := c.Params("id")

	// Verificar se curso existe e está publicado
	var course models.Course
	if config.DB.First(&course, "id = ? AND published = ?", courseID, true).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Curso não encontrado",
		})
	}

	// Verificar se já está matriculado
	var existing models.Enrollment
	if config.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&existing).Error == nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Você já está matriculado neste curso",
		})
	}

	// Criar matrícula
	enrollment := models.Enrollment{
		UserID:   userID,
		CourseID: courseID,
	}
	config.DB.Create(&enrollment)

	// Incrementar contador de matrículas
	config.DB.Model(&course).Update("enrollment_count", course.EnrollmentCount+1)

	return c.JSON(fiber.Map{
		"success":    true,
		"message":    "Matrícula realizada com sucesso!",
		"enrollment": enrollment,
	})
}

// GetMyEnrollments retorna cursos matriculados do usuário
func GetMyEnrollments(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var enrollments []models.Enrollment
	config.DB.Preload("Course").Where("user_id = ?", userID).Order("created_at DESC").Find(&enrollments)

	return c.JSON(fiber.Map{
		"success":     true,
		"enrollments": enrollments,
	})
}

// GetLessonContent retorna conteúdo de uma lição
func GetLessonContent(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	lessonID := c.Params("lessonId")

	var lesson models.Lesson
	if config.DB.Preload("Quiz.Questions.Options").First(&lesson, "id = ?", lessonID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Lição não encontrada",
		})
	}

	// Buscar módulo para verificar o curso
	var module models.Module
	config.DB.First(&module, "id = ?", lesson.ModuleID)

	// Verificar se está matriculado (ou se é lição gratuita)
	if !lesson.IsFree {
		var enrollment models.Enrollment
		if config.DB.Where("user_id = ? AND course_id = ?", userID, module.CourseID).First(&enrollment).Error != nil {
			return c.Status(403).JSON(fiber.Map{
				"success": false,
				"message": "Você precisa se matricular no curso para acessar esta lição",
			})
		}
	}

	// Buscar ou criar progresso
	var progress models.LessonProgress
	if config.DB.Where("user_id = ? AND lesson_id = ?", userID, lessonID).First(&progress).Error != nil {
		progress = models.LessonProgress{
			UserID:   userID,
			LessonID: lessonID,
		}
		config.DB.Create(&progress)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"lesson":   lesson,
		"progress": progress,
	})
}

// UpdateLessonProgress atualiza progresso em uma lição
func UpdateLessonProgress(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	lessonID := c.Params("lessonId")

	type ProgressUpdate struct {
		Completed bool `json:"completed"`
		VideoTime int  `json:"video_time"`
		TimeSpent int  `json:"time_spent"`
	}

	var req ProgressUpdate
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	var progress models.LessonProgress
	if config.DB.Where("user_id = ? AND lesson_id = ?", userID, lessonID).First(&progress).Error != nil {
		progress = models.LessonProgress{
			UserID:   userID,
			LessonID: lessonID,
		}
	}

	progress.VideoTime = req.VideoTime
	progress.TimeSpent += req.TimeSpent

	if req.Completed && !progress.Completed {
		progress.Completed = true
		now := time.Now()
		progress.CompletedAt = &now
	}

	config.DB.Save(&progress)

	// Atualizar progresso do curso
	updateCourseProgress(userID, lessonID)

	return c.JSON(fiber.Map{
		"success":  true,
		"progress": progress,
	})
}

// updateCourseProgress atualiza o progresso geral do curso
func updateCourseProgress(userID, lessonID string) {
	// Buscar módulo e curso
	var lesson models.Lesson
	config.DB.First(&lesson, "id = ?", lessonID)

	var module models.Module
	config.DB.First(&module, "id = ?", lesson.ModuleID)

	// Contar total de lições do curso
	var totalLessons int64
	config.DB.Model(&models.Lesson{}).
		Joins("JOIN modules ON lessons.module_id = modules.id").
		Where("modules.course_id = ?", module.CourseID).
		Count(&totalLessons)

	// Contar lições completadas
	var completedLessons int64
	config.DB.Model(&models.LessonProgress{}).
		Joins("JOIN lessons ON lesson_progresses.lesson_id = lessons.id").
		Joins("JOIN modules ON lessons.module_id = modules.id").
		Where("modules.course_id = ? AND lesson_progresses.user_id = ? AND lesson_progresses.completed = ?",
			module.CourseID, userID, true).
		Count(&completedLessons)

	// Calcular progresso
	progress := float64(0)
	if totalLessons > 0 {
		progress = (float64(completedLessons) / float64(totalLessons)) * 100
	}

	// Atualizar enrollment
	now := time.Now()
	updates := map[string]interface{}{
		"progress":         progress,
		"last_accessed_at": now,
	}

	// Se completou 100%, marcar como concluído
	if progress >= 100 {
		updates["completed_at"] = now
	}

	config.DB.Model(&models.Enrollment{}).
		Where("user_id = ? AND course_id = ?", userID, module.CourseID).
		Updates(updates)
}

// SubmitQuiz submete as respostas do quiz
func SubmitQuiz(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	quizID := c.Params("quizId")

	type QuizSubmission struct {
		Answers map[string][]string `json:"answers"` // questionID -> optionIDs
	}

	var req QuizSubmission
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	// Buscar quiz com questões
	var quiz models.Quiz
	if config.DB.Preload("Questions.Options").First(&quiz, "id = ?", quizID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Quiz não encontrado",
		})
	}

	// Verificar número de tentativas
	var attemptCount int64
	config.DB.Model(&models.QuizAttempt{}).Where("user_id = ? AND quiz_id = ?", userID, quizID).Count(&attemptCount)
	if quiz.AttemptsAllowed > 0 && int(attemptCount) >= quiz.AttemptsAllowed {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Você atingiu o número máximo de tentativas",
		})
	}

	// Calcular pontuação
	totalPoints := 0
	earnedPoints := 0

	for _, question := range quiz.Questions {
		totalPoints += question.Points

		userAnswers := req.Answers[question.ID]
		if userAnswers == nil {
			continue
		}

		// Verificar resposta correta
		correctOptions := []string{}
		for _, opt := range question.Options {
			if opt.IsCorrect {
				correctOptions = append(correctOptions, opt.ID)
			}
		}

		// Comparar respostas
		isCorrect := len(userAnswers) == len(correctOptions)
		if isCorrect {
			for _, ua := range userAnswers {
				found := false
				for _, co := range correctOptions {
					if ua == co {
						found = true
						break
					}
				}
				if !found {
					isCorrect = false
					break
				}
			}
		}

		if isCorrect {
			earnedPoints += question.Points
		}
	}

	// Calcular nota
	score := float64(0)
	if totalPoints > 0 {
		score = (float64(earnedPoints) / float64(totalPoints)) * 100
	}
	passed := score >= float64(quiz.PassingScore)

	// Salvar tentativa
	answersJSON, _ := json.Marshal(req.Answers)
	now := time.Now()
	attempt := models.QuizAttempt{
		UserID:    userID,
		QuizID:    quizID,
		Score:     score,
		Passed:    passed,
		StartedAt: now,
		EndedAt:   &now,
		Answers:   string(answersJSON),
	}
	config.DB.Create(&attempt)

	return c.JSON(fiber.Map{
		"success":       true,
		"score":         score,
		"passed":        passed,
		"total_points":  totalPoints,
		"earned_points": earnedPoints,
		"attempt":       attempt,
	})
}

// GetMyCertificates retorna certificados do usuário
func GetMyCertificates(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var certificates []models.Certificate
	config.DB.Preload("Course").Where("user_id = ?", userID).Order("issued_at DESC").Find(&certificates)

	return c.JSON(fiber.Map{
		"success":      true,
		"certificates": certificates,
	})
}

// GenerateCertificate gera certificado de conclusão
func GenerateCertificate(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	courseID := c.Params("courseId")

	// Verificar se completou o curso
	var enrollment models.Enrollment
	if config.DB.Where("user_id = ? AND course_id = ? AND progress >= 100", userID, courseID).First(&enrollment).Error != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Você precisa completar o curso para gerar o certificado",
		})
	}

	// Verificar se já tem certificado
	var existing models.Certificate
	if config.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&existing).Error == nil {
		return c.JSON(fiber.Map{
			"success":     true,
			"certificate": existing,
		})
	}

	// Gerar número do certificado
	certificateNo := fmt.Sprintf("CERT-%s-%d", courseID[:8], time.Now().UnixNano())

	certificate := models.Certificate{
		UserID:        userID,
		CourseID:      courseID,
		CertificateNo: certificateNo,
		IssuedAt:      time.Now(),
	}
	config.DB.Create(&certificate)

	// Carregar dados relacionados
	config.DB.Preload("Course").Preload("User").First(&certificate, "id = ?", certificate.ID)

	return c.JSON(fiber.Map{
		"success":     true,
		"certificate": certificate,
	})
}

// RateCourse avalia um curso
func RateCourse(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	courseID := c.Params("courseId")

	type RatingRequest struct {
		Rating int    `json:"rating"`
		Review string `json:"review"`
	}

	var req RatingRequest
	if err := c.BodyParser(&req); err != nil || req.Rating < 1 || req.Rating > 5 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Avaliação deve ser entre 1 e 5",
		})
	}

	// Verificar se está matriculado
	var enrollment models.Enrollment
	if config.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&enrollment).Error != nil {
		return c.Status(403).JSON(fiber.Map{
			"success": false,
			"message": "Você precisa estar matriculado para avaliar",
		})
	}

	// Atualizar avaliação
	enrollment.UserRating = &req.Rating
	enrollment.UserReview = req.Review
	config.DB.Save(&enrollment)

	// Recalcular média do curso
	var avgRating float64
	var ratingCount int64
	row := config.DB.Model(&models.Enrollment{}).
		Where("course_id = ? AND user_rating IS NOT NULL", courseID).
		Select("AVG(user_rating), COUNT(*)").
		Row()
	if err := row.Scan(&avgRating, &ratingCount); err != nil {
		avgRating = 0
		ratingCount = 0
	}

	config.DB.Model(&models.Course{}).
		Where("id = ?", courseID).
		Updates(map[string]interface{}{
			"rating":       avgRating,
			"rating_count": ratingCount,
		})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Avaliação enviada com sucesso!",
	})
}

// ==================== ADMIN ====================

// AdminGetAllCourses retorna todos os cursos (admin)
func AdminGetAllCourses(c *fiber.Ctx) error {
	var courses []models.Course
	config.DB.Order("created_at DESC").Find(&courses)

	return c.JSON(fiber.Map{
		"success": true,
		"courses": courses,
	})
}

// AdminCreateCourse cria um novo curso
func AdminCreateCourse(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)

	var course models.Course
	if err := c.BodyParser(&course); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	course.InstructorID = adminID
	config.DB.Create(&course)

	return c.JSON(fiber.Map{
		"success": true,
		"course":  course,
		"message": "Curso criado com sucesso!",
	})
}

// AdminUpdateCourse atualiza um curso
func AdminUpdateCourse(c *fiber.Ctx) error {
	courseID := c.Params("id")

	var course models.Course
	if config.DB.First(&course, "id = ?", courseID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Curso não encontrado",
		})
	}

	var updates models.Course
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	config.DB.Model(&course).Updates(map[string]interface{}{
		"title":           updates.Title,
		"description":     updates.Description,
		"thumbnail":       updates.Thumbnail,
		"intro_video_url": updates.IntroVideoURL,
		"category":        updates.Category,
		"level":           updates.Level,
		"requirements":    updates.Requirements,
		"target_audience": updates.TargetAudience,
		"instructor_name": updates.InstructorName,
		"published":       updates.Published,
		"featured":        updates.Featured,
	})

	config.DB.First(&course, "id = ?", courseID)

	return c.JSON(fiber.Map{
		"success": true,
		"course":  course,
		"message": "Curso atualizado com sucesso!",
	})
}

// AdminDeleteCourse exclui um curso
func AdminDeleteCourse(c *fiber.Ctx) error {
	courseID := c.Params("id")

	var course models.Course
	if config.DB.First(&course, "id = ?", courseID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Curso não encontrado",
		})
	}

	// Excluir em cascata
	config.DB.Where("course_id = ?", courseID).Delete(&models.Enrollment{})
	config.DB.Where("course_id = ?", courseID).Delete(&models.Certificate{})

	// Excluir módulos, lições, etc
	var modules []models.Module
	config.DB.Where("course_id = ?", courseID).Find(&modules)
	for _, m := range modules {
		var lessons []models.Lesson
		config.DB.Where("module_id = ?", m.ID).Find(&lessons)
		for _, l := range lessons {
			config.DB.Where("lesson_id = ?", l.ID).Delete(&models.LessonProgress{})
		}
		config.DB.Where("module_id = ?", m.ID).Delete(&models.Lesson{})
	}
	config.DB.Where("course_id = ?", courseID).Delete(&models.Module{})

	config.DB.Delete(&course)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Curso excluído com sucesso!",
	})
}

// AdminCreateModule cria um módulo
func AdminCreateModule(c *fiber.Ctx) error {
	courseID := c.Params("courseId")

	var module models.Module
	if err := c.BodyParser(&module); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	module.CourseID = courseID

	// Definir ordem automaticamente
	var maxOrder int
	config.DB.Model(&models.Module{}).Where("course_id = ?", courseID).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)
	module.SortOrder = maxOrder + 1

	config.DB.Create(&module)

	return c.JSON(fiber.Map{
		"success": true,
		"module":  module,
		"message": "Módulo criado com sucesso!",
	})
}

// AdminUpdateModule atualiza um módulo
func AdminUpdateModule(c *fiber.Ctx) error {
	moduleID := c.Params("moduleId")

	var module models.Module
	if config.DB.First(&module, "id = ?", moduleID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Módulo não encontrado",
		})
	}

	var updates models.Module
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	config.DB.Model(&module).Updates(map[string]interface{}{
		"title":       updates.Title,
		"description": updates.Description,
		"sort_order":  updates.SortOrder,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"module":  module,
		"message": "Módulo atualizado com sucesso!",
	})
}

// AdminDeleteModule exclui um módulo
func AdminDeleteModule(c *fiber.Ctx) error {
	moduleID := c.Params("moduleId")

	var module models.Module
	if config.DB.First(&module, "id = ?", moduleID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Módulo não encontrado",
		})
	}

	// Excluir lições
	var lessons []models.Lesson
	config.DB.Where("module_id = ?", moduleID).Find(&lessons)
	for _, l := range lessons {
		config.DB.Where("lesson_id = ?", l.ID).Delete(&models.LessonProgress{})
	}
	config.DB.Where("module_id = ?", moduleID).Delete(&models.Lesson{})

	config.DB.Delete(&module)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Módulo excluído com sucesso!",
	})
}

// AdminCreateLesson cria uma lição
func AdminCreateLesson(c *fiber.Ctx) error {
	moduleID := c.Params("moduleId")

	var lesson models.Lesson
	if err := c.BodyParser(&lesson); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	lesson.ModuleID = moduleID

	// Definir ordem automaticamente
	var maxOrder int
	config.DB.Model(&models.Lesson{}).Where("module_id = ?", moduleID).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)
	lesson.SortOrder = maxOrder + 1

	config.DB.Create(&lesson)

	// Atualizar duração do módulo e curso
	updateCourseDuration(moduleID)

	return c.JSON(fiber.Map{
		"success": true,
		"lesson":  lesson,
		"message": "Lição criada com sucesso!",
	})
}

// AdminUpdateLesson atualiza uma lição
func AdminUpdateLesson(c *fiber.Ctx) error {
	lessonID := c.Params("lessonId")

	var lesson models.Lesson
	if config.DB.First(&lesson, "id = ?", lessonID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Lição não encontrada",
		})
	}

	var updates models.Lesson
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	config.DB.Model(&lesson).Updates(map[string]interface{}{
		"title":       updates.Title,
		"description": updates.Description,
		"type":        updates.Type,
		"content":     updates.Content,
		"video_url":   updates.VideoURL,
		"duration":    updates.Duration,
		"sort_order":  updates.SortOrder,
		"is_free":     updates.IsFree,
	})

	// Atualizar duração
	updateCourseDuration(lesson.ModuleID)

	return c.JSON(fiber.Map{
		"success": true,
		"lesson":  lesson,
		"message": "Lição atualizada com sucesso!",
	})
}

// AdminDeleteLesson exclui uma lição
func AdminDeleteLesson(c *fiber.Ctx) error {
	lessonID := c.Params("lessonId")

	var lesson models.Lesson
	if config.DB.First(&lesson, "id = ?", lessonID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Lição não encontrada",
		})
	}

	moduleID := lesson.ModuleID

	config.DB.Where("lesson_id = ?", lessonID).Delete(&models.LessonProgress{})
	config.DB.Delete(&lesson)

	// Atualizar duração
	updateCourseDuration(moduleID)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Lição excluída com sucesso!",
	})
}

// AdminUploadImage faz upload de uma imagem (thumbnail)
func AdminUploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Arquivo de imagem não encontrado",
		})
	}

	// Validar tipo de arquivo
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	contentType := file.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.",
		})
	}

	// Limite de 10MB para imagens
	if file.Size > 10*1024*1024 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Arquivo muito grande. Limite de 10MB para imagens.",
		})
	}

	// Criar diretório de uploads se não existir
	uploadDir := "./uploads/images"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar diretório de uploads",
		})
	}

	// Gerar nome único para o arquivo
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Salvar arquivo
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao salvar arquivo",
		})
	}

	// Gerar URL pública
	imageURL := fmt.Sprintf("/uploads/images/%s", filename)

	return c.JSON(fiber.Map{
		"success":   true,
		"image_url": imageURL,
		"filename":  filename,
		"size":      file.Size,
		"message":   "Imagem enviada com sucesso!",
	})
}

// AdminUploadVideo faz upload de um vídeo para uma lição
func AdminUploadVideo(c *fiber.Ctx) error {
	file, err := c.FormFile("video")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Arquivo de vídeo não encontrado",
		})
	}

	// Validar tipo de arquivo - formatos comuns de e-learning até 4K
	allowedTypes := map[string]bool{
		"video/mp4":                true, // MP4 (H.264, H.265)
		"video/webm":               true, // WebM (VP8, VP9)
		"video/ogg":                true, // OGG (Theora)
		"video/quicktime":          true, // MOV
		"video/x-msvideo":          true, // AVI
		"video/x-matroska":         true, // MKV
		"video/x-ms-wmv":           true, // WMV
		"video/mpeg":               true, // MPEG
		"application/octet-stream": true, // Fallback para alguns navegadores
	}

	contentType := file.Header.Get("Content-Type")
	// Também verificar por extensão se o content-type não for reconhecido
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".mp4": true, ".webm": true, ".ogg": true, ".mov": true,
		".avi": true, ".mkv": true, ".wmv": true, ".mpeg": true, ".mpg": true,
	}

	if !allowedTypes[contentType] && !allowedExts[ext] {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Tipo de arquivo não permitido. Use MP4, WebM, OGG, MOV, AVI, MKV, WMV ou MPEG.",
		})
	}

	// Limite de 500MB para vídeos de lições
	if file.Size > 500*1024*1024 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Arquivo muito grande. Limite de 500MB.",
		})
	}

	// Criar diretório de uploads se não existir
	uploadDir := "./uploads/videos"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao criar diretório de uploads",
		})
	}

	// Gerar nome único para o arquivo (ext já foi declarado acima na validação)
	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Salvar arquivo
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Erro ao salvar arquivo",
		})
	}

	// Gerar URL pública
	videoURL := fmt.Sprintf("/uploads/videos/%s", filename)

	return c.JSON(fiber.Map{
		"success":   true,
		"video_url": videoURL,
		"filename":  filename,
		"size":      file.Size,
		"message":   "Vídeo enviado com sucesso!",
	})
}

// updateCourseDuration atualiza a duração total do curso
func updateCourseDuration(moduleID string) {
	var module models.Module
	config.DB.First(&module, "id = ?", moduleID)

	// Calcular duração do módulo
	var moduleDuration int
	config.DB.Model(&models.Lesson{}).Where("module_id = ?", moduleID).Select("COALESCE(SUM(duration), 0)").Scan(&moduleDuration)
	config.DB.Model(&module).Update("duration", moduleDuration)

	// Calcular duração total do curso
	var courseDuration int
	config.DB.Model(&models.Module{}).Where("course_id = ?", module.CourseID).Select("COALESCE(SUM(duration), 0)").Scan(&courseDuration)
	config.DB.Model(&models.Course{}).Where("id = ?", module.CourseID).Update("duration", courseDuration)
}

// AdminCreateQuiz cria um quiz
func AdminCreateQuiz(c *fiber.Ctx) error {
	var quiz models.Quiz
	if err := c.BodyParser(&quiz); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	config.DB.Create(&quiz)

	return c.JSON(fiber.Map{
		"success": true,
		"quiz":    quiz,
		"message": "Quiz criado com sucesso!",
	})
}

// AdminUpdateQuiz atualiza um quiz
func AdminUpdateQuiz(c *fiber.Ctx) error {
	quizID := c.Params("quizId")

	var quiz models.Quiz
	if config.DB.First(&quiz, "id = ?", quizID).Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Quiz não encontrado",
		})
	}

	var updates models.Quiz
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	config.DB.Model(&quiz).Updates(updates)

	return c.JSON(fiber.Map{
		"success": true,
		"quiz":    quiz,
		"message": "Quiz atualizado com sucesso!",
	})
}

// AdminAddQuestion adiciona uma questão ao quiz
func AdminAddQuestion(c *fiber.Ctx) error {
	quizID := c.Params("quizId")

	type QuestionWithOptions struct {
		Type        string `json:"type"`
		Text        string `json:"text"`
		Explanation string `json:"explanation"`
		Points      int    `json:"points"`
		Options     []struct {
			Text      string `json:"text"`
			IsCorrect bool   `json:"is_correct"`
		} `json:"options"`
	}

	var req QuestionWithOptions
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Dados inválidos",
		})
	}

	// Criar questão
	var maxOrder int
	config.DB.Model(&models.QuizQuestion{}).Where("quiz_id = ?", quizID).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)

	question := models.QuizQuestion{
		QuizID:      quizID,
		Type:        models.QuestionType(req.Type),
		Text:        req.Text,
		Explanation: req.Explanation,
		Points:      req.Points,
		SortOrder:   maxOrder + 1,
	}
	config.DB.Create(&question)

	// Criar opções
	for i, opt := range req.Options {
		option := models.QuizOption{
			QuestionID: question.ID,
			Text:       opt.Text,
			IsCorrect:  opt.IsCorrect,
			SortOrder:  i + 1,
		}
		config.DB.Create(&option)
	}

	// Carregar questão com opções
	config.DB.Preload("Options").First(&question, "id = ?", question.ID)

	return c.JSON(fiber.Map{
		"success":  true,
		"question": question,
		"message":  "Questão adicionada com sucesso!",
	})
}

// AdminGetLearningStats retorna estatísticas da plataforma
func AdminGetLearningStats(c *fiber.Ctx) error {
	var stats struct {
		TotalCourses         int64   `json:"total_courses"`
		PublishedCourses     int64   `json:"published_courses"`
		TotalEnrollments     int64   `json:"total_enrollments"`
		CompletedEnrollments int64   `json:"completed_enrollments"`
		TotalLessons         int64   `json:"total_lessons"`
		TotalQuizzes         int64   `json:"total_quizzes"`
		AverageRating        float64 `json:"average_rating"`
		CertificatesIssued   int64   `json:"certificates_issued"`
	}

	config.DB.Model(&models.Course{}).Count(&stats.TotalCourses)
	config.DB.Model(&models.Course{}).Where("published = ?", true).Count(&stats.PublishedCourses)
	config.DB.Model(&models.Enrollment{}).Count(&stats.TotalEnrollments)
	config.DB.Model(&models.Enrollment{}).Where("completed_at IS NOT NULL").Count(&stats.CompletedEnrollments)
	config.DB.Model(&models.Lesson{}).Count(&stats.TotalLessons)
	config.DB.Model(&models.Quiz{}).Count(&stats.TotalQuizzes)
	config.DB.Model(&models.Certificate{}).Count(&stats.CertificatesIssued)

	config.DB.Model(&models.Course{}).Where("rating > 0").Select("AVG(rating)").Scan(&stats.AverageRating)

	// Top cursos
	var topCourses []models.Course
	config.DB.Order("enrollment_count DESC").Limit(5).Find(&topCourses)

	// Matrículas recentes
	var recentEnrollments []models.Enrollment
	config.DB.Preload("User").Preload("Course").Order("created_at DESC").Limit(10).Find(&recentEnrollments)

	return c.JSON(fiber.Map{
		"success":            true,
		"stats":              stats,
		"top_courses":        topCourses,
		"recent_enrollments": recentEnrollments,
	})
}

// AdminGetCourseDetails retorna detalhes completos de um curso (admin)
func AdminGetCourseDetails(c *fiber.Ctx) error {
	courseID := c.Params("id")

	var course models.Course
	result := config.DB.Preload("Modules", func(db *gorm.DB) *gorm.DB {
		return db.Order("modules.sort_order ASC")
	}).Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
		return db.Order("lessons.sort_order ASC")
	}).Preload("Modules.Lessons.Quiz.Questions.Options").First(&course, "id = ?", courseID)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "Curso não encontrado",
		})
	}

	// Estatísticas do curso
	var enrollmentCount int64
	config.DB.Model(&models.Enrollment{}).Where("course_id = ?", courseID).Count(&enrollmentCount)

	var completedCount int64
	config.DB.Model(&models.Enrollment{}).Where("course_id = ? AND completed_at IS NOT NULL", courseID).Count(&completedCount)

	// Matrículas recentes
	var enrollments []models.Enrollment
	config.DB.Preload("User").Where("course_id = ?", courseID).Order("created_at DESC").Limit(20).Find(&enrollments)

	return c.JSON(fiber.Map{
		"success":          true,
		"course":           course,
		"enrollment_count": enrollmentCount,
		"completed_count":  completedCount,
		"enrollments":      enrollments,
	})
}
