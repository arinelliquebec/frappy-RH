"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Chip,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import FolderIcon from "@mui/icons-material/Folder";
import SecurityIcon from "@mui/icons-material/Security";
import CampaignIcon from "@mui/icons-material/Campaign";
import SchoolIcon from "@mui/icons-material/School";
import { authAPI, userAPI, User, documentsAPI } from "@/lib/api";
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

const adminCards = [
  {
    id: "colaboradores",
    title: "Colaboradores",
    description: "Gerencie usuários e permissões",
    icon: BadgeIcon,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    glow: "rgba(59, 130, 246, 0.4)",
    href: "/adminhub/colaboradores",
  },
  {
    id: "documentos",
    title: "Análise de Documentos",
    description: "Revise documentação dos colaboradores",
    icon: FolderIcon,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    glow: "rgba(245, 158, 11, 0.4)",
    href: "/adminhub/documentos",
  },
  {
    id: "ferias",
    title: "Férias & Ausências",
    description: "Aprove e gerencie solicitações da equipe",
    icon: BeachAccessIcon,
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    glow: "rgba(16, 185, 129, 0.4)",
    href: "/adminhub/ferias",
  },
  {
    id: "comunicados",
    title: "Comunicados",
    description: "Crie e gerencie notícias da empresa",
    icon: CampaignIcon,
    gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
    glow: "rgba(236, 72, 153, 0.4)",
    href: "/adminhub/comunicados",
  },
  {
    id: "aprendizado",
    title: "E-Learning",
    description: "Gerencie cursos e treinamentos",
    icon: SchoolIcon,
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
    glow: "rgba(139, 92, 246, 0.4)",
    href: "/adminhub/aprendizado",
  },
];

export default function AdminHubPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pendingDocs, setPendingDocs] = useState(0);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    const checkAuth = () => {
      setMounted(true);
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (token) {
        setIsAuthenticated(true);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Verifica se é admin
          if (parsedUser.role !== "admin") {
            router.push("/hub");
            return;
          }
        }
        // Buscar dados atualizados do usuário
        userAPI
          .getProfile()
          .then((response) => {
            if (response.success && response.user) {
              setUser(response.user);
              localStorage.setItem("user", JSON.stringify(response.user));
              if (response.user.role !== "admin") {
                router.push("/hub");
              }
            }
          })
          .catch(() => {});
        // Buscar pendências de documentos
        documentsAPI.admin
          .getStats()
          .then((response) => {
            if (response.success) {
              setPendingDocs(response.stats.pending);
            }
          })
          .catch(() => {});
      } else {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  if (!mounted || !isAuthenticated || !user || user.role !== "admin") {
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

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleCardClick = (href: string) => {
    router.push(href);
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
        {/* Background Effects */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            left: "20%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.15) 0%, transparent 70%)",
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
              "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "pulse 10s ease-in-out infinite reverse",
          }}
        />

        {/* Grid Pattern */}
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

        {/* Navigation */}
        <Box
          sx={{
            position: "fixed",
            top: 24,
            left: 24,
            zIndex: 100,
            display: "flex",
            gap: 2,
          }}
        >
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
              <ArrowBackIcon />
            </IconButton>
          </Link>
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
                  background: "rgba(232, 75, 138, 0.1)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(232, 75, 138, 0.2)",
                  borderRadius: "50px",
                  py: 0.8,
                  px: 2,
                  pr: 1,
                  transition: "all 0.2s ease",
                "&:hover": {
                  background: "rgba(232, 75, 138, 0.2)",
                  borderColor: "rgba(232, 75, 138, 0.3)",
                },
              }}
            >
              <Chip
                icon={<SecurityIcon sx={{ fontSize: 14 }} />}
                label="Admin"
                size="small"
                sx={{
                  background: "rgba(232, 75, 138, 0.2)",
                  color: "#e84b8a",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24,
                  "& .MuiChip-icon": { color: "#e84b8a" },
                }}
              />
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
                Administrador
              </Typography>
              <Typography variant="body1" fontWeight={600} color="white">
                {user.name}
              </Typography>
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
            <MenuItem
              onClick={() => {
                handleMenuClose();
                router.push("/hub");
              }}
            >
              <HomeIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Hub de Aplicativos
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{ color: "#e84b8a !important" }}
            >
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Sair
            </MenuItem>
          </Menu>
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
                      "linear-gradient(90deg, #e84b8a 0%, #ff6b9d 50%, #3B82F6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Admin Hub
                </Typography>
                <Typography variant="h6" color="rgba(255,255,255,0.5)">
                  Ferramentas de gestão e administração
                </Typography>
              </motion.div>
            </Box>

            {/* Admin Cards Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 3,
              }}
            >
              {adminCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    onClick={() => handleCardClick(card.href)}
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
                        boxShadow: `0 20px 60px ${card.glow}`,
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
                        background: `radial-gradient(circle at center, ${card.glow} 0%, transparent 70%)`,
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                        pointerEvents: "none",
                      }}
                    />

                    {/* Badge de pendências */}
                    {card.id === "documentos" && pendingDocs > 0 && (
                      <Chip
                        label={`${pendingDocs} pendente${
                          pendingDocs > 1 ? "s" : ""
                        }`}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 16,
                          right: 16,
                          background: "#F59E0B",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          zIndex: 2,
                        }}
                      />
                    )}

                    <CardContent sx={{ p: 4, position: "relative" }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Box
                          sx={{
                            p: 2.5,
                            borderRadius: "16px",
                            background: card.gradient,
                            boxShadow: `0 8px 32px ${card.glow}`,
                          }}
                        >
                          <card.icon sx={{ fontSize: 40, color: "#fff" }} />
                        </Box>
                        <Box>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color="white"
                          >
                            {card.title}
                          </Typography>
                          <Typography
                            variant="body1"
                            color="rgba(255,255,255,0.5)"
                            mt={0.5}
                          >
                            {card.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
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
