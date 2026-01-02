"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Button,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Box,
  Typography,
  Alert,
  Stack,
  Paper,
  Slide,
  Fade,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { authAPI } from "@/lib/api";
import React from "react";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function SurveyModal({ isOpen, onClose }: SurveyModalProps) {
  const [step, setStep] = useState<"info" | "survey" | "complete">("info");
  const [currentPage, setCurrentPage] = useState(0);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    cpf: "",
    password: "",
    company: "",
  });
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
    if (step === "info") {
      return userInfo.name && userInfo.email && userInfo.cpf && userInfo.password;
    }
    const currentQuestions = getCurrentQuestions();
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  };

  const handleNext = async () => {
    if (step === "info") {
      setStep("survey");
      return;
    }

    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authAPI.signup({
          name: userInfo.name,
          email: userInfo.email,
          cpf: userInfo.cpf,
          password: userInfo.password,
          company: userInfo.company || undefined,
          answers,
        });

        if (response.success) {
          setTempPassword(response.temp_password || null);
          setStep("complete");
        } else {
          setError(response.error || "Erro ao cadastrar");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === "survey" && currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    } else if (step === "survey" && currentPage === 0) {
      setStep("info");
    }
  };

  const progress = step === "info" ? 0 : ((currentPage + 1) / totalPages) * 100;

  const handleClose = () => {
    setStep("info");
    setCurrentPage(0);
    setAnswers({});
    setUserInfo({ name: "", email: "", cpf: "", password: "", company: "" });
    setError(null);
    setTempPassword(null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={SlideTransition}
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, #15152a 0%, #0c0c18 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)", pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            {step === "survey" && (
              <IconButton
                onClick={handleBack}
                size="small"
                sx={{
                  color: "rgba(255,255,255,0.5)",
                  "&:hover": {
                    color: "rgba(255,255,255,0.9)",
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Box>
              <Typography variant="h5" fontWeight="bold" color="white">
                {step === "info" && "Criar Conta"}
                {step === "survey" && "Avaliação de Bem-estar"}
                {step === "complete" && "Cadastro Concluído!"}
              </Typography>
              {step === "survey" && (
                <Typography variant="body2" color="rgba(255,255,255,0.5)" mt={0.5}>
                  Página {currentPage + 1} de {totalPages}
                </Typography>
              )}
            </Box>
          </Stack>
          <IconButton
            onClick={handleClose}
            sx={{
              color: "rgba(255,255,255,0.5)",
              "&:hover": {
                color: "rgba(255,255,255,0.9)",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {step !== "complete" && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mt: 2,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 3,
                background: "linear-gradient(90deg, #4a9fd9 0%, #e84b8a 100%)",
              },
            }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, maxHeight: "60vh", overflowY: "auto" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === "info" && (
          <Fade in>
            <Stack spacing={3}>
              <Typography color="rgba(255,255,255,0.6)">
                Preencha seus dados e responda ao questionário de avaliação para criar sua conta.
              </Typography>

              <TextField
                fullWidth
                label="Nome completo"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                sx={textFieldStyles}
              />

              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                sx={textFieldStyles}
              />

              <TextField
                fullWidth
                label="CPF"
                value={userInfo.cpf}
                onChange={(e) => setUserInfo({ ...userInfo, cpf: e.target.value })}
                placeholder="000.000.000-00"
                sx={textFieldStyles}
              />

              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={userInfo.password}
                onChange={(e) => setUserInfo({ ...userInfo, password: e.target.value })}
                sx={textFieldStyles}
              />

              <TextField
                fullWidth
                label="Empresa (opcional)"
                value={userInfo.company}
                onChange={(e) => setUserInfo({ ...userInfo, company: e.target.value })}
                sx={textFieldStyles}
              />
            </Stack>
          </Fade>
        )}

        {step === "survey" && (
          <Stack spacing={3}>
            {getCurrentQuestions().map((question) => (
              <Paper
                key={question.id}
                sx={{
                  p: 3,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              >
                <Typography color="white" fontWeight={500} mb={2}>
                  <Box component="span" color="#e84b8a" mr={1}>
                    {question.id}.
                  </Box>
                  {question.text}
                </Typography>

                <FormControl fullWidth>
                  <RadioGroup
                    row
                    value={answers[question.id]?.toString() || ""}
                    onChange={(e) => handleAnswer(question.id, parseInt(e.target.value))}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    {getLabels(question).map((label, idx) => (
                      <FormControlLabel
                        key={idx}
                        value={(idx + 1).toString()}
                        control={
                          <Radio
                            sx={{
                              color: "rgba(255,255,255,0.3)",
                              "&.Mui-checked": {
                                color: "#e84b8a",
                              },
                            }}
                          />
                        }
                        label={label}
                        sx={{
                          flex: "1 1 auto",
                          minWidth: "fit-content",
                          m: 0,
                          p: "8px 12px",
                          borderRadius: "8px",
                          backgroundColor:
                            answers[question.id] === idx + 1
                              ? "rgba(232, 75, 138, 0.15)"
                              : "transparent",
                          border: "1px solid",
                          borderColor:
                            answers[question.id] === idx + 1
                              ? "rgba(232, 75, 138, 0.3)"
                              : "transparent",
                          transition: "all 0.2s ease",
                          "& .MuiFormControlLabel-label": {
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "0.8rem",
                            textAlign: "center",
                            width: "100%",
                          },
                          "&:hover": {
                            backgroundColor: "rgba(255,255,255,0.05)",
                          },
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Paper>
            ))}
          </Stack>
        )}

        {step === "complete" && (
          <Fade in>
            <Box textAlign="center" py={4}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 3,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 48, color: "#fff" }} />
              </Box>

              <Typography variant="h4" fontWeight="bold" color="white" mb={2}>
                Obrigado, {userInfo.name}!
              </Typography>
              <Typography color="rgba(255,255,255,0.6)" maxWidth={480} mx="auto" mb={3}>
                Seu cadastro foi realizado com sucesso.
              </Typography>

              {tempPassword && (
                <Paper
                  sx={{
                    mt: 3,
                    p: 3,
                    background: "rgba(74, 159, 217, 0.15)",
                    border: "1px solid rgba(74, 159, 217, 0.3)",
                    borderRadius: "12px",
                  }}
                >
                  <Typography variant="body2" color="rgba(255,255,255,0.7)" mb={1}>
                    Sua senha temporária:
                  </Typography>
                  <Typography
                    variant="h5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    color="#4a9fd9"
                  >
                    {tempPassword}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.5)" mt={1}>
                    Guarde esta senha! Use-a para fazer login.
                  </Typography>
                </Paper>
              )}
            </Box>
          </Fade>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: "1px solid rgba(255,255,255,0.05)", p: 2.5 }}>
        {step !== "complete" ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            endIcon={!isLoading && <ArrowForwardIcon />}
            sx={{
              background: canProceed() && !isLoading
                ? "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)"
                : "rgba(255,255,255,0.1)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1.5,
              boxShadow: canProceed() && !isLoading
                ? "0 4px 20px rgba(232, 75, 138, 0.3)"
                : "none",
              "&:hover": {
                background: "linear-gradient(135deg, #ff6b9d 0%, #e84b8a 100%)",
                boxShadow: "0 6px 30px rgba(232, 75, 138, 0.5)",
              },
              "&:disabled": {
                color: "rgba(255,255,255,0.3)",
              },
            }}
          >
            {isLoading ? "Cadastrando..." : step === "info" ? "Continuar" : currentPage < totalPages - 1 ? "Próximo" : "Finalizar"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              background: "linear-gradient(135deg, #4a9fd9 0%, #5b7fd9 100%)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              py: 1.5,
              boxShadow: "0 4px 20px rgba(74, 159, 217, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5b7fd9 0%, #4a9fd9 100%)",
                boxShadow: "0 6px 30px rgba(74, 159, 217, 0.5)",
              },
            }}
          >
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.05)",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.1)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255,255,255,0.2)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#e84b8a",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.5)",
    "&.Mui-focused": {
      color: "#e84b8a",
    },
  },
};
