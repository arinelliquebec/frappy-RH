"use client";

import { useState, useEffect } from "react";
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
  Checkbox,
  FormControlLabel,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loginData, setLoginData] = useState({
    cpf: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Montar componente e verificar autenticação
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/hub");
    }
  }, [router]);

  // Evitar hydration mismatch
  if (!mounted) {
    return null;
  }

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await authAPI.login({
        cpf: loginData.cpf,
        password: loginData.password,
        remember_me: loginData.rememberMe,
      });
      if (response.success) {
        router.push("/hub");
      } else {
        setLoginError(response.error || "Erro ao fazer login");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoginLoading(false);
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
        {/* Background Effects */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            left: -200,
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
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "pulse 10s ease-in-out infinite reverse",
          }}
        />

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: 450, zIndex: 10 }}
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
              <Box mb={4}>
                <Link href="/hub">
                  <IconButton
                    sx={{ color: "rgba(255,255,255,0.5)", mb: 2 }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Link>
                <Typography variant="h4" fontWeight="bold" color="white">
                  Bem-vindo de volta!
                </Typography>
                <Typography
                  variant="body1"
                  color="rgba(255,255,255,0.5)"
                  mt={1}
                >
                  Entre na sua conta FrappYOU!
                </Typography>
              </Box>

              {loginError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {loginError}
                </Alert>
              )}

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={loginData.cpf}
                  onChange={(e) =>
                    setLoginData({ ...loginData, cpf: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  sx={textFieldStyles}
                />

                <TextField
                  fullWidth
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      password: e.target.value,
                    })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={loginData.rememberMe}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            rememberMe: e.target.checked,
                          })
                        }
                        sx={{
                          color: "rgba(255,255,255,0.3)",
                          "&.Mui-checked": { color: "#3B82F6" },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        color="rgba(255,255,255,0.6)"
                      >
                        Lembrar-me
                      </Typography>
                    }
                  />
                  <Button
                    size="small"
                    sx={{ textTransform: "none", color: "#3B82F6" }}
                  >
                    Esqueceu a senha?
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleLogin}
                  disabled={
                    !loginData.cpf ||
                    !loginData.password ||
                    loginLoading
                  }
                  sx={{
                    background:
                      "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                    borderRadius: "16px",
                    py: 1.5,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                    boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3)",
                    "&:hover": {
                      boxShadow: "0 12px 48px rgba(59, 130, 246, 0.5)",
                    },
                    "&:disabled": { background: "rgba(255,255,255,0.1)" },
                  }}
                >
                  {loginLoading ? "Entrando..." : "Entrar"}
                </Button>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <Typography
                    variant="body2"
                    color="rgba(255,255,255,0.4)"
                  >
                    ou
                  </Typography>
                </Divider>

                <Typography
                  variant="body2"
                  textAlign="center"
                  color="rgba(255,255,255,0.5)"
                >
                  Ainda não tem acesso?{" "}
                  <Link href="/cadastro" style={{ textDecoration: "none" }}>
                    <Button
                      sx={{
                        textTransform: "none",
                        color: "#e84b8a",
                        fontWeight: 600,
                        p: 0,
                        minWidth: "auto",
                      }}
                    >
                      Cadastre-se aqui
                    </Button>
                  </Link>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        {/* Animation styles */}
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
