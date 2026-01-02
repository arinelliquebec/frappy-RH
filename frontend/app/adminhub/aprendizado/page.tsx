"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DescriptionIcon from "@mui/icons-material/Description";
import QuizIcon from "@mui/icons-material/Quiz";
import PeopleIcon from "@mui/icons-material/People";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import StarIcon from "@mui/icons-material/Star";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import LinkIcon from "@mui/icons-material/Link";
import {
  userAPI,
  learningAPI,
  User,
  Course,
  CourseLevel,
  Module,
  Lesson,
  Enrollment,
  LearningStats,
  COURSE_CATEGORIES,
  COURSE_LEVELS,
} from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8B5CF6" },
    secondary: { main: "#10B981" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

const lessonTypeOptions = [
  { value: "video", label: "Vídeo", icon: PlayArrowIcon },
  { value: "text", label: "Texto", icon: DescriptionIcon },
  { value: "pdf", label: "PDF", icon: DescriptionIcon },
  { value: "link", label: "Link Externo", icon: LinkIcon },
  { value: "quiz", label: "Quiz", icon: QuizIcon },
];

// Helper para construir URL de mídia (imagens e vídeos de upload)
const getMediaUrl = (url: string | undefined): string => {
  if (!url) return "";
  if (url.startsWith("/uploads/")) {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://127.0.0.1:8080";
    return `${apiUrl}${url}`;
  }
  return url;
};

// Placeholder SVG para thumbnails
const PLACEHOLDER_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%231a1a2e' width='400' height='225'/%3E%3Ctext fill='%23666' font-family='sans-serif' font-size='16' text-anchor='middle' x='200' y='118'%3E🎓%3C/text%3E%3C/svg%3E";

export default function AdminAprendizadoPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topCourses, setTopCourses] = useState<Course[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);

  // UI
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Course Dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<{
    title: string;
    description: string;
    thumbnail: string;
    intro_video_url: string;
    category: string;
    level: CourseLevel;
    requirements: string;
    target_audience: string;
    instructor_name: string;
    published: boolean;
    featured: boolean;
  }>({
    title: "",
    description: "",
    thumbnail: "",
    intro_video_url: "",
    category: "",
    level: "iniciante",
    requirements: "",
    target_audience: "",
    instructor_name: "",
    published: false,
    featured: false,
  });
  const [savingCourse, setSavingCourse] = useState(false);

  // Course media upload
  const [thumbnailSource, setThumbnailSource] = useState<"url" | "upload">(
    "url"
  );
  const [introVideoSource, setIntroVideoSource] = useState<"url" | "upload">(
    "url"
  );
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [introVideoUploadProgress, setIntroVideoUploadProgress] = useState(0);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const introVideoInputRef = useRef<HTMLInputElement>(null);

  // Course Detail
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<Enrollment[]>([]);

  // Module Dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
  });

  // Lesson Dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "text" | "pdf" | "link" | "quiz",
    content: "",
    video_url: "",
    duration: 0,
    is_free: false,
  });

  // Video upload
  const [videoSource, setVideoSource] = useState<"url" | "upload">("url");
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.role !== "admin") {
        router.push("/hub");
        return;
      }
      setUser(u);
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, coursesRes] = await Promise.all([
        learningAPI.admin.getStats(),
        learningAPI.admin.getAllCourses(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        setTopCourses(statsRes.top_courses || []);
        setRecentEnrollments(statsRes.recent_enrollments || []);
      }
      if (coursesRes.success) {
        setCourses(coursesRes.courses || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    try {
      const res = await learningAPI.admin.getCourseDetails(courseId);
      if (res.success) {
        setSelectedCourse(res.course);
        setCourseEnrollments(res.enrollments || []);
      }
    } catch (error) {
      console.error("Erro ao carregar curso:", error);
    }
  };

  // Course CRUD
  const handleOpenCourseDialog = (course?: Course) => {
    // Reset upload states
    setThumbnailUploadProgress(0);
    setIntroVideoUploadProgress(0);

    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        intro_video_url: course.intro_video_url || "",
        category: course.category,
        level: course.level,
        requirements: course.requirements || "",
        target_audience: course.target_audience || "",
        instructor_name: course.instructor_name || "",
        published: course.published,
        featured: course.featured,
      });
      // Detectar fonte da mídia
      setThumbnailSource(
        course.thumbnail?.startsWith("/uploads/") ? "upload" : "url"
      );
      setIntroVideoSource(
        course.intro_video_url?.startsWith("/uploads/") ? "upload" : "url"
      );
    } else {
      setEditingCourse(null);
      setCourseForm({
        title: "",
        description: "",
        thumbnail: "",
        intro_video_url: "",
        category: "",
        level: "iniciante",
        requirements: "",
        target_audience: "",
        instructor_name: "",
        published: false,
        featured: false,
      });
      setThumbnailSource("url");
      setIntroVideoSource("url");
    }
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    setSavingCourse(true);
    try {
      if (editingCourse) {
        const res = await learningAPI.admin.updateCourse(
          editingCourse.id,
          courseForm
        );
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Curso atualizado!",
            severity: "success",
          });
        }
      } else {
        const res = await learningAPI.admin.createCourse(courseForm);
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Curso criado!",
            severity: "success",
          });
        }
      }
      setCourseDialogOpen(false);
      loadData();
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao salvar",
        severity: "error",
      });
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Tem certeza que deseja excluir este curso?")) return;
    try {
      const res = await learningAPI.admin.deleteCourse(courseId);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Curso excluído!",
          severity: "success",
        });
        loadData();
        if (selectedCourse?.id === courseId) {
          setSelectedCourse(null);
        }
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao excluir",
        severity: "error",
      });
    }
  };

  // Module CRUD
  const handleOpenModuleDialog = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setModuleForm({
        title: module.title,
        description: module.description || "",
      });
    } else {
      setEditingModule(null);
      setModuleForm({ title: "", description: "" });
    }
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!selectedCourse) return;
    try {
      if (editingModule) {
        await learningAPI.admin.updateModule(editingModule.id, moduleForm);
        setSnackbar({
          open: true,
          message: "Módulo atualizado!",
          severity: "success",
        });
      } else {
        await learningAPI.admin.createModule(selectedCourse.id, moduleForm);
        setSnackbar({
          open: true,
          message: "Módulo criado!",
          severity: "success",
        });
      }
      setModuleDialogOpen(false);
      loadCourseDetails(selectedCourse.id);
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao salvar",
        severity: "error",
      });
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!selectedCourse || !confirm("Excluir módulo e todas as lições?"))
      return;
    try {
      await learningAPI.admin.deleteModule(moduleId);
      setSnackbar({
        open: true,
        message: "Módulo excluído!",
        severity: "success",
      });
      loadCourseDetails(selectedCourse.id);
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao excluir",
        severity: "error",
      });
    }
  };

  // Lesson CRUD
  const handleOpenLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setSelectedModuleId(moduleId);
    setUploadProgress(0);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        description: lesson.description || "",
        type: lesson.type as "video" | "text" | "pdf" | "quiz",
        content: lesson.content || "",
        video_url: lesson.video_url || "",
        duration: lesson.duration,
        is_free: lesson.is_free,
      });
      // Detectar se é upload ou URL externa
      if (lesson.video_url?.startsWith("/uploads/")) {
        setVideoSource("upload");
      } else {
        setVideoSource("url");
      }
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: "",
        description: "",
        type: "video",
        content: "",
        video_url: "",
        duration: 0,
        is_free: false,
      });
      setVideoSource("url");
    }
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!selectedCourse) return;
    try {
      if (editingLesson) {
        await learningAPI.admin.updateLesson(editingLesson.id, lessonForm);
        setSnackbar({
          open: true,
          message: "Lição atualizada!",
          severity: "success",
        });
      } else {
        await learningAPI.admin.createLesson(selectedModuleId, lessonForm);
        setSnackbar({
          open: true,
          message: "Lição criada!",
          severity: "success",
        });
      }
      setLessonDialogOpen(false);
      loadCourseDetails(selectedCourse.id);
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao salvar",
        severity: "error",
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourse || !confirm("Excluir esta lição?")) return;
    try {
      await learningAPI.admin.deleteLesson(lessonId);
      setSnackbar({
        open: true,
        message: "Lição excluída!",
        severity: "success",
      });
      loadCourseDetails(selectedCourse.id);
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao excluir",
        severity: "error",
      });
    }
  };

  // Video Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (500MB)
    if (file.size > 500 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Arquivo muito grande. Limite de 500MB.",
        severity: "error",
      });
      return;
    }

    try {
      setUploadProgress(1); // Iniciar progresso
      const result = await learningAPI.admin.uploadVideo(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        setLessonForm({ ...lessonForm, video_url: result.video_url });
        setSnackbar({
          open: true,
          message: "Vídeo enviado com sucesso!",
          severity: "success",
        });
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao enviar vídeo",
        severity: "error",
      });
    } finally {
      setUploadProgress(0);
      // Limpar input para permitir selecionar mesmo arquivo novamente
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };

  // Thumbnail Upload (para curso)
  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (10MB para imagens)
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Arquivo muito grande. Limite de 10MB para imagens.",
        severity: "error",
      });
      return;
    }

    try {
      setThumbnailUploadProgress(1);
      const result = await learningAPI.admin.uploadImage(file, (progress) => {
        setThumbnailUploadProgress(progress);
      });

      if (result.success) {
        setCourseForm({ ...courseForm, thumbnail: result.image_url });
        setSnackbar({
          open: true,
          message: "Imagem enviada com sucesso!",
          severity: "success",
        });
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao enviar imagem",
        severity: "error",
      });
    } finally {
      setThumbnailUploadProgress(0);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  // Intro Video Upload (para curso)
  const handleIntroVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (300MB para vídeos de introdução)
    if (file.size > 300 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Arquivo muito grande. Limite de 300MB para vídeos.",
        severity: "error",
      });
      return;
    }

    try {
      setIntroVideoUploadProgress(1);
      const result = await learningAPI.admin.uploadVideo(file, (progress) => {
        setIntroVideoUploadProgress(progress);
      });

      if (result.success) {
        setCourseForm({ ...courseForm, intro_video_url: result.video_url });
        setSnackbar({
          open: true,
          message: "Vídeo de introdução enviado com sucesso!",
          severity: "success",
        });
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao enviar vídeo",
        severity: "error",
      });
    } finally {
      setIntroVideoUploadProgress(0);
      if (introVideoInputRef.current) {
        introVideoInputRef.current.value = "";
      }
    }
  };

  if (!mounted) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(15, 15, 26, 0.92)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            px: { xs: 2, sm: 3, md: 4 },
            py: 2.5,
          }}
        >
          <Box sx={{ maxWidth: "1800px", mx: "auto" }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton
                  onClick={() => router.push("/adminhub")}
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    background: "rgba(255,255,255,0.05)",
                    "&:hover": { background: "rgba(139, 92, 246, 0.2)" },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="white">
                    🎓 Gerenciar Aprendizado
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.5)">
                    Administração da plataforma de e-learning
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCourseDialog()}
                sx={{
                  background:
                    "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                  px: 3,
                  py: 1.2,
                  borderRadius: "12px",
                  fontWeight: 600,
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(139, 92, 246, 0.4)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Novo Curso
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: "1800px", mx: "auto" }}
        >
          {selectedCourse ? (
            // Course Detail View
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setSelectedCourse(null)}
                sx={{ mb: 2, color: "rgba(255,255,255,0.7)" }}
              >
                Voltar à lista
              </Button>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  {/* Course Header */}
                  <Card
                    sx={{
                      mb: 3,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                    }}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box>
                          <Stack direction="row" spacing={1} mb={1}>
                            <Chip
                              label={
                                selectedCourse.published
                                  ? "Publicado"
                                  : "Rascunho"
                              }
                              size="small"
                              sx={{
                                background: selectedCourse.published
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(245, 158, 11, 0.2)",
                                color: selectedCourse.published
                                  ? "#10B981"
                                  : "#F59E0B",
                              }}
                            />
                            {selectedCourse.featured && (
                              <Chip
                                label="⭐ Destaque"
                                size="small"
                                sx={{
                                  background: "rgba(245, 158, 11, 0.2)",
                                  color: "#F59E0B",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color="white"
                            mb={1}
                          >
                            {selectedCourse.title}
                          </Typography>
                          <Typography color="rgba(255,255,255,0.6)">
                            {selectedCourse.category} •{" "}
                            {
                              COURSE_LEVELS.find(
                                (l) => l.value === selectedCourse.level
                              )?.label
                            }
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            onClick={() =>
                              handleOpenCourseDialog(selectedCourse)
                            }
                            sx={{ color: "#8B5CF6" }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() =>
                              handleDeleteCourse(selectedCourse.id)
                            }
                            sx={{ color: "#EF4444" }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Modules */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="h6" fontWeight="bold" color="white">
                      Módulos e Lições
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenModuleDialog()}
                      sx={{ color: "#8B5CF6" }}
                    >
                      Adicionar Módulo
                    </Button>
                  </Stack>

                  {selectedCourse.modules?.length === 0 ? (
                    <Card
                      sx={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        textAlign: "center",
                        py: 6,
                      }}
                    >
                      <Typography color="rgba(255,255,255,0.5)">
                        Nenhum módulo criado. Adicione módulos para organizar o
                        conteúdo.
                      </Typography>
                    </Card>
                  ) : (
                    selectedCourse.modules?.map((module, idx) => (
                      <Accordion
                        key={module.id}
                        defaultExpanded
                        sx={{
                          mb: 2,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px !important",
                          "&:before": { display: "none" },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={
                            <ExpandMoreIcon sx={{ color: "white" }} />
                          }
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            width="100%"
                            pr={2}
                          >
                            <Typography color="white" fontWeight="bold">
                              Módulo {idx + 1}: {module.title}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              <Box
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModuleDialog(module);
                                }}
                                sx={{
                                  color: "#8B5CF6",
                                  cursor: "pointer",
                                  p: 0.5,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  "&:hover": {
                                    background: "rgba(139, 92, 246, 0.1)",
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </Box>
                              <Box
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteModule(module.id);
                                }}
                                sx={{
                                  color: "#EF4444",
                                  cursor: "pointer",
                                  p: 0.5,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  "&:hover": {
                                    background: "rgba(239, 68, 68, 0.1)",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </Box>
                            </Stack>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List disablePadding>
                            {module.lessons?.map((lesson, lIdx) => {
                              const TypeIcon =
                                lessonTypeOptions.find(
                                  (t) => t.value === lesson.type
                                )?.icon || PlayArrowIcon;
                              return (
                                <ListItem
                                  key={lesson.id}
                                  sx={{
                                    borderRadius: "8px",
                                    mb: 0.5,
                                    background: "rgba(255,255,255,0.02)",
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    sx={{ mr: 2 }}
                                  >
                                    <TypeIcon sx={{ color: "#8B5CF6" }} />
                                  </Stack>
                                  <ListItemText
                                    primary={`${lIdx + 1}. ${lesson.title}`}
                                    secondary={`${lesson.duration} min`}
                                    primaryTypographyProps={{ color: "white" }}
                                    secondaryTypographyProps={{
                                      color: "rgba(255,255,255,0.5)",
                                    }}
                                  />
                                  {lesson.is_free && (
                                    <Chip
                                      size="small"
                                      label="Grátis"
                                      color="success"
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleOpenLessonDialog(
                                          module.id,
                                          lesson
                                        )
                                      }
                                      sx={{ color: "#8B5CF6" }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleDeleteLesson(lesson.id)
                                      }
                                      sx={{ color: "#EF4444" }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              );
                            })}
                          </List>
                          <Button
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenLessonDialog(module.id)}
                            sx={{ mt: 1, color: "#8B5CF6" }}
                          >
                            Adicionar Lição
                          </Button>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                </Grid>

                {/* Sidebar */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="white"
                        mb={2}
                      >
                        Estatísticas
                      </Typography>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            p: 2,
                            background: "rgba(139, 92, 246, 0.1)",
                            borderRadius: "12px",
                          }}
                        >
                          <Typography
                            variant="h4"
                            fontWeight="bold"
                            color="#8B5CF6"
                          >
                            {selectedCourse.enrollment_count}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="rgba(255,255,255,0.5)"
                          >
                            Matrículas
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            p: 2,
                            background: "rgba(16, 185, 129, 0.1)",
                            borderRadius: "12px",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <StarIcon sx={{ color: "#F59E0B" }} />
                            <Typography
                              variant="h4"
                              fontWeight="bold"
                              color="#10B981"
                            >
                              {selectedCourse.rating?.toFixed(1) || "N/A"}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="body2"
                            color="rgba(255,255,255,0.5)"
                          >
                            Avaliação ({selectedCourse.rating_count} votos)
                          </Typography>
                        </Box>
                      </Stack>

                      {courseEnrollments.length > 0 && (
                        <>
                          <Typography
                            variant="subtitle2"
                            color="rgba(255,255,255,0.5)"
                            mt={3}
                            mb={2}
                          >
                            Matrículas Recentes
                          </Typography>
                          <List dense>
                            {courseEnrollments.slice(0, 5).map((enrollment) => (
                              <ListItem
                                key={enrollment.id}
                                disablePadding
                                sx={{ mb: 1 }}
                              >
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    mr: 1,
                                    background: "#8B5CF6",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {getInitials(enrollment.user?.name)}
                                </Avatar>
                                <ListItemText
                                  primary={enrollment.user?.name}
                                  secondary={`${Math.round(
                                    enrollment.progress
                                  )}% concluído`}
                                  primaryTypographyProps={{
                                    color: "white",
                                    fontSize: "0.875rem",
                                  }}
                                  secondaryTypographyProps={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.75rem",
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </motion.div>
          ) : (
            // Dashboard View
            <>
              {/* Stats */}
              {stats && (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                    mb: 5,
                    justifyContent: "stretch",
                  }}
                >
                  {[
                    {
                      label: "Cursos",
                      value: stats.total_courses,
                      icon: SchoolIcon,
                      color: "#8B5CF6",
                      gradient:
                        "linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(109, 40, 217, 0.08) 100%)",
                    },
                    {
                      label: "Publicados",
                      value: stats.published_courses,
                      icon: VisibilityIcon,
                      color: "#10B981",
                      gradient:
                        "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)",
                    },
                    {
                      label: "Matrículas",
                      value: stats.total_enrollments,
                      icon: PeopleIcon,
                      color: "#3B82F6",
                      gradient:
                        "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(29, 78, 216, 0.08) 100%)",
                    },
                    {
                      label: "Concluídos",
                      value: stats.completed_enrollments,
                      icon: TrendingUpIcon,
                      color: "#F59E0B",
                      gradient:
                        "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)",
                    },
                    {
                      label: "Certificados",
                      value: stats.certificates_issued,
                      icon: CardMembershipIcon,
                      color: "#EC4899",
                      gradient:
                        "linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(219, 39, 119, 0.08) 100%)",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      style={{ flex: "1 1 180px", minWidth: "180px" }}
                    >
                      <Card
                        sx={{
                          background: stat.gradient,
                          border: `1px solid ${stat.color}25`,
                          borderRadius: "24px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          height: "100%",
                          "&:hover": {
                            transform: "translateY(-6px) scale(1.02)",
                            boxShadow: `0 20px 50px ${stat.color}25`,
                            borderColor: `${stat.color}50`,
                          },
                        }}
                      >
                        <CardContent sx={{ textAlign: "center", py: 4, px: 3 }}>
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: "18px",
                              background: `linear-gradient(135deg, ${stat.color}30 0%, ${stat.color}15 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              mx: "auto",
                              mb: 2.5,
                              boxShadow: `0 8px 24px ${stat.color}20`,
                            }}
                          >
                            <stat.icon
                              sx={{ fontSize: 32, color: stat.color }}
                            />
                          </Box>
                          <Typography
                            variant="h2"
                            fontWeight="bold"
                            color="white"
                            sx={{
                              mb: 0.5,
                              fontSize: { xs: "2rem", md: "2.5rem" },
                            }}
                          >
                            {stat.value}
                          </Typography>
                          <Typography
                            variant="body1"
                            color="rgba(255,255,255,0.65)"
                            fontWeight={500}
                          >
                            {stat.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </Box>
              )}

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  mb: 3,
                  "& .MuiTabs-indicator": { background: "#8B5CF6" },
                  "& .MuiTab-root": {
                    color: "rgba(255,255,255,0.5)",
                    "&.Mui-selected": { color: "white" },
                  },
                }}
              >
                <Tab label="Todos os Cursos" />
                <Tab label="Matrículas Recentes" />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  {loading ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", py: 8 }}
                    >
                      <CircularProgress size={50} sx={{ color: "#8B5CF6" }} />
                    </Box>
                  ) : courses.length === 0 ? (
                    <Card
                      sx={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        p: 6,
                        textAlign: "center",
                      }}
                    >
                      <SchoolIcon
                        sx={{
                          fontSize: 60,
                          color: "rgba(255,255,255,0.2)",
                          mb: 2,
                        }}
                      />
                      <Typography color="rgba(255,255,255,0.5)" variant="h6">
                        Nenhum curso criado ainda
                      </Typography>
                      <Typography
                        color="rgba(255,255,255,0.3)"
                        variant="body2"
                        sx={{ mt: 1 }}
                      >
                        Clique em &quot;Novo Curso&quot; para começar
                      </Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={3}>
                      {courses.map((course) => (
                        <Grid
                          key={course.id}
                          size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                        >
                          <Card
                            onClick={() => loadCourseDetails(course.id)}
                            sx={{
                              background:
                                "linear-gradient(145deg, rgba(26,26,46,0.95) 0%, rgba(15,15,26,0.98) 100%)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "16px",
                              overflow: "hidden",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              "&:hover": {
                                transform: "translateY(-8px)",
                                boxShadow:
                                  "0 20px 40px rgba(139, 92, 246, 0.3)",
                                borderColor: "rgba(139, 92, 246, 0.5)",
                                "& .course-thumbnail": {
                                  transform: "scale(1.05)",
                                },
                                "& .play-overlay": {
                                  opacity: 1,
                                },
                              },
                            }}
                          >
                            {/* Thumbnail com overlay */}
                            <Box
                              sx={{
                                position: "relative",
                                paddingTop: "56.25%",
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                className="course-thumbnail"
                                component="img"
                                src={
                                  getMediaUrl(course.thumbnail) ||
                                  PLACEHOLDER_THUMBNAIL
                                }
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  transition: "transform 0.3s ease",
                                }}
                                onError={(
                                  e: React.SyntheticEvent<HTMLImageElement>
                                ) => {
                                  e.currentTarget.src = PLACEHOLDER_THUMBNAIL;
                                }}
                              />

                              {/* Play overlay */}
                              <Box
                                className="play-overlay"
                                sx={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: "rgba(0,0,0,0.5)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: 0,
                                  transition: "opacity 0.3s ease",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: "50%",
                                    background: "rgba(139, 92, 246, 0.9)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                      "0 4px 20px rgba(139, 92, 246, 0.5)",
                                  }}
                                >
                                  <PlayArrowIcon
                                    sx={{ color: "white", fontSize: 32 }}
                                  />
                                </Box>
                              </Box>

                              {/* Badges superiores */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 12,
                                  left: 12,
                                  right: 12,
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Chip
                                  label={
                                    course.published ? "Publicado" : "Rascunho"
                                  }
                                  size="small"
                                  sx={{
                                    background: course.published
                                      ? "rgba(16, 185, 129, 0.9)"
                                      : "rgba(245, 158, 11, 0.9)",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "0.7rem",
                                    height: 24,
                                  }}
                                />
                                {course.featured && (
                                  <Chip
                                    icon={
                                      <StarIcon
                                        sx={{
                                          color: "#FCD34D !important",
                                          fontSize: 14,
                                        }}
                                      />
                                    }
                                    label="Destaque"
                                    size="small"
                                    sx={{
                                      background: "rgba(245, 158, 11, 0.9)",
                                      color: "white",
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                      height: 24,
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Duração */}
                              {course.duration > 0 && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    bottom: 8,
                                    right: 8,
                                    background: "rgba(0,0,0,0.85)",
                                    borderRadius: "4px",
                                    px: 1,
                                    py: 0.3,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="white"
                                    fontWeight={600}
                                  >
                                    {course.duration >= 60
                                      ? `${Math.floor(course.duration / 60)}h ${
                                          course.duration % 60
                                        }min`
                                      : `${course.duration}min`}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Conteúdo do card */}
                            <CardContent
                              sx={{
                                flex: 1,
                                p: 2.5,
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              {/* Categoria */}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#8B5CF6",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                  mb: 0.5,
                                }}
                              >
                                {course.category || "Sem categoria"}
                              </Typography>

                              {/* Título */}
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                color="white"
                                sx={{
                                  mb: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  lineHeight: 1.3,
                                  minHeight: "2.6em",
                                }}
                              >
                                {course.title}
                              </Typography>

                              {/* Instrutor */}
                              {course.instructor_name && (
                                <Typography
                                  variant="caption"
                                  color="rgba(255,255,255,0.5)"
                                  sx={{ mb: 1.5 }}
                                >
                                  {course.instructor_name}
                                </Typography>
                              )}

                              {/* Spacer */}
                              <Box sx={{ flex: 1 }} />

                              {/* Rating e Stats */}
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ mb: 1.5 }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.5}
                                >
                                  <StarIcon
                                    sx={{ color: "#F59E0B", fontSize: 18 }}
                                  />
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color="#F59E0B"
                                  >
                                    {course.rating?.toFixed(1) || "Novo"}
                                  </Typography>
                                </Stack>
                                {course.rating_count > 0 && (
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.4)"
                                  >
                                    ({course.rating_count})
                                  </Typography>
                                )}
                                <Box sx={{ flex: 1 }} />
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.5}
                                >
                                  <PeopleIcon
                                    sx={{
                                      color: "rgba(255,255,255,0.4)",
                                      fontSize: 16,
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.5)"
                                  >
                                    {course.enrollment_count}
                                  </Typography>
                                </Stack>
                              </Stack>

                              {/* Nível */}
                              <Stack direction="row" spacing={1}>
                                <Chip
                                  label={
                                    COURSE_LEVELS.find(
                                      (l) => l.value === course.level
                                    )?.label || "Iniciante"
                                  }
                                  size="small"
                                  sx={{
                                    background: "rgba(139, 92, 246, 0.15)",
                                    color: "#A78BFA",
                                    fontSize: "0.7rem",
                                    height: 22,
                                  }}
                                />
                              </Stack>
                            </CardContent>

                            {/* Footer com ações */}
                            <Box
                              sx={{
                                p: 2,
                                pt: 0,
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1,
                                borderTop: "1px solid rgba(255,255,255,0.05)",
                                mt: "auto",
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCourseDialog(course);
                                }}
                                sx={{
                                  color: "#8B5CF6",
                                  background: "rgba(139, 92, 246, 0.1)",
                                  "&:hover": {
                                    background: "rgba(139, 92, 246, 0.2)",
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCourse(course.id);
                                }}
                                sx={{
                                  color: "#EF4444",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  "&:hover": {
                                    background: "rgba(239, 68, 68, 0.2)",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {activeTab === 1 && (
                <TableContainer
                  component={Card}
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Aluno
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Curso
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Progresso
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Data
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentEnrollments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            align="center"
                            sx={{ py: 4, color: "rgba(255,255,255,0.5)" }}
                          >
                            Nenhuma matrícula recente
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentEnrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell
                              sx={{
                                color: "white",
                                borderColor: "rgba(255,255,255,0.08)",
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                              >
                                <Avatar sx={{ background: "#8B5CF6" }}>
                                  {getInitials(enrollment.user?.name)}
                                </Avatar>
                                <Typography>{enrollment.user?.name}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "rgba(255,255,255,0.7)",
                                borderColor: "rgba(255,255,255,0.08)",
                              }}
                            >
                              {enrollment.course?.title}
                            </TableCell>
                            <TableCell
                              sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                            >
                              <Stack spacing={0.5}>
                                <LinearProgress
                                  variant="determinate"
                                  value={enrollment.progress}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    background: "rgba(139, 92, 246, 0.1)",
                                    "& .MuiLinearProgress-bar": {
                                      background: "#8B5CF6",
                                    },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="rgba(255,255,255,0.5)"
                                >
                                  {Math.round(enrollment.progress)}%
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "rgba(255,255,255,0.5)",
                                borderColor: "rgba(255,255,255,0.08)",
                              }}
                            >
                              {new Date(
                                enrollment.created_at
                              ).toLocaleDateString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>

        {/* Course Dialog */}
        <Dialog
          open={courseDialogOpen}
          onClose={() => setCourseDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "28px",
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle sx={{ pb: 0, pt: 3, px: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SchoolIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
              <Box>
                <Typography
                  component="span"
                  variant="h5"
                  fontWeight="bold"
                  color="white"
                  display="block"
                >
                  {editingCourse ? "Editar Curso" : "Novo Curso"}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  {editingCourse
                    ? "Atualize as informações do curso"
                    : "Preencha os dados para criar um novo curso"}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3 }}>
            <Stack spacing={4}>
              {/* Seção: Informações Básicas */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="#8B5CF6"
                  fontWeight={600}
                  sx={{ mb: 2, textTransform: "uppercase", letterSpacing: 1 }}
                >
                  📚 Informações Básicas
                </Typography>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="Título do Curso"
                    placeholder="Ex: Introdução ao Atendimento ao Cliente"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "14px",
                        color: "white",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(139, 92, 246, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#8B5CF6",
                        },
                      },
                      "& .MuiInputLabel-root": {
                        color: "rgba(255,255,255,0.5)",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Descrição"
                    placeholder="Descreva o que o aluno vai aprender..."
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        description: e.target.value,
                      })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "14px",
                        color: "white",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(139, 92, 246, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#8B5CF6",
                        },
                      },
                      "& .MuiInputLabel-root": {
                        color: "rgba(255,255,255,0.5)",
                      },
                    }}
                  />
                </Stack>
              </Box>

              {/* Seção: Classificação */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="#10B981"
                  fontWeight={600}
                  sx={{ mb: 2, textTransform: "uppercase", letterSpacing: 1 }}
                >
                  🏷️ Classificação
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                      Categoria
                    </InputLabel>
                    <Select
                      value={courseForm.category}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          category: e.target.value,
                        })
                      }
                      label="Categoria"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            background: "rgba(26, 26, 46, 0.98)",
                            border: "1px solid rgba(139, 92, 246, 0.3)",
                            borderRadius: "12px",
                            mt: 1,
                            "& .MuiMenuItem-root": {
                              color: "white",
                              py: 1.5,
                              "&:hover": {
                                background: "rgba(139, 92, 246, 0.15)",
                              },
                              "&.Mui-selected": {
                                background: "rgba(139, 92, 246, 0.25)",
                              },
                            },
                          },
                        },
                      }}
                      sx={{
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "14px",
                        color: "white",
                        minHeight: "56px",
                        "& .MuiSelect-select": { py: 2 },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255,255,255,0.1)",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(139, 92, 246, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#8B5CF6",
                        },
                        "& .MuiSvgIcon-root": {
                          color: "rgba(255,255,255,0.5)",
                        },
                      }}
                    >
                      {COURSE_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ minWidth: 200 }}>
                    <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                      Nível de Dificuldade
                    </InputLabel>
                    <Select
                      value={courseForm.level}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          level: e.target.value as CourseLevel,
                        })
                      }
                      label="Nível de Dificuldade"
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            background: "rgba(26, 26, 46, 0.98)",
                            border: "1px solid rgba(139, 92, 246, 0.3)",
                            borderRadius: "12px",
                            mt: 1,
                            "& .MuiMenuItem-root": {
                              color: "white",
                              py: 1.5,
                              "&:hover": {
                                background: "rgba(139, 92, 246, 0.15)",
                              },
                              "&.Mui-selected": {
                                background: "rgba(139, 92, 246, 0.25)",
                              },
                            },
                          },
                        },
                      }}
                      sx={{
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "14px",
                        color: "white",
                        minHeight: "56px",
                        "& .MuiSelect-select": { py: 2 },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255,255,255,0.1)",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(139, 92, 246, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#8B5CF6",
                        },
                        "& .MuiSvgIcon-root": {
                          color: "rgba(255,255,255,0.5)",
                        },
                      }}
                    >
                      {COURSE_LEVELS.map((level) => (
                        <MenuItem key={level.value} value={level.value}>
                          {level.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              {/* Seção: Mídia e Instrutor */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="#3B82F6"
                  fontWeight={600}
                  sx={{ mb: 2, textTransform: "uppercase", letterSpacing: 1 }}
                >
                  🎬 Mídia e Instrutor
                </Typography>
                <Stack spacing={3}>
                  {/* Nome do Instrutor */}
                  <TextField
                    fullWidth
                    label="Nome do Instrutor"
                    placeholder="Nome completo do instrutor"
                    value={courseForm.instructor_name}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        instructor_name: e.target.value,
                      })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "14px",
                        color: "white",
                      },
                      "& .MuiInputLabel-root": {
                        color: "rgba(255,255,255,0.5)",
                      },
                    }}
                  />

                  {/* Thumbnail */}
                  <Box>
                    <Typography
                      variant="body2"
                      color="rgba(255,255,255,0.7)"
                      mb={1}
                    >
                      Imagem de Capa (Thumbnail)
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Select
                        value={thumbnailSource}
                        onChange={(e) =>
                          setThumbnailSource(e.target.value as "url" | "upload")
                        }
                        size="small"
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          color: "white",
                          borderRadius: "10px",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.1)",
                          },
                        }}
                      >
                        <MenuItem value="url">URL Externa</MenuItem>
                        <MenuItem value="upload">Upload de Arquivo</MenuItem>
                      </Select>
                    </FormControl>

                    {thumbnailSource === "url" ? (
                      <TextField
                        fullWidth
                        label="URL da Imagem"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={courseForm.thumbnail}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            thumbnail: e.target.value,
                          })
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "14px",
                            color: "white",
                          },
                          "& .MuiInputLabel-root": {
                            color: "rgba(255,255,255,0.5)",
                          },
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          border: "2px dashed rgba(59, 130, 246, 0.3)",
                          borderRadius: "12px",
                          p: 3,
                          textAlign: "center",
                          background: "rgba(59, 130, 246, 0.05)",
                          cursor: "pointer",
                          "&:hover": {
                            borderColor: "rgba(59, 130, 246, 0.5)",
                            background: "rgba(59, 130, 246, 0.1)",
                          },
                        }}
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={thumbnailInputRef}
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          style={{ display: "none" }}
                          onChange={handleThumbnailUpload}
                        />
                        {thumbnailUploadProgress > 0 &&
                        thumbnailUploadProgress < 100 ? (
                          <Box>
                            <CircularProgress
                              variant="determinate"
                              value={thumbnailUploadProgress}
                              sx={{ color: "#3B82F6", mb: 1 }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Enviando... {thumbnailUploadProgress}%
                            </Typography>
                          </Box>
                        ) : courseForm.thumbnail &&
                          thumbnailSource === "upload" ? (
                          <Box>
                            <CheckCircleIcon
                              sx={{ fontSize: 40, color: "#10B981", mb: 1 }}
                            />
                            <Typography color="#10B981" fontWeight="bold">
                              Imagem enviada!
                            </Typography>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCourseForm({ ...courseForm, thumbnail: "" });
                              }}
                              sx={{ mt: 1, color: "#EF4444" }}
                            >
                              Remover
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            <CloudUploadIcon
                              sx={{
                                fontSize: 40,
                                color: "rgba(59, 130, 246, 0.5)",
                                mb: 1,
                              }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Clique para selecionar uma imagem
                            </Typography>
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              JPG, PNG, GIF ou WebP (máx. 10MB)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Preview da thumbnail estilo Udemy */}
                    {courseForm.thumbnail && (
                      <Box
                        sx={{
                          mt: 3,
                          background:
                            "linear-gradient(145deg, rgba(15,15,26,0.95) 0%, rgba(26,26,46,0.95) 100%)",
                          borderRadius: "16px",
                          overflow: "hidden",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
                        }}
                      >
                        {/* Header do card */}
                        <Box
                          sx={{
                            p: 2,
                            background:
                              "linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: "10px",
                                background:
                                  "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <VisibilityIcon
                                sx={{ color: "white", fontSize: 20 }}
                              />
                            </Box>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                color="white"
                              >
                                Imagem de Capa
                              </Typography>
                              <Typography
                                variant="caption"
                                color="rgba(255,255,255,0.5)"
                              >
                                Thumbnail do curso na listagem
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            label={
                              thumbnailSource === "upload"
                                ? "Upload"
                                : "URL Externa"
                            }
                            size="small"
                            sx={{
                              background:
                                thumbnailSource === "upload"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                thumbnailSource === "upload"
                                  ? "#10B981"
                                  : "#3B82F6",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>

                        {/* Preview da imagem */}
                        <Box
                          sx={{
                            position: "relative",
                            paddingTop: "56.25%",
                            background: "#1a1a2e",
                          }}
                        >
                          <Box
                            component="img"
                            src={getMediaUrl(courseForm.thumbnail)}
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(
                              e: React.SyntheticEvent<HTMLImageElement>
                            ) => {
                              e.currentTarget.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect fill='%231a1a2e' width='400' height='225'/%3E%3Ctext fill='%23666' font-family='sans-serif' font-size='16' text-anchor='middle' x='200' y='118'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          {/* Overlay de dimensões */}
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              background: "rgba(0,0,0,0.7)",
                              borderRadius: "6px",
                              px: 1,
                              py: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="white"
                              fontWeight={500}
                            >
                              16:9
                            </Typography>
                          </Box>
                        </Box>

                        {/* Footer do card */}
                        <Box
                          sx={{
                            p: 2,
                            background: "rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                            sx={{
                              maxWidth: "70%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {courseForm.thumbnail}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() =>
                              setCourseForm({ ...courseForm, thumbnail: "" })
                            }
                            sx={{
                              color: "#EF4444",
                              fontSize: "0.75rem",
                              "&:hover": {
                                background: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            Remover
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Vídeo de Introdução */}
                  <Box>
                    <Typography
                      variant="body2"
                      color="rgba(255,255,255,0.7)"
                      mb={1}
                    >
                      Vídeo de Introdução (opcional)
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Select
                        value={introVideoSource}
                        onChange={(e) =>
                          setIntroVideoSource(
                            e.target.value as "url" | "upload"
                          )
                        }
                        size="small"
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          color: "white",
                          borderRadius: "10px",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.1)",
                          },
                        }}
                      >
                        <MenuItem value="url">
                          URL Externa (YouTube, Vimeo, etc)
                        </MenuItem>
                        <MenuItem value="upload">Upload de Arquivo</MenuItem>
                      </Select>
                    </FormControl>

                    {introVideoSource === "url" ? (
                      <TextField
                        fullWidth
                        label="URL do Vídeo de Introdução"
                        placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                        value={courseForm.intro_video_url}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            intro_video_url: e.target.value,
                          })
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: "14px",
                            color: "white",
                          },
                          "& .MuiInputLabel-root": {
                            color: "rgba(255,255,255,0.5)",
                          },
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          border: "2px dashed rgba(139, 92, 246, 0.3)",
                          borderRadius: "12px",
                          p: 3,
                          textAlign: "center",
                          background: "rgba(139, 92, 246, 0.05)",
                          cursor: "pointer",
                          "&:hover": {
                            borderColor: "rgba(139, 92, 246, 0.5)",
                            background: "rgba(139, 92, 246, 0.1)",
                          },
                        }}
                        onClick={() => introVideoInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={introVideoInputRef}
                          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                          style={{ display: "none" }}
                          onChange={handleIntroVideoUpload}
                        />
                        {introVideoUploadProgress > 0 &&
                        introVideoUploadProgress < 100 ? (
                          <Box>
                            <CircularProgress
                              variant="determinate"
                              value={introVideoUploadProgress}
                              sx={{ color: "#8B5CF6", mb: 1 }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Enviando... {introVideoUploadProgress}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={introVideoUploadProgress}
                              sx={{
                                mt: 2,
                                height: 8,
                                borderRadius: 4,
                                background: "rgba(139, 92, 246, 0.1)",
                                "& .MuiLinearProgress-bar": {
                                  background:
                                    "linear-gradient(90deg, #8B5CF6, #A78BFA)",
                                  borderRadius: 4,
                                },
                              }}
                            />
                          </Box>
                        ) : courseForm.intro_video_url &&
                          introVideoSource === "upload" ? (
                          <Box>
                            <CheckCircleIcon
                              sx={{ fontSize: 40, color: "#10B981", mb: 1 }}
                            />
                            <Typography color="#10B981" fontWeight="bold">
                              Vídeo enviado!
                            </Typography>
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.5)"
                            >
                              {courseForm.intro_video_url}
                            </Typography>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCourseForm({
                                  ...courseForm,
                                  intro_video_url: "",
                                });
                              }}
                              sx={{
                                mt: 1,
                                color: "#EF4444",
                                display: "block",
                                mx: "auto",
                              }}
                            >
                              Remover
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            <CloudUploadIcon
                              sx={{
                                fontSize: 40,
                                color: "rgba(139, 92, 246, 0.5)",
                                mb: 1,
                              }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Clique para selecionar um vídeo
                            </Typography>
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              MP4, WebM, OGG, MOV ou AVI (máx. 300MB, até 4K)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Info sobre formatos */}
                    {introVideoSource === "upload" &&
                      !courseForm.intro_video_url && (
                        <Alert
                          severity="info"
                          sx={{
                            mt: 2,
                            background: "rgba(59, 130, 246, 0.1)",
                            color: "rgba(255,255,255,0.8)",
                            borderRadius: "12px",
                            "& .MuiAlert-icon": { color: "#3B82F6" },
                          }}
                        >
                          Formatos recomendados para e-learning: MP4 (H.264),
                          WebM. Resolução até 4K (3840x2160).
                        </Alert>
                      )}

                    {/* Preview do vídeo estilo Udemy */}
                    {courseForm.intro_video_url && (
                      <Box
                        sx={{
                          mt: 3,
                          background:
                            "linear-gradient(145deg, rgba(15,15,26,0.95) 0%, rgba(26,26,46,0.95) 100%)",
                          borderRadius: "16px",
                          overflow: "hidden",
                          border: "1px solid rgba(139, 92, 246, 0.3)",
                          boxShadow: "0 8px 32px rgba(139, 92, 246, 0.15)",
                        }}
                      >
                        {/* Header do card */}
                        <Box
                          sx={{
                            p: 2,
                            background:
                              "linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: "10px",
                                background:
                                  "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <PlayCircleIcon
                                sx={{ color: "white", fontSize: 20 }}
                              />
                            </Box>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                color="white"
                              >
                                Vídeo de Introdução
                              </Typography>
                              <Typography
                                variant="caption"
                                color="rgba(255,255,255,0.5)"
                              >
                                Prévia do curso para alunos
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            label={
                              introVideoSource === "upload"
                                ? "Upload"
                                : "URL Externa"
                            }
                            size="small"
                            sx={{
                              background:
                                introVideoSource === "upload"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                introVideoSource === "upload"
                                  ? "#10B981"
                                  : "#3B82F6",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>

                        {/* Video Player */}
                        <Box
                          sx={{
                            position: "relative",
                            paddingTop: "56.25%",
                            background: "#000",
                          }}
                        >
                          {(() => {
                            const url = courseForm.intro_video_url;
                            // Detectar tipo de vídeo
                            const isYouTube =
                              url.includes("youtube.com") ||
                              url.includes("youtu.be");
                            const isVimeo = url.includes("vimeo.com");
                            const isLocalUpload = url.startsWith("/uploads/");

                            let embedUrl = url;
                            if (isYouTube) {
                              const videoId = url.includes("youtu.be")
                                ? url.split("/").pop()?.split("?")[0]
                                : url.split("v=")[1]?.split("&")[0];
                              embedUrl = `https://www.youtube.com/embed/${videoId}`;
                            } else if (isVimeo) {
                              const videoId = url.split("/").pop();
                              embedUrl = `https://player.vimeo.com/video/${videoId}`;
                            } else if (isLocalUpload) {
                              embedUrl = getMediaUrl(url);
                            }

                            if (
                              isLocalUpload ||
                              url.match(/\.(mp4|webm|ogg|mov|avi)$/i)
                            ) {
                              return (
                                <video
                                  src={embedUrl}
                                  controls
                                  controlsList="nodownload"
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              );
                            }

                            return (
                              <iframe
                                src={embedUrl}
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            );
                          })()}
                        </Box>

                        {/* Footer do card */}
                        <Box
                          sx={{
                            p: 2,
                            background: "rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                            sx={{
                              maxWidth: "70%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {courseForm.intro_video_url}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() =>
                              setCourseForm({
                                ...courseForm,
                                intro_video_url: "",
                              })
                            }
                            sx={{
                              color: "#EF4444",
                              fontSize: "0.75rem",
                              "&:hover": {
                                background: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            Remover
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </Box>

              {/* Seção: Conteúdo */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="#F59E0B"
                  fontWeight={600}
                  sx={{ mb: 2, textTransform: "uppercase", letterSpacing: 1 }}
                >
                  📝 Requisitos e Público-alvo
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Requisitos / O que o aluno vai aprender (um por linha)"
                  placeholder="Ex:&#10;Conhecimentos básicos de informática&#10;Vontade de aprender&#10;Comunicação eficaz"
                  value={courseForm.requirements}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      requirements: e.target.value,
                    })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "14px",
                      color: "white",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(139, 92, 246, 0.5)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#8B5CF6",
                      },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />
              </Box>

              {/* Seção: Publicação */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="#EC4899"
                  fontWeight={600}
                  sx={{ mb: 2, textTransform: "uppercase", letterSpacing: 1 }}
                >
                  ⚙️ Configurações de Publicação
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Card
                    sx={{
                      flex: 1,
                      background: courseForm.published
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        courseForm.published
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: courseForm.published
                          ? "rgba(16, 185, 129, 0.5)"
                          : "rgba(139, 92, 246, 0.3)",
                      },
                    }}
                    onClick={() =>
                      setCourseForm({
                        ...courseForm,
                        published: !courseForm.published,
                      })
                    }
                  >
                    <CardContent
                      sx={{
                        py: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <VisibilityIcon
                          sx={{
                            color: courseForm.published
                              ? "#10B981"
                              : "rgba(255,255,255,0.4)",
                          }}
                        />
                        <Box>
                          <Typography color="white" fontWeight={600}>
                            Publicado
                          </Typography>
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                          >
                            Visível para colaboradores
                          </Typography>
                        </Box>
                      </Stack>
                      <Switch
                        checked={courseForm.published}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            published: e.target.checked,
                          })
                        }
                        color="success"
                      />
                    </CardContent>
                  </Card>
                  <Card
                    sx={{
                      flex: 1,
                      background: courseForm.featured
                        ? "rgba(245, 158, 11, 0.1)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        courseForm.featured
                          ? "rgba(245, 158, 11, 0.3)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: courseForm.featured
                          ? "rgba(245, 158, 11, 0.5)"
                          : "rgba(139, 92, 246, 0.3)",
                      },
                    }}
                    onClick={() =>
                      setCourseForm({
                        ...courseForm,
                        featured: !courseForm.featured,
                      })
                    }
                  >
                    <CardContent
                      sx={{
                        py: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <StarIcon
                          sx={{
                            color: courseForm.featured
                              ? "#F59E0B"
                              : "rgba(255,255,255,0.4)",
                          }}
                        />
                        <Box>
                          <Typography color="white" fontWeight={600}>
                            Destaque
                          </Typography>
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                          >
                            Aparecer em evidência
                          </Typography>
                        </Box>
                      </Stack>
                      <Switch
                        checked={courseForm.featured}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            featured: e.target.checked,
                          })
                        }
                        color="warning"
                      />
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{ p: 3, px: 4, borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Button
              onClick={() => setCourseDialogOpen(false)}
              sx={{
                color: "rgba(255,255,255,0.6)",
                px: 3,
                "&:hover": { background: "rgba(255,255,255,0.05)" },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveCourse}
              disabled={savingCourse || !courseForm.title}
              sx={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                px: 4,
                py: 1.2,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                },
              }}
            >
              {savingCourse ? (
                <CircularProgress size={24} />
              ) : editingCourse ? (
                "Salvar Alterações"
              ) : (
                "Criar Curso"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Module Dialog */}
        <Dialog
          open={moduleDialogOpen}
          onClose={() => setModuleDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 15, 26, 0.98)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "24px",
            },
          }}
        >
          <DialogTitle>
            <Typography
              component="span"
              variant="h6"
              fontWeight="bold"
              color="white"
            >
              {editingModule ? "Editar Módulo" : "Novo Módulo"}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Título do Módulo"
                value={moduleForm.title}
                onChange={(e) =>
                  setModuleForm({ ...moduleForm, title: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255,255,255,0.03)",
                    color: "white",
                  },
                }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Descrição"
                value={moduleForm.description}
                onChange={(e) =>
                  setModuleForm({ ...moduleForm, description: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255,255,255,0.03)",
                    color: "white",
                  },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setModuleDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.5)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveModule}
              disabled={!moduleForm.title}
              sx={{ background: "#8B5CF6" }}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog
          open={lessonDialogOpen}
          onClose={() => setLessonDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 15, 26, 0.98)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "24px",
            },
          }}
        >
          <DialogTitle>
            <Typography
              component="span"
              variant="h6"
              fontWeight="bold"
              color="white"
            >
              {editingLesson ? "Editar Lição" : "Nova Lição"}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Título da Lição"
                  value={lessonForm.title}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, title: e.target.value })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Tipo
                  </InputLabel>
                  <Select
                    value={lessonForm.type}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        type: e.target.value as typeof lessonForm.type,
                      })
                    }
                    label="Tipo"
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                    }}
                  >
                    {lessonTypeOptions.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duração (minutos)"
                  value={lessonForm.duration}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                    },
                  }}
                />
              </Grid>
              {lessonForm.type === "video" && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Fonte do Vídeo
                      </InputLabel>
                      <Select
                        value={videoSource}
                        label="Fonte do Vídeo"
                        onChange={(e) => {
                          setVideoSource(e.target.value as "url" | "upload");
                          if (e.target.value === "url") {
                            setUploadProgress(0);
                          }
                        }}
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.1)",
                          },
                        }}
                      >
                        <MenuItem value="url">
                          URL Externa (YouTube, Vimeo, etc)
                        </MenuItem>
                        <MenuItem value="upload">Upload de Arquivo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {videoSource === "url" && (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="URL do Vídeo"
                        placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                        value={lessonForm.video_url}
                        onChange={(e) =>
                          setLessonForm({
                            ...lessonForm,
                            video_url: e.target.value,
                          })
                        }
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            background: "rgba(255,255,255,0.03)",
                            color: "white",
                          },
                        }}
                      />
                    </Grid>
                  )}

                  {videoSource === "upload" && (
                    <Grid size={{ xs: 12 }}>
                      <Box
                        sx={{
                          border: "2px dashed rgba(139, 92, 246, 0.3)",
                          borderRadius: "12px",
                          p: 3,
                          textAlign: "center",
                          background: "rgba(139, 92, 246, 0.05)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "rgba(139, 92, 246, 0.5)",
                            background: "rgba(139, 92, 246, 0.1)",
                          },
                        }}
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <input
                          type="file"
                          ref={videoInputRef}
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          style={{ display: "none" }}
                          onChange={handleVideoUpload}
                        />
                        {uploadProgress > 0 && uploadProgress < 100 ? (
                          <Box>
                            <CircularProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{ color: "#8B5CF6", mb: 2 }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Enviando... {uploadProgress}%
                            </Typography>
                          </Box>
                        ) : lessonForm.video_url && videoSource === "upload" ? (
                          <Box>
                            <CheckCircleIcon
                              sx={{ fontSize: 48, color: "#10B981", mb: 1 }}
                            />
                            <Typography color="#10B981" fontWeight="bold">
                              Vídeo enviado!
                            </Typography>
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.5)"
                            >
                              {lessonForm.video_url}
                            </Typography>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLessonForm({ ...lessonForm, video_url: "" });
                              }}
                              sx={{ mt: 1, color: "#EF4444" }}
                            >
                              Remover
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            <CloudUploadIcon
                              sx={{
                                fontSize: 48,
                                color: "rgba(139, 92, 246, 0.5)",
                                mb: 1,
                              }}
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              Clique para selecionar um vídeo
                            </Typography>
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              MP4, WebM, OGG ou MOV (máx. 500MB)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  )}
                </>
              )}
              {(lessonForm.type === "text" || lessonForm.type === "pdf") && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label={
                      lessonForm.type === "text" ? "Conteúdo" : "URL do PDF"
                    }
                    value={lessonForm.content}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, content: e.target.value })
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "rgba(255,255,255,0.03)",
                        color: "white",
                      },
                    }}
                  />
                </Grid>
              )}
              {lessonForm.type === "link" && (
                <Grid size={{ xs: 12 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      mb: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <LinkIcon sx={{ color: "#3B82F6", fontSize: 20 }} />
                      <Typography variant="body2" color="#3B82F6" fontWeight={600}>
                        Link Externo
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="rgba(255,255,255,0.6)">
                      Cole a URL de um recurso externo (site, artigo, documento online, etc.)
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="URL do Recurso Externo"
                    placeholder="https://exemplo.com/recurso"
                    value={lessonForm.content}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, content: e.target.value })
                    }
                    helperText="URLs aceitas: sites, artigos, Google Drive, Notion, etc."
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        background: "rgba(255,255,255,0.03)",
                        color: "white",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(59, 130, 246, 0.5)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#3B82F6",
                        },
                      },
                      "& .MuiFormHelperText-root": {
                        color: "rgba(255,255,255,0.4)",
                      },
                    }}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descrição"
                  value={lessonForm.description}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      description: e.target.value,
                    })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={lessonForm.is_free}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          is_free: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Lição gratuita (preview)"
                  sx={{ color: "rgba(255,255,255,0.8)" }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setLessonDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.5)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveLesson}
              disabled={!lessonForm.title}
              sx={{ background: "#8B5CF6" }}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ borderRadius: "12px" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
