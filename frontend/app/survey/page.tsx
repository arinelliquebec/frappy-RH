"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Paper,
  Stack,
  Alert,
  IconButton,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Link from "next/link";
import { surveyAPI } from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3B82F6" },
    secondary: { main: "#e84b8a" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

type ScaleType = "frequency" | "agreement";
type ScaleDirection = "normal" | "inverted";

interface Question {
  id: number;
  text: string;
  scaleType: ScaleType;
  scaleDirection: ScaleDirection;
}

const surveyQuestions: Question[] = [
  { id: 1, text: "Sei claramente o que é esperado de mim no trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 2, text: "Posso decidir quando fazer uma pausa", scaleType: "frequency", scaleDirection: "normal" },
  { id: 3, text: "Grupos de trabalho diferentes pedem-me coisas difíceis de conjugar", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 4, text: "Sei do que necessito para fazer o meu trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 5, text: "Sou sujeito a assédio pessoal sob a forma de palavras ou comportamentos incorretos", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 6, text: "Tenho prazos impossíveis de cumprir", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 7, text: "Se o trabalho se torna difícil, os colegas ajudam-me", scaleType: "frequency", scaleDirection: "normal" },
  { id: 8, text: "Recebo feedback de apoio sobre o trabalho que faço", scaleType: "frequency", scaleDirection: "normal" },
  { id: 9, text: "Tenho que trabalhar muito intensivamente", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 10, text: "Tenho capacidade de decisão sobre a minha rapidez de trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 11, text: "Sei claramente os meus deveres e responsabilidades", scaleType: "frequency", scaleDirection: "normal" },
  { id: 12, text: "Tenho que negligenciar tarefas porque tenho demasiado que fazer", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 13, text: "Sei claramente as metas e objetivos do meu departamento", scaleType: "frequency", scaleDirection: "normal" },
  { id: 14, text: "Há fricção ou animosidade entre os colegas", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 15, text: "Posso decidir como fazer o meu trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 16, text: "Não consigo fazer pausas suficientes", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 17, text: "Compreendo como o meu trabalho se integra no objetivo geral da organização", scaleType: "frequency", scaleDirection: "normal" },
  { id: 18, text: "Sou pressionado a trabalhar durante horários longos", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 19, text: "Tenho poder de escolha para decidir o que faço no trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 20, text: "Tenho que trabalhar muito depressa", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 21, text: "Sou sujeito a intimidação/perseguição no trabalho", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 22, text: "Tenho pressões de tempo irrealistas", scaleType: "frequency", scaleDirection: "inverted" },
  { id: 23, text: "Posso estar seguro de que o meu chefe imediato me ajuda num problema de trabalho", scaleType: "frequency", scaleDirection: "normal" },
  { id: 24, text: "Tenho ajuda e apoio necessários dos colegas", scaleType: "agreement", scaleDirection: "normal" },
  { id: 25, text: "Tenho algum poder de decisão sobre a minha forma de trabalho", scaleType: "agreement", scaleDirection: "normal" },
  { id: 26, text: "Tenho oportunidades suficientes para questionar os chefes sobre mudanças no trabalho", scaleType: "agreement", scaleDirection: "normal" },
  { id: 27, text: "Sou respeitado como mereço pelos colegas de trabalho", scaleType: "agreement", scaleDirection: "normal" },
  { id: 28, text: "O pessoal é sempre consultado sobre mudança no trabalho", scaleType: "agreement", scaleDirection: "normal" },
  { id: 29, text: "Posso falar com o meu chefe imediato sobre algo no trabalho que me transtornou ou irritou", scaleType: "agreement", scaleDirection: "normal" },
  { id: 30, text: "O meu horário pode ser flexível", scaleType: "agreement", scaleDirection: "normal" },
  { id: 31, text: "Os meus colegas estão dispostos a ouvir os meus problemas relacionados com o trabalho", scaleType: "agreement", scaleDirection: "normal" },
  { id: 32, text: "Quando são efetuadas mudanças no trabalho, sei claramente como resultarão na prática", scaleType: "agreement", scaleDirection: "normal" },
  { id: 33, text: "Recebo apoio durante trabalho que pode ser emocionalmente exigente", scaleType: "agreement", scaleDirection: "normal" },
  { id: 34, text: "Os relacionamentos no trabalho estão sob pressão", scaleType: "agreement", scaleDirection: "inverted" },
  { id: 35, text: "O meu chefe imediato encoraja-me no trabalho", scaleType: "agreement", scaleDirection: "normal" },
];

const frequencyLabels = {
  normal: ["Nunca", "Raramente", "Por vezes", "Frequentemente", "Sempre"],
  inverted: ["Sempre", "Frequentemente", "Por vezes", "Raramente", "Nunca"],
};

const agreementLabels = {
  normal: ["Discordo fortemente", "Discordo", "Neutro", "Concordo", "Concordo fortemente"],
  inverted: ["Concordo fortemente", "Concordo", "Neutro", "Discordo", "Discordo fortemente"],
};

const QUESTIONS_PER_PAGE = 5;
const totalPages = Math.ceil(surveyQuestions.length / QUESTIONS_PER_PAGE);

// Chave para salvar no localStorage
const SURVEY_STORAGE_KEY = "survey_progress";

interface SurveyProgress {
  answers: Record<number, number>;
  currentPage: number;
  lastUpdated: string;
}

export default function SurveyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  // Carregar progresso salvo ao iniciar
  useEffect(() => {
    setMounted(true);
    // Verificar se está autenticado
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Verificar se já completou o survey
    surveyAPI.getStatus().then((res) => {
      if (res.completed) {
        // Limpar progresso salvo se já completou
        localStorage.removeItem(SURVEY_STORAGE_KEY);
        router.push("/carreiras");
      } else {
        // Restaurar progresso salvo
        const savedProgress = localStorage.getItem(SURVEY_STORAGE_KEY);
        if (savedProgress) {
          try {
            const progress: SurveyProgress = JSON.parse(savedProgress);
            setAnswers(progress.answers);
            setCurrentPage(progress.currentPage);
            setRestored(true);
          } catch {
            // Se der erro ao parsear, ignorar
            localStorage.removeItem(SURVEY_STORAGE_KEY);
          }
        }
      }
    }).catch(() => {
      // Se der erro, tentar restaurar progresso mesmo assim
      const savedProgress = localStorage.getItem(SURVEY_STORAGE_KEY);
      if (savedProgress) {
        try {
          const progress: SurveyProgress = JSON.parse(savedProgress);
          setAnswers(progress.answers);
          setCurrentPage(progress.currentPage);
          setRestored(true);
        } catch {
          localStorage.removeItem(SURVEY_STORAGE_KEY);
        }
      }
    });
  }, [router]);

  // Salvar progresso automaticamente quando respostas ou página mudam
  useEffect(() => {
    if (mounted && Object.keys(answers).length > 0) {
      const progress: SurveyProgress = {
        answers,
        currentPage,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(progress));
    }
  }, [answers, currentPage, mounted]);

  const getLabels = (question: Question) => {
    if (question.scaleType === "frequency") {
      return frequencyLabels[question.scaleDirection];
    }
    return agreementLabels[question.scaleDirection];
  };

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const getCurrentQuestions = () => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    return surveyQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  };

  const canProceed = () => {
    const currentQuestions = getCurrentQuestions();
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  };

  const handleNext = async () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      // Enviar respostas
      setIsLoading(true);
      setError(null);

      try {
        const response = await surveyAPI.submit(answers);
        if (response.success) {
          // Limpar progresso salvo após enviar com sucesso
          localStorage.removeItem(SURVEY_STORAGE_KEY);
          setScore(response.score || null);
          setIsComplete(true);
        } else {
          setError(response.error || "Erro ao enviar respostas");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar respostas");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const progress = ((currentPage + 1) / totalPages) * 100;
  const answeredCount = Object.keys(answers).length;

  if (!mounted) return null;

  // Tela de conclusão
  if (isComplete) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              sx={{
                p: 6,
                maxWidth: 500,
                textAlign: "center",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <CheckCircleIcon
                  sx={{ fontSize: 80, color: "#10B981", mb: 3 }}
                />
              </motion.div>

              <Typography
                variant="h4"
                fontWeight="bold"
                color="white"
                gutterBottom
              >
                Questionário Concluído!
              </Typography>

              <Typography variant="body1" color="rgba(255,255,255,0.7)" mb={3}>
                Suas respostas foram salvas com sucesso. Agora você pode acessar
                sua análise de carreira.
              </Typography>

              {score !== null && (
                <Box
                  sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: "16px",
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <Typography variant="body2" color="rgba(255,255,255,0.5)">
                    Sua pontuação geral
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    sx={{
                      background: "linear-gradient(90deg, #3B82F6, #10B981)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {score.toFixed(0)}%
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={() => router.push("/carreiras")}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "1rem",
                }}
              >
                Ir para Minha Carreira
              </Button>
            </Paper>
          </motion.div>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Elements */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            left: "10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -200,
            right: "10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Home Button */}
        <Box sx={{ position: "absolute", top: 24, left: 24, zIndex: 10 }}>
          <Link href="/hub">
            <IconButton
              sx={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                "&:hover": {
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                },
              }}
            >
              <HomeIcon />
            </IconButton>
          </Link>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
            px: 2,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: "100%", maxWidth: 800 }}
          >
            {/* Header */}
            <Box textAlign="center" mb={4}>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  background: "linear-gradient(90deg, #3B82F6, #A855F7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 1,
                }}
              >
                Questionário de Carreira
              </Typography>
              <Typography variant="body1" color="rgba(255,255,255,0.6)">
                Responda com sinceridade para uma análise mais precisa
              </Typography>
            </Box>

            {/* Progress */}
            <Paper
              sx={{
                p: 3,
                mb: 3,
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Página {currentPage + 1} de {totalPages}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  {answeredCount} de 35 respondidas
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    background: "linear-gradient(90deg, #3B82F6, #A855F7)",
                  },
                }}
              />
            </Paper>

            {/* Questions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Paper
                  sx={{
                    p: 4,
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "24px",
                    mb: 3,
                  }}
                >
                  <Stack spacing={4}>
                    {getCurrentQuestions().map((question, qIndex) => {
                      const labels = getLabels(question);
                      return (
                        <Box key={question.id}>
                          <Typography
                            variant="body1"
                            fontWeight={600}
                            color="white"
                            mb={2}
                          >
                            <span style={{ color: "#3B82F6" }}>
                              {question.id}.
                            </span>{" "}
                            {question.text}
                          </Typography>

                          <FormControl component="fieldset" fullWidth>
                            <RadioGroup
                              row
                              value={answers[question.id] ?? ""}
                              onChange={(e) =>
                                handleAnswer(question.id, parseInt(e.target.value))
                              }
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                flexWrap: { xs: "wrap", md: "nowrap" },
                                gap: 1,
                              }}
                            >
                              {labels.map((label, index) => (
                                <FormControlLabel
                                  key={index}
                                  value={index + 1}
                                  control={
                                    <Radio
                                      sx={{
                                        color: "rgba(255,255,255,0.3)",
                                        "&.Mui-checked": {
                                          color: "#3B82F6",
                                        },
                                      }}
                                    />
                                  }
                                  label={
                                    <Typography
                                      variant="caption"
                                      color="rgba(255,255,255,0.7)"
                                      sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}
                                    >
                                      {label}
                                    </Typography>
                                  }
                                  sx={{
                                    flex: 1,
                                    m: 0,
                                    p: 1,
                                    borderRadius: "12px",
                                    background:
                                      answers[question.id] === index + 1
                                        ? "rgba(59, 130, 246, 0.15)"
                                        : "rgba(255,255,255,0.02)",
                                    border: "1px solid",
                                    borderColor:
                                      answers[question.id] === index + 1
                                        ? "rgba(59, 130, 246, 0.5)"
                                        : "rgba(255,255,255,0.05)",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                      background: "rgba(255,255,255,0.05)",
                                    },
                                  }}
                                />
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </motion.div>
            </AnimatePresence>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            {/* Navigation Buttons */}
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={currentPage === 0}
                startIcon={<ArrowBackIcon />}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: "12px",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.7)",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.05)",
                  },
                  "&:disabled": {
                    opacity: 0.3,
                  },
                }}
              >
                Anterior
              </Button>

              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                endIcon={
                  isLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : currentPage === totalPages - 1 ? (
                    <CheckCircleIcon />
                  ) : (
                    <ArrowForwardIcon />
                  )
                }
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: "12px",
                  background:
                    currentPage === totalPages - 1
                      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  fontWeight: 600,
                  "&:disabled": {
                    opacity: 0.5,
                  },
                }}
              >
                {currentPage === totalPages - 1 ? "Finalizar" : "Próxima"}
              </Button>
            </Stack>

            {/* Indicador de salvamento automático */}
            {answeredCount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  mt: 2,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <SaveIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  Progresso salvo automaticamente
                </Typography>
              </Box>
            )}
          </motion.div>
        </Box>

        {/* Snackbar de progresso restaurado */}
        <Snackbar
          open={restored}
          autoHideDuration={4000}
          onClose={() => setRestored(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setRestored(false)}
            severity="info"
            variant="filled"
            sx={{
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.9)",
            }}
          >
            Progresso restaurado! Continue de onde parou.
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

