"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  CircularProgress,
  Paper,
  Grid,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CommentIcon from "@mui/icons-material/Comment";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SchoolIcon from "@mui/icons-material/School";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GroupsIcon from "@mui/icons-material/Groups";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  pdiAPI,
  PDI,
  PDISummary,
  PDIGoal,
  PDIAction,
  PDICheckin,
  PDIStatus,
  GoalPriority,
  GoalStatus,
  ActionStatus,
  PDI_STATUSES,
  GOAL_PRIORITIES,
  GOAL_CATEGORIES,
  ACTION_TYPES,
  User,
} from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8B5CF6" },
    secondary: { main: "#3B82F6" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

export default function PDIPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  // Data
  const [pdis, setPdis] = useState<PDISummary[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">(
    new Date().getFullYear()
  );
  const [statusFilter, setStatusFilter] = useState<string>("");

  // PDI Detail
  const [selectedPDI, setSelectedPDI] = useState<PDI | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PDIGoal | null>(null);
  const [editingAction, setEditingAction] = useState<PDIAction | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  // Forms
  const [pdiForm, setPdiForm] = useState({
    title: "",
    description: "",
    period_start: "",
    period_end: "",
    focus_area: "",
  });
  const [pdiFormStep, setPdiFormStep] = useState(0);

  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium" as GoalPriority,
    due_date: "",
    success_criteria: "",
  });

  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    action_type: "",
    due_date: "",
    resource_url: "",
    resource_name: "",
  });

  const [checkinForm, setCheckinForm] = useState({
    progress: "",
    challenges: "",
    next_steps: "",
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    loadPDIs();
  }, [router]);

  useEffect(() => {
    if (mounted) {
      loadPDIs();
    }
  }, [selectedYear, statusFilter, mounted]);

  const loadPDIs = async () => {
    setLoading(true);
    try {
      const params: { status?: string; year?: number } = {};
      if (statusFilter) params.status = statusFilter;
      if (selectedYear) params.year = selectedYear as number;

      const res = await pdiAPI.getMyPDIs(params);
      if (res.success) {
        setPdis(res.pdis || []);
        if (res.years && res.years.length > 0) {
          setYears(res.years);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar PDIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPDIDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await pdiAPI.getPDIById(id);
      if (res.success) {
        setSelectedPDI(res.pdi);
        setTab(1);
      }
    } catch (error) {
      console.error("Erro ao carregar PDI:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ==================== HANDLERS ====================

  const handleCreatePDI = async () => {
    try {
      const res = await pdiAPI.create({
        title: pdiForm.title,
        description: pdiForm.description,
        period_start: pdiForm.period_start,
        period_end: pdiForm.period_end,
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: "PDI criado com sucesso!",
          severity: "success",
        });
        setCreateDialogOpen(false);
        setPdiForm({
          title: "",
          description: "",
          period_start: "",
          period_end: "",
          focus_area: "",
        });
        setPdiFormStep(0);
        loadPDIs();
        loadPDIDetail(res.pdi.id);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao criar PDI",
        severity: "error",
      });
    }
  };

  const handleSubmitPDI = async () => {
    if (!selectedPDI) return;
    try {
      const res = await pdiAPI.submit(selectedPDI.id);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "PDI enviado para aprovação!",
          severity: "success",
        });
        loadPDIDetail(selectedPDI.id);
        loadPDIs();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao enviar PDI";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleSaveGoal = async () => {
    if (!selectedPDI) return;
    try {
      if (editingGoal) {
        const res = await pdiAPI.updateGoal(editingGoal.id, goalForm);
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Meta atualizada!",
            severity: "success",
          });
        }
      } else {
        const res = await pdiAPI.addGoal(selectedPDI.id, goalForm);
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Meta adicionada!",
            severity: "success",
          });
        }
      }
      setGoalDialogOpen(false);
      setEditingGoal(null);
      setGoalForm({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        due_date: "",
        success_criteria: "",
      });
      loadPDIDetail(selectedPDI.id);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao salvar meta",
        severity: "error",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!selectedPDI || !confirm("Deseja remover esta meta?")) return;
    try {
      const res = await pdiAPI.deleteGoal(goalId);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Meta removida!",
          severity: "success",
        });
        loadPDIDetail(selectedPDI.id);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao remover meta",
        severity: "error",
      });
    }
  };

  const handleUpdateGoalStatus = async (
    goal: PDIGoal,
    newStatus: GoalStatus
  ) => {
    if (!selectedPDI) return;
    try {
      const progress =
        newStatus === "completed" ? 100 : newStatus === "in_progress" ? 50 : 0;
      await pdiAPI.updateGoal(goal.id, { status: newStatus, progress });
      loadPDIDetail(selectedPDI.id);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao atualizar status",
        severity: "error",
      });
    }
  };

  const handleSaveAction = async () => {
    if (!selectedGoalId) return;
    try {
      if (editingAction) {
        const res = await pdiAPI.updateAction(editingAction.id, actionForm);
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Ação atualizada!",
            severity: "success",
          });
        }
      } else {
        const res = await pdiAPI.addAction(selectedGoalId, actionForm);
        if (res.success) {
          setSnackbar({
            open: true,
            message: "Ação adicionada!",
            severity: "success",
          });
        }
      }
      setActionDialogOpen(false);
      setEditingAction(null);
      setSelectedGoalId("");
      setActionForm({
        title: "",
        description: "",
        action_type: "",
        due_date: "",
        resource_url: "",
        resource_name: "",
      });
      if (selectedPDI) loadPDIDetail(selectedPDI.id);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao salvar ação",
        severity: "error",
      });
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!selectedPDI || !confirm("Deseja remover esta ação?")) return;
    try {
      const res = await pdiAPI.deleteAction(actionId);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Ação removida!",
          severity: "success",
        });
        loadPDIDetail(selectedPDI.id);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao remover ação",
        severity: "error",
      });
    }
  };

  const handleUpdateActionStatus = async (
    action: PDIAction,
    newStatus: ActionStatus
  ) => {
    if (!selectedPDI) return;
    try {
      await pdiAPI.updateAction(action.id, { status: newStatus });
      loadPDIDetail(selectedPDI.id);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao atualizar status",
        severity: "error",
      });
    }
  };

  const handleAddCheckin = async () => {
    if (!selectedPDI) return;
    try {
      const res = await pdiAPI.addCheckin(selectedPDI.id, checkinForm);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Check-in registrado!",
          severity: "success",
        });
        setCheckinDialogOpen(false);
        setCheckinForm({ progress: "", challenges: "", next_steps: "" });
        loadPDIDetail(selectedPDI.id);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao registrar check-in",
        severity: "error",
      });
    }
  };

  // ==================== HELPERS ====================

  const getStatusInfo = (status: PDIStatus) => {
    return PDI_STATUSES.find((s) => s.value === status) || PDI_STATUSES[0];
  };

  const getPriorityInfo = (priority: GoalPriority) => {
    return (
      GOAL_PRIORITIES.find((p) => p.value === priority) || GOAL_PRIORITIES[1]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const openEditGoal = (goal: PDIGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || "",
      category: goal.category || "",
      priority: goal.priority,
      due_date: goal.due_date ? goal.due_date.split("T")[0] : "",
      success_criteria: goal.success_criteria || "",
    });
    setGoalDialogOpen(true);
  };

  const openAddAction = (goalId: string) => {
    setSelectedGoalId(goalId);
    setEditingAction(null);
    setActionForm({
      title: "",
      description: "",
      action_type: "",
      due_date: "",
      resource_url: "",
      resource_name: "",
    });
    setActionDialogOpen(true);
  };

  const openEditAction = (action: PDIAction) => {
    setSelectedGoalId(action.goal_id);
    setEditingAction(action);
    setActionForm({
      title: action.title,
      description: action.description || "",
      action_type: action.action_type || "",
      due_date: action.due_date ? action.due_date.split("T")[0] : "",
      resource_url: action.resource_url || "",
      resource_name: action.resource_name || "",
    });
    setActionDialogOpen(true);
  };

  if (!mounted) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(15, 15, 26, 0.92)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            px: { xs: 2, sm: 3, md: 4 },
            py: 2,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => (tab === 1 ? setTab(0) : router.push("/hub"))}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.05)",
                  "&:hover": { background: "rgba(139, 92, 246, 0.2)" },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <IconButton
                onClick={() => router.push("/hub")}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.05)",
                  "&:hover": { background: "rgba(139, 92, 246, 0.2)" },
                }}
              >
                <HomeIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="white">
                  🎯 Meu PDI
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Plano de Desenvolvimento Individual
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              {tab === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    background:
                      "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                    borderRadius: "12px",
                  }}
                >
                  Novo PDI
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Content */}
        <Box
          sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: "1400px", mx: "auto" }}
        >
          {tab === 0 ? (
            // ==================== LISTA DE PDIs ====================
            <>
              {/* Filtros */}
              <Stack direction="row" spacing={2} mb={3}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Ano
                  </InputLabel>
                  <Select
                    value={selectedYear}
                    label="Ano"
                    onChange={(e) =>
                      setSelectedYear(e.target.value as number | "")
                    }
                    sx={{
                      color: "white",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "12px",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                    {!years.includes(new Date().getFullYear()) && (
                      <MenuItem value={new Date().getFullYear()}>
                        {new Date().getFullYear()}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Status
                  </InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      color: "white",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "12px",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {PDI_STATUSES.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Lista */}
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress sx={{ color: "#8B5CF6" }} />
                </Box>
              ) : pdis.length === 0 ? (
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    textAlign: "center",
                    py: 6,
                  }}
                >
                  <AssignmentIcon
                    sx={{ fontSize: 64, color: "rgba(255,255,255,0.2)", mb: 2 }}
                  />
                  <Typography color="rgba(255,255,255,0.5)" mb={2}>
                    Você ainda não tem PDIs. Crie seu primeiro plano de
                    desenvolvimento!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                      background:
                        "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                      borderRadius: "12px",
                    }}
                  >
                    Criar PDI
                  </Button>
                </Card>
              ) : (
                <Grid container spacing={3}>
                  {pdis.map((pdi) => {
                    const statusInfo = getStatusInfo(pdi.status);
                    return (
                      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={pdi.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card
                            onClick={() => loadPDIDetail(pdi.id)}
                            sx={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "20px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              "&:hover": {
                                borderColor: "rgba(139, 92, 246, 0.3)",
                                background: "rgba(139, 92, 246, 0.05)",
                              },
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                mb={2}
                              >
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  color="white"
                                >
                                  {pdi.title}
                                </Typography>
                                <Chip
                                  label={statusInfo.label}
                                  size="small"
                                  sx={{
                                    background: `${statusInfo.color}20`,
                                    color: statusInfo.color,
                                    fontWeight: 600,
                                  }}
                                />
                              </Stack>

                              <Typography
                                variant="body2"
                                color="rgba(255,255,255,0.5)"
                                mb={2}
                              >
                                {formatDate(pdi.period_start)} -{" "}
                                {formatDate(pdi.period_end)}
                              </Typography>

                              <Box mb={2}>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  mb={0.5}
                                >
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.5)"
                                  >
                                    Progresso
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="#8B5CF6"
                                    fontWeight="bold"
                                  >
                                    {pdi.overall_progress}%
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={pdi.overall_progress}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: "rgba(139, 92, 246, 0.1)",
                                    "& .MuiLinearProgress-bar": {
                                      background:
                                        "linear-gradient(90deg, #8B5CF6, #A78BFA)",
                                      borderRadius: 4,
                                    },
                                  }}
                                />
                              </Box>

                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Typography
                                  variant="body2"
                                  color="rgba(255,255,255,0.5)"
                                >
                                  <FlagIcon
                                    sx={{
                                      fontSize: 16,
                                      verticalAlign: "middle",
                                      mr: 0.5,
                                    }}
                                  />
                                  {pdi.goals_count} metas
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="#10B981"
                                  fontWeight="bold"
                                >
                                  <CheckCircleIcon
                                    sx={{
                                      fontSize: 16,
                                      verticalAlign: "middle",
                                      mr: 0.5,
                                    }}
                                  />
                                  {pdi.goals_completed} concluídas
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </>
          ) : (
            // ==================== DETALHE DO PDI ====================
            selectedPDI && (
              <>
                {/* Header do PDI */}
                <Card
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    borderRadius: "20px",
                    mb: 3,
                  }}
                >
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={2}
                    >
                      <Box>
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          mb={1}
                        >
                          <Typography
                            variant="h4"
                            fontWeight="bold"
                            color="white"
                          >
                            {selectedPDI.title}
                          </Typography>
                          <Chip
                            label={getStatusInfo(selectedPDI.status).label}
                            sx={{
                              background: `${
                                getStatusInfo(selectedPDI.status).color
                              }20`,
                              color: getStatusInfo(selectedPDI.status).color,
                              fontWeight: 600,
                            }}
                          />
                        </Stack>
                        <Typography
                          variant="body1"
                          color="rgba(255,255,255,0.6)"
                        >
                          {formatDate(selectedPDI.period_start)} -{" "}
                          {formatDate(selectedPDI.period_end)}
                        </Typography>
                        {selectedPDI.description && (
                          <Typography
                            variant="body2"
                            color="rgba(255,255,255,0.5)"
                            mt={1}
                          >
                            {selectedPDI.description}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={2}>
                        {selectedPDI.status === "draft" && (
                          <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={handleSubmitPDI}
                            sx={{
                              background:
                                "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              borderRadius: "12px",
                            }}
                          >
                            Enviar para Aprovação
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<CommentIcon />}
                          onClick={() => setCheckinDialogOpen(true)}
                          sx={{
                            borderColor: "rgba(139, 92, 246, 0.5)",
                            color: "#8B5CF6",
                            borderRadius: "12px",
                          }}
                        >
                          Check-in
                        </Button>
                      </Stack>
                    </Stack>

                    {/* Progresso */}
                    <Box mt={3}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={1}
                      >
                        <Typography color="rgba(255,255,255,0.7)">
                          Progresso Geral
                        </Typography>
                        <Typography color="#8B5CF6" fontWeight="bold">
                          {selectedPDI.overall_progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={selectedPDI.overall_progress}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          background: "rgba(139, 92, 246, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            background:
                              "linear-gradient(90deg, #8B5CF6, #A78BFA)",
                            borderRadius: 6,
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>

                {/* Metas */}
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    mb: 3,
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <FlagIcon sx={{ color: "#8B5CF6" }} />
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          color="white"
                        >
                          Metas ({selectedPDI.goals?.length || 0})
                        </Typography>
                      </Stack>
                      {(selectedPDI.status === "draft" ||
                        selectedPDI.status === "approved" ||
                        selectedPDI.status === "in_progress") && (
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setEditingGoal(null);
                            setGoalForm({
                              title: "",
                              description: "",
                              category: "",
                              priority: "medium",
                              due_date: "",
                              success_criteria: "",
                            });
                            setGoalDialogOpen(true);
                          }}
                          sx={{ color: "#8B5CF6" }}
                        >
                          Nova Meta
                        </Button>
                      )}
                    </Stack>

                    {!selectedPDI.goals || selectedPDI.goals.length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "white",
                          borderRadius: "12px",
                        }}
                      >
                        Adicione metas ao seu PDI para começar seu
                        desenvolvimento.
                      </Alert>
                    ) : (
                      selectedPDI.goals.map((goal) => {
                        const priorityInfo = getPriorityInfo(goal.priority);
                        return (
                          <Accordion
                            key={goal.id}
                            sx={{
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              borderRadius: "12px !important",
                              mb: 2,
                              "&:before": { display: "none" },
                            }}
                          >
                            <AccordionSummary
                              expandIcon={
                                <ExpandMoreIcon sx={{ color: "white" }} />
                              }
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={2}
                                sx={{ width: "100%" }}
                              >
                                <Chip
                                  label={priorityInfo.label}
                                  size="small"
                                  sx={{
                                    background: `${priorityInfo.color}20`,
                                    color: priorityInfo.color,
                                    minWidth: 60,
                                  }}
                                />
                                <Box flex={1}>
                                  <Typography color="white" fontWeight="bold">
                                    {goal.title}
                                  </Typography>
                                  {goal.category && (
                                    <Typography
                                      variant="caption"
                                      color="rgba(255,255,255,0.5)"
                                    >
                                      {goal.category}
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ width: 100, mr: 2 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={goal.progress}
                                    sx={{
                                      height: 6,
                                      borderRadius: 3,
                                      background: "rgba(139, 92, 246, 0.1)",
                                      "& .MuiLinearProgress-bar": {
                                        background:
                                          goal.status === "completed"
                                            ? "#10B981"
                                            : "#8B5CF6",
                                        borderRadius: 3,
                                      },
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.5)"
                                  >
                                    {goal.progress}%
                                  </Typography>
                                </Box>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              {goal.description && (
                                <Typography
                                  color="rgba(255,255,255,0.7)"
                                  mb={2}
                                >
                                  {goal.description}
                                </Typography>
                              )}

                              {goal.success_criteria && (
                                <Paper
                                  sx={{
                                    p: 2,
                                    mb: 2,
                                    background: "rgba(139, 92, 246, 0.1)",
                                    borderRadius: "12px",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.5)"
                                  >
                                    Critérios de Sucesso
                                  </Typography>
                                  <Typography color="white">
                                    {goal.success_criteria}
                                  </Typography>
                                </Paper>
                              )}

                              {/* Ações */}
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={2}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="rgba(255,255,255,0.7)"
                                >
                                  Ações de Desenvolvimento
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => openAddAction(goal.id)}
                                  sx={{ color: "#8B5CF6" }}
                                >
                                  Ação
                                </Button>
                              </Stack>

                              {goal.actions && goal.actions.length > 0 ? (
                                <Stack spacing={1}>
                                  {goal.actions.map((action) => (
                                    <Paper
                                      key={action.id}
                                      sx={{
                                        p: 2,
                                        background: "rgba(255,255,255,0.02)",
                                        borderRadius: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Box flex={1}>
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          spacing={1}
                                        >
                                          {action.status === "completed" ? (
                                            <CheckCircleIcon
                                              sx={{
                                                color: "#10B981",
                                                fontSize: 20,
                                              }}
                                            />
                                          ) : action.status ===
                                            "in_progress" ? (
                                            <PlayArrowIcon
                                              sx={{
                                                color: "#3B82F6",
                                                fontSize: 20,
                                              }}
                                            />
                                          ) : (
                                            <TrackChangesIcon
                                              sx={{
                                                color: "rgba(255,255,255,0.3)",
                                                fontSize: 20,
                                              }}
                                            />
                                          )}
                                          <Typography
                                            color="white"
                                            sx={{
                                              textDecoration:
                                                action.status === "completed"
                                                  ? "line-through"
                                                  : "none",
                                            }}
                                          >
                                            {action.title}
                                          </Typography>
                                          {action.action_type && (
                                            <Chip
                                              label={
                                                ACTION_TYPES.find(
                                                  (t) =>
                                                    t.value ===
                                                    action.action_type
                                                )?.label || action.action_type
                                              }
                                              size="small"
                                              sx={{
                                                background:
                                                  "rgba(59, 130, 246, 0.2)",
                                                color: "#3B82F6",
                                                fontSize: "0.7rem",
                                              }}
                                            />
                                          )}
                                        </Stack>
                                      </Box>
                                      <Stack direction="row" spacing={1}>
                                        {action.status !== "completed" && (
                                          <Tooltip title="Marcar como concluída">
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleUpdateActionStatus(
                                                  action,
                                                  "completed"
                                                )
                                              }
                                              sx={{ color: "#10B981" }}
                                            >
                                              <CheckCircleIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                        <IconButton
                                          size="small"
                                          onClick={() => openEditAction(action)}
                                          sx={{
                                            color: "rgba(255,255,255,0.5)",
                                          }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleDeleteAction(action.id)
                                          }
                                          sx={{ color: "#EF4444" }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </Paper>
                                  ))}
                                </Stack>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="rgba(255,255,255,0.4)"
                                  textAlign="center"
                                  py={2}
                                >
                                  Nenhuma ação adicionada
                                </Typography>
                              )}

                              {/* Botões da meta */}
                              <Stack
                                direction="row"
                                justifyContent="flex-end"
                                spacing={1}
                                mt={2}
                              >
                                {goal.status !== "completed" && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() =>
                                      handleUpdateGoalStatus(goal, "completed")
                                    }
                                    sx={{
                                      background: "#10B981",
                                      "&:hover": { background: "#059669" },
                                    }}
                                  >
                                    Concluir Meta
                                  </Button>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() => openEditGoal(goal)}
                                  sx={{ color: "rgba(255,255,255,0.5)" }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  sx={{ color: "#EF4444" }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Check-ins */}
                {selectedPDI.checkins && selectedPDI.checkins.length > 0 && (
                  <Card
                    sx={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "20px",
                    }}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        mb={3}
                      >
                        <EventNoteIcon sx={{ color: "#8B5CF6" }} />
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          color="white"
                        >
                          Histórico de Check-ins
                        </Typography>
                      </Stack>

                      <Stack spacing={2}>
                        {selectedPDI.checkins.map((checkin) => (
                          <Paper
                            key={checkin.id}
                            sx={{
                              p: 3,
                              background: "rgba(255,255,255,0.02)",
                              borderRadius: "12px",
                              borderLeft: `4px solid ${
                                checkin.checkin_type === "manager"
                                  ? "#F59E0B"
                                  : "#8B5CF6"
                              }`,
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              mb={2}
                            >
                              <Typography color="white" fontWeight="bold">
                                {checkin.author?.name || "Colaborador"}
                              </Typography>
                              <Typography color="rgba(255,255,255,0.5)">
                                {formatDate(checkin.checkin_date)}
                              </Typography>
                            </Stack>

                            {checkin.progress && (
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="#10B981"
                                  fontWeight="bold"
                                >
                                  Progresso:
                                </Typography>
                                <Typography color="rgba(255,255,255,0.7)">
                                  {checkin.progress}
                                </Typography>
                              </Box>
                            )}

                            {checkin.challenges && (
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="#EF4444"
                                  fontWeight="bold"
                                >
                                  Desafios:
                                </Typography>
                                <Typography color="rgba(255,255,255,0.7)">
                                  {checkin.challenges}
                                </Typography>
                              </Box>
                            )}

                            {checkin.next_steps && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="#3B82F6"
                                  fontWeight="bold"
                                >
                                  Próximos Passos:
                                </Typography>
                                <Typography color="rgba(255,255,255,0.7)">
                                  {checkin.next_steps}
                                </Typography>
                              </Box>
                            )}

                            {checkin.manager_notes && (
                              <Paper
                                sx={{
                                  p: 2,
                                  mt: 2,
                                  background: "rgba(245, 158, 11, 0.1)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="#F59E0B"
                                  fontWeight="bold"
                                >
                                  Notas do Gestor:
                                </Typography>
                                <Typography color="rgba(255,255,255,0.8)">
                                  {checkin.manager_notes}
                                </Typography>
                              </Paper>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </>
            )
          )}
        </Box>

        {/* ==================== DIALOGS ==================== */}

        {/* Criar PDI - Modal Rico */}
        <Dialog
          open={createDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false);
            setPdiFormStep(0);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              borderRadius: "24px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              overflow: "hidden",
            },
          }}
        >
          {/* Header com gradiente */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%)",
              p: 3,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Padrão decorativo */}
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: -30,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
              }}
            />

            <Stack direction="row" alignItems="center" spacing={2} position="relative">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RocketLaunchIcon sx={{ fontSize: 32, color: "white" }} />
              </Box>
              <Box>
            <Typography variant="h5" fontWeight="bold" color="white">
                  Novo Plano de Desenvolvimento
            </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Defina suas metas e trace seu caminho de crescimento profissional
                </Typography>
              </Box>
            </Stack>

            {/* Indicador de progresso */}
            <Box sx={{ mt: 3, mb: 1 }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="rgba(255,255,255,0.7)">
                  Progresso do preenchimento
                </Typography>
                <Typography variant="caption" fontWeight="bold" color="white">
                  {Math.round(
                    ((pdiForm.title ? 1 : 0) +
                      (pdiForm.description ? 1 : 0) +
                      (pdiForm.period_start ? 1 : 0) +
                      (pdiForm.period_end ? 1 : 0) +
                      (pdiForm.focus_area ? 1 : 0)) /
                      5 *
                      100
                  )}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={
                  ((pdiForm.title ? 1 : 0) +
                    (pdiForm.description ? 1 : 0) +
                    (pdiForm.period_start ? 1 : 0) +
                    (pdiForm.period_end ? 1 : 0) +
                    (pdiForm.focus_area ? 1 : 0)) /
                  5 *
                  100
                }
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    background: "linear-gradient(90deg, #FCD34D 0%, #10B981 100%)",
                  },
                }}
              />
            </Box>
          </Box>

          <DialogContent sx={{ p: 4 }}>
            <Stack spacing={4}>
              {/* Dica informativa */}
              <Alert
                severity="info"
                icon={<LightbulbIcon />}
                sx={{
                  borderRadius: "16px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  "& .MuiAlert-icon": { color: "#3B82F6" },
                }}
              >
                <Typography variant="body2">
                  <strong>Dica:</strong> Um PDI bem estruturado deve ter metas SMART
                  (Específicas, Mensuráveis, Alcançáveis, Relevantes e Temporais).
                  Você poderá adicionar metas e ações após criar o plano.
                </Typography>
              </Alert>

              {/* Título */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Título do seu PDI *
                </Typography>
              <TextField
                fullWidth
                  placeholder="Ex: Desenvolvimento de Liderança 2025"
                value={pdiForm.title}
                onChange={(e) =>
                  setPdiForm({ ...pdiForm, title: e.target.value })
                }
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                      fontSize: "1.1rem",
                    },
                  }}
                />
                {/* Sugestões rápidas */}
                <Stack direction="row" flexWrap="wrap" gap={1} mt={1.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
                    Sugestões:
                  </Typography>
                  {[
                    "Desenvolvimento de Liderança",
                    "Aprimoramento Técnico",
                    "Crescimento Profissional",
                    "Comunicação e Soft Skills",
                  ].map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      onClick={() =>
                        setPdiForm({
                          ...pdiForm,
                          title: `${suggestion} ${new Date().getFullYear()}`,
                        })
                      }
                      sx={{
                        cursor: "pointer",
                        background: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        "&:hover": {
                          background: "rgba(139, 92, 246, 0.2)",
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* Área de Foco */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                  Área de foco principal
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { value: "tecnica", label: "Técnica", icon: <SchoolIcon />, color: "#3B82F6" },
                    { value: "lideranca", label: "Liderança", icon: <GroupsIcon />, color: "#8B5CF6" },
                    { value: "comportamental", label: "Comportamental", icon: <PsychologyIcon />, color: "#10B981" },
                    { value: "carreira", label: "Carreira", icon: <TrendingUpIcon />, color: "#F59E0B" },
                  ].map((area) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={area.value}>
                      <Paper
                        onClick={() => setPdiForm({ ...pdiForm, focus_area: area.value })}
                        sx={{
                          p: 2,
                          textAlign: "center",
                          cursor: "pointer",
                          borderRadius: "16px",
                          border: pdiForm.focus_area === area.value
                            ? `2px solid ${area.color}`
                            : "1px solid rgba(255,255,255,0.1)",
                          background: pdiForm.focus_area === area.value
                            ? `${area.color}15`
                            : "rgba(255,255,255,0.02)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: `${area.color}10`,
                            borderColor: `${area.color}50`,
                            transform: "translateY(-2px)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: pdiForm.focus_area === area.value ? area.color : "text.secondary",
                            mb: 1,
                          }}
                        >
                          {area.icon}
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={pdiForm.focus_area === area.value ? "bold" : "normal"}
                          color={pdiForm.focus_area === area.value ? area.color : "text.primary"}
                        >
                          {area.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Descrição */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Descrição e Objetivos
                </Typography>
              <TextField
                fullWidth
                  placeholder="Descreva seus objetivos gerais e o que espera alcançar..."
                multiline
                rows={3}
                value={pdiForm.description}
                onChange={(e) =>
                  setPdiForm({ ...pdiForm, description: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              </Box>

              {/* Período */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Período do PDI *
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label="Este Semestre"
                      size="small"
                      icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                      onClick={() => {
                        const now = new Date();
                        const month = now.getMonth();
                        const year = now.getFullYear();
                        const start = month < 6
                          ? new Date(year, 0, 1)
                          : new Date(year, 6, 1);
                        const end = month < 6
                          ? new Date(year, 5, 30)
                          : new Date(year, 11, 31);
                        setPdiForm({
                          ...pdiForm,
                          period_start: start.toISOString().split("T")[0],
                          period_end: end.toISOString().split("T")[0],
                        });
                      }}
                      sx={{
                        cursor: "pointer",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        "&:hover": { background: "rgba(16, 185, 129, 0.2)" },
                      }}
                    />
                    <Chip
                      label="Ano Inteiro"
                      size="small"
                      icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                      onClick={() => {
                        const year = new Date().getFullYear();
                        setPdiForm({
                          ...pdiForm,
                          period_start: `${year}-01-01`,
                          period_end: `${year}-12-31`,
                        });
                      }}
                      sx={{
                        cursor: "pointer",
                        background: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        "&:hover": { background: "rgba(139, 92, 246, 0.2)" },
                      }}
                    />
                  </Stack>
                </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Data Início"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={pdiForm.period_start}
                  onChange={(e) =>
                    setPdiForm({ ...pdiForm, period_start: e.target.value })
                  }
                  sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
                />
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={pdiForm.period_end}
                  onChange={(e) =>
                    setPdiForm({ ...pdiForm, period_end: e.target.value })
                  }
                  sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
                />
              </Stack>
              </Box>

              {/* Preview Card */}
              {pdiForm.title && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <AutoAwesomeIcon sx={{ color: "#F59E0B", fontSize: 20 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Preview do seu PDI
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight="bold" color="white" gutterBottom>
                      {pdiForm.title}
                    </Typography>
                    {pdiForm.description && (
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {pdiForm.description.substring(0, 100)}
                        {pdiForm.description.length > 100 && "..."}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {pdiForm.focus_area && (
                        <Chip
                          size="small"
                          label={
                            pdiForm.focus_area === "tecnica" ? "Técnica" :
                            pdiForm.focus_area === "lideranca" ? "Liderança" :
                            pdiForm.focus_area === "comportamental" ? "Comportamental" : "Carreira"
                          }
                          sx={{
                            background: "rgba(139, 92, 246, 0.2)",
                            color: "#A78BFA",
                          }}
                        />
                      )}
                      {pdiForm.period_start && pdiForm.period_end && (
                        <Chip
                          size="small"
                          icon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
                          label={`${new Date(pdiForm.period_start + "T12:00:00").toLocaleDateString("pt-BR")} - ${new Date(pdiForm.period_end + "T12:00:00").toLocaleDateString("pt-BR")}`}
                          sx={{
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60A5FA",
                          }}
                        />
                      )}
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {/* Info sobre próximos passos */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <InfoOutlinedIcon sx={{ color: "text.secondary", mt: 0.3 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Próximos passos após criar:</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, mt: 0.5 }}>
                      <li>Adicione metas específicas para seu desenvolvimento</li>
                      <li>Defina ações concretas para cada meta</li>
                      <li>Acompanhe seu progresso com check-ins regulares</li>
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{
              p: 3,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setPdiFormStep(0);
              }}
              sx={{ borderRadius: "12px" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreatePDI}
              disabled={
                !pdiForm.title || !pdiForm.period_start || !pdiForm.period_end
              }
              startIcon={<RocketLaunchIcon />}
              sx={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                borderRadius: "12px",
                px: 4,
                py: 1.2,
                fontWeight: "bold",
                "&:hover": {
                  background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                },
              }}
            >
              Criar PDI
            </Button>
          </DialogActions>
        </Dialog>

        {/* Meta Dialog */}
        <Dialog
          open={goalDialogOpen}
          onClose={() => setGoalDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              borderRadius: "20px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="span" fontWeight="bold" color="white">
              {editingGoal ? "Editar Meta" : "Nova Meta"}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} mt={2}>
              <TextField
                fullWidth
                label="Título"
                value={goalForm.title}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, title: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={2}
                value={goalForm.description}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, description: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={goalForm.category}
                    label="Categoria"
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, category: e.target.value })
                    }
                    sx={{ borderRadius: "12px" }}
                  >
                    {GOAL_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={goalForm.priority}
                    label="Prioridade"
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        priority: e.target.value as GoalPriority,
                      })
                    }
                    sx={{ borderRadius: "12px" }}
                  >
                    {GOAL_PRIORITIES.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                fullWidth
                label="Data Limite"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={goalForm.due_date}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, due_date: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Critérios de Sucesso"
                multiline
                rows={2}
                value={goalForm.success_criteria}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, success_criteria: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSaveGoal}
              disabled={!goalForm.title}
              sx={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                borderRadius: "12px",
              }}
            >
              {editingGoal ? "Salvar" : "Adicionar"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Ação Dialog */}
        <Dialog
          open={actionDialogOpen}
          onClose={() => setActionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              borderRadius: "20px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="span" fontWeight="bold" color="white">
              {editingAction ? "Editar Ação" : "Nova Ação"}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} mt={2}>
              <TextField
                fullWidth
                label="Título"
                value={actionForm.title}
                onChange={(e) =>
                  setActionForm({ ...actionForm, title: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={2}
                value={actionForm.description}
                onChange={(e) =>
                  setActionForm({ ...actionForm, description: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={actionForm.action_type}
                    label="Tipo"
                    onChange={(e) =>
                      setActionForm({
                        ...actionForm,
                        action_type: e.target.value,
                      })
                    }
                    sx={{ borderRadius: "12px" }}
                  >
                    {ACTION_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Data Limite"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={actionForm.due_date}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, due_date: e.target.value })
                  }
                  sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
                />
              </Stack>
              <TextField
                fullWidth
                label="Link do Recurso"
                value={actionForm.resource_url}
                onChange={(e) =>
                  setActionForm({ ...actionForm, resource_url: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Nome do Recurso"
                value={actionForm.resource_name}
                onChange={(e) =>
                  setActionForm({
                    ...actionForm,
                    resource_name: e.target.value,
                  })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSaveAction}
              disabled={!actionForm.title}
              sx={{
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                borderRadius: "12px",
              }}
            >
              {editingAction ? "Salvar" : "Adicionar"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Check-in Dialog */}
        <Dialog
          open={checkinDialogOpen}
          onClose={() => setCheckinDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              borderRadius: "20px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="span" fontWeight="bold" color="white">
              Registrar Check-in
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} mt={2}>
              <TextField
                fullWidth
                label="O que você conquistou?"
                multiline
                rows={3}
                value={checkinForm.progress}
                onChange={(e) =>
                  setCheckinForm({ ...checkinForm, progress: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Quais desafios está enfrentando?"
                multiline
                rows={3}
                value={checkinForm.challenges}
                onChange={(e) =>
                  setCheckinForm({ ...checkinForm, challenges: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
              <TextField
                fullWidth
                label="Próximos passos"
                multiline
                rows={3}
                value={checkinForm.next_steps}
                onChange={(e) =>
                  setCheckinForm({ ...checkinForm, next_steps: e.target.value })
                }
                sx={{ "& .MuiInputBase-root": { borderRadius: "12px" } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setCheckinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleAddCheckin}
              disabled={!checkinForm.progress}
              sx={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                borderRadius: "12px",
              }}
            >
              Registrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ borderRadius: "12px" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
