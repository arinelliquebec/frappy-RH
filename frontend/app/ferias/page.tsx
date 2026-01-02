"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import EventIcon from "@mui/icons-material/Event";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FlagIcon from "@mui/icons-material/Flag";
import CelebrationIcon from "@mui/icons-material/Celebration";
import SchoolIcon from "@mui/icons-material/School";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SellIcon from "@mui/icons-material/Sell";
import {
  authAPI,
  userAPI,
  vacationAPI,
  calendarAPI,
  User,
  VacationBalance,
  Vacation,
  VacationStats,
  TeamVacation,
  VacationType,
  VacationStatus,
  CalendarEvent,
  VacationSellRequest,
} from "@/lib/api";

const eventTypes = [
  { value: "meta", label: "Meta", icon: FlagIcon, color: "#F59E0B" },
  { value: "feriado", label: "Feriado", icon: CelebrationIcon, color: "#EF4444" },
  { value: "evento", label: "Evento", icon: EventIcon, color: "#3B82F6" },
  { value: "treinamento", label: "Treinamento", icon: SchoolIcon, color: "#A855F7" },
];

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#10B981" },
    secondary: { main: "#059669" },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

const vacationTypes = [
  { value: "ferias", label: "Férias", icon: BeachAccessIcon, color: "#3B82F6" },
  { value: "abono", label: "Abono", icon: CardGiftcardIcon, color: "#A855F7" },
  { value: "licenca", label: "Licença", icon: EventBusyIcon, color: "#F59E0B" },
  { value: "atestado", label: "Atestado Médico", icon: LocalHospitalIcon, color: "#EF4444" },
  { value: "folga", label: "Folga", icon: EventIcon, color: "#10B981" },
  { value: "home_office", label: "Home Office", icon: HomeWorkIcon, color: "#6366F1" },
];

const statusConfig = {
  pending: { label: "Pendente", color: "#F59E0B", icon: PendingIcon },
  approved: { label: "Aprovado", color: "#10B981", icon: CheckCircleIcon },
  rejected: { label: "Rejeitado", color: "#EF4444", icon: CancelIcon },
  canceled: { label: "Cancelado", color: "#6B7280", icon: CancelIcon },
  interrupted: { label: "Interrompido", color: "#8B5CF6", icon: PauseCircleIcon },
};

export default function FeriasPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [balance, setBalance] = useState<VacationBalance | null>(null);
  const [stats, setStats] = useState<VacationStats | null>(null);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [teamVacations, setTeamVacations] = useState<TeamVacation[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Vacation[]>([]);
  const [ongoingVacations, setOngoingVacations] = useState<Vacation[]>([]);

  // UI states
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formType, setFormType] = useState<VacationType>("ferias");
  const [formStartDate, setFormStartDate] = useState<Dayjs | null>(null);
  const [formEndDate, setFormEndDate] = useState<Dayjs | null>(null);
  const [formReason, setFormReason] = useState("");

  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; vacation: Vacation | null; action: "approved" | "rejected" }>({
    open: false,
    vacation: null,
    action: "approved",
  });
  const [rejectReason, setRejectReason] = useState("");

  // Admin states
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; cpf: string }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminFormMode, setAdminFormMode] = useState<"vacation" | "event">("vacation");
  const [adminFormUserId, setAdminFormUserId] = useState("");
  const [adminFormStatus, setAdminFormStatus] = useState<VacationStatus>("approved");
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventFormTitle, setEventFormTitle] = useState("");
  const [eventFormDescription, setEventFormDescription] = useState("");
  const [eventFormType, setEventFormType] = useState("meta");
  const [eventFormColor, setEventFormColor] = useState("#F59E0B");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dayDetailDialog, setDayDetailDialog] = useState<{
    open: boolean;
    date: Dayjs | null;
    vacations: TeamVacation[];
    events: CalendarEvent[];
  }>({ open: false, date: null, vacations: [], events: [] });
  const [interruptDialog, setInterruptDialog] = useState<{
    open: boolean;
    vacation: Vacation | null;
  }>({ open: false, vacation: null });
  const [interruptReason, setInterruptReason] = useState("");

  // Venda de férias
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellDays, setSellDays] = useState(1);
  const [sellReason, setSellReason] = useState("");
  const [sellRequests, setSellRequests] = useState<VacationSellRequest[]>([]);
  const [submittingSell, setSubmittingSell] = useState(false);

  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token) {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      userAPI.getProfile().then((response) => {
        if (response.success && response.user) {
          setUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        }
      }).catch(() => {});
      loadData();
    } else {
      router.push("/login");
    }
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balanceRes, statsRes, vacationsRes, teamRes, eventsRes, sellRes] = await Promise.all([
        vacationAPI.getBalance(),
        vacationAPI.getStats(),
        vacationAPI.getMyVacations({ per_page: 50 }),
        vacationAPI.getTeamVacations(calendarMonth.month() + 1, calendarMonth.year()),
        calendarAPI.getEvents(calendarMonth.month() + 1, calendarMonth.year()),
        vacationAPI.getMySellRequests(),
      ]);

      if (balanceRes.success) setBalance(balanceRes.balance);
      if (statsRes.success) setStats(statsRes.stats);
      if (vacationsRes.vacations) setVacations(vacationsRes.vacations);
      if (teamRes.success) setTeamVacations(teamRes.vacations);
      if (eventsRes.success) setCalendarEvents(eventsRes.events || []);
      if (sellRes.success) setSellRequests(sellRes.requests || []);

      // Load admin data
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.role === "admin") {
          const [pendingRes, usersRes, allVacationsRes] = await Promise.all([
            vacationAPI.getPendingApprovals(),
            vacationAPI.getAllUsersForAdmin(),
            vacationAPI.getAllVacations({ status: "approved" }),
          ]);
          if (pendingRes.success) setPendingApprovals(pendingRes.vacations);
          if (usersRes.success) setAllUsers(usersRes.users || []);
          // Filtrar férias em andamento (aprovadas e data atual está no período)
          if (allVacationsRes.success && allVacationsRes.vacations) {
            const now = dayjs();
            const ongoing = allVacationsRes.vacations.filter(
              (v: Vacation) => v.status === "approved" &&
                dayjs(v.start_date).isBefore(now.add(1, 'day')) &&
                dayjs(v.end_date).isAfter(now.subtract(1, 'day'))
            );
            setOngoingVacations(ongoing);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      Promise.all([
        vacationAPI.getTeamVacations(calendarMonth.month() + 1, calendarMonth.year()),
        calendarAPI.getEvents(calendarMonth.month() + 1, calendarMonth.year()),
      ]).then(([teamRes, eventsRes]) => {
        if (teamRes.success) setTeamVacations(teamRes.vacations);
        if (eventsRes.success) setCalendarEvents(eventsRes.events || []);
      });
    }
  }, [calendarMonth, mounted]);

  // Calendar data - must be before any conditional returns
  const calendarDays = useMemo(() => {
    const startOfMonth = calendarMonth.startOf("month");
    const endOfMonth = calendarMonth.endOf("month");
    const startDay = startOfMonth.day();
    const daysInMonth = calendarMonth.daysInMonth();

    const days: { date: Dayjs; vacations: TeamVacation[]; events: CalendarEvent[] }[] = [];

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: startOfMonth.subtract(i + 1, "day"), vacations: [], events: [] });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = calendarMonth.date(i);
      const dayVacations = teamVacations.filter((v) => {
        const start = dayjs(v.start_date);
        const end = dayjs(v.end_date);
        return date.isSame(start, "day") || date.isSame(end, "day") || (date.isAfter(start) && date.isBefore(end));
      });
      const dayEvents = calendarEvents.filter((e) => {
        const start = dayjs(e.start_date);
        const end = dayjs(e.end_date);
        return date.isSame(start, "day") || date.isSame(end, "day") || (date.isAfter(start) && date.isBefore(end));
      });
      days.push({ date, vacations: dayVacations, events: dayEvents });
    }

    // Next month days to complete grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: endOfMonth.add(i, "day"), vacations: [], events: [] });
    }

    return days;
  }, [calendarMonth, teamVacations, calendarEvents]);

  const totalFormDays = useMemo(() => {
    if (!formStartDate || !formEndDate) return 0;
    return formEndDate.diff(formStartDate, "day") + 1;
  }, [formStartDate, formEndDate]);

  if (!mounted) return null;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authAPI.logout();
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

  const handleCreateVacation = async () => {
    if (!formStartDate || !formEndDate) {
      setSnackbar({ open: true, message: "Selecione as datas", severity: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await vacationAPI.create({
        type: formType,
        start_date: formStartDate.format("YYYY-MM-DD"),
        end_date: formEndDate.format("YYYY-MM-DD"),
        reason: formReason,
      });

      if (res.success) {
        setSnackbar({ open: true, message: "Solicitação criada com sucesso!", severity: "success" });
        setDialogOpen(false);
        resetForm();
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro ao criar solicitação", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelVacation = async (id: number) => {
    try {
      const res = await vacationAPI.cancel(id);
      if (res.success) {
        setSnackbar({ open: true, message: "Solicitação cancelada!", severity: "success" });
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro ao cancelar", severity: "error" });
    }
  };

  const handleApproval = async () => {
    if (!approvalDialog.vacation) return;

    setSubmitting(true);
    try {
      const res = await vacationAPI.approveOrReject(
        String(approvalDialog.vacation.id),
        approvalDialog.action,
        approvalDialog.action === "rejected" ? rejectReason : undefined
      );

      if (res.success) {
        setSnackbar({
          open: true,
          message: approvalDialog.action === "approved" ? "Solicitação aprovada!" : "Solicitação rejeitada!",
          severity: "success",
        });
        setApprovalDialog({ open: false, vacation: null, action: "approved" });
        setRejectReason("");
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro ao processar", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterrupt = async () => {
    if (!interruptDialog.vacation) return;

    setSubmitting(true);
    try {
      const res = await vacationAPI.interruptVacation(
        String(interruptDialog.vacation.id),
        interruptReason
      );

      if (res.success) {
        setSnackbar({
          open: true,
          message: `Férias interrompidas! ${res.actual_days} dias usados, ${res.days_returned} dias devolvidos.`,
          severity: "success",
        });
        setInterruptDialog({ open: false, vacation: null });
        setInterruptReason("");
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro ao interromper férias", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormType("ferias");
    setFormStartDate(null);
    setFormEndDate(null);
    setFormReason("");
  };

  const resetAdminForm = () => {
    setAdminFormUserId("");
    setAdminFormStatus("approved");
    setFormType("ferias");
    setFormStartDate(null);
    setFormEndDate(null);
    setFormReason("");
    setEditingVacation(null);
  };

  const resetEventForm = () => {
    setEventFormTitle("");
    setEventFormDescription("");
    setEventFormType("meta");
    setEventFormColor("#F59E0B");
    setFormStartDate(null);
    setFormEndDate(null);
    setEditingEvent(null);
  };

  // Admin: Create/Edit vacation for any user
  const handleAdminCreateVacation = async () => {
    if (!formStartDate || !formEndDate || (!editingVacation && !adminFormUserId)) {
      setSnackbar({ open: true, message: "Preencha todos os campos", severity: "error" });
      return;
    }

    setSubmitting(true);
    try {
      if (editingVacation) {
        const res = await vacationAPI.adminUpdate(String(editingVacation.id), {
          type: formType,
          start_date: formStartDate.format("YYYY-MM-DD"),
          end_date: formEndDate.format("YYYY-MM-DD"),
          status: adminFormStatus,
          reason: formReason,
        });
        if (res.success) {
          setSnackbar({ open: true, message: "Solicitação atualizada!", severity: "success" });
        }
      } else {
        const res = await vacationAPI.adminCreate({
          user_id: adminFormUserId,
          type: formType,
          start_date: formStartDate.format("YYYY-MM-DD"),
          end_date: formEndDate.format("YYYY-MM-DD"),
          status: adminFormStatus,
          reason: formReason,
        });
        if (res.success) {
          setSnackbar({ open: true, message: "Solicitação criada!", severity: "success" });
        }
      }
      setAdminDialogOpen(false);
      resetAdminForm();
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Delete vacation
  const handleAdminDeleteVacation = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta solicitação?")) return;
    try {
      const res = await vacationAPI.adminDelete(id);
      if (res.success) {
        setSnackbar({ open: true, message: "Solicitação removida!", severity: "success" });
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro", severity: "error" });
    }
  };

  // Admin: Edit vacation
  const handleEditVacation = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setFormType(vacation.type);
    setFormStartDate(dayjs(vacation.start_date));
    setFormEndDate(dayjs(vacation.end_date));
    setFormReason(vacation.reason || "");
    setAdminFormStatus(vacation.status);
    setAdminDialogOpen(true);
  };

  // Admin: Create/Edit calendar event
  const handleSaveEvent = async () => {
    if (!formStartDate || !formEndDate || !eventFormTitle) {
      setSnackbar({ open: true, message: "Preencha todos os campos", severity: "error" });
      return;
    }

    setSubmitting(true);
    try {
      if (editingEvent) {
        const res = await calendarAPI.update(editingEvent.id, {
          title: eventFormTitle,
          description: eventFormDescription,
          type: eventFormType,
          start_date: formStartDate.format("YYYY-MM-DD"),
          end_date: formEndDate.format("YYYY-MM-DD"),
          color: eventFormColor,
        });
        if (res.success) {
          setSnackbar({ open: true, message: "Evento atualizado!", severity: "success" });
        }
      } else {
        const res = await calendarAPI.create({
          title: eventFormTitle,
          description: eventFormDescription,
          type: eventFormType,
          start_date: formStartDate.format("YYYY-MM-DD"),
          end_date: formEndDate.format("YYYY-MM-DD"),
          color: eventFormColor,
        });
        if (res.success) {
          setSnackbar({ open: true, message: "Evento criado!", severity: "success" });
        }
      }
      setEventDialogOpen(false);
      resetEventForm();
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Delete event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este evento?")) return;
    try {
      const res = await calendarAPI.delete(id);
      if (res.success) {
        setSnackbar({ open: true, message: "Evento removido!", severity: "success" });
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro", severity: "error" });
    }
  };

  // Admin: Edit event
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventFormTitle(event.title);
    setEventFormDescription(event.description || "");
    setEventFormType(event.type);
    setEventFormColor(event.color || "#F59E0B");
    setFormStartDate(dayjs(event.start_date));
    setFormEndDate(dayjs(event.end_date));
    setEventDialogOpen(true);
    setDayDetailDialog({ open: false, date: null, vacations: [], events: [] });
  };

  // Venda de férias
  const handleSellVacation = async () => {
    if (!balance || balance.available_days < sellDays) {
      setSnackbar({ open: true, message: "Saldo insuficiente de férias", severity: "error" });
      return;
    }

    setSubmittingSell(true);
    try {
      const res = await vacationAPI.createSellRequest({
        days_to_sell: sellDays,
        reason: sellReason,
      });

      if (res.success) {
        setSnackbar({ open: true, message: "Solicitação de venda enviada com sucesso!", severity: "success" });
        setSellDialogOpen(false);
        setSellDays(1);
        setSellReason("");
        loadData();
      }
    } catch (error: unknown) {
      const err = error as Error;
      setSnackbar({ open: true, message: err.message || "Erro ao solicitar venda", severity: "error" });
    } finally {
      setSubmittingSell(false);
    }
  };

  // Handle double click on calendar day
  const handleDayDoubleClick = (day: { date: Dayjs; vacations: TeamVacation[]; events: CalendarEvent[] }) => {
    if (day.vacations.length > 0 || day.events.length > 0 || user?.role === "admin") {
      setDayDetailDialog({
        open: true,
        date: day.date,
        vacations: day.vacations,
        events: day.events,
      });
    }
  };

  const getTypeConfig = (type: string) => {
    return vacationTypes.find((t) => t.value === type) || vacationTypes[0];
  };

  const getEventTypeConfig = (type: string) => {
    return eventTypes.find((t) => t.value === type) || eventTypes[0];
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <Box
          sx={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated Background */}
          <Box
            sx={{
              position: "absolute",
              top: -200,
              left: "20%",
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "float 12s ease-in-out infinite",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -100,
              right: "10%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
              animation: "float 15s ease-in-out infinite reverse",
            }}
          />

          {/* Grid Pattern */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
              pointerEvents: "none",
            }}
          />

          {/* Top Navigation */}
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: "rgba(10, 10, 18, 0.85)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(16, 185, 129, 0.1)",
            }}
          >
            <Box
              sx={{
                maxWidth: 1400,
                mx: "auto",
                px: 3,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Left Side */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Link href="/hub">
                  <IconButton
                    sx={{
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      color: "#10B981",
                      "&:hover": { background: "rgba(16, 185, 129, 0.2)" },
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Link>
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{
                      fontFamily: "var(--font-orbitron), sans-serif",
                      background: "linear-gradient(135deg, #10B981 0%, #3B82F6 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    FÉRIAS & AUSÊNCIAS
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.5)">
                    Gerencie suas folgas e ausências
                  </Typography>
                </Box>
              </Stack>

              {/* Right Side */}
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                  sx={{
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    "&:hover": {
                      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    },
                  }}
                >
                  Nova Solicitação
                </Button>

                <Tooltip title="Converter até 1/3 das férias em dinheiro (abono pecuniário)">
                  <Button
                    variant="outlined"
                    startIcon={<SellIcon />}
                    onClick={() => setSellDialogOpen(true)}
                    sx={{
                      borderColor: "rgba(245, 158, 11, 0.5)",
                      color: "#F59E0B",
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "#F59E0B",
                        background: "rgba(245, 158, 11, 0.1)",
                      },
                    }}
                  >
                    Vender Férias
                  </Button>
                </Tooltip>

                {user?.role === "admin" && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<BeachAccessIcon />}
                      onClick={() => router.push("/adminhub/ferias")}
                      sx={{
                        borderColor: "rgba(59, 130, 246, 0.5)",
                        color: "#3B82F6",
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: "#3B82F6",
                          background: "rgba(59, 130, 246, 0.1)",
                        },
                      }}
                    >
                      Gerenciar Férias
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FlagIcon />}
                      onClick={() => {
                        resetEventForm();
                        setEventDialogOpen(true);
                      }}
                      sx={{
                        borderColor: "rgba(245, 158, 11, 0.5)",
                        color: "#F59E0B",
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: "#F59E0B",
                          background: "rgba(245, 158, 11, 0.1)",
                        },
                      }}
                    >
                      Adicionar Evento
                    </Button>
                  </>
                )}

                {user && (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    onClick={handleMenuClick}
                    sx={{
                      cursor: "pointer",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "50px",
                      py: 0.8,
                      px: 2,
                      pr: 1,
                      transition: "all 0.2s ease",
                      "&:hover": { background: "rgba(16, 185, 129, 0.2)" },
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="white">
                      {user.name}
                    </Typography>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(user.name)}
                    </Avatar>
                  </Stack>
                )}

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
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "16px",
                      minWidth: 200,
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="rgba(255,255,255,0.5)">
                      Logado como
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="white">
                      {user?.name}
                    </Typography>
                  </Box>
                  <Divider sx={{ borderColor: "rgba(16, 185, 129, 0.2)" }} />
                  <MenuItem onClick={() => { handleMenuClose(); router.push("/perfil"); }}>
                    <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Meu Perfil
                  </MenuItem>
                  {user?.role === "admin" && (
                    <MenuItem onClick={() => { handleMenuClose(); router.push("/admin"); }}>
                      <AdminPanelSettingsIcon sx={{ mr: 1.5, fontSize: 20, color: "#10B981" }} />
                      Painel Admin
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: "#10B981 !important" }}>
                    <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                    Sair
                  </MenuItem>
                </Menu>
              </Stack>
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ pt: 18, pb: 6, px: 3, position: "relative", zIndex: 1 }}>
            <Box sx={{ maxWidth: 1400, mx: "auto" }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                  <CircularProgress sx={{ color: "#10B981" }} />
                </Box>
              ) : (
                <>
                  {/* Stats Cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                        gap: 3,
                        mb: 4,
                      }}
                    >
                      {/* Saldo de Férias */}
                      <Card
                        sx={{
                          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "20px",
                          overflow: "hidden",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" color="rgba(255,255,255,0.5)" fontWeight={500}>
                                Saldo de Férias
                              </Typography>
                              <Typography variant="h3" fontWeight="bold" color="white" sx={{ my: 1 }}>
                                {balance?.available_days || 0}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                dias disponíveis
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: "14px",
                                background: "rgba(59, 130, 246, 0.2)",
                              }}
                            >
                              <BeachAccessIcon sx={{ fontSize: 28, color: "#3B82F6" }} />
                            </Box>
                          </Stack>
                          <Box sx={{ mt: 2 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                Utilizado
                              </Typography>
                              <Typography variant="caption" color="#3B82F6">
                                {balance?.used_days || 0} / {balance?.total_days || 30}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={((balance?.used_days || 0) / (balance?.total_days || 30)) * 100}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                background: "rgba(59, 130, 246, 0.1)",
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 3,
                                  background: "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)",
                                },
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>

                      {/* Próximas Férias */}
                      <Card
                        sx={{
                          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.02) 100%)",
                          border: "1px solid rgba(168, 85, 247, 0.2)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" color="rgba(255,255,255,0.5)" fontWeight={500}>
                                Próximas Férias
                              </Typography>
                              {(() => {
                                const nextVacation = vacations
                                  .filter(v => v.status === "approved" && v.type === "ferias" && dayjs(v.start_date).isAfter(dayjs()))
                                  .sort((a, b) => dayjs(a.start_date).diff(dayjs(b.start_date)))[0];

                                if (nextVacation) {
                                  const daysUntil = dayjs(nextVacation.start_date).diff(dayjs(), 'day');
                                  return (
                                    <>
                                      <Typography variant="h4" fontWeight="bold" color="white" sx={{ my: 1 }}>
                                        {dayjs(nextVacation.start_date).format("DD/MM")}
                                      </Typography>
                                      <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                        em {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}
                                      </Typography>
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <Typography variant="h4" fontWeight="bold" color="rgba(255,255,255,0.3)" sx={{ my: 1 }}>
                                      —
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                      nenhuma agendada
                                    </Typography>
                                  </>
                                );
                              })()}
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: "14px",
                                background: "rgba(168, 85, 247, 0.2)",
                              }}
                            >
                              <CalendarMonthIcon sx={{ fontSize: 28, color: "#A855F7" }} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Pendentes */}
                      <Card
                        sx={{
                          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" color="rgba(255,255,255,0.5)" fontWeight={500}>
                                Solicitações Pendentes
                              </Typography>
                              <Typography variant="h3" fontWeight="bold" color="white" sx={{ my: 1 }}>
                                {stats?.pending_requests || 0}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                aguardando aprovação
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: "14px",
                                background: "rgba(245, 158, 11, 0.2)",
                              }}
                            >
                              <AccessTimeIcon sx={{ fontSize: 28, color: "#F59E0B" }} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>

                      {/* Aprovadas */}
                      <Card
                        sx={{
                          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" color="rgba(255,255,255,0.5)" fontWeight={500}>
                                Total Aprovadas
                              </Typography>
                              <Typography variant="h3" fontWeight="bold" color="white" sx={{ my: 1 }}>
                                {stats?.approved_requests || 0}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                {stats?.total_days_used || 0} dias utilizados
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: "14px",
                                background: "rgba(16, 185, 129, 0.2)",
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 28, color: "#10B981" }} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Box>
                  </motion.div>

                  {/* Tabs */}
                  <Box sx={{ mb: 3 }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, val) => setActiveTab(val)}
                      sx={{
                        "& .MuiTabs-indicator": {
                          background: "linear-gradient(90deg, #10B981 0%, #3B82F6 100%)",
                          height: 3,
                          borderRadius: 2,
                        },
                        "& .MuiTab-root": {
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: 500,
                          textTransform: "none",
                          fontSize: "1rem",
                          "&.Mui-selected": { color: "white" },
                        },
                      }}
                    >
                      <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Calendário" />
                      <Tab
                        icon={<EventIcon />}
                        iconPosition="start"
                        label={
                          <Badge badgeContent={vacations.length} color="primary">
                            Minhas Solicitações
                          </Badge>
                        }
                      />
                      {user?.role === "admin" && (
                        <Tab
                          icon={<GroupsIcon />}
                          iconPosition="start"
                          label={
                            <Badge badgeContent={pendingApprovals.length} color="warning">
                              Aprovar Solicitações
                            </Badge>
                          }
                        />
                      )}
                      {user?.role === "admin" && (
                        <Tab
                          icon={<PauseCircleIcon />}
                          iconPosition="start"
                          label={
                            <Badge badgeContent={ongoingVacations.length} color="secondary">
                              Interromper Férias
                            </Badge>
                          }
                        />
                      )}
                    </Tabs>
                  </Box>

                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 0 && (
                      <motion.div
                        key="calendar"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {/* Calendar */}
                        <Card
                          sx={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "20px",
                            overflow: "hidden",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            {/* Calendar Header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                              <Typography variant="h6" fontWeight="bold" color="white">
                                Calendário da Equipe
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton onClick={() => setCalendarMonth(calendarMonth.subtract(1, "month"))}>
                                  <ChevronLeftIcon sx={{ color: "rgba(255,255,255,0.7)" }} />
                                </IconButton>
                                <Typography variant="h6" color="white" sx={{ minWidth: 180, textAlign: "center" }}>
                                  {calendarMonth.format("MMMM YYYY")}
                                </Typography>
                                <IconButton onClick={() => setCalendarMonth(calendarMonth.add(1, "month"))}>
                                  <ChevronRightIcon sx={{ color: "rgba(255,255,255,0.7)" }} />
                                </IconButton>
                              </Stack>
                            </Stack>

                            {/* Weekday Headers */}
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                                <Typography
                                  key={day}
                                  variant="caption"
                                  fontWeight={600}
                                  color="rgba(255,255,255,0.5)"
                                  textAlign="center"
                                >
                                  {day}
                                </Typography>
                              ))}
                            </Box>

                            {/* Calendar Grid */}
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                gap: 1,
                              }}
                            >
                              {calendarDays.map((day, index) => {
                                const isCurrentMonth = day.date.month() === calendarMonth.month();
                                const isToday = day.date.isSame(dayjs(), "day");
                                const hasVacations = day.vacations.length > 0;
                                const hasEvents = day.events.length > 0;
                                const hasContent = hasVacations || hasEvents;

                                return (
                                  <Tooltip
                                    key={index}
                                    title={
                                      hasContent ? (
                                        <Box>
                                          {day.events.map((e, i) => (
                                            <Typography key={`e-${i}`} variant="caption" display="block" sx={{ color: e.color }}>
                                              📌 {e.title}
                                            </Typography>
                                          ))}
                                          {day.vacations.map((v, i) => (
                                            <Typography key={`v-${i}`} variant="caption" display="block">
                                              {v.user_name}: {getTypeConfig(v.type).label}
                                            </Typography>
                                          ))}
                                        </Box>
                                      ) : ""
                                    }
                                    arrow
                                  >
                                    <Box
                                      onDoubleClick={() => handleDayDoubleClick(day)}
                                      sx={{
                                        aspectRatio: "1",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: "12px",
                                        background: isToday
                                          ? "rgba(16, 185, 129, 0.2)"
                                          : hasEvents
                                          ? "rgba(245, 158, 11, 0.1)"
                                          : hasVacations
                                          ? "rgba(59, 130, 246, 0.1)"
                                          : "rgba(255,255,255,0.02)",
                                        border: isToday
                                          ? "2px solid #10B981"
                                          : hasEvents
                                          ? "1px solid rgba(245, 158, 11, 0.4)"
                                          : hasVacations
                                          ? "1px solid rgba(59, 130, 246, 0.3)"
                                          : "1px solid rgba(255,255,255,0.03)",
                                        opacity: isCurrentMonth ? 1 : 0.3,
                                        cursor: (hasContent || user?.role === "admin") ? "pointer" : "default",
                                        transition: "all 0.2s",
                                        "&:hover": (hasContent || user?.role === "admin")
                                          ? { background: hasEvents ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)" }
                                          : {},
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        fontWeight={isToday ? 700 : 500}
                                        color={isToday ? "#10B981" : "rgba(255,255,255,0.7)"}
                                      >
                                        {day.date.date()}
                                      </Typography>
                                      {hasContent && (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            gap: 0.3,
                                            mt: 0.5,
                                          }}
                                        >
                                          {day.events.slice(0, 2).map((e, i) => (
                                            <Box
                                              key={`ed-${i}`}
                                              sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "2px",
                                                background: e.color || "#F59E0B",
                                              }}
                                            />
                                          ))}
                                          {day.vacations.slice(0, 3 - day.events.length).map((v, i) => (
                                            <Box
                                              key={i}
                                              sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: getTypeConfig(v.type).color,
                                              }}
                                            />
                                          ))}
                                        </Box>
                                      )}
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>

                            {/* Legend */}
                            <Stack direction="row" spacing={3} sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
                              {vacationTypes.slice(0, 4).map((type) => (
                                <Stack key={type.value} direction="row" spacing={1} alignItems="center">
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      background: type.color,
                                    }}
                                  />
                                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                                    {type.label}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {activeTab === 1 && (
                      <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {/* My Vacations List */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {vacations.length === 0 ? (
                            <Card
                              sx={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "20px",
                                p: 6,
                                textAlign: "center",
                              }}
                            >
                              <BeachAccessIcon sx={{ fontSize: 64, color: "rgba(255,255,255,0.1)", mb: 2 }} />
                              <Typography variant="h6" color="rgba(255,255,255,0.5)">
                                Nenhuma solicitação encontrada
                              </Typography>
                              <Typography variant="body2" color="rgba(255,255,255,0.3)" sx={{ mb: 3 }}>
                                Clique em "Nova Solicitação" para começar
                              </Typography>
                              <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => setDialogOpen(true)}
                                sx={{
                                  borderColor: "rgba(16, 185, 129, 0.5)",
                                  color: "#10B981",
                                  "&:hover": {
                                    borderColor: "#10B981",
                                    background: "rgba(16, 185, 129, 0.1)",
                                  },
                                }}
                              >
                                Nova Solicitação
                              </Button>
                            </Card>
                          ) : (
                            vacations.map((vacation) => {
                              const typeConfig = getTypeConfig(vacation.type);
                              const statusConf = statusConfig[vacation.status];
                              const TypeIcon = typeConfig.icon;
                              const StatusIcon = statusConf.icon;

                              return (
                                <motion.div
                                  key={vacation.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                >
                                  <Card
                                    sx={{
                                      background: "rgba(255,255,255,0.02)",
                                      border: "1px solid rgba(255,255,255,0.05)",
                                      borderRadius: "16px",
                                      overflow: "hidden",
                                      "&:hover": {
                                        borderColor: "rgba(255,255,255,0.1)",
                                      },
                                    }}
                                  >
                                    <CardContent sx={{ p: 0 }}>
                                      <Stack direction={{ xs: "column", md: "row" }} alignItems="stretch">
                                        {/* Left Color Bar */}
                                        <Box
                                          sx={{
                                            width: { xs: "100%", md: 6 },
                                            height: { xs: 6, md: "auto" },
                                            background: typeConfig.color,
                                          }}
                                        />

                                        {/* Content */}
                                        <Box sx={{ flex: 1, p: 3 }}>
                                          <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            justifyContent="space-between"
                                            alignItems={{ xs: "flex-start", sm: "center" }}
                                            spacing={2}
                                          >
                                            <Stack direction="row" spacing={2} alignItems="center">
                                              <Box
                                                sx={{
                                                  p: 1.5,
                                                  borderRadius: "12px",
                                                  background: `${typeConfig.color}20`,
                                                }}
                                              >
                                                <TypeIcon sx={{ fontSize: 28, color: typeConfig.color }} />
                                              </Box>
                                              <Box>
                                                <Typography variant="h6" fontWeight="bold" color="white">
                                                  {typeConfig.label}
                                                </Typography>
                                                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                                                  {dayjs(vacation.start_date).format("DD/MM/YYYY")} -{" "}
                                                  {dayjs(vacation.end_date).format("DD/MM/YYYY")}
                                                </Typography>
                                              </Box>
                                            </Stack>

                                            <Stack direction="row" spacing={2} alignItems="center">
                                              <Chip
                                                icon={<StatusIcon sx={{ fontSize: 18 }} />}
                                                label={statusConf.label}
                                                sx={{
                                                  background: `${statusConf.color}20`,
                                                  color: statusConf.color,
                                                  fontWeight: 600,
                                                  "& .MuiChip-icon": { color: statusConf.color },
                                                }}
                                              />
                                              <Chip
                                                label={
                                                  vacation.status === "interrupted"
                                                    ? `${vacation.actual_days || 0}/${vacation.total_days} dias`
                                                    : `${vacation.total_days} dias`
                                                }
                                                sx={{
                                                  background: "rgba(255,255,255,0.05)",
                                                  color: "rgba(255,255,255,0.7)",
                                                }}
                                              />
                                              {(vacation.status === "pending" ||
                                                (vacation.status === "approved" && dayjs(vacation.start_date).isAfter(dayjs()))) && (
                                                <Button
                                                  size="small"
                                                  color="error"
                                                  onClick={() => handleCancelVacation(vacation.id)}
                                                  sx={{ textTransform: "none" }}
                                                >
                                                  Cancelar
                                                </Button>
                                              )}
                                            </Stack>
                                          </Stack>

                                          {vacation.reason && (
                                            <Typography
                                              variant="body2"
                                              color="rgba(255,255,255,0.4)"
                                              sx={{ mt: 2 }}
                                            >
                                              <strong>Motivo:</strong> {vacation.reason}
                                            </Typography>
                                          )}

                                          {vacation.reject_reason && (
                                            <Alert severity="error" sx={{ mt: 2, background: "rgba(239, 68, 68, 0.1)" }}>
                                              <strong>Motivo da rejeição:</strong> {vacation.reject_reason}
                                            </Alert>
                                          )}
                                        </Box>
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })
                          )}
                        </Box>
                      </motion.div>
                    )}

                    {activeTab === 2 && user?.role === "admin" && (
                      <motion.div
                        key="approvals"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {/* Pending Approvals */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {pendingApprovals.length === 0 ? (
                            <Card
                              sx={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "20px",
                                p: 6,
                                textAlign: "center",
                              }}
                            >
                              <CheckCircleIcon sx={{ fontSize: 64, color: "rgba(16, 185, 129, 0.3)", mb: 2 }} />
                              <Typography variant="h6" color="rgba(255,255,255,0.5)">
                                Todas as solicitações foram processadas
                              </Typography>
                              <Typography variant="body2" color="rgba(255,255,255,0.3)">
                                Não há solicitações pendentes de aprovação
                              </Typography>
                            </Card>
                          ) : (
                            pendingApprovals.map((vacation) => {
                              const typeConfig = getTypeConfig(vacation.type);
                              const TypeIcon = typeConfig.icon;

                              return (
                                <motion.div
                                  key={vacation.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                >
                                  <Card
                                    sx={{
                                      background: "rgba(245, 158, 11, 0.05)",
                                      border: "1px solid rgba(245, 158, 11, 0.2)",
                                      borderRadius: "16px",
                                    }}
                                  >
                                    <CardContent sx={{ p: 3 }}>
                                      <Stack
                                        direction={{ xs: "column", md: "row" }}
                                        justifyContent="space-between"
                                        alignItems={{ xs: "flex-start", md: "center" }}
                                        spacing={2}
                                      >
                                        <Stack direction="row" spacing={2} alignItems="center">
                                          <Avatar
                                            sx={{
                                              width: 48,
                                              height: 48,
                                              background: `${typeConfig.color}30`,
                                              color: typeConfig.color,
                                            }}
                                          >
                                            <TypeIcon />
                                          </Avatar>
                                          <Box>
                                            <Typography variant="h6" fontWeight="bold" color="white">
                                              {vacation.user?.name || "Usuário"}
                                            </Typography>
                                            <Typography variant="body2" color="rgba(255,255,255,0.5)">
                                              {typeConfig.label} • {vacation.total_days} dias
                                            </Typography>
                                            <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                              {dayjs(vacation.start_date).format("DD/MM/YYYY")} -{" "}
                                              {dayjs(vacation.end_date).format("DD/MM/YYYY")}
                                            </Typography>
                                          </Box>
                                        </Stack>

                                        <Stack direction="row" spacing={1}>
                                          <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<CheckCircleIcon />}
                                            onClick={() =>
                                              setApprovalDialog({ open: true, vacation, action: "approved" })
                                            }
                                            sx={{ textTransform: "none", borderRadius: "10px" }}
                                          >
                                            Aprovar
                                          </Button>
                                          <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<CancelIcon />}
                                            onClick={() =>
                                              setApprovalDialog({ open: true, vacation, action: "rejected" })
                                            }
                                            sx={{ textTransform: "none", borderRadius: "10px" }}
                                          >
                                            Rejeitar
                                          </Button>
                                        </Stack>
                                      </Stack>

                                      {vacation.reason && (
                                        <Typography
                                          variant="body2"
                                          color="rgba(255,255,255,0.4)"
                                          sx={{ mt: 2, pl: 8 }}
                                        >
                                          <strong>Motivo:</strong> {vacation.reason}
                                        </Typography>
                                      )}
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })
                          )}
                        </Box>
                      </motion.div>
                    )}

                    {activeTab === 3 && user?.role === "admin" && (
                      <motion.div
                        key="interrupt"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        {/* Ongoing Vacations to Interrupt */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {ongoingVacations.length === 0 ? (
                            <Card
                              sx={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "16px",
                              }}
                            >
                              <CardContent sx={{ textAlign: "center", py: 6 }}>
                                <PauseCircleIcon sx={{ fontSize: 60, color: "rgba(255,255,255,0.2)", mb: 2 }} />
                                <Typography color="rgba(255,255,255,0.5)">
                                  Nenhuma férias em andamento para interromper
                                </Typography>
                              </CardContent>
                            </Card>
                          ) : (
                            ongoingVacations.map((vacation, index) => {
                              const typeConfig = getTypeConfig(vacation.type);
                              const TypeIcon = typeConfig.icon;
                              const now = dayjs();
                              const daysElapsed = Math.max(0, now.diff(dayjs(vacation.start_date), 'day') + 1);
                              const daysRemaining = Math.max(0, dayjs(vacation.end_date).diff(now, 'day') + 1);

                              return (
                                <motion.div
                                  key={vacation.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <Card
                                    sx={{
                                      background: "rgba(139, 92, 246, 0.05)",
                                      border: "1px solid rgba(139, 92, 246, 0.2)",
                                      borderRadius: "16px",
                                      transition: "all 0.2s ease",
                                      "&:hover": {
                                        borderColor: "rgba(139, 92, 246, 0.4)",
                                        boxShadow: "0 4px 20px rgba(139, 92, 246, 0.1)",
                                      },
                                    }}
                                  >
                                    <CardContent sx={{ p: 3 }}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Stack direction="row" spacing={2} alignItems="center">
                                          <Avatar
                                            sx={{
                                              width: 48,
                                              height: 48,
                                              background: `${typeConfig.color}30`,
                                              color: typeConfig.color,
                                            }}
                                          >
                                            <TypeIcon />
                                          </Avatar>
                                          <Box>
                                            <Typography variant="h6" fontWeight="bold" color="white">
                                              {vacation.user?.name || "Usuário"}
                                            </Typography>
                                            <Typography variant="body2" color="rgba(255,255,255,0.5)">
                                              {typeConfig.label} • {vacation.total_days} dias totais
                                            </Typography>
                                            <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                              {dayjs(vacation.start_date).format("DD/MM/YYYY")} -{" "}
                                              {dayjs(vacation.end_date).format("DD/MM/YYYY")}
                                            </Typography>
                                          </Box>
                                        </Stack>

                                        <Button
                                          variant="contained"
                                          startIcon={<PauseCircleIcon />}
                                          onClick={() => setInterruptDialog({ open: true, vacation })}
                                          sx={{
                                            textTransform: "none",
                                            borderRadius: "10px",
                                            background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                                          }}
                                        >
                                          Interromper
                                        </Button>
                                      </Stack>

                                      {/* Progress info */}
                                      <Box sx={{ mt: 2, p: 2, background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                          <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                            Progresso das férias
                                          </Typography>
                                          <Typography variant="body2" fontWeight="bold" color="#8B5CF6">
                                            {daysElapsed}/{vacation.total_days} dias
                                          </Typography>
                                        </Stack>
                                        <LinearProgress
                                          variant="determinate"
                                          value={(daysElapsed / vacation.total_days) * 100}
                                          sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            background: "rgba(139, 92, 246, 0.1)",
                                            "& .MuiLinearProgress-bar": {
                                              background: "linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)",
                                              borderRadius: 4,
                                            },
                                          }}
                                        />
                                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                                          <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                            ✅ {daysElapsed} dias utilizados
                                          </Typography>
                                          <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                            ⏳ {daysRemaining} dias restantes
                                          </Typography>
                                        </Stack>
                                      </Box>

                                      {vacation.reason && (
                                        <Typography
                                          variant="body2"
                                          color="rgba(255,255,255,0.4)"
                                          sx={{ mt: 2 }}
                                        >
                                          <strong>Motivo:</strong> {vacation.reason}
                                        </Typography>
                                      )}
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })
                          )}
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Box>
          </Box>

          {/* New Request Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "20px",
              },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                Nova Solicitação
              </Typography>
              <Typography component="span" variant="body2" color="rgba(255,255,255,0.5)" display="block">
                Preencha os dados para solicitar ausência
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                {/* Type Selection */}
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Tipo de Ausência</InputLabel>
                  <Select
                    value={formType}
                    label="Tipo de Ausência"
                    onChange={(e) => setFormType(e.target.value as VacationType)}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.1)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(16, 185, 129, 0.3)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#10B981",
                      },
                      color: "white",
                    }}
                  >
                    {vacationTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <type.icon sx={{ color: type.color }} />
                          <span>{type.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Date Range */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <DatePicker
                    label="Data Início"
                    value={formStartDate}
                    onChange={(date) => setFormStartDate(date)}
                    minDate={dayjs()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(16, 185, 129, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#10B981" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                  <DatePicker
                    label="Data Fim"
                    value={formEndDate}
                    onChange={(date) => setFormEndDate(date)}
                    minDate={formStartDate || dayjs()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(16, 185, 129, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#10B981" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                </Stack>

                {/* Days Summary */}
                {totalFormDays > 0 && (
                  <Alert
                    severity="info"
                    sx={{
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      "& .MuiAlert-icon": { color: "#3B82F6" },
                    }}
                  >
                    Total de <strong>{totalFormDays}</strong> dia(s) solicitado(s)
                  </Alert>
                )}

                {/* Reason */}
                <TextField
                  label="Motivo (opcional)"
                  multiline
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(16, 185, 129, 0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#10B981" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button
                onClick={() => setDialogOpen(false)}
                sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateVacation}
                disabled={submitting || !formStartDate || !formEndDate}
                sx={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  textTransform: "none",
                  px: 4,
                }}
              >
                {submitting ? <CircularProgress size={24} /> : "Solicitar"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Approval Dialog */}
          <Dialog
            open={approvalDialog.open}
            onClose={() => setApprovalDialog({ open: false, vacation: null, action: "approved" })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${approvalDialog.action === "approved" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                borderRadius: "20px",
              },
            }}
          >
            <DialogTitle>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                {approvalDialog.action === "approved" ? "Aprovar Solicitação" : "Rejeitar Solicitação"}
              </Typography>
            </DialogTitle>
            <DialogContent>
              {approvalDialog.vacation && (
                <Box sx={{ mb: 3 }}>
                  <Typography color="rgba(255,255,255,0.7)">
                    <strong>Colaborador:</strong> {approvalDialog.vacation.user?.name}
                  </Typography>
                  <Typography color="rgba(255,255,255,0.7)">
                    <strong>Tipo:</strong> {getTypeConfig(approvalDialog.vacation.type).label}
                  </Typography>
                  <Typography color="rgba(255,255,255,0.7)">
                    <strong>Período:</strong> {dayjs(approvalDialog.vacation.start_date).format("DD/MM/YYYY")} -{" "}
                    {dayjs(approvalDialog.vacation.end_date).format("DD/MM/YYYY")} ({approvalDialog.vacation.total_days} dias)
                  </Typography>
                </Box>
              )}

              {approvalDialog.action === "rejected" && (
                <TextField
                  label="Motivo da rejeição"
                  multiline
                  rows={3}
                  fullWidth
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(239, 68, 68, 0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#EF4444" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button
                onClick={() => setApprovalDialog({ open: false, vacation: null, action: "approved" })}
                sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color={approvalDialog.action === "approved" ? "success" : "error"}
                onClick={handleApproval}
                disabled={submitting}
                sx={{ textTransform: "none", px: 4 }}
              >
                {submitting ? <CircularProgress size={24} /> : approvalDialog.action === "approved" ? "Aprovar" : "Rejeitar"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Admin Dialog - Create/Edit Vacation for Team */}
          <Dialog
            open={adminDialogOpen}
            onClose={() => setAdminDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "20px",
              },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                {editingVacation ? "Editar Ausência" : "Criar Ausência para Equipe"}
              </Typography>
              <Typography component="span" variant="body2" color="rgba(255,255,255,0.5)" display="block">
                {editingVacation ? "Modifique os dados da solicitação" : "Selecione o colaborador e preencha os dados"}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                {!editingVacation && (
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Colaborador</InputLabel>
                    <Select
                      value={adminFormUserId}
                      label="Colaborador"
                      onChange={(e) => setAdminFormUserId(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(59, 130, 246, 0.3)" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                        color: "white",
                      }}
                    >
                      {allUsers.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Tipo de Ausência</InputLabel>
                  <Select
                    value={formType}
                    label="Tipo de Ausência"
                    onChange={(e) => setFormType(e.target.value as VacationType)}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(59, 130, 246, 0.3)" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                      color: "white",
                    }}
                  >
                    {vacationTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <type.icon sx={{ color: type.color }} />
                          <span>{type.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Status</InputLabel>
                  <Select
                    value={adminFormStatus}
                    label="Status"
                    onChange={(e) => setAdminFormStatus(e.target.value as VacationStatus)}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(59, 130, 246, 0.3)" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3B82F6" },
                      color: "white",
                    }}
                  >
                    <MenuItem value="approved">Aprovado</MenuItem>
                    <MenuItem value="pending">Pendente</MenuItem>
                    <MenuItem value="rejected">Rejeitado</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <DatePicker
                    label="Data Início"
                    value={formStartDate}
                    onChange={(date) => setFormStartDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                  <DatePicker
                    label="Data Fim"
                    value={formEndDate}
                    onChange={(date) => setFormEndDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                </Stack>

                <TextField
                  label="Motivo (opcional)"
                  multiline
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setAdminDialogOpen(false)} sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleAdminCreateVacation}
                disabled={submitting}
                sx={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  textTransform: "none",
                  px: 4,
                }}
              >
                {submitting ? <CircularProgress size={24} /> : editingVacation ? "Salvar" : "Criar"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Event Dialog - Create/Edit Calendar Event */}
          <Dialog
            open={eventDialogOpen}
            onClose={() => setEventDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "20px",
              },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                {editingEvent ? "Editar Evento" : "Novo Evento no Calendário"}
              </Typography>
              <Typography component="span" variant="body2" color="rgba(255,255,255,0.5)" display="block">
                Metas, feriados, treinamentos e eventos
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Título"
                  fullWidth
                  value={eventFormTitle}
                  onChange={(e) => setEventFormTitle(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(245, 158, 11, 0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#F59E0B" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Tipo de Evento</InputLabel>
                  <Select
                    value={eventFormType}
                    label="Tipo de Evento"
                    onChange={(e) => {
                      setEventFormType(e.target.value);
                      const typeConfig = eventTypes.find((t) => t.value === e.target.value);
                      if (typeConfig) setEventFormColor(typeConfig.color);
                    }}
                    sx={{
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(245, 158, 11, 0.3)" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#F59E0B" },
                      color: "white",
                    }}
                  >
                    {eventTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <type.icon sx={{ color: type.color }} />
                          <span>{type.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <DatePicker
                    label="Data Início"
                    value={formStartDate}
                    onChange={(date) => setFormStartDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(245, 158, 11, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#F59E0B" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                  <DatePicker
                    label="Data Fim"
                    value={formEndDate}
                    onChange={(date) => setFormEndDate(date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            color: "white",
                            "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                            "&:hover fieldset": { borderColor: "rgba(245, 158, 11, 0.3)" },
                            "&.Mui-focused fieldset": { borderColor: "#F59E0B" },
                          },
                          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.5)" },
                        },
                      },
                    }}
                  />
                </Stack>

                <TextField
                  label="Descrição (opcional)"
                  multiline
                  rows={2}
                  value={eventFormDescription}
                  onChange={(e) => setEventFormDescription(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                      "&:hover fieldset": { borderColor: "rgba(245, 158, 11, 0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#F59E0B" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                  }}
                />

                {/* Color Picker */}
                <Box>
                  <Typography variant="body2" color="rgba(255,255,255,0.5)" sx={{ mb: 1 }}>
                    Cor do Evento
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#A855F7", "#EC4899"].map((color) => (
                      <Box
                        key={color}
                        onClick={() => setEventFormColor(color)}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          background: color,
                          cursor: "pointer",
                          border: eventFormColor === color ? "3px solid white" : "3px solid transparent",
                          transition: "all 0.2s",
                          "&:hover": { transform: "scale(1.1)" },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setEventDialogOpen(false)} sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveEvent}
                disabled={submitting}
                sx={{
                  background: `linear-gradient(135deg, ${eventFormColor} 0%, ${eventFormColor}cc 100%)`,
                  textTransform: "none",
                  px: 4,
                }}
              >
                {submitting ? <CircularProgress size={24} /> : editingEvent ? "Salvar" : "Criar"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Day Detail Dialog */}
          <Dialog
            open={dayDetailDialog.open}
            onClose={() => setDayDetailDialog({ open: false, date: null, vacations: [], events: [] })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "20px",
              },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                {dayDetailDialog.date?.format("DD [de] MMMM [de] YYYY")}
              </Typography>
              <Typography component="span" variant="body2" color="rgba(255,255,255,0.5)" display="block">
                {dayDetailDialog.events.length + dayDetailDialog.vacations.length} item(s) neste dia
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Events */}
                {dayDetailDialog.events.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" sx={{ mb: 1 }}>
                      📌 Eventos
                    </Typography>
                    {dayDetailDialog.events.map((event) => {
                      const typeConfig = getEventTypeConfig(event.type);
                      const TypeIcon = typeConfig.icon;
                      return (
                        <Card
                          key={event.id}
                          sx={{
                            background: `${event.color || typeConfig.color}15`,
                            border: `1px solid ${event.color || typeConfig.color}40`,
                            borderRadius: "12px",
                            mb: 1,
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <TypeIcon sx={{ color: event.color || typeConfig.color }} />
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold" color="white">
                                    {event.title}
                                  </Typography>
                                  <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                    {typeConfig.label} • {dayjs(event.start_date).format("DD/MM")} - {dayjs(event.end_date).format("DD/MM")}
                                  </Typography>
                                </Box>
                              </Stack>
                              {user?.role === "admin" && (
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditEvent(event)}
                                    sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#3B82F6" } }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#EF4444" } }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                            </Stack>
                            {event.description && (
                              <Typography variant="body2" color="rgba(255,255,255,0.4)" sx={{ mt: 1 }}>
                                {event.description}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                )}

                {/* Vacations */}
                {dayDetailDialog.vacations.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" sx={{ mb: 1 }}>
                      🏖️ Ausências
                    </Typography>
                    {dayDetailDialog.vacations.map((vacation, idx) => {
                      const typeConfig = getTypeConfig(vacation.type);
                      const TypeIcon = typeConfig.icon;
                      return (
                        <Card
                          key={idx}
                          sx={{
                            background: `${typeConfig.color}15`,
                            border: `1px solid ${typeConfig.color}40`,
                            borderRadius: "12px",
                            mb: 1,
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <TypeIcon sx={{ color: typeConfig.color }} />
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold" color="white">
                                    {vacation.user_name}
                                  </Typography>
                                  <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                    {typeConfig.label} • {dayjs(vacation.start_date).format("DD/MM")} - {dayjs(vacation.end_date).format("DD/MM")}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {user?.role === "admin" && vacation.status === "approved" && (
                                  <Tooltip title="Interromper férias">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        // Buscar a vacation completa pelo user_id
                                        const fullVacation = vacations.find(
                                          (v) => v.user_id === vacation.user_id &&
                                                 dayjs(v.start_date).isSame(vacation.start_date, 'day') &&
                                                 v.status === "approved"
                                        );
                                        if (fullVacation) {
                                          setInterruptDialog({ open: true, vacation: fullVacation as unknown as Vacation });
                                        }
                                      }}
                                      sx={{ color: "#8B5CF6" }}
                                    >
                                      <PauseCircleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Chip
                                  size="small"
                                  label={
                                    vacation.status === "approved" ? "Aprovado" :
                                    vacation.status === "pending" ? "Pendente" :
                                    vacation.status === "interrupted" ? "Interrompido" :
                                    "Rejeitado"
                                  }
                                  sx={{
                                    background:
                                      vacation.status === "approved" ? "rgba(16, 185, 129, 0.2)" :
                                      vacation.status === "pending" ? "rgba(245, 158, 11, 0.2)" :
                                      vacation.status === "interrupted" ? "rgba(139, 92, 246, 0.2)" :
                                      "rgba(239, 68, 68, 0.2)",
                                    color:
                                      vacation.status === "approved" ? "#10B981" :
                                      vacation.status === "pending" ? "#F59E0B" :
                                      vacation.status === "interrupted" ? "#8B5CF6" :
                                      "#EF4444",
                                    fontWeight: 600,
                                    fontSize: "0.7rem",
                                  }}
                                />
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                )}

                {/* Empty state */}
                {dayDetailDialog.events.length === 0 && dayDetailDialog.vacations.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <CalendarMonthIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.2)", mb: 1 }} />
                    <Typography color="rgba(255,255,255,0.5)">
                      Nenhum evento ou ausência neste dia
                    </Typography>
                    {user?.role === "admin" && (
                      <Typography variant="body2" color="rgba(255,255,255,0.3)" sx={{ mt: 1 }}>
                        Use os botões acima para adicionar
                      </Typography>
                    )}
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              {user?.role === "admin" && (
                <>
                  <Button
                    startIcon={<FlagIcon />}
                    onClick={() => {
                      resetEventForm();
                      setFormStartDate(dayDetailDialog.date);
                      setFormEndDate(dayDetailDialog.date);
                      setEventDialogOpen(true);
                    }}
                    sx={{ color: "#F59E0B", textTransform: "none" }}
                  >
                    Novo Evento
                  </Button>
                  <Button
                    startIcon={<BeachAccessIcon />}
                    onClick={() => {
                      resetAdminForm();
                      setFormStartDate(dayDetailDialog.date);
                      setFormEndDate(dayDetailDialog.date);
                      setAdminDialogOpen(true);
                    }}
                    sx={{ color: "#3B82F6", textTransform: "none" }}
                  >
                    Nova Ausência
                  </Button>
                </>
              )}
              <Button
                onClick={() => setDayDetailDialog({ open: false, date: null, vacations: [], events: [] })}
                sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}
              >
                Fechar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Interrupt Dialog */}
          <Dialog
            open={interruptDialog.open}
            onClose={() => setInterruptDialog({ open: false, vacation: null })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "rgba(20, 20, 30, 0.98)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "24px",
              },
            }}
          >
            <DialogTitle>
              <Typography component="span" variant="h5" fontWeight="bold" color="white" display="block">
                <PauseCircleIcon sx={{ mr: 1, verticalAlign: "middle", color: "#8B5CF6" }} />
                Interromper Férias
              </Typography>
            </DialogTitle>
            <DialogContent>
              {interruptDialog.vacation && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="warning" sx={{ mb: 2, background: "rgba(245, 158, 11, 0.1)" }}>
                    <Typography variant="body2">
                      Você está prestes a interromper as férias de{" "}
                      <strong>{interruptDialog.vacation.user?.name || "Colaborador"}</strong>.
                      <br />
                      Os dias não utilizados serão devolvidos ao saldo.
                    </Typography>
                  </Alert>
                  <Stack spacing={2}>
                    <Box sx={{ p: 2, background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                      <Typography variant="body2" color="rgba(255,255,255,0.5)">
                        Período original:
                      </Typography>
                      <Typography color="white">
                        {dayjs(interruptDialog.vacation.start_date).format("DD/MM/YYYY")} -{" "}
                        {dayjs(interruptDialog.vacation.end_date).format("DD/MM/YYYY")}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.5)" sx={{ mt: 1 }}>
                        Total de dias planejados: <strong>{interruptDialog.vacation.total_days}</strong>
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Motivo da interrupção (opcional)"
                      value={interruptReason}
                      onChange={(e) => setInterruptReason(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "12px",
                          color: "white",
                        },
                        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                      }}
                    />
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button
                onClick={() => {
                  setInterruptDialog({ open: false, vacation: null });
                  setInterruptReason("");
                }}
                sx={{ color: "rgba(255,255,255,0.5)", textTransform: "none" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleInterrupt}
                disabled={submitting}
                sx={{
                  textTransform: "none",
                  px: 4,
                  background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                }}
              >
                {submitting ? "Interrompendo..." : "Confirmar Interrupção"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Sell Vacation Dialog */}
          <Dialog
            open={sellDialogOpen}
            onClose={() => setSellDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "24px",
              },
            }}
          >
            <DialogTitle>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AttachMoneyIcon sx={{ color: "white", fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography component="span" variant="h6" fontWeight="bold" color="white" display="block">
                    Vender Férias
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.5)">
                    Abono pecuniário - converter férias em dinheiro
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>
                <Typography variant="body2">
                  Você pode vender até <strong>30 dias de férias</strong>.
                  O valor será calculado com base no seu salário e pago junto ao adiantamento de férias.
                </Typography>
              </Alert>

              {balance && (
                <Card sx={{ p: 2, mb: 3, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "16px" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="rgba(255,255,255,0.7)">Saldo disponível:</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#10B981">
                      {balance.available_days} dias
                    </Typography>
                  </Stack>
                </Card>
              )}

              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" sx={{ mb: 1 }}>
                Quantos dias deseja vender?
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={sellDays}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setSellDays(Math.min(Math.max(value, 1), 30));
                }}
                inputProps={{ min: 1, max: 30 }}
                helperText={`Mínimo: 1 dia | Máximo: 30 dias${balance ? ` | Disponível: ${balance.available_days} dias` : ''}`}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    textAlign: "center",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(245, 158, 11, 0.5)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#F59E0B",
                    },
                  },
                  "& .MuiOutlinedInput-input": {
                    textAlign: "center",
                  },
                  "& .MuiFormHelperText-root": {
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "center",
                  },
                }}
              />

              <TextField
                fullWidth
                label="Motivo (opcional)"
                placeholder="Ex: Necessidade financeira para reforma..."
                value={sellReason}
                onChange={(e) => setSellReason(e.target.value)}
                multiline
                rows={2}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    color: "white",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(245, 158, 11, 0.5)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#F59E0B",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(255,255,255,0.5)",
                  },
                }}
              />

              {sellRequests.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" sx={{ mb: 1 }}>
                    Histórico de solicitações:
                  </Typography>
                  {sellRequests.slice(0, 3).map((req) => (
                    <Card
                      key={req.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "12px",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography color="white" fontWeight={600}>
                            {req.days_to_sell} dias
                          </Typography>
                          <Typography variant="caption" color="rgba(255,255,255,0.5)">
                            {dayjs(req.created_at).format("DD/MM/YYYY")}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={
                            req.status === "pending" ? "Pendente" :
                            req.status === "approved" ? "Aprovado" : "Rejeitado"
                          }
                          sx={{
                            background:
                              req.status === "pending" ? "rgba(245, 158, 11, 0.2)" :
                              req.status === "approved" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color:
                              req.status === "pending" ? "#F59E0B" :
                              req.status === "approved" ? "#10B981" : "#EF4444",
                          }}
                        />
                      </Stack>
                    </Card>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button
                onClick={() => setSellDialogOpen(false)}
                sx={{ color: "rgba(255,255,255,0.7)", textTransform: "none" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSellVacation}
                disabled={submittingSell || !balance || balance.available_days < sellDays}
                sx={{
                  textTransform: "none",
                  px: 4,
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                  },
                }}
              >
                {submittingSell ? <CircularProgress size={24} /> : "Solicitar Venda"}
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

          {/* CSS Animations */}
          <style jsx global>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
          `}</style>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

