"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Divider,
  Alert,
  Stack,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { authAPI } from "@/lib/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSignupClick,
}: LoginModalProps) {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.login({
        cpf,
        password,
        remember_me: rememberMe,
      });

      if (response.success) {
        window.location.href = "/dashboard";
      } else {
        setError(response.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCpf("");
    setPassword("");
    setShowPassword(false);
    setRememberMe(false);
    setError(null);
    onClose();
  };

  const switchToSignup = () => {
    handleClose();
    onSignupClick();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, #15152a 0%, #0c0c18 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight="bold" color="white">
              Bem-vindo de volta!
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.5)" mt={0.5}>
              Entre na sua conta FrappYOU!
            </Typography>
          </Box>
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
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            fullWidth
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
            sx={{
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
                  borderColor: "#4a9fd9",
                },
              },
              "& .MuiInputLabel-root": {
                color: "rgba(255,255,255,0.5)",
                "&.Mui-focused": {
                  color: "#4a9fd9",
                },
              },
            }}
          />

          <TextField
            fullWidth
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
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
                  borderColor: "#4a9fd9",
                },
              },
              "& .MuiInputLabel-root": {
                color: "rgba(255,255,255,0.5)",
                "&.Mui-focused": {
                  color: "#4a9fd9",
                },
              },
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{
                    color: "rgba(255,255,255,0.3)",
                    "&.Mui-checked": {
                      color: "#4a9fd9",
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" color="rgba(255,255,255,0.6)">
                  Lembrar-me
                </Typography>
              }
            />

            <Button
              size="small"
              sx={{
                textTransform: "none",
                color: "#4a9fd9",
                "&:hover": {
                  backgroundColor: "rgba(74, 159, 217, 0.1)",
                },
              }}
            >
              Esqueceu a senha?
            </Button>
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            disabled={!cpf || !password || isLoading}
            startIcon={<LoginIcon />}
            sx={{
              background:
                cpf && password
                  ? "linear-gradient(135deg, #4a9fd9 0%, #5b7fd9 100%)"
                  : "rgba(255,255,255,0.1)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              py: 1.5,
              fontSize: "1rem",
              boxShadow:
                cpf && password
                  ? "0 4px 20px rgba(74, 159, 217, 0.3)"
                  : "none",
              "&:hover": {
                background: "linear-gradient(135deg, #5b7fd9 0%, #4a9fd9 100%)",
                boxShadow: "0 6px 30px rgba(74, 159, 217, 0.5)",
              },
              "&:disabled": {
                color: "rgba(255,255,255,0.3)",
              },
            }}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <Typography variant="body2" color="rgba(255,255,255,0.4)">
              ou continue com
            </Typography>
          </Divider>

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              sx={{
                borderColor: "rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                },
              }}
            >
              <Box component="span" sx={{ mr: 1, display: "flex" }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </Box>
              Google
            </Button>

            <Button
              fullWidth
              variant="outlined"
              sx={{
                borderColor: "rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                },
              }}
            >
              <Box component="span" sx={{ mr: 1, display: "flex" }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
              </Box>
              Apple
            </Button>
          </Stack>

          <Typography variant="body2" textAlign="center" color="rgba(255,255,255,0.5)">
            Não tem uma conta?{" "}
            <Button
              onClick={switchToSignup}
              sx={{
                textTransform: "none",
                color: "#e84b8a",
                fontWeight: 600,
                p: 0,
                minWidth: "auto",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "#ff6b9d",
                },
              }}
            >
              Cadastre-se
            </Button>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
