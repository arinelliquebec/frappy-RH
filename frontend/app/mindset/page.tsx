"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Chip,
  Grid,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import StarIcon from "@mui/icons-material/Star";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import Link from "next/link";
import { authAPI, userAPI, User } from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#F59E0B" },
    secondary: { main: "#D97706" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

// Vídeos de Mindset
const videos = [
  {
    id: 1,
    title: "Mindset de Crescimento",
    description:
      "Desenvolva uma mentalidade focada em crescimento e superação de desafios. Este conteúdo foi preparado especialmente para ajudar você a alcançar seu máximo potencial.",
    embedUrl:
      "https://www.canva.com/design/DAGfZKdEJ-Y/C04130gepWXcBBS8dOkczQ/view?embed",
    category: "growth",
    tags: ["Desenvolvimento Pessoal", "Mindset", "Crescimento"],
    featured: true,
    duration: "15 min",
  },
  // Adicione mais vídeos aqui conforme necessário
];

// Categorias
const categories = [
  { id: "all", label: "Todos", icon: OndemandVideoIcon },
  { id: "growth", label: "Crescimento", icon: RocketLaunchIcon },
  { id: "motivation", label: "Motivação", icon: LightbulbIcon },
  { id: "wellness", label: "Bem-estar", icon: SelfImprovementIcon },
  { id: "leadership", label: "Liderança", icon: FavoriteIcon },
];

export default function MindsetPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState(videos[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  }, []);

  // Listen for fullscreen changes and keyboard shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      // Tecla F para toggle fullscreen
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keypress", handleKeyPress);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keypress", handleKeyPress);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      userAPI
        .getProfile()
        .then((response) => {
          if (response.success && response.user) {
            setUser(response.user);
            localStorage.setItem("user", JSON.stringify(response.user));
          }
        })
        .catch(() => {});
    } else {
      router.push("/login");
    }
  }, [router]);

  if (!mounted || !isAuthenticated) {
    return null;
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await authAPI.logout();
    router.push("/login");
  };

  const filteredVideos =
    selectedCategory === "all"
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0a0a12 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Effects */}
        <Box
          sx={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "50%",
            height: "50%",
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "50%",
            height: "50%",
            background:
              "radial-gradient(circle, rgba(217, 119, 6, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <Box
          component={motion.div}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backdropFilter: "blur(20px)",
            background: "rgba(10, 10, 18, 0.8)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Box
            sx={{
              maxWidth: "1400px",
              mx: "auto",
              px: { xs: 2, md: 4 },
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Link href="/hub" passHref>
                <IconButton
                  sx={{
                    color: "white",
                    "&:hover": { background: "rgba(245, 158, 11, 0.2)" },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Link>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                }}
              >
                <PsychologyIcon sx={{ color: "white", fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{
                    background:
                      "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Mindset
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.5)">
                  Fortaleça sua mentalidade
                </Typography>
              </Box>
            </Stack>

            {/* User Menu */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Link href="/hub" passHref>
                <IconButton
                  sx={{
                    color: "white",
                    "&:hover": { background: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Link>
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background:
                      "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    border: "2px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {user?.name?.charAt(0) || "U"}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    background: "rgba(26, 26, 46, 0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    minWidth: 200,
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    color="white"
                    fontWeight={600}
                  >
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.5)">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    router.push("/perfil");
                  }}
                  sx={{ color: "white", py: 1.5 }}
                >
                  <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Meu Perfil
                </MenuItem>
                {user?.role === "admin" && (
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      router.push("/adminhub");
                    }}
                    sx={{ color: "white", py: 1.5 }}
                  >
                    <AdminPanelSettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Painel Admin
                  </MenuItem>
                )}
                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
                <MenuItem
                  onClick={handleLogout}
                  sx={{ color: "#EF4444", py: 1.5 }}
                >
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Sair
                </MenuItem>
              </Menu>
            </Stack>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{ maxWidth: "1400px", mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}
        >
          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Box sx={{ mb: 4 }}>
              <Tabs
                value={selectedCategory}
                onChange={(_, val) => setSelectedCategory(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  "& .MuiTabs-indicator": {
                    background:
                      "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)",
                    height: 3,
                    borderRadius: "3px",
                  },
                  "& .MuiTab-root": {
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                    textTransform: "none",
                    fontSize: "0.95rem",
                    minHeight: 48,
                    "&.Mui-selected": {
                      color: "#F59E0B",
                    },
                  },
                }}
              >
                {categories.map((cat) => (
                  <Tab
                    key={cat.id}
                    value={cat.id}
                    icon={<cat.icon sx={{ fontSize: 20 }} />}
                    iconPosition="start"
                    label={cat.label}
                  />
                ))}
              </Tabs>
            </Box>
          </motion.div>

          {/* Featured Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Box
              sx={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                overflow: "hidden",
                mb: 4,
              }}
            >
              {/* Video Player */}
              <Box
                ref={videoContainerRef}
                sx={{
                  position: "relative",
                  width: "100%",
                  paddingTop: isFullscreen ? "0" : "56.25%", // 16:9 aspect ratio
                  height: isFullscreen ? "100vh" : "auto",
                  background:
                    "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                }}
              >
                <iframe
                  src={selectedVideo.embedUrl}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allowFullScreen
                  allow="fullscreen"
                  title={selectedVideo.title}
                />
                {/* Fullscreen Button */}
                <Tooltip
                  title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                  <IconButton
                    onClick={toggleFullscreen}
                    sx={{
                      position: "absolute",
                      bottom: 16,
                      right: 16,
                      background: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      "&:hover": {
                        background: "rgba(245, 158, 11, 0.8)",
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease",
                      zIndex: 10,
                    }}
                  >
                    {isFullscreen ? (
                      <FullscreenExitIcon sx={{ fontSize: 28 }} />
                    ) : (
                      <FullscreenIcon sx={{ fontSize: 28 }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Video Info */}
              <Box sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={3}
                  alignItems={{ md: "flex-start" }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)",
                      flexShrink: 0,
                    }}
                  >
                    <PlayCircleFilledIcon
                      sx={{ color: "#F59E0B", fontSize: 40 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <Typography variant="h5" fontWeight="bold" color="white">
                        {selectedVideo.title}
                      </Typography>
                      {selectedVideo.featured && (
                        <Chip
                          size="small"
                          icon={
                            <StarIcon
                              sx={{ color: "#F59E0B !important", fontSize: 14 }}
                            />
                          }
                          label="Destaque"
                          sx={{
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#F59E0B",
                            fontWeight: 500,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="body1"
                      color="rgba(255,255,255,0.7)"
                      mb={2}
                      sx={{ lineHeight: 1.7 }}
                    >
                      {selectedVideo.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {selectedVideo.tags.map((tag) => (
                        <Chip
                          key={tag}
                          size="small"
                          label={tag}
                          sx={{
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.8)",
                            fontWeight: 500,
                          }}
                        />
                      ))}
                      <Chip
                        size="small"
                        label={selectedVideo.duration}
                        sx={{
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#FBBF24",
                          fontWeight: 500,
                        }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </motion.div>

          {/* Video Grid */}
          {filteredVideos.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Typography variant="h6" fontWeight="bold" color="white" mb={3}>
                Mais Vídeos
              </Typography>
              <Grid container spacing={3}>
                {filteredVideos
                  .filter((v) => v.id !== selectedVideo.id)
                  .map((video, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={video.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ y: -8 }}
                      >
                        <Card
                          onClick={() => setSelectedVideo(video)}
                          sx={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "16px",
                            overflow: "hidden",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: "0 20px 40px rgba(245, 158, 11, 0.15)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                            },
                          }}
                        >
                          {/* Thumbnail */}
                          <Box
                            sx={{
                              position: "relative",
                              height: 180,
                              background:
                                "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <PlayCircleFilledIcon
                              sx={{
                                fontSize: 60,
                                color: "rgba(245, 158, 11, 0.8)",
                              }}
                            />
                            {video.featured && (
                              <Chip
                                size="small"
                                icon={
                                  <StarIcon
                                    sx={{
                                      color: "#F59E0B !important",
                                      fontSize: 12,
                                    }}
                                  />
                                }
                                label="Destaque"
                                sx={{
                                  position: "absolute",
                                  top: 12,
                                  right: 12,
                                  background: "rgba(0,0,0,0.6)",
                                  color: "#F59E0B",
                                  fontWeight: 500,
                                  fontSize: "0.7rem",
                                }}
                              />
                            )}
                            <Chip
                              size="small"
                              label={video.duration}
                              sx={{
                                position: "absolute",
                                bottom: 12,
                                right: 12,
                                background: "rgba(0,0,0,0.6)",
                                color: "white",
                                fontWeight: 500,
                                fontSize: "0.7rem",
                              }}
                            />
                          </Box>

                          <CardContent sx={{ p: 2.5 }}>
                            <Typography
                              variant="subtitle1"
                              fontWeight="bold"
                              color="white"
                              mb={1}
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {video.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="rgba(255,255,255,0.6)"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {video.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
              </Grid>
            </motion.div>
          )}

          {/* Empty State */}
          {filteredVideos.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "24px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <OndemandVideoIcon
                  sx={{ fontSize: 64, color: "rgba(245, 158, 11, 0.3)", mb: 2 }}
                />
                <Typography variant="h6" color="rgba(255,255,255,0.5)" mb={1}>
                  Nenhum vídeo nesta categoria
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.3)">
                  Em breve teremos mais conteúdos para você
                </Typography>
              </Box>
            </motion.div>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
