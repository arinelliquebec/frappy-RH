"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Stack,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  createTheme,
  ThemeProvider,
  Paper,
  Grid,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PushPin as PinIcon,
  Campaign as UrgentIcon,
  Event as EventIcon,
  School as TrainingIcon,
  People as HRIcon,
  CardGiftcard as BenefitsIcon,
  Article as GeneralIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  Celebration as CelebrateIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material";
import { newsAPI, News, NewsCategory, NewsPriority, NewsStats, userAPI, User, adminAPI } from "@/lib/api";

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

const priorityConfig: Record<NewsPriority, { label: string; color: string }> = {
  normal: { label: "Normal", color: "#64748b" },
  high: { label: "Alta", color: "#F59E0B" },
  urgent: { label: "Urgente", color: "#EF4444" },
};

interface Filial {
  nome: string;
}

export default function AdminComunicadosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [news, setNews] = useState<News[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filiais, setFiliais] = useState<Filial[]>([]);

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<"" | "published" | "draft" | "expired">("");
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory | "">("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNews, setDeletingNews] = useState<News | null>(null);

  // Form
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "geral" as NewsCategory,
    priority: "normal" as NewsPriority,
    image_url: "",
    filial: "",
    published: false,
    pinned: false,
    expires_at: "",
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Verificar auth e carregar dados
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "admin") {
        router.push("/hub");
        return;
      }
      setUser(parsedUser);
    }

    userAPI.getProfile().then((res) => {
      if (res.success && res.user) {
        if (res.user.role !== "admin") {
          router.push("/hub");
          return;
        }
        setUser(res.user);
      }
    });
  }, [router]);

  // Carregar notícias
  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await newsAPI.admin.getAll({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });

      if (res.success) {
        setNews(res.news || []);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error("Erro ao carregar notícias:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, categoryFilter]);

  // Carregar stats
  const loadStats = async () => {
    try {
      const res = await newsAPI.admin.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
    }
  };

  // Carregar filiais
  const loadFiliais = async () => {
    try {
      const res = await adminAPI.getFiliais();
      if (res.success) {
        setFiliais(res.filiais.map((f: string) => ({ nome: f })));
      }
    } catch (err) {
      console.error("Erro ao carregar filiais:", err);
    }
  };

  useEffect(() => {
    if (mounted && user?.role === "admin") {
      loadNews();
      loadStats();
      loadFiliais();
    }
  }, [mounted, user, loadNews]);

  // Abrir dialog para criar
  const handleOpenCreate = () => {
    setEditingNews(null);
    setForm({
      title: "",
      summary: "",
      content: "",
      category: "geral",
      priority: "normal",
      image_url: "",
      filial: "",
      published: false,
      pinned: false,
      expires_at: "",
    });
    setDialogOpen(true);
  };

  // Abrir dialog para editar
  const handleOpenEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setForm({
      title: newsItem.title,
      summary: newsItem.summary || "",
      content: newsItem.content,
      category: newsItem.category,
      priority: newsItem.priority,
      image_url: newsItem.image_url || "",
      filial: newsItem.filial || "",
      published: newsItem.published,
      pinned: newsItem.pinned,
      expires_at: newsItem.expires_at?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  // Salvar
  const handleSave = async () => {
    if (!form.title || !form.content) {
      setSnackbar({
        open: true,
        message: "Título e conteúdo são obrigatórios",
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingNews) {
        await newsAPI.admin.update(editingNews.id, form);
        setSnackbar({
          open: true,
          message: "Comunicado atualizado com sucesso!",
          severity: "success",
        });
      } else {
        await newsAPI.admin.create(form);
        setSnackbar({
          open: true,
          message: "Comunicado criado com sucesso!",
          severity: "success",
        });
      }
      setDialogOpen(false);
      loadNews();
      loadStats();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao salvar",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle publicação
  const handleTogglePublish = async (newsItem: News) => {
    try {
      await newsAPI.admin.publish(newsItem.id, !newsItem.published);
      setSnackbar({
        open: true,
        message: newsItem.published ? "Comunicado despublicado" : "Comunicado publicado!",
        severity: "success",
      });
      loadNews();
      loadStats();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao atualizar",
        severity: "error",
      });
    }
  };

  // Deletar
  const handleDelete = async () => {
    if (!deletingNews) return;

    try {
      await newsAPI.admin.delete(deletingNews.id);
      setSnackbar({
        open: true,
        message: "Comunicado excluído com sucesso!",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      setDeletingNews(null);
      loadNews();
      loadStats();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao excluir",
        severity: "error",
      });
    }
  };

  if (!mounted || !user || user.role !== "admin") return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
          p: { xs: 2, md: 4 },
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" gap={2} mb={4}>
          <IconButton
            onClick={() => router.push("/adminhub")}
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
              Gerenciar Comunicados
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Crie e gerencie as notícias da empresa
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              },
            }}
          >
            Novo Comunicado
          </Button>
        </Stack>

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: "rgba(18, 18, 28, 0.8)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: "rgba(16, 185, 129, 0.2)",
                        color: "#10B981",
                      }}
                    >
                      <GeneralIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700 }}>
                        {stats.total_news}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                        Total de Comunicados
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: "rgba(18, 18, 28, 0.8)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: "rgba(59, 130, 246, 0.2)",
                        color: "#3B82F6",
                      }}
                    >
                      <PublishIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700 }}>
                        {stats.published}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                        Publicados
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: "rgba(18, 18, 28, 0.8)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: "rgba(245, 158, 11, 0.2)",
                        color: "#F59E0B",
                      }}
                    >
                      <ViewIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700 }}>
                        {stats.total_views}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                        Visualizações
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  background: "rgba(18, 18, 28, 0.8)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={2}>
                    <Avatar
                      sx={{
                        bgcolor: "rgba(239, 68, 68, 0.2)",
                        color: "#EF4444",
                      }}
                    >
                      <TrendingIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ color: "#fff", fontWeight: 700 }}>
                        {stats.total_reactions}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                        Reações
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper
          sx={{
            background: "rgba(18, 18, 28, 0.8)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 3,
            p: 2,
            mb: 3,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: "rgba(255,255,255,0.6)" }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                sx={{
                  color: "#fff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="published">Publicados</MenuItem>
                <MenuItem value="draft">Rascunhos</MenuItem>
                <MenuItem value="expired">Expirados</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: "rgba(255,255,255,0.6)" }}>Categoria</InputLabel>
              <Select
                value={categoryFilter}
                label="Categoria"
                onChange={(e) => setCategoryFilter(e.target.value as NewsCategory | "")}
                sx={{
                  color: "#fff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        {/* Table */}
        <Paper
          sx={{
            background: "rgba(18, 18, 28, 0.8)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Título</TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Categoria</TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>Status</TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }} align="center">Views</TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }} align="center">Reações</TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.7)" }} align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} sx={{ color: "#10B981" }} />
                    </TableCell>
                  </TableRow>
                ) : news.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "rgba(255,255,255,0.5)" }}>
                      Nenhum comunicado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  news.map((item) => {
                    const CategoryIcon = categoryConfig[item.category]?.icon || GeneralIcon;
                    const categoryColor = categoryConfig[item.category]?.color || "#64748b";

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1}>
                            {item.pinned && (
                              <Tooltip title="Fixado">
                                <PinIcon sx={{ fontSize: 16, color: "#F59E0B" }} />
                              </Tooltip>
                            )}
                            <Box>
                              <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
                                {item.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                {item.author_name} • {new Date(item.created_at).toLocaleDateString("pt-BR")}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                            label={categoryConfig[item.category]?.label || "Geral"}
                            sx={{
                              bgcolor: `${categoryColor}20`,
                              color: categoryColor,
                              "& .MuiChip-icon": { color: categoryColor },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.published ? "Publicado" : "Rascunho"}
                            sx={{
                              bgcolor: item.published
                                ? "rgba(16, 185, 129, 0.2)"
                                : "rgba(245, 158, 11, 0.2)",
                              color: item.published ? "#10B981" : "#F59E0B",
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
                            <ViewIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }} />
                            <Typography variant="body2" sx={{ color: "#fff" }}>
                              {item.view_count}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                            <LikeIcon sx={{ fontSize: 14, color: "#3B82F6" }} />
                            <LoveIcon sx={{ fontSize: 14, color: "#EF4444" }} />
                            <CelebrateIcon sx={{ fontSize: 14, color: "#F59E0B" }} />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                            <Tooltip title={item.published ? "Despublicar" : "Publicar"}>
                              <IconButton
                                size="small"
                                onClick={() => handleTogglePublish(item)}
                                sx={{ color: item.published ? "#10B981" : "rgba(255,255,255,0.5)" }}
                              >
                                {item.published ? <UnpublishIcon /> : <PublishIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(item)}
                                sx={{ color: "#3B82F6" }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setDeletingNews(item);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{ color: "#EF4444" }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
            sx={{
              color: "rgba(255,255,255,0.7)",
              "& .MuiTablePagination-selectIcon": { color: "rgba(255,255,255,0.5)" },
            }}
          />
        </Paper>

        {/* Create/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(18, 18, 28, 0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {editingNews ? "Editar Comunicado" : "Novo Comunicado"}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Título"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                fullWidth
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  },
                  "& label": { color: "rgba(255,255,255,0.6)" },
                  "& input": { color: "#fff" },
                }}
              />

              <TextField
                label="Resumo (opcional)"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                fullWidth
                multiline
                rows={2}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  },
                  "& label": { color: "rgba(255,255,255,0.6)" },
                  "& textarea": { color: "#fff" },
                }}
              />

              <TextField
                label="Conteúdo"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                fullWidth
                multiline
                rows={6}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  },
                  "& label": { color: "rgba(255,255,255,0.6)" },
                  "& textarea": { color: "#fff" },
                }}
              />

              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.6)" }}>Categoria</InputLabel>
                  <Select
                    value={form.category}
                    label="Categoria"
                    onChange={(e) => setForm({ ...form, category: e.target.value as NewsCategory })}
                    sx={{
                      color: "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    {Object.entries(categoryConfig).map(([key, { label }]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.6)" }}>Prioridade</InputLabel>
                  <Select
                    value={form.priority}
                    label="Prioridade"
                    onChange={(e) => setForm({ ...form, priority: e.target.value as NewsPriority })}
                    sx={{
                      color: "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    {Object.entries(priorityConfig).map(([key, { label }]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.6)" }}>Filial (vazio = todas)</InputLabel>
                  <Select
                    value={form.filial}
                    label="Filial (vazio = todas)"
                    onChange={(e) => setForm({ ...form, filial: e.target.value })}
                    sx={{
                      color: "#fff",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    <MenuItem value="">Todas as Filiais</MenuItem>
                    {filiais.map((f) => (
                      <MenuItem key={f.nome} value={f.nome}>
                        {f.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Expira em (opcional)"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                    },
                    "& label": { color: "rgba(255,255,255,0.6)" },
                    "& input": { color: "#fff" },
                  }}
                />
              </Stack>

              <TextField
                label="URL da Imagem (opcional)"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                fullWidth
                placeholder="https://exemplo.com/imagem.jpg"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  },
                  "& label": { color: "rgba(255,255,255,0.6)" },
                  "& input": { color: "#fff" },
                }}
              />

              <Stack direction="row" gap={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      sx={{
                        "& .Mui-checked": { color: "#10B981" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#10B981" },
                      }}
                    />
                  }
                  label="Publicar agora"
                  sx={{ color: "rgba(255,255,255,0.7)" }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.pinned}
                      onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                      sx={{
                        "& .Mui-checked": { color: "#F59E0B" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#F59E0B" },
                      }}
                    />
                  }
                  label="Fixar no topo"
                  sx={{ color: "rgba(255,255,255,0.7)" }}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <Button
              onClick={() => setDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                },
              }}
            >
              {saving ? <CircularProgress size={20} /> : "Salvar"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              background: "rgba(18, 18, 28, 0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>
              Tem certeza que deseja excluir o comunicado &quot;{deletingNews?.title}&quot;?
              <br />
              Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
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

