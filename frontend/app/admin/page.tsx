"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Avatar,
  Chip,
  TextField,
  Button,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Skeleton,
  Divider,
  Paper,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RefreshIcon from "@mui/icons-material/Refresh";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import LockResetIcon from "@mui/icons-material/LockReset";
import FolderIcon from "@mui/icons-material/Folder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import BadgeIcon from "@mui/icons-material/Badge";
import {
  adminAPI,
  authAPI,
  documentsAPI,
  DashboardStats,
  User,
  AuditLog,
  FullProfile,
  Document,
} from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e84b8a" },
    secondary: { main: "#3B82F6" },
    background: {
      default: "#0a0a12",
      paper: "rgba(255,255,255,0.03)",
    },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255,255,255,0.05)",
        },
        head: {
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          color: "rgba(255,255,255,0.5)",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.02)",
          },
        },
      },
    },
  },
});

const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.03)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.5)",
    "&.Mui-focused": { color: "#3B82F6" },
  },
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ width: "100%" }}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Audit logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsRowsPerPage, setLogsRowsPerPage] = useState(20);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsActionFilter, setLogsActionFilter] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);

  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProfile, setEditingProfile] = useState<FullProfile | null>(
    null
  );
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Documents state
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docStats, setDocStats] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  } | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<Document | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // User documents (for expanded view)
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [userDocsLoading, setUserDocsLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // User history (for expanded view)
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const user = authAPI.getUser();

    if (!token || !user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      router.push("/hub");
      return;
    }

    setCurrentUser(user);
    loadDashboardData();
  }, [router]);

  // Carregar usuários automaticamente ao montar
  useEffect(() => {
    if (mounted && currentUser) {
      loadUsers();
    }
  }, [mounted, currentUser]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, docStatsRes] = await Promise.all([
        adminAPI.getStats(),
        documentsAPI.admin.getStats(),
      ]);
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
      if (docStatsRes.success) {
        setDocStats(docStatsRes.stats);
      }
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminAPI.getUsers({
        page: usersPage + 1,
        limit: usersRowsPerPage,
        search: usersSearch,
        role: usersRoleFilter,
        sortBy: "name",
        sortOrder: "asc",
      });
      if (res.success) {
        setUsers(res.users || []);
        setUsersTotal(res.pagination.total);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersRowsPerPage, usersSearch, usersRoleFilter]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await adminAPI.getAuditLogs({
        page: logsPage + 1,
        limit: logsRowsPerPage,
        search: logsSearch,
        action: logsActionFilter,
      });
      if (res.success) {
        setLogs(res.logs || []);
        setLogsTotal(res.pagination.total);
      }
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsRowsPerPage, logsSearch, logsActionFilter]);

  useEffect(() => {
    if (tabValue === 0 && mounted) {
      loadUsers();
    }
  }, [tabValue, loadUsers, mounted]);

  useEffect(() => {
    if (tabValue === 1 && mounted) {
      loadLogs();
    }
  }, [tabValue, loadLogs, mounted]);

  const loadPendingDocs = async () => {
    setDocsLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        documentsAPI.admin.getPending(),
        documentsAPI.admin.getStats(),
      ]);
      if (docsRes.success) {
        setPendingDocs(docsRes.documents || []);
      }
      if (statsRes.success) {
        setDocStats(statsRes.stats);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleApproveDoc = async (doc: Document) => {
    try {
      await documentsAPI.admin.approve(doc.id);
      setSnackbar({
        open: true,
        message: "Documento aprovado com sucesso!",
        severity: "success",
      });
      loadPendingDocs();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao aprovar documento",
        severity: "error",
      });
    }
  };

  const handleRejectDoc = async () => {
    if (!rejectingDoc) return;
    try {
      await documentsAPI.admin.reject(rejectingDoc.id, rejectReason);
      setSnackbar({
        open: true,
        message: "Documento rejeitado",
        severity: "info",
      });
      setRejectDialogOpen(false);
      setRejectingDoc(null);
      setRejectReason("");
      loadPendingDocs();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao rejeitar documento",
        severity: "error",
      });
    }
  };

  const handleDownloadDoc = async (doc: Document) => {
    try {
      await documentsAPI.admin.download(doc.id, doc.original_name);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao baixar documento",
        severity: "error",
      });
    }
  };

  const loadUserDocuments = async (userId: string) => {
    setUserDocsLoading(true);
    try {
      const res = await documentsAPI.admin.getAll({ user_id: userId });
      if (res.success) {
        setUserDocuments(res.documents || []);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos do usuário:", err);
    } finally {
      setUserDocsLoading(false);
    }
  };

  const loadUserLogs = async (userId: string) => {
    setUserLogsLoading(true);
    try {
      const res = await adminAPI.getAuditLogs({
        entityType: "user",
        adminId: userId,
      });
      if (res.success) {
        // Filtra logs relacionados a esse usuário (como alvo ou admin)
        const filteredLogs = (res.logs || []).filter(
          (log) => log.entity_id === userId || log.admin_id === userId
        );
        setUserLogs(filteredLogs.slice(0, 10)); // Limita a 10 logs
      }
    } catch (err) {
      console.error("Erro ao carregar histórico do usuário:", err);
    } finally {
      setUserLogsLoading(false);
    }
  };

  const handleExpandUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDocuments([]);
      setUserLogs([]);
    } else {
      setExpandedUserId(userId);
      await Promise.all([loadUserDocuments(userId), loadUserLogs(userId)]);
    }
  };

  const handleEditUser = async (user: User) => {
    try {
      const res = await adminAPI.getUserById(user.id);
      if (res.success) {
        setEditingUser(res.user);
        setEditingProfile(res.profile);
        setEditForm({
          name: res.user.name || "",
          email: res.user.email || "",
          cpf: res.user.cpf || "",
          company: res.user.company || "",
          position: res.user.position || "",
          role: res.user.role || "user",
          nome: res.profile?.nome || "",
          codinome: res.profile?.codinome || "",
          email_empresarial: res.profile?.email_empresarial || "",
          email_pessoal: res.profile?.email_pessoal || "",
          telefone1: res.profile?.telefone1 || "",
          telefone2: res.profile?.telefone2 || "",
          rg: res.profile?.rg || "",
          cnh: res.profile?.cnh || "",
          sexo: res.profile?.sexo || "",
          estado_civil: res.profile?.estado_civil || "",
          password: "",
        });
        setEditDialogOpen(true);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao carregar usuário",
        severity: "error",
      });
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setEditSaving(true);

    try {
      // Atualiza dados do usuário
      const userUpdate: Record<string, string> = {};
      if (editForm.name !== editingUser.name) userUpdate.name = editForm.name;
      if (editForm.email !== editingUser.email)
        userUpdate.email = editForm.email;
      if (editForm.cpf !== editingUser.cpf) userUpdate.cpf = editForm.cpf;
      if (editForm.company !== (editingUser.company || ""))
        userUpdate.company = editForm.company;
      if (editForm.position !== (editingUser.position || ""))
        userUpdate.position = editForm.position;
      if (editForm.password) userUpdate.password = editForm.password;

      if (Object.keys(userUpdate).length > 0) {
        await adminAPI.updateUser(editingUser.id, userUpdate);
      }

      // Atualiza role se mudou
      if (editForm.role !== editingUser.role) {
        await adminAPI.updateUserRole(editingUser.id, editForm.role);
      }

      // Atualiza perfil
      const profileUpdate: Record<string, string> = {};
      if (editingProfile) {
        if (editForm.nome !== (editingProfile.nome || ""))
          profileUpdate.nome = editForm.nome;
        if (editForm.codinome !== (editingProfile.codinome || ""))
          profileUpdate.codinome = editForm.codinome;
        if (
          editForm.email_empresarial !==
          (editingProfile.email_empresarial || "")
        )
          profileUpdate.email_empresarial = editForm.email_empresarial;
        if (editForm.email_pessoal !== (editingProfile.email_pessoal || ""))
          profileUpdate.email_pessoal = editForm.email_pessoal;
        if (editForm.telefone1 !== (editingProfile.telefone1 || ""))
          profileUpdate.telefone1 = editForm.telefone1;
        if (editForm.telefone2 !== (editingProfile.telefone2 || ""))
          profileUpdate.telefone2 = editForm.telefone2;
        if (editForm.rg !== (editingProfile.rg || ""))
          profileUpdate.rg = editForm.rg;
        if (editForm.cnh !== (editingProfile.cnh || ""))
          profileUpdate.cnh = editForm.cnh;
        if (editForm.sexo !== (editingProfile.sexo || ""))
          profileUpdate.sexo = editForm.sexo;
        if (editForm.estado_civil !== (editingProfile.estado_civil || ""))
          profileUpdate.estado_civil = editForm.estado_civil;
      }

      if (Object.keys(profileUpdate).length > 0) {
        await adminAPI.updateUserProfile(editingUser.id, profileUpdate);
      }

      setSnackbar({
        open: true,
        message: "Usuário atualizado com sucesso!",
        severity: "success",
      });
      setEditDialogOpen(false);
      loadUsers();
      loadDashboardData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao salvar",
        severity: "error",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await adminAPI.deleteUser(deletingUser.id);
      setSnackbar({
        open: true,
        message: "Usuário deletado com sucesso!",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      loadUsers();
      loadDashboardData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao deletar",
        severity: "error",
      });
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await adminAPI.updateUserRole(user.id, newRole);
      setSnackbar({
        open: true,
        message: `Role alterado para ${newRole}`,
        severity: "success",
      });
      loadUsers();
      loadDashboardData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Erro ao alterar role",
        severity: "error",
      });
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "#10B981";
      case "UPDATE":
        return "#3B82F6";
      case "DELETE":
        return "#EF4444";
      case "ROLE_CHANGE":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "CREATE":
        return "Criação";
      case "UPDATE":
        return "Atualização";
      case "DELETE":
        return "Exclusão";
      case "ROLE_CHANGE":
        return "Mudança de Role";
      default:
        return action;
    }
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
            left: "10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.1) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -300,
            right: "10%",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            filter: "blur(100px)",
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

        {/* Main Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            p: { xs: 2, md: 4 },
            pt: { xs: 10, md: 8 },
          }}
        >
          <Box sx={{ maxWidth: 1400, mx: "auto" }}>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                mb={4}
                spacing={2}
              >
                <Box>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    sx={{
                      background:
                        "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 50%, #3B82F6 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      mb: 1,
                    }}
                  >
                    Painel Administrativo
                  </Typography>
                  <Typography color="rgba(255,255,255,0.5)">
                    Gerencie usuários, permissões e monitore atividades do
                    sistema
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    icon={<SecurityIcon />}
                    label="Admin"
                    sx={{
                      background:
                        "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      background:
                        "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                      fontWeight: 700,
                    }}
                  >
                    {currentUser?.name ? getInitials(currentUser.name) : "AD"}
                  </Avatar>
                </Stack>
              </Stack>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 3,
                  mb: 4,
                }}
              >
                {/* Total Users */}
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background:
                        "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)",
                    }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                        >
                          Total de Usuários
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#fff">
                          {loading ? (
                            <Skeleton width={60} />
                          ) : (
                            stats?.total_users || 0
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: "rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <PeopleIcon sx={{ color: "#3B82F6", fontSize: 28 }} />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Admins */}
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background:
                        "linear-gradient(90deg, #e84b8a 0%, #ff6b9d 100%)",
                    }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                        >
                          Administradores
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#fff">
                          {loading ? (
                            <Skeleton width={60} />
                          ) : (
                            stats?.total_admins || 0
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: "rgba(232, 75, 138, 0.2)",
                        }}
                      >
                        <AdminPanelSettingsIcon
                          sx={{ color: "#e84b8a", fontSize: 28 }}
                        />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Recent Users */}
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background:
                        "linear-gradient(90deg, #10B981 0%, #059669 100%)",
                    }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                        >
                          Novos (7 dias)
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#fff">
                          {loading ? (
                            <Skeleton width={60} />
                          ) : (
                            stats?.recent_users || 0
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: "rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        <TrendingUpIcon
                          sx={{ color: "#10B981", fontSize: 28 }}
                        />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Recent Logs */}
                <Card
                  sx={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background:
                        "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)",
                    }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                        >
                          Ações (7 dias)
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="#fff">
                          {loading ? (
                            <Skeleton width={60} />
                          ) : (
                            stats?.recent_logs || 0
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: "rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <HistoryIcon sx={{ color: "#F59E0B", fontSize: 28 }} />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card
                sx={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "24px",
                  overflow: "hidden",
                }}
              >
                <Tabs
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  sx={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    "& .MuiTab-root": {
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                      textTransform: "none",
                      fontSize: "1rem",
                      py: 2,
                      "&.Mui-selected": {
                        color: "#fff",
                      },
                    },
                    "& .MuiTabs-indicator": {
                      background:
                        "linear-gradient(90deg, #e84b8a 0%, #3B82F6 100%)",
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                    },
                  }}
                >
                  <Tab
                    icon={<BadgeIcon />}
                    iconPosition="start"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Colaboradores</span>
                        {docStats && docStats.pending > 0 && (
                          <Chip
                            size="small"
                            label={`${docStats.pending} docs`}
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              background: "#F59E0B",
                              color: "#fff",
                            }}
                          />
                        )}
                      </Stack>
                    }
                  />
                  <Tab
                    icon={<HistoryIcon />}
                    iconPosition="start"
                    label="Histórico"
                  />
                </Tabs>

                {/* Users Tab */}
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ p: 3 }}>
                    {/* Filters */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      mb={3}
                    >
                      <TextField
                        placeholder="Buscar por nome, email ou CPF..."
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        size="small"
                        sx={{ ...textFieldStyles, flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon
                                sx={{ color: "rgba(255,255,255,0.3)" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={usersRoleFilter}
                          onChange={(e) => setUsersRoleFilter(e.target.value)}
                          displayEmpty
                          sx={{
                            ...textFieldStyles["& .MuiOutlinedInput-root"],
                            "& .MuiSelect-select": { color: "#fff" },
                          }}
                        >
                          <MenuItem value="">Todos os Roles</MenuItem>
                          <MenuItem value="user">Usuário</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadUsers}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#3B82F6",
                            background: "rgba(59, 130, 246, 0.1)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {/* Collaborators Table */}
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell width={40}></TableCell>
                            <TableCell>Colaborador</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>CPF</TableCell>
                            <TableCell>Cargo</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {usersLoading ? (
                            [...Array(5)].map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={7}>
                                  <Skeleton height={50} />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : users.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                align="center"
                                sx={{ py: 4 }}
                              >
                                <Typography color="rgba(255,255,255,0.5)">
                                  Nenhum colaborador encontrado
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((user) => (
                              <React.Fragment key={user.id || user.cpf}>
                                <TableRow
                                  sx={{
                                    cursor: "pointer",
                                    "&:hover": {
                                      background: "rgba(255,255,255,0.03)",
                                    },
                                    ...(expandedUserId === user.id && {
                                      background: "rgba(59, 130, 246, 0.05)",
                                    }),
                                  }}
                                  onClick={() =>
                                    user.has_system_user &&
                                    handleExpandUser(user.id)
                                  }
                                >
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      sx={{ color: "rgba(255,255,255,0.5)" }}
                                    >
                                      {expandedUserId === user.id ? (
                                        <ExpandLessIcon />
                                      ) : (
                                        <ExpandMoreIcon />
                                      )}
                                    </IconButton>
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 200 }}>
                                    <Stack
                                      direction="row"
                                      spacing={2}
                                      alignItems="center"
                                    >
                                      <Avatar
                                        sx={{
                                          width: 40,
                                          height: 40,
                                          background:
                                            user.role === "admin"
                                              ? "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)"
                                              : "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                                          fontSize: "0.875rem",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {getInitials(user.name)}
                                      </Avatar>
                                      <Tooltip
                                        title={user.name}
                                        arrow
                                        placement="top"
                                      >
                                        <Typography
                                          color="#fff"
                                          fontWeight={500}
                                          sx={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {user.name}
                                        </Typography>
                                      </Tooltip>
                                    </Stack>
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 180 }}>
                                    <Tooltip
                                      title={user.email}
                                      arrow
                                      placement="top"
                                    >
                                      <Typography
                                        color="rgba(255,255,255,0.7)"
                                        fontSize="0.875rem"
                                        sx={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {user.email}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Typography
                                      color="rgba(255,255,255,0.7)"
                                      fontSize="0.875rem"
                                      fontFamily="monospace"
                                    >
                                      {user.cpf || "-"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 150 }}>
                                    <Tooltip
                                      title={user.position || "-"}
                                      arrow
                                      placement="top"
                                    >
                                      <Typography
                                        color="rgba(255,255,255,0.7)"
                                        fontSize="0.875rem"
                                        sx={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {user.position || "-"}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      flexWrap="wrap"
                                      gap={0.5}
                                    >
                                      {user.has_system_user ? (
                                        <Chip
                                          size="small"
                                          label={
                                            user.role === "admin"
                                              ? "Admin"
                                              : "Cadastrado"
                                          }
                                          icon={
                                            user.role === "admin" ? (
                                              <VerifiedUserIcon />
                                            ) : (
                                              <CheckCircleIcon />
                                            )
                                          }
                                          sx={{
                                            background:
                                              user.role === "admin"
                                                ? "rgba(232, 75, 138, 0.2)"
                                                : "rgba(16, 185, 129, 0.2)",
                                            color:
                                              user.role === "admin"
                                                ? "#e84b8a"
                                                : "#10B981",
                                            fontWeight: 600,
                                            fontSize: "0.7rem",
                                            height: 24,
                                            "& .MuiChip-icon": {
                                              color:
                                                user.role === "admin"
                                                  ? "#e84b8a"
                                                  : "#10B981",
                                            },
                                          }}
                                        />
                                      ) : (
                                        <Chip
                                          size="small"
                                          label="Não cadastrado"
                                          icon={<PersonIcon />}
                                          sx={{
                                            background:
                                              "rgba(245, 158, 11, 0.2)",
                                            color: "#F59E0B",
                                            fontWeight: 600,
                                            fontSize: "0.7rem",
                                            height: 24,
                                            "& .MuiChip-icon": {
                                              color: "#F59E0B",
                                            },
                                          }}
                                        />
                                      )}
                                      {user.ativo === false && (
                                        <Chip
                                          size="small"
                                          label="Inativo"
                                          sx={{
                                            background:
                                              "rgba(239, 68, 68, 0.2)",
                                            color: "#EF4444",
                                            fontWeight: 600,
                                            fontSize: "0.7rem",
                                            height: 24,
                                          }}
                                        />
                                      )}
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      justifyContent="flex-end"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {user.has_system_user && (
                                        <>
                                          <Tooltip
                                            title={
                                              user.role === "admin"
                                                ? "Remover Admin"
                                                : "Tornar Admin"
                                            }
                                          >
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleToggleRole(user)
                                              }
                                              disabled={
                                                user.id === currentUser?.id
                                              }
                                              sx={{
                                                color:
                                                  user.role === "admin"
                                                    ? "#F59E0B"
                                                    : "#10B981",
                                                "&:hover": {
                                                  background:
                                                    user.role === "admin"
                                                      ? "rgba(245, 158, 11, 0.1)"
                                                      : "rgba(16, 185, 129, 0.1)",
                                                },
                                              }}
                                            >
                                              {user.role === "admin" ? (
                                                <PersonOffIcon />
                                              ) : (
                                                <AdminPanelSettingsIcon />
                                              )}
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Editar Dados">
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleEditUser(user)
                                              }
                                              sx={{
                                                color: "#3B82F6",
                                                "&:hover": {
                                                  background:
                                                    "rgba(59, 130, 246, 0.1)",
                                                },
                                              }}
                                            >
                                              <EditIcon />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Excluir">
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                setDeletingUser(user);
                                                setDeleteDialogOpen(true);
                                              }}
                                              disabled={
                                                user.id === currentUser?.id
                                              }
                                              sx={{
                                                color: "#EF4444",
                                                "&:hover": {
                                                  background:
                                                    "rgba(239, 68, 68, 0.1)",
                                                },
                                              }}
                                            >
                                              <DeleteIcon />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                      {!user.has_system_user && (
                                        <Typography
                                          variant="caption"
                                          color="rgba(255,255,255,0.4)"
                                          sx={{ fontStyle: "italic" }}
                                        >
                                          Sem conta
                                        </Typography>
                                      )}
                                    </Stack>
                                  </TableCell>
                                </TableRow>

                                {/* Expanded Row - Documents */}
                                {expandedUserId === user.id &&
                                  user.has_system_user && (
                                    <TableRow>
                                      <TableCell
                                        colSpan={7}
                                        sx={{
                                          background: "rgba(0,0,0,0.2)",
                                          p: 0,
                                        }}
                                      >
                                        <Box sx={{ p: 3 }}>
                                          <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            mb={2}
                                          >
                                            <FolderIcon
                                              sx={{ color: "#3B82F6" }}
                                            />
                                            <Typography
                                              variant="subtitle1"
                                              fontWeight="bold"
                                              color="white"
                                            >
                                              Documentos de {user.name}
                                            </Typography>
                                          </Stack>

                                          {userDocsLoading ? (
                                            <Stack spacing={1}>
                                              <Skeleton height={40} />
                                              <Skeleton height={40} />
                                            </Stack>
                                          ) : userDocuments.length === 0 ? (
                                            <Alert
                                              severity="info"
                                              sx={{
                                                background:
                                                  "rgba(59, 130, 246, 0.1)",
                                                border:
                                                  "1px solid rgba(59, 130, 246, 0.2)",
                                                borderRadius: "12px",
                                              }}
                                            >
                                              Nenhum documento enviado por este
                                              colaborador
                                            </Alert>
                                          ) : (
                                            <TableContainer>
                                              <Table size="small">
                                                <TableHead>
                                                  <TableRow>
                                                    <TableCell>
                                                      Documento
                                                    </TableCell>
                                                    <TableCell>Tipo</TableCell>
                                                    <TableCell>
                                                      Status
                                                    </TableCell>
                                                    <TableCell>
                                                      Enviado em
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      Ações
                                                    </TableCell>
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {userDocuments.map((doc) => (
                                                    <TableRow key={doc.id}>
                                                      <TableCell>
                                                        <Typography
                                                          color="white"
                                                          fontSize="0.875rem"
                                                        >
                                                          {doc.name}
                                                        </Typography>
                                                        <Typography
                                                          color="rgba(255,255,255,0.5)"
                                                          fontSize="0.75rem"
                                                        >
                                                          {doc.original_name}
                                                        </Typography>
                                                      </TableCell>
                                                      <TableCell>
                                                        <Chip
                                                          size="small"
                                                          label={doc.type.toUpperCase()}
                                                          sx={{
                                                            background:
                                                              "rgba(59, 130, 246, 0.2)",
                                                            color: "#3B82F6",
                                                            fontSize: "0.7rem",
                                                          }}
                                                        />
                                                      </TableCell>
                                                      <TableCell>
                                                        <Chip
                                                          size="small"
                                                          label={
                                                            doc.status ===
                                                            "approved"
                                                              ? "Aprovado"
                                                              : doc.status ===
                                                                "pending"
                                                              ? "Pendente"
                                                              : "Rejeitado"
                                                          }
                                                          sx={{
                                                            background:
                                                              doc.status ===
                                                              "approved"
                                                                ? "rgba(16, 185, 129, 0.2)"
                                                                : doc.status ===
                                                                  "pending"
                                                                ? "rgba(245, 158, 11, 0.2)"
                                                                : "rgba(239, 68, 68, 0.2)",
                                                            color:
                                                              doc.status ===
                                                              "approved"
                                                                ? "#10B981"
                                                                : doc.status ===
                                                                  "pending"
                                                                ? "#F59E0B"
                                                                : "#EF4444",
                                                            fontSize: "0.7rem",
                                                          }}
                                                        />
                                                      </TableCell>
                                                      <TableCell>
                                                        <Typography
                                                          color="rgba(255,255,255,0.5)"
                                                          fontSize="0.8rem"
                                                        >
                                                          {formatDate(
                                                            doc.created_at
                                                          )}
                                                        </Typography>
                                                      </TableCell>
                                                      <TableCell align="right">
                                                        <Stack
                                                          direction="row"
                                                          spacing={0.5}
                                                          justifyContent="flex-end"
                                                        >
                                                          <Tooltip title="Baixar">
                                                            <IconButton
                                                              size="small"
                                                              onClick={() =>
                                                                handleDownloadDoc(
                                                                  doc
                                                                )
                                                              }
                                                              sx={{
                                                                color:
                                                                  "#3B82F6",
                                                              }}
                                                            >
                                                              <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                          </Tooltip>
                                                          {doc.status ===
                                                            "pending" && (
                                                            <>
                                                              <Tooltip title="Aprovar">
                                                                <IconButton
                                                                  size="small"
                                                                  onClick={() => {
                                                                    handleApproveDoc(
                                                                      doc
                                                                    );
                                                                    setTimeout(
                                                                      () =>
                                                                        loadUserDocuments(
                                                                          user.id
                                                                        ),
                                                                      500
                                                                    );
                                                                  }}
                                                                  sx={{
                                                                    color:
                                                                      "#10B981",
                                                                  }}
                                                                >
                                                                  <CheckCircleIcon fontSize="small" />
                                                                </IconButton>
                                                              </Tooltip>
                                                              <Tooltip title="Rejeitar">
                                                                <IconButton
                                                                  size="small"
                                                                  onClick={() => {
                                                                    setRejectingDoc(
                                                                      doc
                                                                    );
                                                                    setRejectDialogOpen(
                                                                      true
                                                                    );
                                                                  }}
                                                                  sx={{
                                                                    color:
                                                                      "#EF4444",
                                                                  }}
                                                                >
                                                                  <CancelIcon fontSize="small" />
                                                                </IconButton>
                                                              </Tooltip>
                                                            </>
                                                          )}
                                                        </Stack>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </TableContainer>
                                          )}

                                          {/* Histórico de Ações */}
                                          <Divider
                                            sx={{
                                              my: 3,
                                              borderColor:
                                                "rgba(255,255,255,0.1)",
                                            }}
                                          />
                                          <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            mb={2}
                                          >
                                            <HistoryIcon
                                              sx={{ color: "#F59E0B" }}
                                            />
                                            <Typography
                                              variant="subtitle1"
                                              fontWeight="bold"
                                              color="white"
                                            >
                                              Histórico de Ações
                                            </Typography>
                                          </Stack>

                                          {userLogsLoading ? (
                                            <Stack spacing={1}>
                                              <Skeleton height={40} />
                                              <Skeleton height={40} />
                                            </Stack>
                                          ) : userLogs.length === 0 ? (
                                            <Alert
                                              severity="info"
                                              sx={{
                                                background:
                                                  "rgba(245, 158, 11, 0.1)",
                                                border:
                                                  "1px solid rgba(245, 158, 11, 0.2)",
                                                borderRadius: "12px",
                                              }}
                                            >
                                              Nenhuma ação registrada para este
                                              colaborador
                                            </Alert>
                                          ) : (
                                            <Stack spacing={1}>
                                              {userLogs.map((log) => (
                                                <Paper
                                                  key={log.id}
                                                  sx={{
                                                    p: 1.5,
                                                    background:
                                                      "rgba(255,255,255,0.02)",
                                                    border:
                                                      "1px solid rgba(255,255,255,0.05)",
                                                    borderRadius: "8px",
                                                    borderLeft: `3px solid ${getActionColor(
                                                      log.action
                                                    )}`,
                                                  }}
                                                >
                                                  <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                  >
                                                    <Box>
                                                      <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        alignItems="center"
                                                        mb={0.5}
                                                      >
                                                        <Chip
                                                          size="small"
                                                          label={getActionLabel(
                                                            log.action
                                                          )}
                                                          sx={{
                                                            background: `${getActionColor(
                                                              log.action
                                                            )}20`,
                                                            color:
                                                              getActionColor(
                                                                log.action
                                                              ),
                                                            fontWeight: 600,
                                                            fontSize: "0.65rem",
                                                            height: 20,
                                                          }}
                                                        />
                                                        <Typography
                                                          variant="caption"
                                                          color="rgba(255,255,255,0.5)"
                                                        >
                                                          {log.entity_type}
                                                        </Typography>
                                                      </Stack>
                                                      <Typography
                                                        variant="body2"
                                                        color="white"
                                                        fontWeight={500}
                                                      >
                                                        {log.description}
                                                      </Typography>
                                                      {log.field_name && (
                                                        <Typography
                                                          variant="caption"
                                                          color="rgba(255,255,255,0.5)"
                                                        >
                                                          {log.field_name}:{" "}
                                                          {log.old_value || "-"}{" "}
                                                          →{" "}
                                                          {log.new_value || "-"}
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                    <Stack alignItems="flex-end">
                                                      <Typography
                                                        variant="caption"
                                                        color="rgba(255,255,255,0.5)"
                                                      >
                                                        {log.admin_name}
                                                      </Typography>
                                                      <Typography
                                                        variant="caption"
                                                        color="rgba(255,255,255,0.3)"
                                                      >
                                                        {formatDate(
                                                          log.created_at
                                                        )}
                                                      </Typography>
                                                    </Stack>
                                                  </Stack>
                                                </Paper>
                                              ))}
                                            </Stack>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  )}
                              </React.Fragment>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={usersTotal}
                      page={usersPage}
                      onPageChange={(_, p) => setUsersPage(p)}
                      rowsPerPage={usersRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setUsersRowsPerPage(parseInt(e.target.value, 10));
                        setUsersPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      labelRowsPerPage="Por página:"
                      labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count}`
                      }
                      sx={{
                        color: "rgba(255,255,255,0.7)",
                        "& .MuiTablePagination-selectIcon": {
                          color: "rgba(255,255,255,0.5)",
                        },
                      }}
                    />
                  </Box>
                </TabPanel>

                {/* Audit Logs Tab */}
                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ p: 3 }}>
                    {/* Filters */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      mb={3}
                    >
                      <TextField
                        placeholder="Buscar nos logs..."
                        value={logsSearch}
                        onChange={(e) => setLogsSearch(e.target.value)}
                        size="small"
                        sx={{ ...textFieldStyles, flex: 1 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon
                                sx={{ color: "rgba(255,255,255,0.3)" }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                          value={logsActionFilter}
                          onChange={(e) => setLogsActionFilter(e.target.value)}
                          displayEmpty
                          sx={{
                            ...textFieldStyles["& .MuiOutlinedInput-root"],
                            "& .MuiSelect-select": { color: "#fff" },
                          }}
                        >
                          <MenuItem value="">Todas as Ações</MenuItem>
                          <MenuItem value="CREATE">Criação</MenuItem>
                          <MenuItem value="UPDATE">Atualização</MenuItem>
                          <MenuItem value="DELETE">Exclusão</MenuItem>
                          <MenuItem value="ROLE_CHANGE">
                            Mudança de Role
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadLogs}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#3B82F6",
                            background: "rgba(59, 130, 246, 0.1)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {/* Logs Timeline */}
                    {logsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(5)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={80}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : logs.length === 0 ? (
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 8,
                        }}
                      >
                        <HistoryIcon
                          sx={{
                            fontSize: 64,
                            color: "rgba(255,255,255,0.1)",
                            mb: 2,
                          }}
                        />
                        <Typography color="rgba(255,255,255,0.5)">
                          Nenhum registro de alteração encontrado
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2}>
                        {logs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Paper
                              sx={{
                                p: 2,
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "12px",
                                borderLeft: `4px solid ${getActionColor(
                                  log.action
                                )}`,
                              }}
                            >
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                justifyContent="space-between"
                                spacing={2}
                              >
                                <Box>
                                  <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    mb={1}
                                  >
                                    <Chip
                                      size="small"
                                      label={getActionLabel(log.action)}
                                      sx={{
                                        background: `${getActionColor(
                                          log.action
                                        )}20`,
                                        color: getActionColor(log.action),
                                        fontWeight: 600,
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      color="rgba(255,255,255,0.5)"
                                    >
                                      {log.entity_type}
                                    </Typography>
                                  </Stack>
                                  <Typography color="#fff" fontWeight={500}>
                                    {log.description}
                                  </Typography>
                                  {log.field_name && (
                                    <Typography
                                      variant="body2"
                                      color="rgba(255,255,255,0.5)"
                                      mt={0.5}
                                    >
                                      Campo: <strong>{log.field_name}</strong>
                                      {log.old_value && (
                                        <>
                                          {" "}
                                          | De:{" "}
                                          <span style={{ color: "#EF4444" }}>
                                            {log.old_value}
                                          </span>
                                        </>
                                      )}
                                      {log.new_value && (
                                        <>
                                          {" "}
                                          → Para:{" "}
                                          <span style={{ color: "#10B981" }}>
                                            {log.new_value}
                                          </span>
                                        </>
                                      )}
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ textAlign: { md: "right" } }}>
                                  <Typography
                                    variant="body2"
                                    color="rgba(255,255,255,0.7)"
                                  >
                                    {log.admin_name}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    justifyContent={{ md: "flex-end" }}
                                  >
                                    <AccessTimeIcon
                                      sx={{
                                        fontSize: 14,
                                        color: "rgba(255,255,255,0.3)",
                                      }}
                                    />
                                    <Typography
                                      variant="caption"
                                      color="rgba(255,255,255,0.4)"
                                    >
                                      {formatDate(log.created_at)}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Stack>
                            </Paper>
                          </motion.div>
                        ))}
                      </Stack>
                    )}

                    <TablePagination
                      component="div"
                      count={logsTotal}
                      page={logsPage}
                      onPageChange={(_, p) => setLogsPage(p)}
                      rowsPerPage={logsRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setLogsRowsPerPage(parseInt(e.target.value, 10));
                        setLogsPage(0);
                      }}
                      rowsPerPageOptions={[10, 20, 50, 100]}
                      labelRowsPerPage="Por página:"
                      labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count}`
                      }
                      sx={{
                        color: "rgba(255,255,255,0.7)",
                        mt: 2,
                        "& .MuiTablePagination-selectIcon": {
                          color: "rgba(255,255,255,0.5)",
                        },
                      }}
                    />
                  </Box>
                </TabPanel>
              </Card>
            </motion.div>
          </Box>
        </Box>

        {/* Edit User Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
            },
          }}
        >
          <DialogTitle
            sx={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  background:
                    "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                }}
              >
                {editingUser?.name ? getInitials(editingUser.name) : "?"}
              </Avatar>
              <Box>
                <Typography variant="h6" color="#fff">
                  Editar Usuário
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  {editingUser?.email}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={() => setEditDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.5)" }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
                mt: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                color="#e84b8a"
                sx={{ gridColumn: "1 / -1", mt: 1 }}
              >
                Dados do Sistema
              </Typography>

              <TextField
                label="Nome"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Email"
                value={editForm.email || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="CPF"
                value={editForm.cpf || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, cpf: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Empresa"
                value={editForm.company || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, company: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <FormControl fullWidth>
                <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Cargo
                </InputLabel>
                <Select
                  value={editForm.position || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, position: e.target.value })
                  }
                  label="Cargo"
                  sx={{
                    ...textFieldStyles["& .MuiOutlinedInput-root"],
                    "& .MuiSelect-select": { color: "#fff" },
                  }}
                >
                  <MenuItem value="">Sem cargo definido</MenuItem>
                  <MenuItem value="Analista Tributário">
                    Analista Tributário
                  </MenuItem>
                  <MenuItem value="Analista Contábil">
                    Analista Contábil
                  </MenuItem>
                  <MenuItem value="Analista Fiscal">Analista Fiscal</MenuItem>
                  <MenuItem value="Consultor Tributário">
                    Consultor Tributário
                  </MenuItem>
                  <MenuItem value="Consultor Sênior">Consultor Sênior</MenuItem>
                  <MenuItem value="Coordenador">Coordenador</MenuItem>
                  <MenuItem value="Gerente">Gerente</MenuItem>
                  <MenuItem value="Diretor">Diretor</MenuItem>
                  <MenuItem value="Sócio">Sócio</MenuItem>
                  <MenuItem value="Estagiário">Estagiário</MenuItem>
                  <MenuItem value="Assistente Administrativo">
                    Assistente Administrativo
                  </MenuItem>
                  <MenuItem value="Auxiliar Administrativo">
                    Auxiliar Administrativo
                  </MenuItem>
                  <MenuItem value="Recepcionista">Recepcionista</MenuItem>
                  <MenuItem value="TI">TI</MenuItem>
                  <MenuItem value="RH">RH</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>
                  Role
                </InputLabel>
                <Select
                  value={editForm.role || "user"}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  label="Role"
                  disabled={editingUser?.id === currentUser?.id}
                  sx={{
                    ...textFieldStyles["& .MuiOutlinedInput-root"],
                    "& .MuiSelect-select": { color: "#fff" },
                  }}
                >
                  <MenuItem value="user">Usuário</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Nova Senha (deixe vazio para manter)"
                type="password"
                value={editForm.password || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockResetIcon sx={{ color: "rgba(255,255,255,0.3)" }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Divider sx={{ gridColumn: "1 / -1", my: 1 }} />

              <Typography
                variant="subtitle2"
                color="#3B82F6"
                sx={{ gridColumn: "1 / -1" }}
              >
                Dados do Perfil (PessoasFisicasFradema)
              </Typography>

              <TextField
                label="Nome Completo"
                value={editForm.nome || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, nome: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Codinome"
                value={editForm.codinome || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, codinome: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Email Empresarial"
                value={editForm.email_empresarial || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    email_empresarial: e.target.value,
                  })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Email Pessoal"
                value={editForm.email_pessoal || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, email_pessoal: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Telefone 1"
                value={editForm.telefone1 || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, telefone1: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Telefone 2"
                value={editForm.telefone2 || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, telefone2: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="RG"
                value={editForm.rg || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, rg: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="CNH"
                value={editForm.cnh || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, cnh: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Sexo"
                value={editForm.sexo || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, sexo: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
              <TextField
                label="Estado Civil"
                value={editForm.estado_civil || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, estado_civil: e.target.value })
                }
                fullWidth
                sx={textFieldStyles}
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Button
              onClick={() => setEditDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveUser}
              disabled={editSaving}
              startIcon={
                editSaving ? <CircularProgress size={20} /> : <SaveIcon />
              }
              sx={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #059669 0%, #047857 100%)",
                },
              }}
            >
              {editSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "#EF4444" }}>
            Confirmar Exclusão
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)">
              Tem certeza que deseja excluir o usuário{" "}
              <strong style={{ color: "#fff" }}>{deletingUser?.name}</strong>?
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.5)" mt={1}>
              Esta ação não pode ser desfeita.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleDeleteUser}
              sx={{
                background: "#EF4444",
                "&:hover": { background: "#DC2626" },
              }}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Document Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => {
            setRejectDialogOpen(false);
            setRejectingDoc(null);
            setRejectReason("");
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "#EF4444" }}>
            Rejeitar Documento
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)" mb={2}>
              Você está rejeitando o documento{" "}
              <strong style={{ color: "#fff" }}>{rejectingDoc?.name}</strong> de{" "}
              <strong style={{ color: "#fff" }}>
                {rejectingDoc?.user?.name}
              </strong>
              .
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Documento ilegível, fora da validade, etc."
              sx={textFieldStyles}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingDoc(null);
                setRejectReason("");
              }}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleRejectDoc}
              sx={{
                background: "#EF4444",
                "&:hover": { background: "#DC2626" },
              }}
            >
              Rejeitar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
