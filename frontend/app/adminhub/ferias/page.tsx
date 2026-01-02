"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Skeleton,
  Tabs,
  Tab,
  Collapse,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityIcon from "@mui/icons-material/Security";
import PendingIcon from "@mui/icons-material/Pending";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import {
  authAPI,
  vacationAPI,
  User,
  Vacation,
  VacationStatus,
  VacationSellRequest,
  VacationBalance,
} from "@/lib/api";

interface BalanceWithUser extends VacationBalance {
  user_name: string;
  user_email: string;
}

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
  },
});

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

interface UserWithVacations {
  id: string;
  name: string;
  email: string;
  vacations: Vacation[];
  feriasVacations: Vacation[];
  ausenciasVacations: Vacation[];
  sellRequests: VacationSellRequest[];
  pendingCount: number;
  pendingFeriasCount: number;
  pendingAusenciasCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalDays: number;
  soldDays: number;
}

export default function AdminFeriasPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Vacations state
  const [pendingVacations, setPendingVacations] = useState<Vacation[]>([]);
  const [allVacations, setAllVacations] = useState<Vacation[]>([]);
  const [usersWithVacations, setUsersWithVacations] = useState<
    UserWithVacations[]
  >([]);
  const [vacationsLoading, setVacationsLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Venda de férias
  const [sellRequests, setSellRequests] = useState<VacationSellRequest[]>([]);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedSellRequest, setSelectedSellRequest] = useState<VacationSellRequest | null>(null);
  const [sellAction, setSellAction] = useState<"approved" | "rejected">("approved");
  const [sellRejectReason, setSellRejectReason] = useState("");

  // Editar venda de férias
  const [editSellDialogOpen, setEditSellDialogOpen] = useState(false);
  const [editingSellRequest, setEditingSellRequest] = useState<VacationSellRequest | null>(null);
  const [editSellDays, setEditSellDays] = useState(0);

  // Gerenciamento de saldos
  const [balances, setBalances] = useState<BalanceWithUser[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState("");
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [editBalanceForm, setEditBalanceForm] = useState({
    total_days: 30,
    used_days: 0,
    available_days: 30,
    period_start: "",
    period_end: "",
  });


  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingVacation, setRejectingVacation] = useState<Vacation | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVacation, setDeletingVacation] = useState<Vacation | null>(
    null
  );

  // Edit vacation dialog
  const [editVacationDialogOpen, setEditVacationDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [editVacationForm, setEditVacationForm] = useState({
    start_date: "",
    end_date: "",
    total_days: 0,
    reason: "",
  });

  // Create vacation dialog
  const [createVacationDialogOpen, setCreateVacationDialogOpen] = useState(false);
  const [createVacationForm, setCreateVacationForm] = useState({
    user_id: "",
    type: "ferias" as "ferias" | "abono" | "licenca" | "atestado" | "folga" | "home_office",
    start_date: "",
    end_date: "",
    total_days: 0,
    reason: "",
    status: "approved" as "pending" | "approved",
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{id: string; name: string; email: string}[]>([]);
  const [selectedUserForCreate, setSelectedUserForCreate] = useState<{id: string; name: string; email: string} | null>(null);

  // Cancel vacation dialog
  const [cancelVacationDialogOpen, setCancelVacationDialogOpen] = useState(false);
  const [cancelingVacation, setCancelingVacation] = useState<Vacation | null>(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    pendingFerias: 0,
    pendingAusencias: 0,
    approved: 0,
    rejected: 0,
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const checkAuth = () => {
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
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const loadPendingVacations = useCallback(async () => {
    setVacationsLoading(true);
    try {
      const res = await vacationAPI.getPendingApprovals();
      if (res.success) {
        const vacations = res.vacations || [];
        setPendingVacations(vacations);
        const pendingFerias = vacations.filter(
          (v) => v.type === "ferias"
        ).length;
        const pendingAusencias = vacations.filter(
          (v) => v.type !== "ferias"
        ).length;
        setStats((prev) => ({
          ...prev,
          pending: vacations.length,
          pendingFerias,
          pendingAusencias,
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar férias pendentes:", err);
    } finally {
      setVacationsLoading(false);
    }
  }, []);

  const loadSellRequests = useCallback(async () => {
    try {
      // Buscar todas as vendas (não apenas pendentes)
      const res = await vacationAPI.getAllSellRequests();
      if (res.success) {
        setSellRequests(res.requests || []);
      }
    } catch (err) {
      console.error("Erro ao carregar solicitações de venda:", err);
    }
  }, []);

  const handleSellAction = async () => {
    if (!selectedSellRequest) return;
    try {
      const res = await vacationAPI.approveSellRequest(
        selectedSellRequest.id,
        sellAction,
        sellAction === "rejected" ? sellRejectReason : undefined
      );
      if (res.success) {
        setSnackbar({
          open: true,
          message: sellAction === "approved"
            ? "Venda de férias aprovada!"
            : "Venda de férias rejeitada!",
          severity: "success",
        });
        setSellDialogOpen(false);
        setSelectedSellRequest(null);
        setSellRejectReason("");
        loadSellRequests();
      }
    } catch (err) {
      console.error("Erro ao processar venda:", err);
      setSnackbar({
        open: true,
        message: "Erro ao processar solicitação",
        severity: "error",
      });
    }
  };

  // Editar venda de férias
  const openEditSellRequest = (request: VacationSellRequest) => {
    setEditingSellRequest(request);
    setEditSellDays(request.days_to_sell);
    setEditSellDialogOpen(true);
  };

  const handleUpdateSellRequest = async () => {
    if (!editingSellRequest) return;
    try {
      const res = await vacationAPI.updateSellRequest(editingSellRequest.id, editSellDays);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Venda de férias atualizada!",
          severity: "success",
        });
        setEditSellDialogOpen(false);
        setEditingSellRequest(null);
        loadSellRequests();
      }
    } catch (err) {
      console.error("Erro ao atualizar venda:", err);
      setSnackbar({
        open: true,
        message: "Erro ao atualizar solicitação",
        severity: "error",
      });
    }
  };

  // Carregar todos os saldos de férias
  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await vacationAPI.admin.getAllBalances();
      if (res.success) {
        setBalances(res.balances || []);
      }
    } catch (err) {
      console.error("Erro ao carregar saldos:", err);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  // Atualizar saldo de férias
  const handleUpdateBalance = async (userId: string) => {
    try {
      const res = await vacationAPI.admin.updateBalance(userId, editBalanceForm);
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Saldo atualizado com sucesso!",
          severity: "success",
        });
        setEditingBalanceId(null);
        loadBalances();
      }
    } catch (err) {
      console.error("Erro ao atualizar saldo:", err);
      setSnackbar({
        open: true,
        message: "Erro ao atualizar saldo",
        severity: "error",
      });
    }
  };

  // Iniciar edição de saldo
  const startEditBalance = (balance: BalanceWithUser) => {
    setEditingBalanceId(balance.user_id);
    // Formatar datas para o formato do input date (YYYY-MM-DD)
    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toISOString().split("T")[0];
    };
    setEditBalanceForm({
      total_days: balance.total_days,
      used_days: balance.used_days,
      available_days: balance.available_days,
      period_start: formatDateForInput(balance.period_start),
      period_end: formatDateForInput(balance.period_end),
    });
  };

  // Filtrar saldos por busca
  const filteredBalances = balances.filter(
    (b) =>
      b.user_name?.toLowerCase().includes(balanceSearch.toLowerCase()) ||
      b.user_email?.toLowerCase().includes(balanceSearch.toLowerCase())
  );

  // Calcular dias entre datas
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Abrir edição de férias
  const openEditVacation = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setEditVacationForm({
      start_date: vacation.start_date.split("T")[0],
      end_date: vacation.end_date.split("T")[0],
      total_days: vacation.total_days,
      reason: vacation.reason || "",
    });
    setEditVacationDialogOpen(true);
  };

  // Salvar edição de férias
  const handleSaveEditVacation = async () => {
    if (!editingVacation) return;
    try {
      const res = await vacationAPI.adminUpdate(editingVacation.id.toString(), {
        start_date: editVacationForm.start_date,
        end_date: editVacationForm.end_date,
        reason: editVacationForm.reason,
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Férias atualizadas com sucesso!",
          severity: "success",
        });
        setEditVacationDialogOpen(false);
        setEditingVacation(null);
        loadAllVacations();
        loadPendingVacations();
      }
    } catch (err) {
      console.error("Erro ao atualizar férias:", err);
      setSnackbar({
        open: true,
        message: "Erro ao atualizar férias",
        severity: "error",
      });
    }
  };

  // Buscar usuários para criar férias
  const searchUsersForCreate = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const res = await vacationAPI.admin.searchUsers(query);
      if (res.success) {
        setUserSearchResults(res.users || []);
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    }
  };

  // Criar férias manualmente
  const handleCreateVacation = async () => {
    if (!selectedUserForCreate) {
      setSnackbar({
        open: true,
        message: "Selecione um colaborador",
        severity: "error",
      });
      return;
    }
    try {
      const res = await vacationAPI.adminCreate({
        user_id: selectedUserForCreate.id,
        type: createVacationForm.type,
        start_date: createVacationForm.start_date,
        end_date: createVacationForm.end_date,
        reason: createVacationForm.reason,
        status: createVacationForm.status,
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Férias criadas com sucesso!",
          severity: "success",
        });
        setCreateVacationDialogOpen(false);
        setSelectedUserForCreate(null);
        setUserSearchQuery("");
        setUserSearchResults([]);
        setCreateVacationForm({
          user_id: "",
          type: "ferias",
          start_date: "",
          end_date: "",
          total_days: 0,
          reason: "",
          status: "approved",
        });
        loadAllVacations();
        loadBalances();
      }
    } catch (err) {
      console.error("Erro ao criar férias:", err);
      setSnackbar({
        open: true,
        message: "Erro ao criar férias",
        severity: "error",
      });
    }
  };

  // Cancelar férias aprovadas
  const handleCancelVacation = async () => {
    if (!cancelingVacation) return;
    try {
      const res = await vacationAPI.adminUpdate(cancelingVacation.id.toString(), {
        status: "canceled",
      });
      if (res.success) {
        setSnackbar({
          open: true,
          message: "Férias canceladas com sucesso!",
          severity: "success",
        });
        setCancelVacationDialogOpen(false);
        setCancelingVacation(null);
        loadAllVacations();
        loadPendingVacations();
        loadBalances();
      }
    } catch (err) {
      console.error("Erro ao cancelar férias:", err);
      setSnackbar({
        open: true,
        message: "Erro ao cancelar férias",
        severity: "error",
      });
    }
  };

  const loadAllVacations = useCallback(async () => {
    setVacationsLoading(true);
    try {
      // Carregar férias e vendas em paralelo
      const [res, sellRes] = await Promise.all([
        vacationAPI.getAllVacations({}),
        vacationAPI.getAllSellRequests(),
      ]);

      if (res.success) {
        setAllVacations(res.vacations || []);
        const approved = (res.vacations || []).filter(
          (v) => v.status === "approved"
        ).length;
        const rejected = (res.vacations || []).filter(
          (v) => v.status === "rejected"
        ).length;
        setStats((prev) => ({ ...prev, approved, rejected }));

        // Agrupar por colaborador
        const userMap = new Map<string, UserWithVacations>();
        (res.vacations || []).forEach((vacation) => {
          if (vacation.user) {
            const userId = String(vacation.user_id);
            if (!userMap.has(userId)) {
              userMap.set(userId, {
                id: userId,
                name: vacation.user.name,
                email: vacation.user.email,
                vacations: [],
                feriasVacations: [],
                ausenciasVacations: [],
                sellRequests: [],
                pendingCount: 0,
                pendingFeriasCount: 0,
                pendingAusenciasCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                totalDays: 0,
                soldDays: 0,
              });
            }
            const userData = userMap.get(userId)!;
            userData.vacations.push(vacation);

            // Separar por tipo
            if (vacation.type === "ferias") {
              userData.feriasVacations.push(vacation);
              if (vacation.status === "pending") userData.pendingFeriasCount++;
            } else {
              userData.ausenciasVacations.push(vacation);
              if (vacation.status === "pending")
                userData.pendingAusenciasCount++;
            }

            if (vacation.status === "pending") userData.pendingCount++;
            else if (vacation.status === "approved") {
              userData.approvedCount++;
              userData.totalDays += vacation.total_days || 0;
            } else if (vacation.status === "rejected") userData.rejectedCount++;
          }
        });

        // Adicionar vendas de férias ao mapa de usuários
        if (sellRes.success) {
          (sellRes.requests || []).forEach((sellRequest) => {
            const userId = String(sellRequest.user_id);
            if (userMap.has(userId)) {
              const userData = userMap.get(userId)!;
              userData.sellRequests.push(sellRequest);
              if (sellRequest.status === "approved") {
                userData.soldDays += sellRequest.days_to_sell;
              }
            } else if (sellRequest.user) {
              // Criar entrada para usuário que só tem venda
              userMap.set(userId, {
                id: userId,
                name: sellRequest.user.name,
                email: sellRequest.user.email || "",
                vacations: [],
                feriasVacations: [],
                ausenciasVacations: [],
                sellRequests: [sellRequest],
                pendingCount: 0,
                pendingFeriasCount: 0,
                pendingAusenciasCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                totalDays: 0,
                soldDays: sellRequest.status === "approved" ? sellRequest.days_to_sell : 0,
              });
            }
          });
        }

        // Ordenar por nome
        const usersArray = Array.from(userMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setUsersWithVacations(usersArray);
      }
    } catch (err) {
      console.error("Erro ao carregar todas as férias:", err);
    } finally {
      setVacationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && currentUser) {
      loadPendingVacations();
      loadAllVacations();
      loadSellRequests();
      loadBalances();
    }
  }, [mounted, currentUser, loadPendingVacations, loadAllVacations, loadSellRequests, loadBalances]);

  const handleApprove = async (vacation: Vacation) => {
    try {
      await vacationAPI.approveOrReject(vacation.id.toString(), "approved");
      setSnackbar({
        open: true,
        message: "Solicitação aprovada com sucesso!",
        severity: "success",
      });
      loadPendingVacations();
      loadAllVacations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao aprovar solicitação",
        severity: "error",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingVacation) return;
    try {
      await vacationAPI.approveOrReject(
        rejectingVacation.id.toString(),
        "rejected",
        rejectReason
      );
      setSnackbar({
        open: true,
        message: "Solicitação rejeitada",
        severity: "info",
      });
      setRejectDialogOpen(false);
      setRejectingVacation(null);
      setRejectReason("");
      loadPendingVacations();
      loadAllVacations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao rejeitar solicitação",
        severity: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingVacation) return;
    try {
      await vacationAPI.adminDelete(deletingVacation.id.toString());
      setSnackbar({
        open: true,
        message: "Solicitação excluída com sucesso!",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      setDeletingVacation(null);
      loadPendingVacations();
      loadAllVacations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao excluir solicitação",
        severity: "error",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ferias: "Férias",
      abono: "Abono",
      licenca: "Licença",
      atestado: "Atestado",
      folga: "Folga",
      home_office: "Home Office",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: VacationStatus) => {
    switch (status) {
      case "approved":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981" };
      case "pending":
        return { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" };
      case "rejected":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444" };
      case "canceled":
        return { bg: "rgba(107, 114, 128, 0.2)", color: "#6B7280" };
      default:
        return { bg: "rgba(107, 114, 128, 0.2)", color: "#6B7280" };
    }
  };

  const getStatusLabel = (status: VacationStatus) => {
    const labels: Record<VacationStatus, string> = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
      canceled: "Cancelado",
      interrupted: "Interrompido",
    };
    return labels[status] || status;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
              "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
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
          <Link href="/adminhub">
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
                        "linear-gradient(135deg, #10B981 0%, #059669 50%, #3B82F6 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      mb: 1,
                    }}
                  >
                    Gestão de Férias & Ausências
                  </Typography>
                  <Typography color="rgba(255,255,255,0.5)">
                    Aprove, rejeite e gerencie solicitações da equipe
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
                        "linear-gradient(135deg, #10B981 0%, #059669 100%)",
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
                    xs: "1fr 1fr",
                    md: "1fr 1fr 1fr 1fr",
                  },
                  gap: 3,
                  mb: 4,
                }}
              >
                {/* Pending Férias */}
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
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                          fontSize="0.65rem"
                        >
                          Férias Pendentes
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#10B981"
                        >
                          {loading ? (
                            <Skeleton width={40} />
                          ) : (
                            stats.pendingFerias
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        <BeachAccessIcon
                          sx={{ color: "#10B981", fontSize: 24 }}
                        />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Pending Ausências */}
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
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                          fontSize="0.65rem"
                        >
                          Ausências Pendentes
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#F59E0B"
                        >
                          {loading ? (
                            <Skeleton width={40} />
                          ) : (
                            stats.pendingAusencias
                          )}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <EventBusyIcon
                          sx={{ color: "#F59E0B", fontSize: 24 }}
                        />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Approved */}
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
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                          fontSize="0.65rem"
                        >
                          Aprovados
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#3B82F6"
                        >
                          {loading ? <Skeleton width={40} /> : stats.approved}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <CheckCircleIcon
                          sx={{ color: "#3B82F6", fontSize: 24 }}
                        />
                      </Avatar>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Rejected */}
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
                        "linear-gradient(90deg, #EF4444 0%, #DC2626 100%)",
                    }}
                  />
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="rgba(255,255,255,0.5)"
                          textTransform="uppercase"
                          letterSpacing={1}
                          fontSize="0.65rem"
                        >
                          Rejeitados
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#EF4444"
                        >
                          {loading ? <Skeleton width={40} /> : stats.rejected}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <CancelIcon sx={{ color: "#EF4444", fontSize: 24 }} />
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
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    "& .MuiTab-root": {
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                      textTransform: "none",
                      fontSize: "0.9rem",
                      py: 2,
                      minWidth: "auto",
                      "&.Mui-selected": {
                        color: "#fff",
                      },
                    },
                    "& .MuiTabs-indicator": {
                      background:
                        "linear-gradient(90deg, #10B981 0%, #3B82F6 100%)",
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                    },
                  }}
                >
                  <Tab
                    icon={<PendingIcon />}
                    iconPosition="start"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Pendentes</span>
                        {stats.pending > 0 && (
                          <Chip
                            size="small"
                            label={stats.pending}
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              background: "#F59E0B",
                              color: "#fff",
                            }}
                          />
                        )}
                      </Stack>
                    }
                  />
                  <Tab
                    icon={<BeachAccessIcon />}
                    iconPosition="start"
                    label="Histórico Férias"
                  />
                  <Tab
                    icon={<EventBusyIcon />}
                    iconPosition="start"
                    label="Histórico Ausências"
                  />
                  <Tab
                    icon={<PersonIcon />}
                    iconPosition="start"
                    label="Por Colaborador"
                  />
                  <Tab
                    icon={<AttachMoneyIcon />}
                    iconPosition="start"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Venda de Férias</span>
                        {sellRequests.filter(r => r.status === "pending").length > 0 && (
                          <Chip
                            size="small"
                            label={sellRequests.filter(r => r.status === "pending").length}
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              background: "#F59E0B",
                              color: "#fff",
                            }}
                          />
                        )}
                      </Stack>
                    }
                  />
                  <Tab
                    icon={<AccountBalanceWalletIcon />}
                    iconPosition="start"
                    label="Saldos de Férias"
                  />
                </Tabs>

                {/* Pending Tab */}
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6" color="white">
                        Solicitações Aguardando Aprovação
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadPendingVacations}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#10B981",
                            background: "rgba(16, 185, 129, 0.1)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {vacationsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(3)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={80}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : pendingVacations.length === 0 ? (
                      <Alert
                        severity="success"
                        icon={<CheckCircleIcon />}
                        sx={{
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhuma solicitação pendente de aprovação! 🎉
                      </Alert>
                    ) : (
                      <Stack spacing={4}>
                        {/* Seção Férias */}
                        {pendingVacations.filter((v) => v.type === "ferias")
                          .length > 0 && (
                          <Box>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              mb={2}
                            >
                              <BeachAccessIcon sx={{ color: "#10B981" }} />
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                color="#10B981"
                              >
                                Férias Pendentes
                              </Typography>
                              <Chip
                                size="small"
                                label={stats.pendingFerias}
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  background: "#10B981",
                                  color: "#fff",
                                }}
                              />
                            </Stack>
                            <TableContainer
                              sx={{
                                background: "rgba(16, 185, 129, 0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(16, 185, 129, 0.1)",
                              }}
                            >
                              <Table>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Colaborador</TableCell>
                                    <TableCell>Período</TableCell>
                                    <TableCell>Dias</TableCell>
                                    <TableCell>Motivo</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {pendingVacations
                                    .filter((v) => v.type === "ferias")
                                    .map((vacation) => (
                                      <TableRow key={vacation.id}>
                                        <TableCell>
                                          <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                          >
                                            <Avatar
                                              sx={{
                                                width: 36,
                                                height: 36,
                                                background:
                                                  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                                fontSize: "0.8rem",
                                              }}
                                            >
                                              {vacation.user?.name
                                                ? getInitials(
                                                    vacation.user.name
                                                  )
                                                : "?"}
                                            </Avatar>
                                            <Typography
                                              color="white"
                                              fontWeight={500}
                                            >
                                              {vacation.user?.name || "Usuário"}
                                            </Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell>
                                          <Typography
                                            color="rgba(255,255,255,0.7)"
                                            fontSize="0.875rem"
                                          >
                                            {formatDate(vacation.start_date)} -{" "}
                                            {formatDate(vacation.end_date)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography
                                            color="white"
                                            fontWeight={600}
                                          >
                                            {vacation.total_days}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Tooltip
                                            title={vacation.reason || "-"}
                                          >
                                            <Typography
                                              color="rgba(255,255,255,0.5)"
                                              fontSize="0.875rem"
                                              sx={{
                                                maxWidth: 150,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {vacation.reason || "-"}
                                            </Typography>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Stack
                                            direction="row"
                                            spacing={1}
                                            justifyContent="flex-end"
                                          >
                                            <Tooltip title="Aprovar">
                                              <IconButton
                                                onClick={() =>
                                                  handleApprove(vacation)
                                                }
                                                sx={{
                                                  color: "#10B981",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(16, 185, 129, 0.1)",
                                                  },
                                                }}
                                              >
                                                <CheckCircleIcon />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Rejeitar">
                                              <IconButton
                                                onClick={() => {
                                                  setRejectingVacation(
                                                    vacation
                                                  );
                                                  setRejectDialogOpen(true);
                                                }}
                                                sx={{
                                                  color: "#EF4444",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(239, 68, 68, 0.1)",
                                                  },
                                                }}
                                              >
                                                <CancelIcon />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Excluir">
                                              <IconButton
                                                onClick={() => {
                                                  setDeletingVacation(vacation);
                                                  setDeleteDialogOpen(true);
                                                }}
                                                sx={{
                                                  color: "#6B7280",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(107, 114, 128, 0.1)",
                                                  },
                                                }}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}

                        {/* Seção Ausências */}
                        {pendingVacations.filter((v) => v.type !== "ferias")
                          .length > 0 && (
                          <Box>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              mb={2}
                            >
                              <EventBusyIcon sx={{ color: "#F59E0B" }} />
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                color="#F59E0B"
                              >
                                Ausências Pendentes
                              </Typography>
                              <Chip
                                size="small"
                                label={stats.pendingAusencias}
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  background: "#F59E0B",
                                  color: "#fff",
                                }}
                              />
                            </Stack>
                            <TableContainer
                              sx={{
                                background: "rgba(245, 158, 11, 0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(245, 158, 11, 0.1)",
                              }}
                            >
                              <Table>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Colaborador</TableCell>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Período</TableCell>
                                    <TableCell>Dias</TableCell>
                                    <TableCell>Motivo</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {pendingVacations
                                    .filter((v) => v.type !== "ferias")
                                    .map((vacation) => (
                                      <TableRow key={vacation.id}>
                                        <TableCell>
                                          <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                          >
                                            <Avatar
                                              sx={{
                                                width: 36,
                                                height: 36,
                                                background:
                                                  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                                fontSize: "0.8rem",
                                              }}
                                            >
                                              {vacation.user?.name
                                                ? getInitials(
                                                    vacation.user.name
                                                  )
                                                : "?"}
                                            </Avatar>
                                            <Typography
                                              color="white"
                                              fontWeight={500}
                                            >
                                              {vacation.user?.name || "Usuário"}
                                            </Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            icon={
                                              <EventBusyIcon
                                                sx={{ fontSize: 14 }}
                                              />
                                            }
                                            label={getTypeLabel(vacation.type)}
                                            size="small"
                                            sx={{
                                              background:
                                                "rgba(245, 158, 11, 0.2)",
                                              color: "#F59E0B",
                                              fontWeight: 600,
                                              fontSize: "0.7rem",
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Typography
                                            color="rgba(255,255,255,0.7)"
                                            fontSize="0.875rem"
                                          >
                                            {formatDate(vacation.start_date)} -{" "}
                                            {formatDate(vacation.end_date)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography
                                            color="white"
                                            fontWeight={600}
                                          >
                                            {vacation.total_days}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Tooltip
                                            title={vacation.reason || "-"}
                                          >
                                            <Typography
                                              color="rgba(255,255,255,0.5)"
                                              fontSize="0.875rem"
                                              sx={{
                                                maxWidth: 150,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {vacation.reason || "-"}
                                            </Typography>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Stack
                                            direction="row"
                                            spacing={1}
                                            justifyContent="flex-end"
                                          >
                                            <Tooltip title="Aprovar">
                                              <IconButton
                                                onClick={() =>
                                                  handleApprove(vacation)
                                                }
                                                sx={{
                                                  color: "#10B981",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(16, 185, 129, 0.1)",
                                                  },
                                                }}
                                              >
                                                <CheckCircleIcon />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Rejeitar">
                                              <IconButton
                                                onClick={() => {
                                                  setRejectingVacation(
                                                    vacation
                                                  );
                                                  setRejectDialogOpen(true);
                                                }}
                                                sx={{
                                                  color: "#EF4444",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(239, 68, 68, 0.1)",
                                                  },
                                                }}
                                              >
                                                <CancelIcon />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Excluir">
                                              <IconButton
                                                onClick={() => {
                                                  setDeletingVacation(vacation);
                                                  setDeleteDialogOpen(true);
                                                }}
                                                sx={{
                                                  color: "#6B7280",
                                                  "&:hover": {
                                                    background:
                                                      "rgba(107, 114, 128, 0.1)",
                                                  },
                                                }}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Box>
                </TabPanel>

                {/* Histórico Férias Tab */}
                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BeachAccessIcon sx={{ color: "#10B981" }} />
                        <Typography variant="h6" color="white">
                          Histórico de Férias
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Button
                          variant="contained"
                          startIcon={<EventIcon />}
                          onClick={() => setCreateVacationDialogOpen(true)}
                          sx={{
                            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                            "&:hover": { background: "#059669" },
                          }}
                        >
                          Adicionar Férias
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={loadAllVacations}
                          sx={{
                            borderColor: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            "&:hover": {
                              borderColor: "#10B981",
                              background: "rgba(16, 185, 129, 0.1)",
                            },
                          }}
                        >
                          Atualizar
                        </Button>
                      </Stack>
                    </Stack>

                    {vacationsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(5)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={60}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : allVacations.filter((v) => v.type === "ferias")
                        .length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhuma solicitação de férias encontrada
                      </Alert>
                    ) : (
                      <TableContainer
                        sx={{
                          background: "rgba(16, 185, 129, 0.03)",
                          borderRadius: "12px",
                          border: "1px solid rgba(16, 185, 129, 0.1)",
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Colaborador</TableCell>
                              <TableCell>Período</TableCell>
                              <TableCell>Dias</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Solicitado em</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {allVacations
                              .filter((v) => v.type === "ferias")
                              .map((vacation) => {
                                const statusStyle = getStatusColor(
                                  vacation.status
                                );
                                return (
                                  <TableRow key={vacation.id}>
                                    <TableCell>
                                      <Stack
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                      >
                                        <Avatar
                                          sx={{
                                            width: 36,
                                            height: 36,
                                            background:
                                              "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                            fontSize: "0.8rem",
                                          }}
                                        >
                                          {vacation.user?.name
                                            ? getInitials(vacation.user.name)
                                            : "?"}
                                        </Avatar>
                                        <Typography
                                          color="white"
                                          fontWeight={500}
                                        >
                                          {vacation.user?.name || "Usuário"}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="rgba(255,255,255,0.7)"
                                        fontSize="0.875rem"
                                      >
                                        {formatDate(vacation.start_date)} -{" "}
                                        {formatDate(vacation.end_date)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="white"
                                        fontWeight={600}
                                      >
                                        {vacation.total_days}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={getStatusLabel(vacation.status)}
                                        sx={{
                                          background: statusStyle.bg,
                                          color: statusStyle.color,
                                          fontWeight: 600,
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="rgba(255,255,255,0.5)"
                                        fontSize="0.875rem"
                                      >
                                        {formatDate(vacation.created_at)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Tooltip title="Editar">
                                          <IconButton
                                            size="small"
                                            onClick={() => openEditVacation(vacation)}
                                            sx={{
                                              color: "#3B82F6",
                                              "&:hover": {
                                                background: "rgba(59, 130, 246, 0.1)",
                                              },
                                            }}
                                          >
                                            <EditIcon />
                                          </IconButton>
                                        </Tooltip>
                                        {vacation.status === "approved" && (
                                          <Tooltip title="Cancelar">
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                setCancelingVacation(vacation);
                                                setCancelVacationDialogOpen(true);
                                              }}
                                              sx={{
                                                color: "#F59E0B",
                                                "&:hover": {
                                                  background: "rgba(245, 158, 11, 0.1)",
                                                },
                                              }}
                                            >
                                              <CancelIcon />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                        <Tooltip title="Excluir">
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setDeletingVacation(vacation);
                                              setDeleteDialogOpen(true);
                                            }}
                                            sx={{
                                              color: "#EF4444",
                                              "&:hover": {
                                                background: "rgba(239, 68, 68, 0.1)",
                                              },
                                            }}
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </TabPanel>

                {/* Histórico Ausências Tab */}
                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EventBusyIcon sx={{ color: "#F59E0B" }} />
                        <Typography variant="h6" color="white">
                          Histórico de Ausências
                        </Typography>
                      </Stack>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllVacations}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#F59E0B",
                            background: "rgba(245, 158, 11, 0.1)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {vacationsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(5)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={60}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : allVacations.filter((v) => v.type !== "ferias")
                        .length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          background: "rgba(245, 158, 11, 0.1)",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhuma solicitação de ausência encontrada
                      </Alert>
                    ) : (
                      <TableContainer
                        sx={{
                          background: "rgba(245, 158, 11, 0.03)",
                          borderRadius: "12px",
                          border: "1px solid rgba(245, 158, 11, 0.1)",
                        }}
                      >
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Colaborador</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Período</TableCell>
                              <TableCell>Dias</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Solicitado em</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {allVacations
                              .filter((v) => v.type !== "ferias")
                              .map((vacation) => {
                                const statusStyle = getStatusColor(
                                  vacation.status
                                );
                                return (
                                  <TableRow key={vacation.id}>
                                    <TableCell>
                                      <Stack
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                      >
                                        <Avatar
                                          sx={{
                                            width: 36,
                                            height: 36,
                                            background:
                                              "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                            fontSize: "0.8rem",
                                          }}
                                        >
                                          {vacation.user?.name
                                            ? getInitials(vacation.user.name)
                                            : "?"}
                                        </Avatar>
                                        <Typography
                                          color="white"
                                          fontWeight={500}
                                        >
                                          {vacation.user?.name || "Usuário"}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        icon={
                                          <EventBusyIcon
                                            sx={{ fontSize: 14 }}
                                          />
                                        }
                                        label={getTypeLabel(vacation.type)}
                                        size="small"
                                        sx={{
                                          background: "rgba(245, 158, 11, 0.2)",
                                          color: "#F59E0B",
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="rgba(255,255,255,0.7)"
                                        fontSize="0.875rem"
                                      >
                                        {formatDate(vacation.start_date)} -{" "}
                                        {formatDate(vacation.end_date)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="white"
                                        fontWeight={600}
                                      >
                                        {vacation.total_days}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={getStatusLabel(vacation.status)}
                                        sx={{
                                          background: statusStyle.bg,
                                          color: statusStyle.color,
                                          fontWeight: 600,
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography
                                        color="rgba(255,255,255,0.5)"
                                        fontSize="0.875rem"
                                      >
                                        {formatDate(vacation.created_at)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Tooltip title="Excluir">
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            setDeletingVacation(vacation);
                                            setDeleteDialogOpen(true);
                                          }}
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
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </TabPanel>

                {/* By User Tab */}
                <TabPanel value={tabValue} index={3}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6" color="white">
                        Histórico por Colaborador
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllVacations}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          "&:hover": {
                            borderColor: "#10B981",
                            background: "rgba(16, 185, 129, 0.1)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {vacationsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(5)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={70}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : usersWithVacations.length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          background: "rgba(59, 130, 246, 0.1)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhuma solicitação encontrada
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        {usersWithVacations.map((userData) => (
                          <Card
                            key={userData.id}
                            sx={{
                              background: "rgba(255,255,255,0.02)",
                              border: `1px solid ${
                                userData.pendingCount > 0
                                  ? "rgba(245, 158, 11, 0.3)"
                                  : "rgba(255,255,255,0.05)"
                              }`,
                              borderRadius: "16px",
                              overflow: "hidden",
                            }}
                          >
                            <CardContent
                              sx={{
                                p: 2,
                                cursor: "pointer",
                                "&:hover": {
                                  background: "rgba(255,255,255,0.02)",
                                },
                              }}
                              onClick={() =>
                                setExpandedUserId(
                                  expandedUserId === userData.id
                                    ? null
                                    : userData.id
                                )
                              }
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Stack
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                >
                                  <Avatar
                                    sx={{
                                      width: 48,
                                      height: 48,
                                      background:
                                        "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                    }}
                                  >
                                    {getInitials(userData.name)}
                                  </Avatar>
                                  <Box>
                                    <Typography color="white" fontWeight={600}>
                                      {userData.name}
                                    </Typography>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                    >
                                      <HistoryIcon
                                        sx={{
                                          fontSize: 14,
                                          color: "rgba(255,255,255,0.4)",
                                        }}
                                      />
                                      <Typography
                                        variant="caption"
                                        color="rgba(255,255,255,0.5)"
                                      >
                                        {userData.vacations.length} solicitação
                                        {userData.vacations.length !== 1
                                          ? "ões"
                                          : ""}
                                        {userData.totalDays > 0 && (
                                          <>
                                            {" "}
                                            • {userData.totalDays} dias
                                            aprovados
                                          </>
                                        )}
                                        {userData.soldDays > 0 && (
                                          <>
                                            {" "}
                                            • <span style={{ color: "#F59E0B" }}>{userData.soldDays} dias vendidos</span>
                                          </>
                                        )}
                                      </Typography>
                                    </Stack>
                                  </Box>
                                </Stack>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  {userData.pendingCount > 0 && (
                                    <Chip
                                      size="small"
                                      label={`${
                                        userData.pendingCount
                                      } pendente${
                                        userData.pendingCount > 1 ? "s" : ""
                                      }`}
                                      sx={{
                                        background: "rgba(245, 158, 11, 0.2)",
                                        color: "#F59E0B",
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}
                                  {userData.approvedCount > 0 && (
                                    <Chip
                                      size="small"
                                      label={`${
                                        userData.approvedCount
                                      } aprovado${
                                        userData.approvedCount > 1 ? "s" : ""
                                      }`}
                                      sx={{
                                        background: "rgba(16, 185, 129, 0.2)",
                                        color: "#10B981",
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}
                                  {userData.rejectedCount > 0 && (
                                    <Chip
                                      size="small"
                                      label={`${
                                        userData.rejectedCount
                                      } rejeitado${
                                        userData.rejectedCount > 1 ? "s" : ""
                                      }`}
                                      sx={{
                                        background: "rgba(239, 68, 68, 0.2)",
                                        color: "#EF4444",
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}
                                  <IconButton
                                    size="small"
                                    sx={{ color: "rgba(255,255,255,0.5)" }}
                                  >
                                    {expandedUserId === userData.id ? (
                                      <ExpandLessIcon />
                                    ) : (
                                      <ExpandMoreIcon />
                                    )}
                                  </IconButton>
                                </Stack>
                              </Stack>
                            </CardContent>

                            <Collapse in={expandedUserId === userData.id}>
                              <Box
                                sx={{
                                  px: 2,
                                  pb: 2,
                                  borderTop: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <Stack spacing={3}>
                                  {/* Seção Férias */}
                                  {userData.feriasVacations.length > 0 && (
                                    <Box>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        mb={1}
                                        mt={2}
                                      >
                                        <BeachAccessIcon
                                          sx={{
                                            color: "#10B981",
                                            fontSize: 18,
                                          }}
                                        />
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight={700}
                                          color="#10B981"
                                        >
                                          Férias (
                                          {userData.feriasVacations.length})
                                        </Typography>
                                        {userData.pendingFeriasCount > 0 && (
                                          <Chip
                                            size="small"
                                            label={`${userData.pendingFeriasCount} pendente`}
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                              background:
                                                "rgba(245, 158, 11, 0.2)",
                                              color: "#F59E0B",
                                            }}
                                          />
                                        )}
                                      </Stack>
                                      <TableContainer
                                        sx={{
                                          background:
                                            "rgba(16, 185, 129, 0.03)",
                                          borderRadius: "8px",
                                          border:
                                            "1px solid rgba(16, 185, 129, 0.1)",
                                        }}
                                      >
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Período</TableCell>
                                              <TableCell>Dias</TableCell>
                                              <TableCell>Status</TableCell>
                                              <TableCell>Motivo</TableCell>
                                              <TableCell>Data</TableCell>
                                              <TableCell align="right">
                                                Ações
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {userData.feriasVacations.map(
                                              (vacation) => {
                                                const statusStyle =
                                                  getStatusColor(
                                                    vacation.status
                                                  );
                                                return (
                                                  <TableRow key={vacation.id}>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.7)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {formatDate(
                                                          vacation.start_date
                                                        )}{" "}
                                                        -{" "}
                                                        {formatDate(
                                                          vacation.end_date
                                                        )}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="white"
                                                        fontWeight={600}
                                                        fontSize="0.9rem"
                                                      >
                                                        {vacation.total_days}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip
                                                        size="small"
                                                        label={getStatusLabel(
                                                          vacation.status
                                                        )}
                                                        sx={{
                                                          background:
                                                            statusStyle.bg,
                                                          color:
                                                            statusStyle.color,
                                                          fontWeight: 600,
                                                          fontSize: "0.65rem",
                                                          height: 22,
                                                        }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Tooltip
                                                        title={
                                                          vacation.reason || "-"
                                                        }
                                                      >
                                                        <Typography
                                                          color="rgba(255,255,255,0.5)"
                                                          fontSize="0.8rem"
                                                          sx={{
                                                            maxWidth: 80,
                                                            overflow: "hidden",
                                                            textOverflow:
                                                              "ellipsis",
                                                            whiteSpace:
                                                              "nowrap",
                                                          }}
                                                        >
                                                          {vacation.reason ||
                                                            "-"}
                                                        </Typography>
                                                      </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.4)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {formatDate(
                                                          vacation.created_at
                                                        )}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="flex-end"
                                                      >
                                                        {vacation.status ===
                                                          "pending" && (
                                                          <>
                                                            <Tooltip title="Aprovar">
                                                              <IconButton
                                                                size="small"
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  handleApprove(
                                                                    vacation
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
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  setRejectingVacation(
                                                                    vacation
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
                                                        <Tooltip title="Excluir">
                                                          <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setDeletingVacation(
                                                                vacation
                                                              );
                                                              setDeleteDialogOpen(
                                                                true
                                                              );
                                                            }}
                                                            sx={{
                                                              color: "#6B7280",
                                                            }}
                                                          >
                                                            <DeleteIcon fontSize="small" />
                                                          </IconButton>
                                                        </Tooltip>
                                                      </Stack>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }
                                            )}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </Box>
                                  )}

                                  {/* Seção Ausências */}
                                  {userData.ausenciasVacations.length > 0 && (
                                    <Box>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        mb={1}
                                        mt={
                                          userData.feriasVacations.length > 0
                                            ? 0
                                            : 2
                                        }
                                      >
                                        <EventBusyIcon
                                          sx={{
                                            color: "#F59E0B",
                                            fontSize: 18,
                                          }}
                                        />
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight={700}
                                          color="#F59E0B"
                                        >
                                          Ausências (
                                          {userData.ausenciasVacations.length})
                                        </Typography>
                                        {userData.pendingAusenciasCount > 0 && (
                                          <Chip
                                            size="small"
                                            label={`${userData.pendingAusenciasCount} pendente`}
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                              background:
                                                "rgba(245, 158, 11, 0.2)",
                                              color: "#F59E0B",
                                            }}
                                          />
                                        )}
                                      </Stack>
                                      <TableContainer
                                        sx={{
                                          background:
                                            "rgba(245, 158, 11, 0.03)",
                                          borderRadius: "8px",
                                          border:
                                            "1px solid rgba(245, 158, 11, 0.1)",
                                        }}
                                      >
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Tipo</TableCell>
                                              <TableCell>Período</TableCell>
                                              <TableCell>Dias</TableCell>
                                              <TableCell>Status</TableCell>
                                              <TableCell>Motivo</TableCell>
                                              <TableCell>Data</TableCell>
                                              <TableCell align="right">
                                                Ações
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {userData.ausenciasVacations.map(
                                              (vacation) => {
                                                const statusStyle =
                                                  getStatusColor(
                                                    vacation.status
                                                  );
                                                return (
                                                  <TableRow key={vacation.id}>
                                                    <TableCell>
                                                      <Chip
                                                        icon={
                                                          <EventBusyIcon
                                                            sx={{
                                                              fontSize: 12,
                                                            }}
                                                          />
                                                        }
                                                        label={getTypeLabel(
                                                          vacation.type
                                                        )}
                                                        size="small"
                                                        sx={{
                                                          background:
                                                            "rgba(245, 158, 11, 0.2)",
                                                          color: "#F59E0B",
                                                          fontWeight: 600,
                                                          fontSize: "0.65rem",
                                                          height: 22,
                                                        }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.7)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {formatDate(
                                                          vacation.start_date
                                                        )}{" "}
                                                        -{" "}
                                                        {formatDate(
                                                          vacation.end_date
                                                        )}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="white"
                                                        fontWeight={600}
                                                        fontSize="0.9rem"
                                                      >
                                                        {vacation.total_days}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip
                                                        size="small"
                                                        label={getStatusLabel(
                                                          vacation.status
                                                        )}
                                                        sx={{
                                                          background:
                                                            statusStyle.bg,
                                                          color:
                                                            statusStyle.color,
                                                          fontWeight: 600,
                                                          fontSize: "0.65rem",
                                                          height: 22,
                                                        }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Tooltip
                                                        title={
                                                          vacation.reason || "-"
                                                        }
                                                      >
                                                        <Typography
                                                          color="rgba(255,255,255,0.5)"
                                                          fontSize="0.8rem"
                                                          sx={{
                                                            maxWidth: 80,
                                                            overflow: "hidden",
                                                            textOverflow:
                                                              "ellipsis",
                                                            whiteSpace:
                                                              "nowrap",
                                                          }}
                                                        >
                                                          {vacation.reason ||
                                                            "-"}
                                                        </Typography>
                                                      </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.4)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {formatDate(
                                                          vacation.created_at
                                                        )}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="flex-end"
                                                      >
                                                        {vacation.status ===
                                                          "pending" && (
                                                          <>
                                                            <Tooltip title="Aprovar">
                                                              <IconButton
                                                                size="small"
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  handleApprove(
                                                                    vacation
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
                                                                onClick={(
                                                                  e
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  setRejectingVacation(
                                                                    vacation
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
                                                        <Tooltip title="Excluir">
                                                          <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setDeletingVacation(
                                                                vacation
                                                              );
                                                              setDeleteDialogOpen(
                                                                true
                                                              );
                                                            }}
                                                            sx={{
                                                              color: "#6B7280",
                                                            }}
                                                          >
                                                            <DeleteIcon fontSize="small" />
                                                          </IconButton>
                                                        </Tooltip>
                                                      </Stack>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }
                                            )}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </Box>
                                  )}

                                  {/* Seção Vendas de Férias */}
                                  {userData.sellRequests.length > 0 && (
                                    <Box>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        mb={1}
                                        mt={2}
                                      >
                                        <AttachMoneyIcon
                                          sx={{ color: "#F59E0B", fontSize: 20 }}
                                        />
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight={700}
                                          color="#F59E0B"
                                        >
                                          Vendas de Férias (
                                          {userData.sellRequests.length})
                                        </Typography>
                                        {userData.soldDays > 0 && (
                                          <Chip
                                            size="small"
                                            label={`${userData.soldDays} dias vendidos`}
                                            sx={{
                                              height: 20,
                                              fontSize: "0.7rem",
                                              background: "rgba(245, 158, 11, 0.2)",
                                              color: "#F59E0B",
                                            }}
                                          />
                                        )}
                                      </Stack>
                                      <TableContainer
                                        sx={{
                                          borderRadius: "12px",
                                          border:
                                            "1px solid rgba(245, 158, 11, 0.1)",
                                        }}
                                      >
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Dias</TableCell>
                                              <TableCell>Ano</TableCell>
                                              <TableCell>Status</TableCell>
                                              <TableCell>Motivo</TableCell>
                                              <TableCell>Data</TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {userData.sellRequests.map(
                                              (sellReq) => {
                                                const statusStyle =
                                                  sellReq.status === "approved"
                                                    ? { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981", label: "Aprovado" }
                                                    : sellReq.status === "rejected"
                                                    ? { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444", label: "Rejeitado" }
                                                    : { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B", label: "Pendente" };
                                                return (
                                                  <TableRow key={sellReq.id}>
                                                    <TableCell>
                                                      <Typography
                                                        color="white"
                                                        fontWeight={600}
                                                        fontSize="0.9rem"
                                                      >
                                                        {sellReq.days_to_sell} dias
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.7)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {sellReq.period_year}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip
                                                        size="small"
                                                        label={statusStyle.label}
                                                        sx={{
                                                          background: statusStyle.bg,
                                                          color: statusStyle.color,
                                                          fontSize: "0.7rem",
                                                        }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Tooltip
                                                        title={sellReq.reason || "Sem motivo"}
                                                      >
                                                        <Typography
                                                          color="rgba(255,255,255,0.5)"
                                                          fontSize="0.8rem"
                                                          sx={{
                                                            maxWidth: 150,
                                                            overflow: "hidden",
                                                            textOverflow:
                                                              "ellipsis",
                                                            whiteSpace:
                                                              "nowrap",
                                                          }}
                                                        >
                                                          {sellReq.reason ||
                                                            "-"}
                                                        </Typography>
                                                      </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography
                                                        color="rgba(255,255,255,0.4)"
                                                        fontSize="0.8rem"
                                                      >
                                                        {new Date(sellReq.created_at).toLocaleDateString("pt-BR")}
                                                      </Typography>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }
                                            )}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </Box>
                                  )}
                                </Stack>
                              </Box>
                            </Collapse>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </TabPanel>

                {/* Sell Requests Tab */}
                <TabPanel value={tabValue} index={4}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6" color="white">
                        Solicitações de Venda de Férias
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadSellRequests}
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.7)",
                          "&:hover": {
                            borderColor: "rgba(255,255,255,0.4)",
                          },
                        }}
                      >
                        Atualizar
                      </Button>
                    </Stack>

                    {sellRequests.length === 0 ? (
                      <Card
                        sx={{
                          p: 6,
                          textAlign: "center",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: "20px",
                        }}
                      >
                        <AttachMoneyIcon
                          sx={{
                            fontSize: 64,
                            color: "rgba(255,255,255,0.1)",
                            mb: 2,
                          }}
                        />
                        <Typography
                          variant="h6"
                          color="rgba(255,255,255,0.5)"
                        >
                          Nenhuma solicitação de venda
                        </Typography>
                        <Typography
                          variant="body2"
                          color="rgba(255,255,255,0.3)"
                        >
                          Não há solicitações de venda de férias registradas
                        </Typography>
                      </Card>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Colaborador</TableCell>
                              <TableCell>Dias</TableCell>
                              <TableCell>Ano</TableCell>
                              <TableCell>Motivo</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Data</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sellRequests.map((request) => {
                              const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                                pending: { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B", label: "Pendente" },
                                approved: { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981", label: "Aprovada" },
                                rejected: { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444", label: "Rejeitada" },
                              };
                              const statusStyle = statusColors[request.status] || statusColors.pending;

                              return (
                                <TableRow
                                  key={request.id}
                                  sx={{
                                    "&:hover": {
                                      background: "rgba(255,255,255,0.02)",
                                    },
                                  }}
                                >
                                  <TableCell>
                                    <Stack
                                      direction="row"
                                      spacing={2}
                                      alignItems="center"
                                    >
                                      <Avatar
                                        sx={{
                                          width: 36,
                                          height: 36,
                                          background:
                                            "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                          fontSize: "0.9rem",
                                        }}
                                      >
                                        {request.user?.name?.[0] || "?"}
                                      </Avatar>
                                      <Box>
                                        <Typography
                                          color="white"
                                          fontWeight={600}
                                        >
                                          {request.user?.name || "Usuário"}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="rgba(255,255,255,0.5)"
                                        >
                                          {request.user?.email}
                                        </Typography>
                                      </Box>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={`${request.days_to_sell} dias`}
                                      size="small"
                                      sx={{
                                        background: "rgba(245, 158, 11, 0.2)",
                                        color: "#F59E0B",
                                        fontWeight: 600,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography color="rgba(255,255,255,0.7)">
                                      {request.period_year}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={request.reason || "Sem motivo"}>
                                      <Typography
                                        color="rgba(255,255,255,0.5)"
                                        sx={{
                                          maxWidth: 150,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {request.reason || "-"}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={statusStyle.label}
                                      size="small"
                                      sx={{
                                        background: statusStyle.bg,
                                        color: statusStyle.color,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography
                                      color="rgba(255,255,255,0.4)"
                                      fontSize="0.85rem"
                                    >
                                      {new Date(request.created_at).toLocaleDateString("pt-BR")}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      justifyContent="flex-end"
                                    >
                                      <Tooltip title="Editar dias">
                                        <IconButton
                                          size="small"
                                          onClick={() => openEditSellRequest(request)}
                                          sx={{ color: "#3B82F6" }}
                                        >
                                          <EditIcon />
                                        </IconButton>
                                      </Tooltip>
                                      {request.status === "pending" && (
                                        <>
                                          <Tooltip title="Aprovar">
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                setSelectedSellRequest(request);
                                                setSellAction("approved");
                                                setSellDialogOpen(true);
                                              }}
                                              sx={{ color: "#10B981" }}
                                            >
                                              <CheckCircleIcon />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Rejeitar">
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                setSelectedSellRequest(request);
                                                setSellAction("rejected");
                                                setSellDialogOpen(true);
                                              }}
                                              sx={{ color: "#EF4444" }}
                                            >
                                              <CancelIcon />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </TabPanel>

                {/* Tab de Saldos de Férias */}
                <TabPanel value={tabValue} index={5}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6" color="white">
                        Gerenciar Saldos de Férias
                      </Typography>
                      <Stack direction="row" spacing={2}>
                        <TextField
                          placeholder="Buscar colaborador..."
                          size="small"
                          value={balanceSearch}
                          onChange={(e) => setBalanceSearch(e.target.value)}
                          InputProps={{
                            startAdornment: <SearchIcon sx={{ color: "rgba(255,255,255,0.3)", mr: 1 }} />,
                          }}
                          sx={{
                            width: 300,
                            "& .MuiOutlinedInput-root": {
                              background: "rgba(255,255,255,0.03)",
                              borderRadius: "8px",
                            },
                          }}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={loadBalances}
                          sx={{ borderRadius: "8px" }}
                        >
                          Atualizar
                        </Button>
                      </Stack>
                    </Stack>

                    {balancesLoading ? (
                      <Stack spacing={2}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton
                            key={i}
                            variant="rectangular"
                            height={60}
                            sx={{ borderRadius: "8px" }}
                          />
                        ))}
                      </Stack>
                    ) : filteredBalances.length === 0 ? (
                      <Alert severity="info">
                        {balanceSearch
                          ? "Nenhum colaborador encontrado"
                          : "Nenhum saldo de férias cadastrado"}
                      </Alert>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Colaborador</TableCell>
                              <TableCell align="center">Total</TableCell>
                              <TableCell align="center">Usados</TableCell>
                              <TableCell align="center">Disponíveis</TableCell>
                              <TableCell align="center">Período</TableCell>
                              <TableCell align="center">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredBalances.map((balance) => (
                              <TableRow key={balance.user_id}>
                                <TableCell>
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ width: 36, height: 36, bgcolor: "#3B82F6" }}>
                                      {balance.user_name?.charAt(0)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" color="white" fontWeight="bold">
                                        {balance.user_name}
                                      </Typography>
                                      <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                        {balance.user_email}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell align="center">
                                  {editingBalanceId === balance.user_id ? (
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={editBalanceForm.total_days}
                                      onChange={(e) => {
                                        const totalDays = parseInt(e.target.value) || 0;
                                        setEditBalanceForm((prev) => ({
                                          ...prev,
                                          total_days: totalDays,
                                          available_days: Math.max(0, totalDays - prev.used_days),
                                        }));
                                      }}
                                      sx={{ width: 70 }}
                                    />
                                  ) : (
                                    <Chip
                                      label={balance.total_days}
                                      size="small"
                                      sx={{ bgcolor: "rgba(59, 130, 246, 0.2)", color: "#3B82F6" }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {editingBalanceId === balance.user_id ? (
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={editBalanceForm.used_days}
                                      onChange={(e) => {
                                        const usedDays = parseInt(e.target.value) || 0;
                                        setEditBalanceForm((prev) => ({
                                          ...prev,
                                          used_days: usedDays,
                                          available_days: Math.max(0, prev.total_days - usedDays),
                                        }));
                                      }}
                                      sx={{ width: 70 }}
                                    />
                                  ) : (
                                    <Chip
                                      label={balance.used_days}
                                      size="small"
                                      sx={{ bgcolor: "rgba(239, 68, 68, 0.2)", color: "#EF4444" }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={editingBalanceId === balance.user_id
                                      ? editBalanceForm.available_days
                                      : balance.available_days}
                                    size="small"
                                    sx={{
                                      bgcolor: "rgba(16, 185, 129, 0.2)",
                                      color: "#10B981",
                                      fontWeight: editingBalanceId === balance.user_id ? "bold" : "normal",
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  {editingBalanceId === balance.user_id ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <TextField
                                        type="date"
                                        size="small"
                                        label="Início"
                                        value={editBalanceForm.period_start}
                                        onChange={(e) =>
                                          setEditBalanceForm((prev) => ({
                                            ...prev,
                                            period_start: e.target.value,
                                          }))
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 140 }}
                                      />
                                      <Typography color="rgba(255,255,255,0.5)">-</Typography>
                                      <TextField
                                        type="date"
                                        size="small"
                                        label="Fim"
                                        value={editBalanceForm.period_end}
                                        onChange={(e) =>
                                          setEditBalanceForm((prev) => ({
                                            ...prev,
                                            period_end: e.target.value,
                                          }))
                                        }
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 140 }}
                                      />
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="rgba(255,255,255,0.6)">
                                      {new Date(balance.period_start).toLocaleDateString("pt-BR")} -{" "}
                                      {new Date(balance.period_end).toLocaleDateString("pt-BR")}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {editingBalanceId === balance.user_id ? (
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                      <Tooltip title="Salvar">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleUpdateBalance(balance.user_id)}
                                          sx={{ color: "#10B981" }}
                                        >
                                          <SaveIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Cancelar">
                                        <IconButton
                                          size="small"
                                          onClick={() => setEditingBalanceId(null)}
                                          sx={{ color: "#EF4444" }}
                                        >
                                          <CancelIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  ) : (
                                    <Tooltip title="Editar saldo">
                                      <IconButton
                                        size="small"
                                        onClick={() => startEditBalance(balance)}
                                        sx={{ color: "#3B82F6" }}
                                      >
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </TabPanel>
              </Card>
            </motion.div>
          </Box>
        </Box>

        {/* Sell Vacation Dialog */}
        <Dialog
          open={sellDialogOpen}
          onClose={() => {
            setSellDialogOpen(false);
            setSelectedSellRequest(null);
            setSellRejectReason("");
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              minWidth: 400,
            },
          }}
        >
          <DialogTitle
            sx={{
              color: sellAction === "approved" ? "#10B981" : "#EF4444",
            }}
          >
            {sellAction === "approved"
              ? "Aprovar Venda de Férias"
              : "Rejeitar Venda de Férias"}
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)" mb={2}>
              {sellAction === "approved"
                ? "Confirmar aprovação da venda de férias de "
                : "Você está rejeitando a venda de férias de "}
              <strong style={{ color: "#fff" }}>
                {selectedSellRequest?.user?.name}
              </strong>
              {" - "}
              <strong style={{ color: "#F59E0B" }}>
                {selectedSellRequest?.days_to_sell} dias
              </strong>
            </Typography>
            {sellAction === "rejected" && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo da rejeição (opcional)"
                value={sellRejectReason}
                onChange={(e) => setSellRejectReason(e.target.value)}
                placeholder="Ex: Saldo insuficiente, período não permite..."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#fff",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                    "&:hover fieldset": {
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                    "&.Mui-focused fieldset": { borderColor: "#EF4444" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(255,255,255,0.5)",
                  },
                }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setSellDialogOpen(false);
                setSelectedSellRequest(null);
                setSellRejectReason("");
              }}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSellAction}
              sx={{
                background:
                  sellAction === "approved" ? "#10B981" : "#EF4444",
                "&:hover": {
                  background:
                    sellAction === "approved" ? "#059669" : "#DC2626",
                },
              }}
            >
              {sellAction === "approved" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => {
            setRejectDialogOpen(false);
            setRejectingVacation(null);
            setRejectReason("");
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              minWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ color: "#EF4444" }}>
            Rejeitar Solicitação
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)" mb={2}>
              Você está rejeitando a solicitação de{" "}
              <strong style={{ color: "#fff" }}>
                {rejectingVacation?.user?.name}
              </strong>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Conflito com outro colaborador, período indisponível..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&.Mui-focused fieldset": { borderColor: "#EF4444" },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255,255,255,0.5)",
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingVacation(null);
                setRejectReason("");
              }}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleReject}
              sx={{
                background: "#EF4444",
                "&:hover": { background: "#DC2626" },
              }}
            >
              Rejeitar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeletingVacation(null);
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              minWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ color: "#EF4444" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <DeleteIcon />
              <span>Confirmar Exclusão</span>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)" mb={1}>
              Você está prestes a excluir a solicitação de{" "}
              <strong style={{ color: "#fff" }}>
                {deletingVacation?.user?.name || "colaborador"}
              </strong>
            </Typography>
            <Typography color="rgba(255,255,255,0.5)" variant="body2" mb={1}>
              Tipo:{" "}
              <strong style={{ color: "#fff" }}>
                {deletingVacation ? getTypeLabel(deletingVacation.type) : "-"}
              </strong>
            </Typography>
            <Typography color="rgba(255,255,255,0.5)" variant="body2" mb={2}>
              Período:{" "}
              <strong style={{ color: "#fff" }}>
                {deletingVacation
                  ? `${formatDate(deletingVacation.start_date)} - ${formatDate(
                      deletingVacation.end_date
                    )}`
                  : "-"}
              </strong>
            </Typography>
            <Alert
              severity="warning"
              sx={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                "& .MuiAlert-icon": { color: "#F59E0B" },
              }}
            >
              Esta ação não pode ser desfeita. Se as férias já foram aprovadas,
              o saldo será restaurado.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingVacation(null);
              }}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleDelete}
              sx={{
                background: "#EF4444",
                "&:hover": { background: "#DC2626" },
              }}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Vacation Dialog */}
        <Dialog
          open={editVacationDialogOpen}
          onClose={() => {
            setEditVacationDialogOpen(false);
            setEditingVacation(null);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "#3B82F6" }}>
            ✏️ Editar Férias
          </DialogTitle>
          <DialogContent>
            {editingVacation && (
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ borderRadius: "8px" }}>
                  Editando férias de: <strong>{editingVacation.user?.name}</strong>
                </Alert>
                <TextField
                  label="Data de Início"
                  type="date"
                  value={editVacationForm.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setEditVacationForm((prev) => ({
                      ...prev,
                      start_date: newStart,
                      total_days: calculateDays(newStart, prev.end_date),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Data de Término"
                  type="date"
                  value={editVacationForm.end_date}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setEditVacationForm((prev) => ({
                      ...prev,
                      end_date: newEnd,
                      total_days: calculateDays(prev.start_date, newEnd),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Chip
                  label={`Total: ${editVacationForm.total_days} dias`}
                  sx={{ alignSelf: "flex-start", bgcolor: "rgba(59, 130, 246, 0.2)", color: "#3B82F6" }}
                />
                <TextField
                  label="Motivo/Observação"
                  multiline
                  rows={2}
                  value={editVacationForm.reason}
                  onChange={(e) => setEditVacationForm({ ...editVacationForm, reason: e.target.value })}
                  fullWidth
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setEditVacationDialogOpen(false);
                setEditingVacation(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveEditVacation}
              startIcon={<SaveIcon />}
              sx={{
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                "&:hover": { background: "#2563EB" },
              }}
            >
              Salvar Alterações
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Vacation Dialog */}
        <Dialog
          open={createVacationDialogOpen}
          onClose={() => {
            setCreateVacationDialogOpen(false);
            setSelectedUserForCreate(null);
            setUserSearchQuery("");
            setUserSearchResults([]);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "#10B981" }}>
            ➕ Adicionar Férias Manualmente
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {/* Busca de usuário */}
              <Box>
                <TextField
                  label="Buscar Colaborador"
                  placeholder="Digite o nome..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    searchUsersForCreate(e.target.value);
                  }}
                  fullWidth
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "rgba(255,255,255,0.3)", mr: 1 }} />,
                  }}
                />
                {userSearchResults.length > 0 && (
                  <Card sx={{ mt: 1, maxHeight: 200, overflow: "auto", background: "rgba(255,255,255,0.05)" }}>
                    {userSearchResults.map((user) => (
                      <Box
                        key={user.id}
                        sx={{
                          p: 1.5,
                          cursor: "pointer",
                          "&:hover": { background: "rgba(255,255,255,0.1)" },
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                        onClick={() => {
                          setSelectedUserForCreate(user);
                          setUserSearchQuery(user.name);
                          setUserSearchResults([]);
                        }}
                      >
                        <Typography variant="body2" color="white">{user.name}</Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">{user.email}</Typography>
                      </Box>
                    ))}
                  </Card>
                )}
                {selectedUserForCreate && (
                  <Chip
                    label={`Selecionado: ${selectedUserForCreate.name}`}
                    onDelete={() => {
                      setSelectedUserForCreate(null);
                      setUserSearchQuery("");
                    }}
                    sx={{ mt: 1, bgcolor: "rgba(16, 185, 129, 0.2)", color: "#10B981" }}
                  />
                )}
              </Box>

              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={createVacationForm.type}
                  onChange={(e) => setCreateVacationForm({ ...createVacationForm, type: e.target.value as typeof createVacationForm.type })}
                  label="Tipo"
                >
                  <MenuItem value="ferias">Férias</MenuItem>
                  <MenuItem value="abono">Abono</MenuItem>
                  <MenuItem value="licenca">Licença</MenuItem>
                  <MenuItem value="atestado">Atestado</MenuItem>
                  <MenuItem value="folga">Folga</MenuItem>
                  <MenuItem value="home_office">Home Office</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Data de Início"
                  type="date"
                  value={createVacationForm.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setCreateVacationForm((prev) => ({
                      ...prev,
                      start_date: newStart,
                      total_days: calculateDays(newStart, prev.end_date),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Data de Término"
                  type="date"
                  value={createVacationForm.end_date}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setCreateVacationForm((prev) => ({
                      ...prev,
                      end_date: newEnd,
                      total_days: calculateDays(prev.start_date, newEnd),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              <Chip
                label={`Total: ${createVacationForm.total_days} dias`}
                sx={{ alignSelf: "flex-start", bgcolor: "rgba(59, 130, 246, 0.2)", color: "#3B82F6" }}
              />

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={createVacationForm.status}
                  onChange={(e) => setCreateVacationForm({ ...createVacationForm, status: e.target.value as typeof createVacationForm.status })}
                  label="Status"
                >
                  <MenuItem value="approved">Aprovado</MenuItem>
                  <MenuItem value="pending">Pendente</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Motivo/Observação"
                multiline
                rows={2}
                value={createVacationForm.reason}
                onChange={(e) => setCreateVacationForm({ ...createVacationForm, reason: e.target.value })}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setCreateVacationDialogOpen(false);
                setSelectedUserForCreate(null);
                setUserSearchQuery("");
                setUserSearchResults([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateVacation}
              disabled={!selectedUserForCreate || !createVacationForm.start_date || !createVacationForm.end_date}
              sx={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                "&:hover": { background: "#059669" },
              }}
            >
              Criar Férias
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Vacation Dialog */}
        <Dialog
          open={cancelVacationDialogOpen}
          onClose={() => {
            setCancelVacationDialogOpen(false);
            setCancelingVacation(null);
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              minWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ color: "#F59E0B" }}>
            ⚠️ Cancelar Férias
          </DialogTitle>
          <DialogContent>
            {cancelingVacation && (
              <Stack spacing={2}>
                <Typography color="rgba(255,255,255,0.7)">
                  Tem certeza que deseja cancelar as férias de{" "}
                  <strong style={{ color: "#fff" }}>{cancelingVacation.user?.name}</strong>?
                </Typography>
                <Alert severity="warning" sx={{ borderRadius: "8px" }}>
                  <Typography variant="body2">
                    <strong>Período:</strong>{" "}
                    {new Date(cancelingVacation.start_date).toLocaleDateString("pt-BR")} -{" "}
                    {new Date(cancelingVacation.end_date).toLocaleDateString("pt-BR")}
                    <br />
                    <strong>Dias:</strong> {cancelingVacation.total_days}
                  </Typography>
                </Alert>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Os dias serão devolvidos ao saldo de férias do colaborador.
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setCancelVacationDialogOpen(false);
                setCancelingVacation(null);
              }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleCancelVacation}
              sx={{
                background: "#F59E0B",
                "&:hover": { background: "#D97706" },
              }}
            >
              Confirmar Cancelamento
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Sell Request Dialog */}
        <Dialog
          open={editSellDialogOpen}
          onClose={() => {
            setEditSellDialogOpen(false);
            setEditingSellRequest(null);
          }}
          PaperProps={{
            sx: {
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              minWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ color: "#3B82F6" }}>
            ✏️ Editar Venda de Férias
          </DialogTitle>
          <DialogContent>
            {editingSellRequest && (
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ borderRadius: "8px" }}>
                  Editando venda de: <strong>{editingSellRequest.user?.name}</strong>
                </Alert>
                <TextField
                  label="Quantidade de dias a vender"
                  type="number"
                  value={editSellDays}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setEditSellDays(Math.min(30, Math.max(1, value)));
                  }}
                  inputProps={{ min: 1, max: 30 }}
                  fullWidth
                  helperText="Mínimo: 1 dia | Máximo: 30 dias"
                />
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Ano do período: <strong style={{ color: "#fff" }}>{editingSellRequest.period_year}</strong>
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => {
                setEditSellDialogOpen(false);
                setEditingSellRequest(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdateSellRequest}
              startIcon={<SaveIcon />}
              disabled={editSellDays < 1 || editSellDays > 30}
              sx={{
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                "&:hover": { background: "#2563EB" },
              }}
            >
              Salvar Alterações
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
