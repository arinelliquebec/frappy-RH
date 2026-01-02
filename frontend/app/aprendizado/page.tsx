"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Rating,
  LinearProgress,
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
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import SchoolIcon from "@mui/icons-material/School";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PeopleIcon from "@mui/icons-material/People";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DescriptionIcon from "@mui/icons-material/Description";
import QuizIcon from "@mui/icons-material/Quiz";
import DownloadIcon from "@mui/icons-material/Download";
import LinkIcon from "@mui/icons-material/Link";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  userAPI,
  learningAPI,
  User,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Certificate,
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

const levelColors = {
  iniciante: "#10B981",
  intermediario: "#F59E0B",
  avancado: "#EF4444",
};

const lessonTypeIcons = {
  video: PlayArrowIcon,
  text: DescriptionIcon,
  pdf: DescriptionIcon,
  quiz: QuizIcon,
  download: DownloadIcon,
  link: LinkIcon,
};

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
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%231a1a2e' width='400' height='225'/%3E%3Ctext fill='%23555' font-family='sans-serif' font-size='48' text-anchor='middle' x='200' y='130'%3E🎓%3C/text%3E%3C/svg%3E";

// Componente VideoPlayer para suportar múltiplas fontes de vídeo com progresso
const VideoPlayer = ({
  url,
  startTime = 0,
  onTimeUpdate,
}: {
  url: string;
  startTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedTimeRef = useRef<number>(startTime);
  const hasSetInitialTime = useRef(false);

  // Função para detectar o tipo de vídeo e retornar a URL de embed
  const getVideoInfo = (videoUrl: string) => {
    // YouTube - formato padrão (inclui start time)
    const youtubeRegex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = videoUrl.match(youtubeRegex);
    if (youtubeMatch) {
      const startParam = startTime > 0 ? `&start=${Math.floor(startTime)}` : "";
      return {
        type: "iframe",
        src: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1${startParam}`,
      };
    }

    // Vimeo (inclui start time)
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = videoUrl.match(vimeoRegex);
    if (vimeoMatch) {
      const startParam = startTime > 0 ? `#t=${Math.floor(startTime)}s` : "";
      return {
        type: "iframe",
        src: `https://player.vimeo.com/video/${vimeoMatch[1]}${startParam}`,
      };
    }

    // Google Drive
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const driveMatch = videoUrl.match(driveRegex);
    if (driveMatch) {
      return {
        type: "iframe",
        src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      };
    }

    // Loom
    const loomRegex = /loom\.com\/share\/([a-zA-Z0-9]+)/;
    const loomMatch = videoUrl.match(loomRegex);
    if (loomMatch) {
      return {
        type: "iframe",
        src: `https://www.loom.com/embed/${loomMatch[1]}`,
      };
    }

    // Wistia
    const wistiaRegex = /wistia\.com\/medias\/([a-zA-Z0-9]+)/;
    const wistiaMatch = videoUrl.match(wistiaRegex);
    if (wistiaMatch) {
      return {
        type: "iframe",
        src: `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`,
      };
    }

    // Vídeo direto (mp4, webm, ogg)
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoUrl)) {
      return {
        type: "video",
        src: videoUrl,
      };
    }

    // Upload local
    if (videoUrl.startsWith("/uploads/")) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://127.0.0.1:8080";
      return {
        type: "video",
        src: `${apiUrl}${videoUrl}`,
      };
    }

    // Se não for reconhecido, tenta como iframe genérico
    return {
      type: "iframe",
      src: videoUrl,
    };
  };

  const videoInfo = getVideoInfo(url);

  // Definir tempo inicial quando o vídeo carregar (apenas para vídeos HTML5)
  useEffect(() => {
    if (
      videoRef.current &&
      videoInfo.type === "video" &&
      startTime > 0 &&
      !hasSetInitialTime.current
    ) {
      const handleLoadedMetadata = () => {
        if (videoRef.current && !hasSetInitialTime.current) {
          videoRef.current.currentTime = startTime;
          hasSetInitialTime.current = true;
        }
      };

      videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);

      // Se o vídeo já carregou
      if (videoRef.current.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        videoRef.current?.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
      };
    }
  }, [startTime, videoInfo.type]);

  // Salvar progresso periodicamente (a cada 5 segundos de diferença)
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      const currentTime = videoRef.current.currentTime;
      // Salvar apenas se a diferença for maior que 5 segundos
      if (Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
        lastSavedTimeRef.current = currentTime;
        onTimeUpdate(currentTime);
      }
    }
  }, [onTimeUpdate]);

  // Salvar ao pausar ou sair
  const handlePause = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  return (
    <Box
      sx={{
        position: "relative",
        paddingTop: "56.25%",
        background: "#000",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {videoInfo.type === "video" ? (
        <video
          ref={videoRef}
          src={videoInfo.src}
          controls
          controlsList="nodownload"
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onEnded={handlePause}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <iframe
          src={videoInfo.src}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </Box>
  );
};

// Componente simples para vídeo de introdução do curso (sem tracking de progresso)
const CourseVideoPlayer = ({ url }: { url: string }) => {
  // Função para detectar o tipo de vídeo e retornar a URL de embed
  const getVideoInfo = (videoUrl: string) => {
    // YouTube
    const youtubeRegex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = videoUrl.match(youtubeRegex);
    if (youtubeMatch) {
      return {
        type: "iframe",
        src: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`,
      };
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = videoUrl.match(vimeoRegex);
    if (vimeoMatch) {
      return {
        type: "iframe",
        src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      };
    }

    // Vídeo direto (mp4, webm, ogg) ou upload local
    if (
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(videoUrl) ||
      videoUrl.startsWith("/uploads/")
    ) {
      return {
        type: "video",
        src: getMediaUrl(videoUrl),
      };
    }

    // Se não for reconhecido, tenta como iframe genérico
    return {
      type: "iframe",
      src: videoUrl,
    };
  };

  const videoInfo = getVideoInfo(url);

  return (
    <Box
      sx={{
        position: "relative",
        paddingTop: "56.25%",
        background: "#000",
      }}
    >
      {videoInfo.type === "video" ? (
        <video
          src={videoInfo.src}
          controls
          controlsList="nodownload"
          poster=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <iframe
          src={videoInfo.src}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </Box>
  );
};

export default function AprendizadoPage() {
  return (
    <Suspense
      fallback={
        <ThemeProvider theme={darkTheme}>
          <Box
            sx={{
              minHeight: "100vh",
              background:
                "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress sx={{ color: "#4a9fd9" }} />
          </Box>
        </ThemeProvider>
      }
    >
      <AprendizadoContent />
    </Suspense>
  );
}

function AprendizadoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("course");
  const lessonIdParam = searchParams.get("lesson");

  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Catálogo
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  // Visualização
  const [activeTab, setActiveTab] = useState(0); // 0: Catálogo, 1: Meus Cursos, 2: Certificados
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentEnrollment, setCurrentEnrollment] = useState<Enrollment | null>(
    null
  );

  // Player
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(
    null
  );
  const [showPlayer, setShowPlayer] = useState(false);

  // Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    total_points: number;
    earned_points: number;
  } | null>(null);

  // UI
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [enrolling, setEnrolling] = useState(false);

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
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    loadData();
  }, [router]);

  useEffect(() => {
    if (courseIdParam && mounted) {
      loadCourseDetails(courseIdParam);
    }
  }, [courseIdParam, mounted]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, enrollmentsRes, certificatesRes] = await Promise.all([
        learningAPI.getCourses(),
        learningAPI.getMyEnrollments(),
        learningAPI.getMyCertificates(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.courses || []);
      if (enrollmentsRes.success)
        setEnrollments(enrollmentsRes.enrollments || []);
      if (certificatesRes.success)
        setCertificates(certificatesRes.certificates || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    try {
      const res = await learningAPI.getCourseById(courseId);
      if (res.success) {
        setSelectedCourse(res.course);
        setIsEnrolled(res.enrolled);
        setCurrentEnrollment(res.enrollment || null);
      }
    } catch (error) {
      console.error("Erro ao carregar curso:", error);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse) return;
    setEnrolling(true);
    try {
      const res = await learningAPI.enrollInCourse(selectedCourse.id);
      if (res.success) {
        setIsEnrolled(true);
        setCurrentEnrollment(res.enrollment);
        setSnackbar({
          open: true,
          message: "Matrícula realizada com sucesso!",
          severity: "success",
        });
        loadData();
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao matricular",
        severity: "error",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleOpenLesson = async (lesson: Lesson) => {
    if (!isEnrolled && !lesson.is_free) {
      setSnackbar({
        open: true,
        message: "Matricule-se no curso para acessar esta lição",
        severity: "error",
      });
      return;
    }

    try {
      const res = await learningAPI.getLessonContent(lesson.id);
      if (res.success) {
        setCurrentLesson(res.lesson);
        setLessonProgress(res.progress);
        setShowPlayer(true);
        setQuizAnswers({});
        setQuizResult(null);
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao carregar lição",
        severity: "error",
      });
    }
  };

  const handleCompleteLesson = async () => {
    if (!currentLesson) return;
    try {
      await learningAPI.updateLessonProgress(currentLesson.id, {
        completed: true,
      });
      setLessonProgress((prev) => (prev ? { ...prev, completed: true } : null));
      setSnackbar({
        open: true,
        message: "Lição concluída!",
        severity: "success",
      });

      // Atualizar progresso do curso
      if (selectedCourse) {
        loadCourseDetails(selectedCourse.id);
      }
      loadData();
    } catch (error) {
      console.error("Erro ao concluir lição:", error);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentLesson?.quiz) return;
    setQuizSubmitting(true);
    try {
      const res = await learningAPI.submitQuiz(
        currentLesson.quiz.id,
        quizAnswers
      );
      setQuizResult(res);
      if (res.passed) {
        handleCompleteLesson();
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao enviar quiz",
        severity: "error",
      });
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!selectedCourse) return;
    try {
      const res = await learningAPI.generateCertificate(selectedCourse.id);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Certificado gerado com sucesso!",
          severity: "success",
        });
        loadData();
      }
    } catch (error) {
      const err = error as Error;
      setSnackbar({
        open: true,
        message: err.message || "Erro ao gerar certificado",
        severity: "error",
      });
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || course.category === selectedCategory;
    const matchesLevel = !selectedLevel || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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
            background: "rgba(15, 15, 26, 0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            px: 3,
            py: 2,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => router.push("/hub")}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="white">
                  🎓 Aprendizado
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Plataforma de capacitação
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  background:
                    "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                  fontWeight: "bold",
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </Stack>
          </Stack>
        </Box>

        {/* Main Content */}
        <Box sx={{ p: 3 }}>
          {selectedCourse ? (
            // Course Detail View
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setSelectedCourse(null);
                  router.push("/aprendizado");
                }}
                sx={{ mb: 2, color: "rgba(255,255,255,0.7)" }}
              >
                Voltar ao catálogo
              </Button>

              <Grid container spacing={4}>
                {/* Course Info */}
                <Grid size={{ xs: 12, md: 8 }}>
                  <Card
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "24px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Vídeo de introdução ou thumbnail */}
                    {selectedCourse.intro_video_url ? (
                      <Box sx={{ position: "relative" }}>
                        <CourseVideoPlayer
                          url={selectedCourse.intro_video_url}
                        />
                      </Box>
                    ) : selectedCourse.thumbnail ? (
                      <CardMedia
                        component="img"
                        height="300"
                        image={getMediaUrl(selectedCourse.thumbnail)}
                        alt={selectedCourse.title}
                        sx={{ objectFit: "cover" }}
                      />
                    ) : null}
                    <CardContent sx={{ p: 4 }}>
                      <Stack direction="row" spacing={1} mb={2}>
                        <Chip
                          label={selectedCourse.category}
                          size="small"
                          sx={{
                            background: "rgba(139, 92, 246, 0.2)",
                            color: "#8B5CF6",
                          }}
                        />
                        <Chip
                          label={
                            COURSE_LEVELS.find(
                              (l) => l.value === selectedCourse.level
                            )?.label || selectedCourse.level
                          }
                          size="small"
                          sx={{
                            background: `${
                              levelColors[
                                selectedCourse.level as keyof typeof levelColors
                              ]
                            }20`,
                            color:
                              levelColors[
                                selectedCourse.level as keyof typeof levelColors
                              ],
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color="white"
                        gutterBottom
                      >
                        {selectedCourse.title}
                      </Typography>

                      <Typography color="rgba(255,255,255,0.7)" paragraph>
                        {selectedCourse.description}
                      </Typography>

                      <Stack direction="row" spacing={3} mb={3}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AccessTimeIcon sx={{ color: "#8B5CF6" }} />
                          <Typography color="rgba(255,255,255,0.7)">
                            {formatDuration(selectedCourse.duration)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PeopleIcon sx={{ color: "#10B981" }} />
                          <Typography color="rgba(255,255,255,0.7)">
                            {selectedCourse.enrollment_count} alunos
                          </Typography>
                        </Stack>
                        {selectedCourse.rating > 0 && (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Rating
                              value={selectedCourse.rating}
                              readOnly
                              size="small"
                            />
                            <Typography color="rgba(255,255,255,0.7)">
                              ({selectedCourse.rating_count})
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      {selectedCourse.instructor_name && (
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          mb={3}
                        >
                          <Avatar sx={{ background: "#8B5CF6" }}>
                            {getInitials(selectedCourse.instructor_name)}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              color="rgba(255,255,255,0.5)"
                            >
                              Instrutor
                            </Typography>
                            <Typography color="white" fontWeight="bold">
                              {selectedCourse.instructor_name}
                            </Typography>
                          </Box>
                        </Stack>
                      )}

                      {currentEnrollment && (
                        <Box sx={{ mb: 3 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            mb={1}
                          >
                            <Typography color="rgba(255,255,255,0.7)">
                              Seu progresso
                            </Typography>
                            <Typography color="#8B5CF6" fontWeight="bold">
                              {Math.round(currentEnrollment.progress)}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={currentEnrollment.progress}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              background: "rgba(139, 92, 246, 0.1)",
                              "& .MuiLinearProgress-bar": {
                                background:
                                  "linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)",
                                borderRadius: 5,
                              },
                            }}
                          />
                          {currentEnrollment.progress >= 100 && (
                            <Button
                              variant="contained"
                              startIcon={<CardMembershipIcon />}
                              onClick={handleGenerateCertificate}
                              sx={{
                                mt: 2,
                                background:
                                  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              }}
                            >
                              Gerar Certificado
                            </Button>
                          )}
                        </Box>
                      )}

                      {/* Modules */}
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="white"
                        mb={2}
                      >
                        Conteúdo do Curso
                      </Typography>

                      {selectedCourse.modules?.map((module, idx) => (
                        <Accordion
                          key={module.id}
                          defaultExpanded={idx === 0}
                          sx={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px !important",
                            mb: 1,
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
                              spacing={2}
                              alignItems="center"
                              width="100%"
                            >
                              <Typography color="white" fontWeight="bold">
                                Módulo {idx + 1}: {module.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${module.lessons?.length || 0} lições`}
                                sx={{
                                  background: "rgba(139, 92, 246, 0.2)",
                                  color: "#8B5CF6",
                                }}
                              />
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <List disablePadding>
                              {module.lessons?.map((lesson) => {
                                const LessonIcon =
                                  lessonTypeIcons[lesson.type] || PlayArrowIcon;
                                const canAccess = isEnrolled || lesson.is_free;

                                return (
                                  <ListItemButton
                                    key={lesson.id}
                                    onClick={() => handleOpenLesson(lesson)}
                                    disabled={!canAccess}
                                    sx={{
                                      borderRadius: "8px",
                                      mb: 0.5,
                                      "&:hover": {
                                        background: "rgba(139, 92, 246, 0.1)",
                                      },
                                    }}
                                  >
                                    <ListItemIcon>
                                      {canAccess ? (
                                        <LessonIcon sx={{ color: "#8B5CF6" }} />
                                      ) : (
                                        <LockIcon
                                          sx={{
                                            color: "rgba(255,255,255,0.3)",
                                          }}
                                        />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={lesson.title}
                                      secondary={`${formatDuration(
                                        lesson.duration
                                      )}`}
                                      primaryTypographyProps={{
                                        color: canAccess
                                          ? "white"
                                          : "rgba(255,255,255,0.3)",
                                      }}
                                      secondaryTypographyProps={{
                                        color: "rgba(255,255,255,0.5)",
                                      }}
                                    />
                                    {lesson.is_free && !isEnrolled && (
                                      <Chip
                                        size="small"
                                        label="Grátis"
                                        color="success"
                                      />
                                    )}
                                  </ListItemButton>
                                );
                              })}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Sidebar */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: "24px",
                      position: "sticky",
                      top: 100,
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      {!isEnrolled ? (
                        <>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color="white"
                            mb={2}
                          >
                            Comece agora!
                          </Typography>
                          <Typography color="rgba(255,255,255,0.7)" mb={3}>
                            Matricule-se gratuitamente e tenha acesso completo
                            ao curso.
                          </Typography>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={handleEnroll}
                            disabled={enrolling}
                            sx={{
                              py: 1.5,
                              background:
                                "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                              fontSize: "1.1rem",
                            }}
                          >
                            {enrolling ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Matricular-se"
                            )}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            mb={2}
                          >
                            <CheckCircleIcon sx={{ color: "#10B981" }} />
                            <Typography color="#10B981" fontWeight="bold">
                              Você está matriculado!
                            </Typography>
                          </Stack>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            startIcon={<PlayCircleIcon />}
                            onClick={() => {
                              const firstLesson =
                                selectedCourse.modules?.[0]?.lessons?.[0];
                              if (firstLesson) handleOpenLesson(firstLesson);
                            }}
                            sx={{
                              py: 1.5,
                              background:
                                "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                            }}
                          >
                            Continuar estudando
                          </Button>
                        </>
                      )}

                      <Divider
                        sx={{ my: 3, borderColor: "rgba(255,255,255,0.1)" }}
                      />

                      <Typography
                        variant="subtitle2"
                        color="rgba(255,255,255,0.5)"
                        mb={1}
                      >
                        O que você vai aprender:
                      </Typography>
                      <List dense>
                        {selectedCourse.requirements
                          ?.split("\n")
                          .filter(Boolean)
                          .map((req, idx) => (
                            <ListItem key={idx} disablePadding>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircleIcon
                                  sx={{ color: "#10B981", fontSize: 18 }}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={req}
                                primaryTypographyProps={{
                                  color: "rgba(255,255,255,0.8)",
                                  fontSize: "0.875rem",
                                }}
                              />
                            </ListItem>
                          ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </motion.div>
          ) : (
            // Catalog View
            <>
              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  mb: 3,
                  "& .MuiTabs-indicator": {
                    background:
                      "linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)",
                  },
                  "& .MuiTab-root": {
                    color: "rgba(255,255,255,0.5)",
                    "&.Mui-selected": { color: "white" },
                  },
                }}
              >
                <Tab
                  icon={<SchoolIcon />}
                  iconPosition="start"
                  label="Catálogo"
                />
                <Tab
                  icon={<PlayCircleIcon />}
                  iconPosition="start"
                  label={`Meus Cursos (${enrollments.length})`}
                />
                <Tab
                  icon={<CardMembershipIcon />}
                  iconPosition="start"
                  label={`Certificados (${certificates.length})`}
                />
              </Tabs>

              <AnimatePresence mode="wait">
                {activeTab === 0 && (
                  <motion.div
                    key="catalog"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Filters */}
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
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                        >
                          <TextField
                            placeholder="Buscar cursos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon
                                    sx={{ color: "rgba(255,255,255,0.5)" }}
                                  />
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "12px",
                                color: "white",
                              },
                            }}
                          />
                          <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                              Categoria
                            </InputLabel>
                            <Select
                              value={selectedCategory}
                              onChange={(e) =>
                                setSelectedCategory(e.target.value)
                              }
                              label="Categoria"
                              sx={{
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "12px",
                                color: "white",
                              }}
                            >
                              <MenuItem value="">Todas</MenuItem>
                              {COURSE_CATEGORIES.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                  {cat}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                              Nível
                            </InputLabel>
                            <Select
                              value={selectedLevel}
                              onChange={(e) => setSelectedLevel(e.target.value)}
                              label="Nível"
                              sx={{
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "12px",
                                color: "white",
                              }}
                            >
                              <MenuItem value="">Todos</MenuItem>
                              {COURSE_LEVELS.map((level) => (
                                <MenuItem key={level.value} value={level.value}>
                                  {level.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Course Grid */}
                    {loading ? (
                      <Grid container spacing={3}>
                        {[...Array(6)].map((_, i) => (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                            <Skeleton
                              variant="rectangular"
                              height={300}
                              sx={{ borderRadius: "16px" }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : filteredCourses.length === 0 ? (
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "24px",
                          textAlign: "center",
                          py: 8,
                        }}
                      >
                        <SchoolIcon
                          sx={{
                            fontSize: 60,
                            color: "rgba(255,255,255,0.2)",
                            mb: 2,
                          }}
                        />
                        <Typography color="rgba(255,255,255,0.5)">
                          Nenhum curso encontrado
                        </Typography>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {filteredCourses.map((course) => (
                          <Grid
                            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                            key={course.id}
                          >
                            <motion.div
                              whileHover={{ y: -8 }}
                              transition={{ duration: 0.3 }}
                              style={{ height: "100%" }}
                            >
                              <Card
                                onClick={() => {
                                  setSelectedCourse(course);
                                  loadCourseDetails(course.id);
                                  router.push(
                                    `/aprendizado?course=${course.id}`
                                  );
                                }}
                                sx={{
                                  cursor: "pointer",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  background:
                                    "linear-gradient(145deg, rgba(26,26,46,0.95) 0%, rgba(15,15,26,0.98) 100%)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "16px",
                                  overflow: "hidden",
                                  transition: "all 0.3s ease",
                                  "&:hover": {
                                    borderColor: "rgba(139, 92, 246, 0.5)",
                                    boxShadow:
                                      "0 20px 50px rgba(139, 92, 246, 0.3)",
                                    "& .course-thumbnail": {
                                      transform: "scale(1.08)",
                                    },
                                    "& .play-overlay": {
                                      opacity: 1,
                                    },
                                  },
                                }}
                              >
                                {/* Thumbnail estilo Udemy */}
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
                                      transition: "transform 0.4s ease",
                                    }}
                                    onError={(
                                      e: React.SyntheticEvent<HTMLImageElement>
                                    ) => {
                                      e.currentTarget.src =
                                        PLACEHOLDER_THUMBNAIL;
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
                                      background:
                                        "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      opacity: 0,
                                      transition: "opacity 0.3s ease",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 70,
                                        height: 70,
                                        borderRadius: "50%",
                                        background:
                                          "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow:
                                          "0 8px 30px rgba(139, 92, 246, 0.6)",
                                        border:
                                          "3px solid rgba(255,255,255,0.3)",
                                      }}
                                    >
                                      <PlayArrowIcon
                                        sx={{
                                          color: "white",
                                          fontSize: 40,
                                          ml: 0.5,
                                        }}
                                      />
                                    </Box>
                                  </Box>

                                  {/* Badge de Destaque */}
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
                                      label="Em Destaque"
                                      size="small"
                                      sx={{
                                        position: "absolute",
                                        top: 12,
                                        left: 12,
                                        background:
                                          "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                        color: "white",
                                        fontWeight: 700,
                                        fontSize: "0.7rem",
                                        boxShadow:
                                          "0 4px 12px rgba(245, 158, 11, 0.4)",
                                      }}
                                    />
                                  )}

                                  {/* Duração */}
                                  {course.duration > 0 && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        bottom: 10,
                                        right: 10,
                                        background: "rgba(0,0,0,0.85)",
                                        borderRadius: "6px",
                                        px: 1.2,
                                        py: 0.4,
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="white"
                                        fontWeight={700}
                                      >
                                        {formatDuration(course.duration)}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* Badge de nível */}
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 12,
                                      right: 12,
                                      background:
                                        levelColors[
                                          course.level as keyof typeof levelColors
                                        ] || "#8B5CF6",
                                      borderRadius: "6px",
                                      px: 1.2,
                                      py: 0.3,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="white"
                                      fontWeight={700}
                                      sx={{
                                        textTransform: "uppercase",
                                        fontSize: "0.65rem",
                                      }}
                                    >
                                      {COURSE_LEVELS.find(
                                        (l) => l.value === course.level
                                      )?.label || "Iniciante"}
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Conteúdo do card */}
                                <CardContent
                                  sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    p: 2.5,
                                  }}
                                >
                                  {/* Categoria */}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "#8B5CF6",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: 0.8,
                                      fontSize: "0.7rem",
                                      mb: 0.8,
                                    }}
                                  >
                                    {course.category || "Geral"}
                                  </Typography>

                                  {/* Título */}
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    color="white"
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      mb: 1,
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
                                      Por {course.instructor_name}
                                    </Typography>
                                  )}

                                  {/* Spacer */}
                                  <Box sx={{ flex: 1 }} />

                                  {/* Rating e matrículas */}
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1.5}
                                    sx={{ mt: 1 }}
                                  >
                                    {course.rating > 0 ? (
                                      <>
                                        <Typography
                                          variant="body2"
                                          fontWeight={800}
                                          color="#F59E0B"
                                        >
                                          {course.rating.toFixed(1)}
                                        </Typography>
                                        <Rating
                                          value={course.rating}
                                          precision={0.5}
                                          readOnly
                                          size="small"
                                          sx={{
                                            "& .MuiRating-iconFilled": {
                                              color: "#F59E0B",
                                            },
                                            "& .MuiRating-iconEmpty": {
                                              color: "rgba(255,255,255,0.2)",
                                            },
                                          }}
                                        />
                                        {course.rating_count > 0 && (
                                          <Typography
                                            variant="caption"
                                            color="rgba(255,255,255,0.4)"
                                          >
                                            ({course.rating_count})
                                          </Typography>
                                        )}
                                      </>
                                    ) : (
                                      <Chip
                                        label="Novo"
                                        size="small"
                                        sx={{
                                          background: "rgba(16, 185, 129, 0.2)",
                                          color: "#10B981",
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                          height: 22,
                                        }}
                                      />
                                    )}
                                    <Box sx={{ flex: 1 }} />
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.5}
                                    >
                                      <PeopleIcon
                                        sx={{
                                          fontSize: 16,
                                          color: "rgba(255,255,255,0.4)",
                                        }}
                                      />
                                      <Typography
                                        variant="caption"
                                        color="rgba(255,255,255,0.5)"
                                        fontWeight={600}
                                      >
                                        {course.enrollment_count.toLocaleString()}
                                      </Typography>
                                    </Stack>
                                  </Stack>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </motion.div>
                )}

                {activeTab === 1 && (
                  <motion.div
                    key="my-courses"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {enrollments.length === 0 ? (
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "24px",
                          textAlign: "center",
                          py: 8,
                        }}
                      >
                        <PlayCircleIcon
                          sx={{
                            fontSize: 60,
                            color: "rgba(255,255,255,0.2)",
                            mb: 2,
                          }}
                        />
                        <Typography color="rgba(255,255,255,0.5)" mb={2}>
                          Você ainda não está matriculado em nenhum curso
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => setActiveTab(0)}
                          sx={{
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                          }}
                        >
                          Explorar Catálogo
                        </Button>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {enrollments.map((enrollment) => (
                          <Grid
                            size={{ xs: 12, sm: 6, md: 4 }}
                            key={enrollment.id}
                          >
                            <Card
                              onClick={() => {
                                if (enrollment.course) {
                                  setSelectedCourse(enrollment.course);
                                  loadCourseDetails(enrollment.course.id);
                                }
                              }}
                              sx={{
                                cursor: "pointer",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "16px",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                  borderColor: "rgba(139, 92, 246, 0.3)",
                                },
                              }}
                            >
                              <CardContent>
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  color="white"
                                  mb={1}
                                >
                                  {enrollment.course?.title}
                                </Typography>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  mb={1}
                                >
                                  <Typography
                                    variant="body2"
                                    color="rgba(255,255,255,0.5)"
                                  >
                                    Progresso
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="#8B5CF6"
                                    fontWeight="bold"
                                  >
                                    {Math.round(enrollment.progress)}%
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={enrollment.progress}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: "rgba(139, 92, 246, 0.1)",
                                    "& .MuiLinearProgress-bar": {
                                      background:
                                        "linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)",
                                    },
                                  }}
                                />
                                {enrollment.completed_at && (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Concluído"
                                    size="small"
                                    sx={{
                                      mt: 2,
                                      background: "rgba(16, 185, 129, 0.2)",
                                      color: "#10B981",
                                    }}
                                  />
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </motion.div>
                )}

                {activeTab === 2 && (
                  <motion.div
                    key="certificates"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {certificates.length === 0 ? (
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "24px",
                          textAlign: "center",
                          py: 8,
                        }}
                      >
                        <CardMembershipIcon
                          sx={{
                            fontSize: 60,
                            color: "rgba(255,255,255,0.2)",
                            mb: 2,
                          }}
                        />
                        <Typography color="rgba(255,255,255,0.5)">
                          Complete cursos para obter certificados
                        </Typography>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {certificates.map((cert) => (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cert.id}>
                            <Card
                              sx={{
                                background:
                                  "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                borderRadius: "16px",
                              }}
                            >
                              <CardContent sx={{ textAlign: "center", py: 4 }}>
                                <CardMembershipIcon
                                  sx={{ fontSize: 60, color: "#10B981", mb: 2 }}
                                />
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  color="white"
                                  mb={1}
                                >
                                  {cert.course?.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="rgba(255,255,255,0.5)"
                                  mb={2}
                                >
                                  Certificado Nº: {cert.certificate_no}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="rgba(255,255,255,0.5)"
                                >
                                  Emitido em:{" "}
                                  {new Date(cert.issued_at).toLocaleDateString(
                                    "pt-BR"
                                  )}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </Box>

        {/* Lesson Player Dialog */}
        <Dialog
          open={showPlayer}
          onClose={() => setShowPlayer(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 15, 26, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "24px",
              maxHeight: "90vh",
            },
          }}
        >
          {currentLesson && (
            <>
              <DialogTitle
                sx={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6" color="white" fontWeight="bold">
                    {currentLesson.title}
                  </Typography>
                  {lessonProgress?.completed && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Concluído"
                      size="small"
                      sx={{
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#10B981",
                      }}
                    />
                  )}
                </Stack>
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                {/* Video */}
                {currentLesson.type === "video" && currentLesson.video_url && (
                  <VideoPlayer
                    url={currentLesson.video_url}
                    startTime={lessonProgress?.video_time || 0}
                    onTimeUpdate={async (currentTime) => {
                      try {
                        await learningAPI.updateLessonProgress(
                          currentLesson.id,
                          {
                            video_time: Math.floor(currentTime),
                          }
                        );
                      } catch (error) {
                        console.error(
                          "Erro ao salvar progresso do vídeo:",
                          error
                        );
                      }
                    }}
                  />
                )}

                {/* Text Content */}
                {currentLesson.type === "text" && (
                  <Box sx={{ p: 4 }}>
                    <Typography
                      color="rgba(255,255,255,0.8)"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {currentLesson.content}
                    </Typography>
                  </Box>
                )}

                {/* Quiz */}
                {currentLesson.type === "quiz" && currentLesson.quiz && (
                  <Box sx={{ p: 4 }}>
                    {quizResult ? (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <Typography
                          variant="h2"
                          fontWeight="bold"
                          color={quizResult.passed ? "#10B981" : "#EF4444"}
                          mb={2}
                        >
                          {Math.round(quizResult.score)}%
                        </Typography>
                        <Typography variant="h5" color="white" mb={2}>
                          {quizResult.passed
                            ? "Parabéns! Você passou!"
                            : "Você não atingiu a nota mínima"}
                        </Typography>
                        <Typography color="rgba(255,255,255,0.5)">
                          Você acertou {quizResult.earned_points} de{" "}
                          {quizResult.total_points} pontos
                        </Typography>
                        {!quizResult.passed && (
                          <Button
                            variant="contained"
                            onClick={() => {
                              setQuizResult(null);
                              setQuizAnswers({});
                            }}
                            sx={{ mt: 3, background: "#8B5CF6" }}
                          >
                            Tentar Novamente
                          </Button>
                        )}
                      </Box>
                    ) : (
                      <>
                        <Typography variant="h6" color="white" mb={3}>
                          {currentLesson.quiz.title}
                        </Typography>
                        <Alert
                          severity="info"
                          sx={{ mb: 3, background: "rgba(139, 92, 246, 0.1)" }}
                        >
                          Nota mínima para aprovação:{" "}
                          {currentLesson.quiz.passing_score}%
                        </Alert>

                        {currentLesson.quiz.questions?.map((question, qIdx) => (
                          <Card
                            key={question.id}
                            sx={{
                              mb: 3,
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "16px",
                            }}
                          >
                            <CardContent>
                              <Typography
                                color="white"
                                fontWeight="bold"
                                mb={2}
                              >
                                {qIdx + 1}. {question.text}
                              </Typography>

                              {question.type === "single" && (
                                <RadioGroup
                                  value={quizAnswers[question.id]?.[0] || ""}
                                  onChange={(e) =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: [e.target.value],
                                    }))
                                  }
                                >
                                  {question.options?.map((opt) => (
                                    <FormControlLabel
                                      key={opt.id}
                                      value={opt.id}
                                      control={
                                        <Radio
                                          sx={{
                                            color: "rgba(255,255,255,0.5)",
                                          }}
                                        />
                                      }
                                      label={opt.text}
                                      sx={{ color: "rgba(255,255,255,0.8)" }}
                                    />
                                  ))}
                                </RadioGroup>
                              )}

                              {question.type === "multiple" && (
                                <Stack>
                                  {question.options?.map((opt) => (
                                    <FormControlLabel
                                      key={opt.id}
                                      control={
                                        <Checkbox
                                          checked={
                                            quizAnswers[question.id]?.includes(
                                              opt.id
                                            ) || false
                                          }
                                          onChange={(e) => {
                                            const current =
                                              quizAnswers[question.id] || [];
                                            setQuizAnswers((prev) => ({
                                              ...prev,
                                              [question.id]: e.target.checked
                                                ? [...current, opt.id]
                                                : current.filter(
                                                    (id) => id !== opt.id
                                                  ),
                                            }));
                                          }}
                                          sx={{
                                            color: "rgba(255,255,255,0.5)",
                                          }}
                                        />
                                      }
                                      label={opt.text}
                                      sx={{ color: "rgba(255,255,255,0.8)" }}
                                    />
                                  ))}
                                </Stack>
                              )}

                              {question.type === "true_false" && (
                                <RadioGroup
                                  value={quizAnswers[question.id]?.[0] || ""}
                                  onChange={(e) =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: [e.target.value],
                                    }))
                                  }
                                >
                                  {question.options?.map((opt) => (
                                    <FormControlLabel
                                      key={opt.id}
                                      value={opt.id}
                                      control={
                                        <Radio
                                          sx={{
                                            color: "rgba(255,255,255,0.5)",
                                          }}
                                        />
                                      }
                                      label={opt.text}
                                      sx={{ color: "rgba(255,255,255,0.8)" }}
                                    />
                                  ))}
                                </RadioGroup>
                              )}
                            </CardContent>
                          </Card>
                        ))}

                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          onClick={handleSubmitQuiz}
                          disabled={quizSubmitting}
                          sx={{
                            py: 1.5,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                          }}
                        >
                          {quizSubmitting ? (
                            <CircularProgress size={24} />
                          ) : (
                            "Enviar Respostas"
                          )}
                        </Button>
                      </>
                    )}
                  </Box>
                )}

                {/* Description */}
                {currentLesson.description && (
                  <Box
                    sx={{ p: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="rgba(255,255,255,0.5)"
                      mb={1}
                    >
                      Descrição
                    </Typography>
                    <Typography color="rgba(255,255,255,0.8)">
                      {currentLesson.description}
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions
                sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Button
                  onClick={() => setShowPlayer(false)}
                  sx={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Fechar
                </Button>
                {!lessonProgress?.completed &&
                  currentLesson.type !== "quiz" && (
                    <Button
                      variant="contained"
                      startIcon={<CheckCircleIcon />}
                      onClick={handleCompleteLesson}
                      sx={{
                        background:
                          "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      }}
                    >
                      Marcar como Concluído
                    </Button>
                  )}
              </DialogActions>
            </>
          )}
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
