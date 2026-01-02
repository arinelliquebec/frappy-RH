package routes

import (
	"github.com/frappyou/backend/handlers"
	"github.com/frappyou/backend/middleware"
	"github.com/gofiber/fiber/v2"
)

// SetupRoutes configura todas as rotas da API
func SetupRoutes(app *fiber.App) {
	// Rate limiting global - proteção contra DDoS
	app.Use(middleware.GlobalRateLimiter())

	// GraphQL endpoints com rate limiting
	app.All("/graphql", middleware.APIRateLimiter(), handlers.GraphQLHandler())
	app.Get("/playground", handlers.PlaygroundHandler())

	// Grupo da API com rate limiting geral
	api := app.Group("/api")

	// Rotas de autenticação (públicas) - Rate limiting RESTRITIVO
	auth := api.Group("/auth")
	auth.Post("/signup", middleware.AuthRateLimiter(), handlers.Signup)
	auth.Post("/login", middleware.AuthRateLimiter(), handlers.Login)
	auth.Post("/activate", middleware.AuthRateLimiter(), handlers.ActivateAccount)
	auth.Post("/validate-cpf", middleware.AuthRateLimiter(), handlers.ValidateCPF)
	auth.Get("/debug-yasmin", handlers.DebugYasmin) // TEMPORÁRIO - debug Yasmin

	// Rotas do questionário (públicas)
	survey := api.Group("/survey")
	survey.Get("/questions", handlers.GetQuestions)

	// Rotas do questionário (protegidas)
	survey.Get("/status", middleware.AuthMiddleware, handlers.CheckSurveyStatus)
	survey.Post("/submit", middleware.AuthMiddleware, handlers.SubmitSurvey)
	survey.Get("/results", middleware.AuthMiddleware, handlers.GetSurveyResults)

	// Rotas protegidas do usuário
	user := api.Group("/user", middleware.AuthMiddleware)
	user.Get("/profile", handlers.GetProfile)
	user.Get("/profile/full", handlers.GetFullProfile)
	user.Put("/profile", handlers.UpdateProfile)
	user.Put("/profile/full", handlers.UpdateFullProfile)

	// Rotas de Férias e Ausências (protegidas)
	vacation := api.Group("/vacation", middleware.AuthMiddleware)
	vacation.Get("/balance", handlers.GetVacationBalance)
	vacation.Get("/stats", handlers.GetVacationStats)
	vacation.Get("/my", handlers.GetMyVacations)
	vacation.Get("/team", handlers.GetTeamVacations)
	vacation.Get("/:id", handlers.GetVacationByID)
	vacation.Post("/", handlers.CreateVacation)
	vacation.Put("/:id/cancel", handlers.CancelVacation)

	// Rotas de venda de férias
	vacation.Post("/sell", handlers.CreateVacationSellRequest)
	vacation.Get("/sell/my", handlers.GetMyVacationSellRequests)

	// Rotas de aprovação e gestão (gestores/admin)
	vacationAdmin := api.Group("/vacation/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	vacationAdmin.Get("/pending", handlers.GetPendingApprovals)
	vacationAdmin.Get("/all", handlers.AdminGetAllVacations)
	vacationAdmin.Get("/users", handlers.GetAllUsersForAdmin)
	vacationAdmin.Post("/", handlers.AdminCreateVacation)
	vacationAdmin.Put("/:id", handlers.AdminUpdateVacation)
	vacationAdmin.Put("/:id/approve", handlers.ApproveOrRejectVacation)
	vacationAdmin.Put("/:id/interrupt", handlers.InterruptVacation)
	vacationAdmin.Delete("/:id", handlers.AdminDeleteVacation)

	// Venda de férias (admin)
	vacationAdmin.Get("/sell/pending", handlers.GetPendingVacationSellRequests)
	vacationAdmin.Get("/sell/all", handlers.GetAllVacationSellRequests)
	vacationAdmin.Put("/sell/:id/approve", handlers.ApproveOrRejectVacationSell)
	vacationAdmin.Put("/sell/:id", handlers.AdminUpdateVacationSell)

	// Gerenciamento de saldos de férias (admin)
	vacationAdmin.Get("/balances", handlers.AdminGetAllVacationBalances)
	vacationAdmin.Get("/balance/:user_id", handlers.AdminGetVacationBalance)
	vacationAdmin.Put("/balance/:user_id", handlers.AdminUpdateVacationBalance)
	vacationAdmin.Get("/users/search", handlers.AdminSearchUsersForVacation)

	// Configurações de férias (admin)
	vacationAdmin.Get("/settings", handlers.GetVacationSettings)
	vacationAdmin.Put("/settings", handlers.UpdateVacationSettings)

	// Rotas de eventos do calendário (admin)
	calendar := api.Group("/calendar", middleware.AuthMiddleware)
	calendar.Get("/events", handlers.GetCalendarEvents)

	calendarAdmin := api.Group("/calendar/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	calendarAdmin.Post("/", handlers.CreateCalendarEvent)
	calendarAdmin.Put("/:id", handlers.UpdateCalendarEvent)
	calendarAdmin.Delete("/:id", handlers.DeleteCalendarEvent)

	// Rotas de Documentos (protegidas) - Upload com rate limiting específico
	documents := api.Group("/documents", middleware.AuthMiddleware)
	documents.Get("/", handlers.GetMyDocuments)
	documents.Get("", handlers.GetMyDocuments)
	documents.Get("/types", handlers.GetDocumentTypes)
	documents.Post("/", middleware.UploadRateLimiter(), handlers.UploadDocument)
	documents.Post("", middleware.UploadRateLimiter(), handlers.UploadDocument)
	documents.Post("/upload", middleware.UploadRateLimiter(), handlers.UploadDocument)
	documents.Get("/:id/download", handlers.DownloadDocument)
	documents.Delete("/:id", handlers.DeleteDocument)

	// Rotas de Documentos para Admin
	documentsAdmin := api.Group("/documents/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	documentsAdmin.Get("/", handlers.AdminGetAllDocuments)
	documentsAdmin.Get("", handlers.AdminGetAllDocuments)
	documentsAdmin.Get("/pending", handlers.AdminGetPendingDocuments)
	documentsAdmin.Get("/stats", handlers.AdminGetDocumentStats)
	documentsAdmin.Get("/:id/download", handlers.AdminDownloadDocument)
	documentsAdmin.Put("/:id/approve", handlers.AdminApproveDocument)
	documentsAdmin.Put("/:id/reject", handlers.AdminRejectDocument)
	documentsAdmin.Delete("/:id", handlers.AdminDeleteDocument)

	// Rotas de Admin (requer autenticação + role admin)
	admin := api.Group("/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	admin.Get("/stats", handlers.GetDashboardStats)
	admin.Get("/users", handlers.GetAllUsers)
	admin.Get("/colaboradores/search", handlers.SearchColaboradores)
	admin.Get("/colaboradores/filiais", handlers.GetFiliais)
	admin.Get("/colaboradores/:id", handlers.GetColaboradorById)
	admin.Put("/colaboradores/:id", handlers.UpdateColaboradorProfile)
	admin.Post("/users", handlers.AdminCreateUser)
	admin.Get("/users/:id", handlers.GetUserByID)
	admin.Put("/users/:id", handlers.UpdateUserByAdmin)
	admin.Put("/users/:id/role", handlers.UpdateUserRole)
	admin.Put("/users/:id/profile", handlers.UpdateProfileByAdmin)
	admin.Put("/users/:id/password", middleware.StrictAuthRateLimiter(), handlers.AdminResetPassword) // Rate limit restritivo
	admin.Delete("/users/:id", handlers.DeleteUser)
	admin.Get("/logs", handlers.GetAuditLogs)

	// Rotas de Analytics (admin)
	analytics := api.Group("/analytics", middleware.AuthMiddleware, middleware.AdminMiddleware)
	analytics.Get("/overview", handlers.GetOverviewAnalytics)
	analytics.Get("/hr", handlers.GetHRAnalytics)
	analytics.Get("/people", handlers.GetPeopleAnalytics)
	analytics.Get("/engagement", handlers.GetEngagementAnalytics)
	analytics.Get("/vacation", handlers.GetVacationAnalytics)
	analytics.Get("/documents", handlers.GetDocumentAnalytics)
	analytics.Get("/news", handlers.GetNewsAnalytics)

	// Rotas de Notícias para Admin (DEVE vir antes das rotas com :id)
	newsAdmin := api.Group("/news/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	newsAdmin.Get("/", handlers.AdminGetAllNews)
	newsAdmin.Get("/stats", handlers.GetNewsStats)
	newsAdmin.Post("/", handlers.AdminCreateNews)
	newsAdmin.Put("/:id", handlers.AdminUpdateNews)
	newsAdmin.Put("/:id/publish", handlers.AdminPublishNews)
	newsAdmin.Delete("/:id", handlers.AdminDeleteNews)

	// Rotas de Notícias/Comunicados (protegidas)
	news := api.Group("/news", middleware.AuthMiddleware)
	news.Get("/", handlers.GetNews)
	news.Get("/:id", handlers.GetNewsById)
	news.Post("/:id/react", handlers.ReactToNews)

	// Rotas de Notificações para Admin (DEVE vir antes das rotas com :id)
	notifAdmin := api.Group("/notifications/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	notifAdmin.Get("/", handlers.AdminGetAllNotifications)
	notifAdmin.Post("/", handlers.AdminCreateNotification)
	notifAdmin.Delete("/:id", handlers.AdminDeleteNotification)

	// Rotas de Notificações (protegidas)
	notifications := api.Group("/notifications", middleware.AuthMiddleware)
	notifications.Get("/", handlers.GetMyNotifications)
	notifications.Get("/count", handlers.GetUnreadCount)
	notifications.Get("/preferences", handlers.GetNotificationPreferences)
	notifications.Put("/preferences", handlers.UpdateNotificationPreferences)
	notifications.Put("/read-all", handlers.MarkAllAsRead)
	notifications.Put("/:id/read", handlers.MarkAsRead)
	notifications.Put("/:id/archive", handlers.ArchiveNotification)
	notifications.Delete("/:id", handlers.DeleteNotification)

	// ==================== E-LEARNING ====================

	// Rotas Admin de Cursos (DEVE vir antes das rotas com :id)
	learningAdmin := api.Group("/learning/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	learningAdmin.Get("/stats", handlers.AdminGetLearningStats)
	learningAdmin.Get("/courses", handlers.AdminGetAllCourses)
	learningAdmin.Post("/courses", handlers.AdminCreateCourse)
	learningAdmin.Get("/courses/:id", handlers.AdminGetCourseDetails)
	learningAdmin.Put("/courses/:id", handlers.AdminUpdateCourse)
	learningAdmin.Delete("/courses/:id", handlers.AdminDeleteCourse)
	// Módulos
	learningAdmin.Post("/courses/:courseId/modules", handlers.AdminCreateModule)
	learningAdmin.Put("/modules/:moduleId", handlers.AdminUpdateModule)
	learningAdmin.Delete("/modules/:moduleId", handlers.AdminDeleteModule)
	// Lições
	learningAdmin.Post("/modules/:moduleId/lessons", handlers.AdminCreateLesson)
	learningAdmin.Put("/lessons/:lessonId", handlers.AdminUpdateLesson)
	learningAdmin.Delete("/lessons/:lessonId", handlers.AdminDeleteLesson)
	// Upload de mídia - com rate limiting para evitar abuso
	learningAdmin.Post("/upload/video", middleware.UploadRateLimiter(), handlers.AdminUploadVideo)
	learningAdmin.Post("/upload/image", middleware.UploadRateLimiter(), handlers.AdminUploadImage)
	// Quizzes
	learningAdmin.Post("/quizzes", handlers.AdminCreateQuiz)
	learningAdmin.Put("/quizzes/:quizId", handlers.AdminUpdateQuiz)
	learningAdmin.Post("/quizzes/:quizId/questions", handlers.AdminAddQuestion)

	// Rotas de E-Learning (Colaboradores)
	learning := api.Group("/learning", middleware.AuthMiddleware)
	learning.Get("/courses", handlers.GetCourses)
	learning.Get("/courses/:id", handlers.GetCourseByID)
	learning.Post("/courses/:id/enroll", handlers.EnrollInCourse)
	learning.Get("/enrollments", handlers.GetMyEnrollments)
	learning.Get("/lessons/:lessonId", handlers.GetLessonContent)
	learning.Put("/lessons/:lessonId/progress", handlers.UpdateLessonProgress)
	learning.Post("/quizzes/:quizId/submit", handlers.SubmitQuiz)
	learning.Get("/certificates", handlers.GetMyCertificates)
	learning.Post("/courses/:courseId/certificate", handlers.GenerateCertificate)
	learning.Post("/courses/:courseId/rate", handlers.RateCourse)

	// ==================== HOLERITE/CONTRACHEQUE ====================

	// Rotas Admin de Holerite (DEVE vir antes das rotas com :id)
	payslipAdmin := api.Group("/payslip/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	payslipAdmin.Get("/", handlers.AdminGetAllPayslips)
	payslipAdmin.Get("/stats", handlers.AdminGetPayslipStats)
	payslipAdmin.Post("/", handlers.AdminCreatePayslip)
	payslipAdmin.Post("/import", handlers.AdminImportPayslips)
	payslipAdmin.Delete("/:id", handlers.AdminDeletePayslip)

	// Rotas de Holerite (Colaboradores)
	payslip := api.Group("/payslip", middleware.AuthMiddleware)
	payslip.Get("/", handlers.GetMyPayslips)
	payslip.Get("/:id", handlers.GetPayslipByID)

	// ==================== PDI (PLANO DE DESENVOLVIMENTO INDIVIDUAL) ====================

	// Rotas Admin de PDI (DEVE vir antes das rotas com :id)
	pdiAdmin := api.Group("/pdi/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	pdiAdmin.Get("/", handlers.AdminGetAllPDIs)

	// Rotas de Gestor para PDI
	pdiManager := api.Group("/pdi/manager", middleware.AuthMiddleware)
	pdiManager.Get("/team", handlers.AdminGetTeamPDIs)
	pdiManager.Get("/:id", handlers.AdminGetPDIByID)
	pdiManager.Put("/:id/approve", handlers.AdminApprovePDI)
	pdiManager.Put("/:id/reject", handlers.AdminRejectPDI)
	pdiManager.Post("/:id/checkin", handlers.AdminAddCheckin)

	// Rotas de PDI (Colaboradores)
	pdi := api.Group("/pdi", middleware.AuthMiddleware)
	pdi.Get("/", handlers.GetMyPDIs)
	pdi.Post("/", handlers.CreatePDI)
	pdi.Get("/:id", handlers.GetPDIByID)
	pdi.Put("/:id", handlers.UpdatePDI)
	pdi.Put("/:id/submit", handlers.SubmitPDI)
	pdi.Post("/:id/checkin", handlers.AddCheckin)
	// Metas
	pdi.Post("/:id/goals", handlers.AddGoal)
	pdi.Put("/goals/:goalId", handlers.UpdateGoal)
	pdi.Delete("/goals/:goalId", handlers.DeleteGoal)
	// Ações
	pdi.Post("/goals/:goalId/actions", handlers.AddAction)
	pdi.Put("/actions/:actionId", handlers.UpdateAction)
	pdi.Delete("/actions/:actionId", handlers.DeleteAction)

	// ==================== PORTAL DO COLABORADOR ====================

	// Rotas do Portal (Colaboradores)
	portal := api.Group("/portal", middleware.AuthMiddleware)
	portal.Get("/dashboard", handlers.GetPortalDashboard)
	portal.Get("/birthdays", handlers.GetBirthdays)
	portal.Get("/new-employees", handlers.GetNewEmployees)
	portal.Get("/badges", handlers.GetUserBadges)
	portal.Get("/badges/all", handlers.GetAllBadges)
	portal.Get("/timeline", handlers.GetCareerTimeline)
	portal.Get("/team", handlers.GetTeamMembers)
	portal.Put("/profile", handlers.UpdateUserProfile)

	// Rotas Admin do Portal
	portalAdmin := api.Group("/portal/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	portalAdmin.Post("/badges", handlers.CreateBadge)
	portalAdmin.Post("/badges/award", handlers.AwardBadge)
	portalAdmin.Post("/timeline", handlers.AddCareerEvent)

	// ==================== CHAT IA (Azure OpenAI) ====================

	// Rotas de Chat (Colaboradores)
	chat := api.Group("/chat", middleware.AuthMiddleware)
	chat.Post("/", handlers.SendMessage)
	chat.Post("/stream", handlers.SendMessageStream)
	chat.Get("/sessions", handlers.GetChatSessions)
	chat.Get("/sessions/:id", handlers.GetChatHistory)
	chat.Delete("/sessions/:id", handlers.DeleteChatSession)
	chat.Get("/suggestions", handlers.GetChatSuggestions)

	// Rotas Admin de Chat (Cache)
	chatAdmin := api.Group("/admin/chat", middleware.AuthMiddleware, middleware.AdminMiddleware)
	chatAdmin.Get("/cache/stats", handlers.GetChatCacheStats)
	chatAdmin.Post("/cache/clear", handlers.ClearChatCache)
	chatAdmin.Delete("/cache/user/:id", handlers.InvalidateUserCache)

	// ==================== BASE DE CONHECIMENTO (RAG) ====================

	// Rotas públicas de busca (requer autenticação)
	knowledge := api.Group("/knowledge", middleware.AuthMiddleware)
	knowledge.Get("/search", handlers.SearchKnowledge)
	knowledge.Get("/categories", handlers.GetKnowledgeCategories)
	knowledge.Get("/featured", handlers.GetFeaturedKnowledge)
	knowledge.Get("/category/:category", handlers.GetKnowledgeByCategory)
	knowledge.Get("/articles/:id", handlers.GetKnowledgeArticle)
	knowledge.Post("/articles/:id/feedback", handlers.SendKnowledgeFeedback)

	// Rotas Admin de Base de Conhecimento
	knowledgeAdmin := api.Group("/admin/knowledge", middleware.AuthMiddleware, middleware.AdminMiddleware)
	knowledgeAdmin.Get("/", handlers.ListKnowledgeArticles)
	knowledgeAdmin.Post("/", handlers.CreateKnowledgeArticle)
	knowledgeAdmin.Put("/:id", handlers.UpdateKnowledgeArticle)
	knowledgeAdmin.Delete("/:id", handlers.DeleteKnowledgeArticle)
	knowledgeAdmin.Put("/:id/toggle-publish", handlers.ToggleKnowledgePublish)
	knowledgeAdmin.Put("/:id/toggle-featured", handlers.ToggleKnowledgeFeatured)
}
