"use client";

import { useState, useEffect } from "react";
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
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PsychologyIcon from "@mui/icons-material/Psychology";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CampaignIcon from "@mui/icons-material/Campaign";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Link from "next/link";
import { authAPI, userAPI, surveyAPI, User } from "@/lib/api";
import NotificationBell from "../components/NotificationBell";

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

const appCards = [
  {
    id: "career",
    title: "Minha Carreira",
    description: "Planeje seu futuro profissional",
    icon: WorkIcon,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    glow: "rgba(59, 130, 246, 0.4)",
  },
  {
    id: "learning",
    title: "Aprendizado",
    description: "Desenvolva novas habilidades",
    icon: SchoolIcon,
    gradient: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
    glow: "rgba(168, 85, 247, 0.4)",
  },
  {
    id: "growth",
    title: "Férias & Ausências",
    description: "Gerencie suas folgas",
    icon: BeachAccessIcon,
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    glow: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "mindset",
    title: "Mindset",
    description: "Fortaleça sua mentalidade",
    icon: PsychologyIcon,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "comunicados",
    title: "Comunicados",
    description: "Novidades da empresa",
    icon: CampaignIcon,
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
    glow: "rgba(236, 72, 153, 0.4)",
  },
  {
    id: "holerite",
    title: "Holerite",
    description: "Consulte seus contracheques",
    icon: ReceiptLongIcon,
    gradient: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
    glow: "rgba(20, 184, 166, 0.4)",
  },
  {
    id: "pdi",
    title: "Meu PDI",
    description: "Plano de Desenvolvimento Individual",
    icon: TrackChangesIcon,
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
    glow: "rgba(139, 92, 246, 0.4)",
  },
  {
    id: "portal",
    title: "Meu Portal",
    description: "Timeline, badges e conquistas",
    icon: AccountCircleIcon,
    gradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
    glow: "rgba(236, 72, 153, 0.4)",
  },
  {
    id: "chat",
    title: "Frappy IA",
    description: "Assistente inteligente de RH",
    icon: SmartToyIcon,
    gradient: "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
    glow: "rgba(99, 102, 241, 0.4)",
  },
];

export default function HubPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const menuOpen = Boolean(anchorEl);

  // Verificar se já está autenticado ao carregar
  useEffect(() => {
    const checkAuth = () => {
      setMounted(true);
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (token) {
        setIsAuthenticated(true);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Buscar dados atualizados do usuário (para garantir role atualizado)
        userAPI
          .getProfile()
          .then((response) => {
            if (response.success && response.user) {
              setUser(response.user);
              localStorage.setItem("user", JSON.stringify(response.user));
            }
          })
          .catch(() => {
            // Se falhar, usa os dados do localStorage
          });
      } else {
        // Redirecionar para login se não estiver autenticado
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Evitar hydration mismatch e não renderizar até verificar autenticação
  if (!mounted || !isAuthenticated) {
    return null;
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
    handleMenuClose();
    router.push("/");
  };

  // Gerar iniciais do nome para o avatar
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handler para clicar no card de carreira
  const handleCareerClick = async () => {
    try {
      const status = await surveyAPI.getStatus();
      if (status.completed) {
        router.push("/carreiras");
      } else {
        router.push("/survey");
      }
    } catch {
      // Se der erro, redireciona para o survey
      router.push("/survey");
    }
  };

  // Handler para cards
  const handleCardClick = (cardId: string) => {
    if (cardId === "career") {
      handleCareerClick();
    } else if (cardId === "learning") {
      router.push("/aprendizado");
    } else if (cardId === "growth") {
      router.push("/ferias");
    } else if (cardId === "admin") {
      router.push("/adminhub");
    } else if (cardId === "mindset") {
      router.push("/mindset");
    } else if (cardId === "comunicados") {
      router.push("/comunicados");
    } else if (cardId === "holerite") {
      router.push("/holerite");
    } else if (cardId === "pdi") {
      router.push("/pdi");
    } else if (cardId === "portal") {
      router.push("/portal");
    } else if (cardId === "chat") {
      router.push("/chat");
    }
  };

  // Card Admin (só para administradores)
  const adminCard = {
    id: "admin",
    title: "Admin Hub",
    description: "Gerencie colaboradores e sistema",
    icon: AdminPanelSettingsIcon,
    gradient: "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
    glow: "rgba(232, 75, 138, 0.4)",
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

        {/* Grid Pattern Overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            pointerEvents: "none",
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

        {/* User Avatar & Notifications - Top Right */}
        {isAuthenticated && user && (
          <Box sx={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <NotificationBell />
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  onClick={handleMenuClick}
                  sx={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "50px",
                    py: 0.8,
                    px: 2,
                    pr: 1,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "rgba(255,255,255,0.1)",
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="white"
                    sx={{
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.name}
                  </Typography>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background:
                        "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(user.name)}
                  </Avatar>
                </Stack>
              </Stack>
            </motion.div>

            {/* Dropdown Menu */}
            <Menu
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  background: "rgba(20, 20, 30, 0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  minWidth: 200,
                  "& .MuiMenuItem-root": {
                    color: "rgba(255,255,255,0.8)",
                    py: 1.5,
                    px: 2,
                    "&:hover": {
                      background: "rgba(255,255,255,0.05)",
                    },
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Logado como
                </Typography>
                <Typography variant="body1" fontWeight={600} color="white">
                  {user.name}
                </Typography>
                {user.email && (
                  <Typography variant="caption" color="rgba(255,255,255,0.4)">
                    {user.email}
                  </Typography>
                )}
              </Box>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  router.push("/perfil");
                }}
              >
                <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Meu Perfil
              </MenuItem>
              {user.role === "admin" && (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    router.push("/adminhub");
                  }}
                >
                  <AdminPanelSettingsIcon
                    sx={{ mr: 1.5, fontSize: 20, color: "#e84b8a" }}
                  />
                  Admin Hub
                </MenuItem>
              )}
              <MenuItem
                onClick={handleLogout}
                sx={{ color: "#e84b8a !important" }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        )}

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
            key="hub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ width: "100%", maxWidth: 900 }}
          >
            {/* Header */}
            <Box textAlign="center" mb={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Typography
                  variant="h2"
                  fontWeight="bold"
                  sx={{
                    fontFamily: "var(--font-orbitron), sans-serif",
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Hub de Aplicativos
                </Typography>
                <Typography variant="h6" color="rgba(255,255,255,0.5)">
                  Escolha uma ferramenta para começar sua jornada
                </Typography>
              </motion.div>
            </Box>

            {/* App Cards Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 3,
              }}
            >
              {/* Cards regulares */}
              {appCards.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    onClick={() => handleCardClick(app.id)}
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "24px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                      position: "relative",
                      "&:hover": {
                        borderColor: "rgba(255,255,255,0.15)",
                        boxShadow: `0 20px 60px ${app.glow}`,
                        "& .card-glow": {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {/* Glow Effect */}
                    <Box
                      className="card-glow"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background: `radial-gradient(circle at center, ${app.glow} 0%, transparent 70%)`,
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                        pointerEvents: "none",
                      }}
                    />

                    <CardContent sx={{ p: 4, position: "relative" }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Box
                          sx={{
                            p: 2.5,
                            borderRadius: "16px",
                            background: app.gradient,
                            boxShadow: `0 8px 32px ${app.glow}`,
                          }}
                        >
                          <app.icon sx={{ fontSize: 40, color: "#fff" }} />
                        </Box>
                        <Box>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color="white"
                          >
                            {app.title}
                          </Typography>
                          <Typography
                            variant="body1"
                            color="rgba(255,255,255,0.5)"
                            mt={0.5}
                          >
                            {app.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Card Admin - Apenas para administradores */}
              {user?.role === "admin" && (
                <motion.div
                  key={adminCard.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + appCards.length * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    gridColumn: appCards.length % 2 === 0 ? "span 2" : "auto",
                  }}
                >
                  <Card
                    onClick={() => handleCardClick(adminCard.id)}
                    sx={{
                      background: "rgba(232, 75, 138, 0.05)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(232, 75, 138, 0.2)",
                      borderRadius: "24px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                      position: "relative",
                      "&:hover": {
                        borderColor: "rgba(232, 75, 138, 0.4)",
                        boxShadow: `0 20px 60px ${adminCard.glow}`,
                        "& .card-glow": {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {/* Glow Effect */}
                    <Box
                      className="card-glow"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background: `radial-gradient(circle at center, ${adminCard.glow} 0%, transparent 70%)`,
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                        pointerEvents: "none",
                      }}
                    />

                    <CardContent sx={{ p: 4, position: "relative" }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Box
                          sx={{
                            p: 2.5,
                            borderRadius: "16px",
                            background: adminCard.gradient,
                            boxShadow: `0 8px 32px ${adminCard.glow}`,
                          }}
                        >
                          <adminCard.icon
                            sx={{ fontSize: 40, color: "#fff" }}
                          />
                        </Box>
                        <Box>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography
                              variant="h5"
                              fontWeight="bold"
                              color="white"
                            >
                              {adminCard.title}
                            </Typography>
                            <Box
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: "6px",
                                background: "rgba(232, 75, 138, 0.2)",
                                border: "1px solid rgba(232, 75, 138, 0.3)",
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{ color: "#e84b8a", fontSize: "0.65rem" }}
                              >
                                ADMIN
                              </Typography>
                            </Box>
                          </Stack>
                          <Typography
                            variant="body1"
                            color="rgba(255,255,255,0.5)"
                            mt={0.5}
                          >
                            {adminCard.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </Box>
          </motion.div>
        </Box>

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
