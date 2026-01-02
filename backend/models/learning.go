package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Course representa um curso na plataforma
type Course struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Title         string `gorm:"type:nvarchar(255);not null" json:"title"`
	Description   string `gorm:"type:nvarchar(max)" json:"description"`
	Thumbnail     string `gorm:"type:nvarchar(500)" json:"thumbnail"`
	IntroVideoURL string `gorm:"type:nvarchar(500)" json:"intro_video_url"` // Vídeo de introdução
	Category      string `gorm:"type:nvarchar(100)" json:"category"`
	Level         string `gorm:"type:nvarchar(50)" json:"level"` // iniciante, intermediario, avancado
	Duration      int    `gorm:"default:0" json:"duration"`      // Duração total em minutos
	Published     bool   `gorm:"default:false" json:"published"`
	Featured      bool   `gorm:"default:false" json:"featured"`

	// Requisitos e público-alvo
	Requirements   string `gorm:"type:nvarchar(max)" json:"requirements"`
	TargetAudience string `gorm:"type:nvarchar(max)" json:"target_audience"`

	// Instrutor
	InstructorID   string `gorm:"type:nvarchar(36)" json:"instructor_id"`
	InstructorName string `gorm:"type:nvarchar(255)" json:"instructor_name"`

	// Relacionamentos
	Modules []Module `gorm:"foreignKey:CourseID" json:"modules,omitempty"`

	// Estatísticas
	EnrollmentCount int     `gorm:"default:0" json:"enrollment_count"`
	Rating          float64 `gorm:"default:0" json:"rating"`
	RatingCount     int     `gorm:"default:0" json:"rating_count"`
}

func (c *Course) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// Module representa um módulo dentro de um curso
type Module struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CourseID    string `gorm:"type:nvarchar(36);not null;index" json:"course_id"`
	Title       string `gorm:"type:nvarchar(255);not null" json:"title"`
	Description string `gorm:"type:nvarchar(max)" json:"description"`
	SortOrder   int    `gorm:"column:sort_order;default:0" json:"order"`
	Duration    int    `gorm:"default:0" json:"duration"` // Duração em minutos

	// Relacionamentos
	Course  Course   `gorm:"foreignKey:CourseID" json:"-"`
	Lessons []Lesson `gorm:"foreignKey:ModuleID" json:"lessons,omitempty"`
}

func (m *Module) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// LessonType tipo de lição
type LessonType string

const (
	LessonTypeVideo    LessonType = "video"
	LessonTypeText     LessonType = "text"
	LessonTypePDF      LessonType = "pdf"
	LessonTypeQuiz     LessonType = "quiz"
	LessonTypeDownload LessonType = "download"
	LessonTypeLink     LessonType = "link" // Link externo (URL)
)

// Lesson representa uma lição dentro de um módulo
type Lesson struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ModuleID    string     `gorm:"type:nvarchar(36);not null;index" json:"module_id"`
	Title       string     `gorm:"type:nvarchar(255);not null" json:"title"`
	Description string     `gorm:"type:nvarchar(max)" json:"description"`
	Type        LessonType `gorm:"type:nvarchar(20);not null" json:"type"`
	Content     string     `gorm:"type:nvarchar(max)" json:"content"`   // Texto ou URL do vídeo
	VideoURL    string     `gorm:"type:nvarchar(500)" json:"video_url"` // URL do vídeo (YouTube, Vimeo, etc)
	Duration    int        `gorm:"default:0" json:"duration"`           // Duração em minutos
	SortOrder   int        `gorm:"column:sort_order;default:0" json:"order"`
	IsFree      bool       `gorm:"default:false" json:"is_free"` // Lição gratuita (preview)

	// Relacionamentos
	Module Module `gorm:"foreignKey:ModuleID" json:"-"`

	// Quiz (se type == quiz)
	QuizID *string `gorm:"type:nvarchar(36)" json:"quiz_id,omitempty"`
	Quiz   *Quiz   `gorm:"foreignKey:QuizID" json:"quiz,omitempty"`
}

func (l *Lesson) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}

// Quiz representa um quiz/avaliação
type Quiz struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Title            string `gorm:"type:nvarchar(255);not null" json:"title"`
	Description      string `gorm:"type:nvarchar(max)" json:"description"`
	PassingScore     int    `gorm:"default:70" json:"passing_score"` // Nota mínima para passar (%)
	TimeLimit        int    `gorm:"default:0" json:"time_limit"`     // Tempo limite em minutos (0 = sem limite)
	AttemptsAllowed  int    `gorm:"default:3" json:"attempts_allowed"`
	ShuffleQuestions bool   `gorm:"default:false" json:"shuffle_questions"`

	// Relacionamentos
	Questions []QuizQuestion `gorm:"foreignKey:QuizID" json:"questions,omitempty"`
}

func (q *Quiz) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return nil
}

// QuestionType tipo de questão
type QuestionType string

const (
	QuestionTypeMultiple  QuestionType = "multiple"   // Múltipla escolha
	QuestionTypeSingle    QuestionType = "single"     // Única escolha
	QuestionTypeTrueFalse QuestionType = "true_false" // Verdadeiro/Falso
	QuestionTypeText      QuestionType = "text"       // Resposta aberta
)

// QuizQuestion representa uma questão do quiz
type QuizQuestion struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	QuizID      string       `gorm:"type:nvarchar(36);not null;index" json:"quiz_id"`
	Type        QuestionType `gorm:"type:nvarchar(20);not null" json:"type"`
	Text        string       `gorm:"type:nvarchar(max);not null" json:"text"`
	Explanation string       `gorm:"type:nvarchar(max)" json:"explanation"` // Explicação da resposta
	Points      int          `gorm:"default:1" json:"points"`
	SortOrder   int          `gorm:"column:sort_order;default:0" json:"order"`

	// Relacionamentos
	Quiz    Quiz         `gorm:"foreignKey:QuizID" json:"-"`
	Options []QuizOption `gorm:"foreignKey:QuestionID" json:"options,omitempty"`
}

func (q *QuizQuestion) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return nil
}

// QuizOption representa uma opção de resposta
type QuizOption struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	QuestionID string `gorm:"type:nvarchar(36);not null;index" json:"question_id"`
	Text       string `gorm:"type:nvarchar(max);not null" json:"text"`
	IsCorrect  bool   `gorm:"default:false" json:"is_correct"`
	SortOrder  int    `gorm:"column:sort_order;default:0" json:"order"`

	// Relacionamento
	Question QuizQuestion `gorm:"foreignKey:QuestionID" json:"-"`
}

func (o *QuizOption) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}

// Enrollment representa a matrícula de um usuário em um curso
type Enrollment struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `gorm:"index:idx_enrollment_user_created,priority:2,sort:desc" json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID   string `gorm:"type:nvarchar(36);not null;index:idx_enrollment_user_created,priority:1;index" json:"user_id"`
	CourseID string `gorm:"type:nvarchar(36);not null;index" json:"course_id"`

	// Progresso
	Progress       float64    `gorm:"default:0" json:"progress"` // Porcentagem de conclusão
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	LastAccessedAt *time.Time `json:"last_accessed_at,omitempty"`

	// Avaliação do usuário
	UserRating *int   `json:"user_rating,omitempty"` // 1-5 estrelas
	UserReview string `gorm:"type:nvarchar(max)" json:"user_review,omitempty"`

	// Relacionamentos
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Course Course `gorm:"foreignKey:CourseID" json:"course,omitempty"`

	// Unique constraint
	_ struct{} `gorm:"uniqueIndex:idx_user_course,priority:1"`
}

func (e *Enrollment) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// LessonProgress progresso do usuário em uma lição
type LessonProgress struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID      string     `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	LessonID    string     `gorm:"type:nvarchar(36);not null;index" json:"lesson_id"`
	Completed   bool       `gorm:"default:false" json:"completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	TimeSpent   int        `gorm:"default:0" json:"time_spent"` // Tempo gasto em segundos
	VideoTime   int        `gorm:"default:0" json:"video_time"` // Posição do vídeo em segundos

	// Relacionamentos
	User   User   `gorm:"foreignKey:UserID" json:"-"`
	Lesson Lesson `gorm:"foreignKey:LessonID" json:"lesson,omitempty"`
}

func (lp *LessonProgress) BeforeCreate(tx *gorm.DB) error {
	if lp.ID == "" {
		lp.ID = uuid.New().String()
	}
	return nil
}

// QuizAttempt tentativa de quiz
type QuizAttempt struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID    string     `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	QuizID    string     `gorm:"type:nvarchar(36);not null;index" json:"quiz_id"`
	Score     float64    `gorm:"default:0" json:"score"`
	Passed    bool       `gorm:"default:false" json:"passed"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
	TimeSpent int        `gorm:"default:0" json:"time_spent"` // Tempo gasto em segundos

	// Respostas
	Answers string `gorm:"type:nvarchar(max)" json:"answers"` // JSON com as respostas

	// Relacionamentos
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Quiz Quiz `gorm:"foreignKey:QuizID" json:"quiz,omitempty"`
}

func (qa *QuizAttempt) BeforeCreate(tx *gorm.DB) error {
	if qa.ID == "" {
		qa.ID = uuid.New().String()
	}
	return nil
}

// Certificate certificado de conclusão
type Certificate struct {
	ID        string         `gorm:"type:nvarchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID        string     `gorm:"type:nvarchar(36);not null;index" json:"user_id"`
	CourseID      string     `gorm:"type:nvarchar(36);not null;index" json:"course_id"`
	CertificateNo string     `gorm:"type:nvarchar(50);uniqueIndex" json:"certificate_no"`
	IssuedAt      time.Time  `json:"issued_at"`
	ValidUntil    *time.Time `json:"valid_until,omitempty"`

	// Relacionamentos
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Course Course `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

func (c *Certificate) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// ============= DTOs =============

// CourseCategory categorias de cursos
var CourseCategories = []string{
	"Desenvolvimento Pessoal",
	"Liderança",
	"Tecnologia",
	"Compliance",
	"Segurança do Trabalho",
	"Qualidade",
	"Vendas",
	"Atendimento ao Cliente",
	"Processos",
	"Onboarding",
}

// CourseLevels níveis de cursos
var CourseLevels = []string{
	"iniciante",
	"intermediario",
	"avancado",
}
