"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HomeIcon from "@mui/icons-material/Home";
import { authAPI } from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e84b8a" },
    secondary: { main: "#3B82F6" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    borderRadius: "16px",
    backgroundColor: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(10px)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.5)",
    "&.Mui-focused": { color: "#3B82F6" },
  },
};

export default function CadastroPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  const [formData, setFormData] = useState({
    cpf: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado de validação do CPF
  const [cpfValidation, setCpfValidation] = useState<{
    checking: boolean;
    valid: boolean | null;
    alreadyRegistered: boolean;
    name: string | null;
    message: string | null;
  }>({
    checking: false,
    valid: null,
    alreadyRegistered: false,
    name: null,
    message: null,
  });

  // Debounce para validar CPF
  const validateCPF = useCallback(async (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setCpfValidation({
        checking: false,
        valid: null,
        alreadyRegistered: false,
        name: null,
        message: null,
      });
      return;
    }

    setCpfValidation((prev) => ({ ...prev, checking: true }));

    try {
      const result = await authAPI.validateCPF(cleanCpf);
      setCpfValidation({
        checking: false,
        valid: result.valid,
        alreadyRegistered: result.already_registered || false,
        name: result.name || null,
        message: result.valid
          ? result.already_registered
            ? "Este CPF já possui uma conta. Faça login."
            : `Colaborador encontrado: ${result.name}`
          : "CPF não encontrado na lista de colaboradores",
      });
    } catch {
      setCpfValidation({
        checking: false,
        valid: false,
        alreadyRegistered: false,
        name: null,
        message: "Erro ao validar CPF",
      });
    }
  }, []);

  // Validar CPF quando digitado (com debounce)
  useEffect(() => {
    const cleanCpf = formData.cpf.replace(/\D/g, "");
    if (cleanCpf.length === 11) {
      const timer = setTimeout(() => {
        validateCPF(formData.cpf);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCpfValidation({
        checking: false,
        valid: null,
        alreadyRegistered: false,
        name: null,
        message: null,
      });
    }
  }, [formData.cpf, validateCPF]);

  // Montar componente e verificar autenticação
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/hub");
    }
  }, [router]);

  // Evitar hydration mismatch - renderizar apenas no cliente
  if (!mounted) {
    return null;
  }

  const canSubmit = () => {
    return (
      formData.cpf.replace(/\D/g, "").length === 11 &&
      cpfValidation.valid === true &&
      !cpfValidation.alreadyRegistered &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.activate({
        cpf: formData.cpf,
        password: formData.password,
      });
      if (response.success) {
        setStep("success");
      } else {
        setError(response.error || "Erro ao ativar conta");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        {/* Animated Background Elements */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            left: "20%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "pulse 8s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -200,
            right: "20%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "pulse 10s ease-in-out infinite reverse",
          }}
        />

        {/* Home Button */}
        <Box sx={{ position: "absolute", top: 24, left: 24, zIndex: 10 }}>
          <Link href="/">
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            width: "100%",
            maxWidth: 450,
            zIndex: 10,
          }}
        >
          <Card
            sx={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "32px",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 5 }}>
              {step === "form" ? (
                <>
                  {/* Header */}
                  <Box mb={4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <Link href="/login">
                        <IconButton sx={{ color: "rgba(255,255,255,0.5)" }}>
                          <ArrowBackIcon />
                        </IconButton>
                      </Link>
                      <Box>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="white"
                        >
                          Ativar Conta
                        </Typography>
                        <Typography
                          variant="body2"
                          color="rgba(255,255,255,0.5)"
                          mt={0.5}
                        >
                          Digite seu CPF e crie sua senha
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <Stack spacing={3}>
                    <Box>
                      <Typography
                        variant="body2"
                        color="rgba(255,255,255,0.6)"
                        mb={2}
                      >
                        Seu CPF deve estar pré-cadastrado pelo RH para ativar
                        sua conta.
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      label="CPF"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, cpf: e.target.value })
                      }
                      error={
                        (formData.cpf !== "" &&
                          formData.cpf.replace(/\D/g, "").length !== 11) ||
                        cpfValidation.valid === false ||
                        cpfValidation.alreadyRegistered
                      }
                      helperText={
                        formData.cpf !== "" &&
                        formData.cpf.replace(/\D/g, "").length !== 11
                          ? "CPF deve ter 11 dígitos"
                          : cpfValidation.message || ""
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {cpfValidation.checking ? (
                              <CircularProgress size={20} />
                            ) : cpfValidation.valid === true &&
                              !cpfValidation.alreadyRegistered ? (
                              <CheckCircleIcon sx={{ color: "#10B981" }} />
                            ) : cpfValidation.valid === false ||
                              cpfValidation.alreadyRegistered ? (
                              <ErrorIcon sx={{ color: "#EF4444" }} />
                            ) : null}
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        ...textFieldStyles,
                        "& .MuiFormHelperText-root": {
                          color:
                            cpfValidation.valid === true &&
                            !cpfValidation.alreadyRegistered
                              ? "#10B981"
                              : cpfValidation.valid === false ||
                                cpfValidation.alreadyRegistered
                              ? "#EF4444"
                              : "rgba(255,255,255,0.5)",
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Senha"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      error={
                        formData.password !== "" && formData.password.length < 6
                      }
                      helperText={
                        formData.password !== "" && formData.password.length < 6
                          ? "Mínimo 6 caracteres"
                          : ""
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              sx={{ color: "rgba(255,255,255,0.5)" }}
                            >
                              {showPassword ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />

                    <TextField
                      fullWidth
                      label="Confirmar Senha"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      error={
                        formData.confirmPassword !== "" &&
                        formData.password !== formData.confirmPassword
                      }
                      helperText={
                        formData.confirmPassword !== "" &&
                        formData.password !== formData.confirmPassword
                          ? "As senhas não coincidem"
                          : ""
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              sx={{ color: "rgba(255,255,255,0.5)" }}
                            >
                              {showConfirmPassword ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyles}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={!canSubmit() || loading}
                      sx={{
                        background:
                          "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
                        borderRadius: "16px",
                        py: 1.5,
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "1rem",
                        boxShadow: "0 8px 32px rgba(232, 75, 138, 0.3)",
                        "&:hover": {
                          boxShadow: "0 12px 48px rgba(232, 75, 138, 0.5)",
                        },
                        "&:disabled": { background: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      {loading ? "Ativando..." : "Ativar Conta"}
                    </Button>

                    <Typography
                      variant="body2"
                      textAlign="center"
                      color="rgba(255,255,255,0.5)"
                    >
                      Já tem uma conta?{" "}
                      <Link href="/login" style={{ textDecoration: "none" }}>
                        <Button
                          sx={{
                            textTransform: "none",
                            color: "#3B82F6",
                            fontWeight: 600,
                            p: 0,
                            minWidth: "auto",
                          }}
                        >
                          Fazer Login
                        </Button>
                      </Link>
                    </Typography>
                  </Stack>
                </>
              ) : (
                /* Success Step */
                <Box textAlign="center" py={4}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                  >
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        mx: "auto",
                        mb: 3,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 16px 48px rgba(16, 185, 129, 0.4)",
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 56, color: "#fff" }} />
                    </Box>
                  </motion.div>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="white"
                    mb={2}
                  >
                    Conta Ativada!
                  </Typography>
                  <Typography color="rgba(255,255,255,0.6)" mb={4}>
                    Sua conta foi ativada com sucesso. Agora você pode fazer
                    login.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push("/login")}
                    sx={{
                      background:
                        "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                      borderRadius: "16px",
                      px: 4,
                      py: 1.5,
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    Fazer Login
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* CSS Animation */}
        <style jsx global>{`
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}</style>
      </Box>
    </ThemeProvider>
  );
}
