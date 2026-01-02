"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Tooltip,
  Badge,
  Skeleton,
  Snackbar,
  Alert,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  Celebration as CelebrateIcon,
  Campaign as UrgentIcon,
  Event as EventIcon,
  School as TrainingIcon,
  People as HRIcon,
  CardGiftcard as BenefitsIcon,
  Article as GeneralIcon,
  PushPin as PinIcon,
  Close as CloseIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { newsAPI, News, NewsCategory, userAPI, User } from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#10B981" },
    secondary: { main: "#3B82F6" },
    background: {
      default: "#0a0a12",
      paper: "rgba(18, 18, 28, 0.95)",
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
  },
});

const categoryConfig: Record<
  NewsCategory,
  { label: string; icon: typeof GeneralIcon; color: string }
> = {
  geral: { label: "Geral", icon: GeneralIcon, color: "#64748b" },
  rh: { label: "RH", icon: HRIcon, color: "#8B5CF6" },
  beneficios: { label: "Benefícios", icon: BenefitsIcon, color: "#F59E0B" },
  eventos: { label: "Eventos", icon: EventIcon, color: "#3B82F6" },
  treinamento: { label: "Treinamento", icon: TrainingIcon, color: "#10B981" },
  urgente: { label: "Urgente", icon: UrgentIcon, color: "#EF4444" },
};

const reactions = [
  { key: "like", icon: LikeIcon, label: "Curtir", color: "#3B82F6" },
  { key: "love", icon: LoveIcon, label: "Amei", color: "#EF4444" },
  {
    key: "celebrate",
    icon: CelebrateIcon,
    label: "Parabéns",
    color: "#F59E0B",
  },
];

export default function ComunicadosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    NewsCategory | "all"
  >("all");
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Verificar autenticação e carregar usuário
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

    userAPI
      .getProfile()
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // Se falhar, redirecionar para login
        router.push("/login");
      });
  }, [router]);

  // Carregar notícias
  const loadNews = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        const currentPage = reset ? 1 : page;
        const res = await newsAPI.getAll({
          page: currentPage,
          limit: 12,
          category: selectedCategory === "all" ? undefined : selectedCategory,
        });

        if (res.success) {
          if (reset) {
            setNews(res.news || []);
            setPage(1);
          } else {
            setNews((prev) => [...prev, ...(res.news || [])]);
          }
          setHasMore(currentPage < res.pagination.total_pages);
        }
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, selectedCategory]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (mounted && token) {
      loadNews(true);
    }
  }, [mounted, selectedCategory]);

  // Abrir notícia
  const handleOpenNews = async (newsItem: News) => {
    try {
      const res = await newsAPI.getById(newsItem.id);
      if (res.success) {
        setSelectedNews(res.news);
        setDialogOpen(true);
        // Atualizar view count na lista
        setNews((prev) =>
          prev.map((n) =>
            n.id === newsItem.id
              ? { ...n, view_count: res.news.view_count, viewed: true }
              : n
          )
        );
      }
    } catch {
      setSelectedNews(newsItem);
      setDialogOpen(true);
    }
  };

  // Reagir
  const handleReact = async (newsId: string, reaction: string) => {
    try {
      const currentNews = news.find((n) => n.id === newsId);
      const newReaction =
        currentNews?.user_reaction === reaction ? "" : reaction;

      const res = await newsAPI.react(newsId, newReaction);
      if (res.success) {
        // Atualizar na lista
        setNews((prev) =>
          prev.map((n) =>
            n.id === newsId
              ? {
                  ...n,
                  reactions: res.reactions,
                  user_reaction: res.user_reaction,
                }
              : n
          )
        );
        // Atualizar no dialog
        if (selectedNews?.id === newsId) {
          setSelectedNews((prev) =>
            prev
              ? {
                  ...prev,
                  reactions: res.reactions,
                  user_reaction: res.user_reaction,
                }
              : null
          );
        }
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Erro ao reagir",
        severity: "error",
      });
    }
  };

  // Filtrar por busca
  const filteredNews = news.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.summary?.toLowerCase().includes(search.toLowerCase())
  );

  // Formatar data relativa
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  if (!mounted) return null;

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
            top: -300,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -200,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            p: { xs: 2, md: 4 },
            pb: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <IconButton
            onClick={() => router.push("/hub")}
            sx={{
              color: "#fff",
              background: "rgba(255,255,255,0.05)",
              "&:hover": { background: "rgba(255,255,255,0.1)" },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Comunicados
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Fique por dentro das novidades da empresa
            </Typography>
          </Box>
          <Avatar
            sx={{
              background: "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
              cursor: "pointer",
            }}
            onClick={() => router.push("/perfil")}
          >
            {user?.name?.charAt(0) || "U"}
          </Avatar>
        </Box>

        {/* Search & Filters */}
        <Box sx={{ px: { xs: 2, md: 4 }, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar comunicados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                background: "rgba(255,255,255,0.03)",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                "&.Mui-focused fieldset": { borderColor: "#10B981" },
              },
              "& input": { color: "#fff" },
            }}
          />

          <Tabs
            value={selectedCategory}
            onChange={(_, v) => setSelectedCategory(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTabs-indicator": {
                background: "linear-gradient(90deg, #10B981, #3B82F6)",
              },
              "& .MuiTab-root": {
                color: "rgba(255,255,255,0.6)",
                minHeight: 40,
                textTransform: "none",
                "&.Mui-selected": { color: "#10B981" },
              },
            }}
          >
            <Tab value="all" label="Todos" />
            {Object.entries(categoryConfig).map(
              ([key, { label, icon: Icon }]) => (
                <Tab
                  key={key}
                  value={key}
                  label={label}
                  icon={<Icon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
              )
            )}
          </Tabs>
        </Box>

        {/* News Grid */}
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
          {loading && news.length === 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={300}
                  sx={{ bgcolor: "rgba(255,255,255,0.05)" }}
                />
              ))}
            </Box>
          ) : filteredNews.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 8,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <GeneralIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6">Nenhum comunicado encontrado</Typography>
              <Typography variant="body2">
                {search
                  ? "Tente outra busca"
                  : "Ainda não há comunicados nesta categoria"}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              <AnimatePresence>
                {filteredNews.map((item, index) => {
                  const CategoryIcon =
                    categoryConfig[item.category]?.icon || GeneralIcon;
                  const categoryColor =
                    categoryConfig[item.category]?.color || "#64748b";

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        sx={{
                          background: "rgba(18, 18, 28, 0.8)",
                          backdropFilter: "blur(20px)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 3,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            borderColor: `${categoryColor}40`,
                            boxShadow: `0 20px 40px ${categoryColor}20`,
                          },
                        }}
                        onClick={() => handleOpenNews(item)}
                      >
                        {item.image_url && (
                          <CardMedia
                            component="img"
                            height="160"
                            image={item.image_url}
                            alt={item.title}
                            sx={{ objectFit: "cover" }}
                          />
                        )}
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            gap={1}
                            mb={1.5}
                          >
                            {item.pinned && (
                              <Tooltip title="Fixado">
                                <PinIcon
                                  sx={{ fontSize: 16, color: "#F59E0B" }}
                                />
                              </Tooltip>
                            )}
                            <Chip
                              size="small"
                              icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                              label={
                                categoryConfig[item.category]?.label || "Geral"
                              }
                              sx={{
                                bgcolor: `${categoryColor}20`,
                                color: categoryColor,
                                "& .MuiChip-icon": { color: categoryColor },
                              }}
                            />
                            {item.priority === "urgent" && (
                              <Chip
                                size="small"
                                label="Urgente"
                                sx={{
                                  bgcolor: "rgba(239, 68, 68, 0.2)",
                                  color: "#EF4444",
                                }}
                              />
                            )}
                          </Stack>

                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: "#fff",
                              mb: 1,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.title}
                          </Typography>

                          {item.summary && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "rgba(255,255,255,0.6)",
                                mb: 2,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {item.summary}
                            </Typography>
                          )}

                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Stack direction="row" alignItems="center" gap={2}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={0.5}
                              >
                                <TimeIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "rgba(255,255,255,0.4)",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: "rgba(255,255,255,0.4)" }}
                                >
                                  {formatRelativeTime(item.published_at)}
                                </Typography>
                              </Stack>
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={0.5}
                              >
                                <ViewIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "rgba(255,255,255,0.4)",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: "rgba(255,255,255,0.4)" }}
                                >
                                  {item.view_count}
                                </Typography>
                              </Stack>
                            </Stack>

                            <Stack direction="row" gap={0.5}>
                              {reactions.map((r) => {
                                const count = item.reactions?.[r.key] || 0;
                                const isActive = item.user_reaction === r.key;
                                return (
                                  <Tooltip key={r.key} title={r.label}>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReact(item.id, r.key);
                                      }}
                                      sx={{
                                        color: isActive
                                          ? r.color
                                          : "rgba(255,255,255,0.4)",
                                        "&:hover": { color: r.color },
                                      }}
                                    >
                                      <Badge
                                        badgeContent={count > 0 ? count : null}
                                        sx={{
                                          "& .MuiBadge-badge": {
                                            bgcolor: r.color,
                                            color: "#fff",
                                            fontSize: 10,
                                          },
                                        }}
                                      >
                                        <r.icon sx={{ fontSize: 18 }} />
                                      </Badge>
                                    </IconButton>
                                  </Tooltip>
                                );
                              })}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Box>
          )}

          {/* Load More */}
          {hasMore && !loading && news.length > 0 && (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setPage((p) => p + 1);
                  loadNews();
                }}
                sx={{
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  "&:hover": {
                    borderColor: "#10B981",
                    background: "rgba(16, 185, 129, 0.1)",
                  },
                }}
              >
                Carregar mais
              </Button>
            </Box>
          )}

          {loading && news.length > 0 && (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <CircularProgress size={32} sx={{ color: "#10B981" }} />
            </Box>
          )}
        </Box>

        {/* News Detail Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(18, 18, 28, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
            },
          }}
        >
          {selectedNews && (
            <>
              <DialogTitle
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Stack direction="row" alignItems="center" gap={1}>
                  <Chip
                    size="small"
                    icon={
                      <Box
                        component={
                          categoryConfig[selectedNews.category]?.icon ||
                          GeneralIcon
                        }
                        sx={{ fontSize: 14 }}
                      />
                    }
                    label={
                      categoryConfig[selectedNews.category]?.label || "Geral"
                    }
                    sx={{
                      bgcolor: `${
                        categoryConfig[selectedNews.category]?.color ||
                        "#64748b"
                      }20`,
                      color:
                        categoryConfig[selectedNews.category]?.color ||
                        "#64748b",
                    }}
                  />
                  {selectedNews.pinned && (
                    <Chip
                      size="small"
                      icon={<PinIcon sx={{ fontSize: 14 }} />}
                      label="Fixado"
                      sx={{
                        bgcolor: "rgba(245, 158, 11, 0.2)",
                        color: "#F59E0B",
                      }}
                    />
                  )}
                </Stack>
                <Stack direction="row" gap={1}>
                  <Tooltip title="Compartilhar">
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setSnackbar({
                          open: true,
                          message: "Link copiado!",
                          severity: "success",
                        });
                      }}
                      sx={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    onClick={() => setDialogOpen(false)}
                    sx={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Stack>
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                {selectedNews.image_url && (
                  <Box
                    component="img"
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    sx={{
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "cover",
                    }}
                  />
                )}
                <Box sx={{ p: 3 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#fff", mb: 2 }}
                  >
                    {selectedNews.title}
                  </Typography>

                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={3}
                    sx={{ mb: 3, color: "rgba(255,255,255,0.5)" }}
                  >
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {selectedNews.author_name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {selectedNews.author_name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <TimeIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        {formatRelativeTime(selectedNews.published_at)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <ViewIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        {selectedNews.view_count} visualizações
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedNews.content}
                  </Typography>

                  {/* Reactions */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={2}
                    sx={{
                      mt: 4,
                      pt: 3,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      O que você achou?
                    </Typography>
                    {reactions.map((r) => {
                      const count = selectedNews.reactions?.[r.key] || 0;
                      const isActive = selectedNews.user_reaction === r.key;
                      return (
                        <Button
                          key={r.key}
                          variant={isActive ? "contained" : "outlined"}
                          startIcon={<r.icon />}
                          onClick={() => handleReact(selectedNews.id, r.key)}
                          sx={{
                            borderColor: isActive
                              ? r.color
                              : "rgba(255,255,255,0.2)",
                            bgcolor: isActive ? `${r.color}20` : "transparent",
                            color: isActive ? r.color : "rgba(255,255,255,0.7)",
                            "&:hover": {
                              borderColor: r.color,
                              bgcolor: `${r.color}10`,
                            },
                          }}
                        >
                          {r.label} {count > 0 && `(${count})`}
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
