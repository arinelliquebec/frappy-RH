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
  Avatar,
  Chip,
  LinearProgress,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  Skeleton,
  Badge as MuiBadge,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import CakeIcon from "@mui/icons-material/Cake";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import StarIcon from "@mui/icons-material/Star";
import SchoolIcon from "@mui/icons-material/School";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CelebrationIcon from "@mui/icons-material/Celebration";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import VerifiedIcon from "@mui/icons-material/Verified";
import FlagIcon from "@mui/icons-material/Flag";
import LockIcon from "@mui/icons-material/Lock";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  authAPI,
  userAPI,
  portalAPI,
  User,
  PortalDashboard,
  Birthday,
  NewEmployee,
  UserBadge,
  Badge,
  CareerEvent,
  TeamMember,
} from "@/lib/api";
import NotificationBell from "../components/NotificationBell";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8B5CF6" },
    secondary: { main: "#10B981" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

// Mapeamento de ícones para eventos de carreira
const eventIcons: Record<string, React.ElementType> = {
  admissao: CelebrationIcon,
  promocao: TrendingUpIcon,
  certificacao: CardMembershipIcon,
  projeto: FlagIcon,
  reconhecimento: StarIcon,
  treinamento: SchoolIcon,
};

// Mapeamento de ícones para badges
const badgeIcons: Record<string, React.ElementType> = {
  sprout: PersonAddIcon,
  star: StarIcon,
  star_half: StarIcon,
  star_rate: StarIcon,
  workspace_premium: MilitaryTechIcon,
  school: SchoolIcon,
  menu_book: SchoolIcon,
  psychology: SchoolIcon,
  military_tech: MilitaryTechIcon,
  campaign: CelebrationIcon,
  poll: FlagIcon,
  emoji_events: EmojiEventsIcon,
  track_changes: TrendingUpIcon,
  flag: FlagIcon,
  verified: VerifiedIcon,
};

export default function PortalPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [newEmployees, setNewEmployees] = useState<NewEmployee[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [lockedBadges, setLockedBadges] = useState<Badge[]>([]);
  const [timeline, setTimeline] = useState<CareerEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [userRes, dashboardRes, birthdaysRes, newEmpRes, badgesRes, timelineRes, teamRes] = await Promise.all([
        userAPI.getProfile(),
        portalAPI.getDashboard(),
        portalAPI.getBirthdays(),
        portalAPI.getNewEmployees(),
        portalAPI.getBadges(),
        portalAPI.getTimeline(),
        portalAPI.getTeam(),
      ]);

      if (userRes.success) setUser(userRes.user);
      if (dashboardRes.success) setDashboard(dashboardRes.dashboard);
      if (birthdaysRes.success) setBirthdays(birthdaysRes.birthdays || []);
      if (newEmpRes.success) setNewEmployees(newEmpRes.new_employees || []);
      if (badgesRes.success) {
        setEarnedBadges(badgesRes.earned_badges || []);
        setLockedBadges(badgesRes.locked_badges || []);
      }
      if (timelineRes.success) setTimeline(timelineRes.events || []);
      if (teamRes.success) setTeam(teamRes.team_members || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authAPI.logout();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const formatTenure = (years: number) => {
    if (years === 0) return "Menos de 1 ano";
    if (years === 1) return "1 ano";
    return `${years} anos`;
  };

  const statsCards = dashboard
    ? [
        {
          label: "Tempo de Casa",
          value: formatTenure(dashboard.stats.tempo_de_casa),
          icon: AccessTimeIcon,
          color: "#3B82F6",
          gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
        },
        {
          label: "Férias Disponíveis",
          value: `${dashboard.stats.ferias_disponiveis} dias`,
          icon: BeachAccessIcon,
          color: "#10B981",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
        },
        {
          label: "Cursos Concluídos",
          value: dashboard.stats.cursos_concluidos.toString(),
          icon: SchoolIcon,
          color: "#8B5CF6",
          gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)",
        },
        {
          label: "Certificados",
          value: dashboard.stats.certificados.toString(),
          icon: CardMembershipIcon,
          color: "#F59E0B",
          gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
        },
        {
          label: "Conquistas",
          value: dashboard.stats.badges.toString(),
          icon: EmojiEventsIcon,
          color: "#EC4899",
          gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)",
        },
        {
          label: "Pontos Totais",
          value: dashboard.stats.pontos_totais.toString(),
          icon: StarIcon,
          color: "#EF4444",
          gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
        },
      ]
    : [];

  // Evitar hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f0f1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Effects */}
        <Box
          sx={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "-20%",
            left: "-10%",
            width: "50%",
            height: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
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
            borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
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
            <Stack direction="row" spacing={2} alignItems="center">
              <Link href="/hub">
                <IconButton
                  sx={{
                    background: "rgba(139, 92, 246, 0.1)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    color: "#8B5CF6",
                    "&:hover": { background: "rgba(139, 92, 246, 0.2)" },
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
                    background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  MEU PORTAL
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.5)">
                  Sua jornada na empresa
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <NotificationBell />
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  p: 0.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                  src={dashboard?.user?.avatar_url}
                >
                  {user?.name ? getInitials(user.name) : "U"}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled sx={{ opacity: 1 }}>
                  <Typography fontWeight="bold" color="white">
                    {user?.name}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => router.push("/perfil")}>
                  <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} /> Perfil
                </MenuItem>
                {user?.role === "admin" && (
                  <MenuItem onClick={() => router.push("/adminhub")}>
                    <AdminPanelSettingsIcon sx={{ mr: 1.5, fontSize: 20 }} /> Admin
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: "#EF4444" }}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} /> Sair
                </MenuItem>
              </Menu>
            </Stack>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ pt: 14, pb: 6, px: 3, position: "relative", zIndex: 1 }}>
          <Box sx={{ maxWidth: 1400, mx: "auto" }}>
            {loading ? (
              <Stack spacing={3}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: "20px" }} />
                <Stack direction="row" spacing={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={100} sx={{ flex: 1, borderRadius: "16px" }} />
                  ))}
                </Stack>
              </Stack>
            ) : (
              <AnimatePresence>
                {/* Profile Header Card */}
                <motion.div
                  key="profile-header"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card
                    sx={{
                      background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      borderRadius: "24px",
                      mb: 4,
                      overflow: "visible",
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center">
                        <MuiBadge
                          overlap="circular"
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          badgeContent={
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid #0a0a12",
                              }}
                            >
                              <VerifiedIcon sx={{ fontSize: 14, color: "white" }} />
                            </Box>
                          }
                        >
                          <Avatar
                            src={dashboard?.user?.avatar_url}
                            sx={{
                              width: 120,
                              height: 120,
                              fontSize: "2.5rem",
                              fontWeight: "bold",
                              background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                              border: "4px solid rgba(139, 92, 246, 0.3)",
                            }}
                          >
                            {dashboard?.user?.name ? getInitials(dashboard.user.name) : "U"}
                          </Avatar>
                        </MuiBadge>

                        <Box sx={{ flex: 1, textAlign: { xs: "center", md: "left" } }}>
                          <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
                            {dashboard?.user?.name}
                          </Typography>
                          <Typography variant="h6" color="rgba(255,255,255,0.7)" gutterBottom>
                            {dashboard?.user?.position || "Colaborador"}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: "center", md: "flex-start" }}>
                            {dashboard?.user?.department && (
                              <Chip
                                icon={<GroupsIcon sx={{ fontSize: 16 }} />}
                                label={dashboard.user.department}
                                size="small"
                                sx={{
                                  background: "rgba(139, 92, 246, 0.2)",
                                  color: "#A78BFA",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                }}
                              />
                            )}
                            {dashboard?.user?.hire_date && (
                              <Chip
                                icon={<CelebrationIcon sx={{ fontSize: 16 }} />}
                                label={`Desde ${dayjs(dashboard.user.hire_date).format("MMM/YYYY")}`}
                                size="small"
                                sx={{
                                  background: "rgba(16, 185, 129, 0.2)",
                                  color: "#6EE7B7",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                }}
                              />
                            )}
                            <Chip
                              icon={<StarIcon sx={{ fontSize: 16 }} />}
                              label={`${dashboard?.stats?.pontos_totais || 0} pontos`}
                              size="small"
                              sx={{
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "#FCD34D",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                              }}
                            />
                          </Stack>
                          {dashboard?.user?.bio && (
                            <Typography variant="body2" color="rgba(255,255,255,0.5)" sx={{ mt: 2 }}>
                              {dashboard.user.bio}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Stats Cards - Meus Números */}
                <motion.div
                  key="stats-cards"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUpIcon sx={{ color: "#8B5CF6" }} />
                    Meus Números
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
                      gap: 2,
                      mb: 4,
                    }}
                  >
                    {statsCards.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card
                            sx={{
                              background: stat.gradient,
                              border: `1px solid ${stat.color}30`,
                              borderRadius: "16px",
                              height: "100%",
                            }}
                          >
                            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: "12px",
                                  background: `${stat.color}20`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  mb: 1.5,
                                }}
                              >
                                <Icon sx={{ color: stat.color, fontSize: 22 }} />
                              </Box>
                              <Typography variant="h5" fontWeight="bold" color="white">
                                {stat.value}
                              </Typography>
                              <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                {stat.label}
                              </Typography>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </Box>
                </motion.div>

                {/* Grid Layout */}
                <Box
                  key="grid-layout"
                  component={motion.div}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
                    gap: 3,
                  }}
                >
                  {/* Left Column */}
                  <Stack spacing={3}>
                    {/* Timeline de Carreira */}
                    <motion.div
                      key="timeline-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                            <WorkHistoryIcon sx={{ color: "#8B5CF6" }} />
                            Minha Timeline
                          </Typography>
                          {timeline.length > 0 ? (
                            <Box sx={{ position: "relative", pl: 3 }}>
                              <Box
                                sx={{
                                  position: "absolute",
                                  left: 8,
                                  top: 0,
                                  bottom: 0,
                                  width: 2,
                                  background: "linear-gradient(180deg, #8B5CF6 0%, rgba(139, 92, 246, 0.1) 100%)",
                                }}
                              />
                              {timeline.map((event, index) => {
                                const EventIcon = eventIcons[event.event_type] || StarIcon;
                                return (
                                  <motion.div
                                    key={event.id || `event-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                  >
                                    <Box sx={{ mb: 3, position: "relative" }}>
                                      <Box
                                        sx={{
                                          position: "absolute",
                                          left: -27,
                                          top: 0,
                                          width: 20,
                                          height: 20,
                                          borderRadius: "50%",
                                          background: event.color || "#8B5CF6",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: "2px solid #0a0a12",
                                        }}
                                      >
                                        <EventIcon sx={{ fontSize: 12, color: "white" }} />
                                      </Box>
                                      <Typography variant="caption" color="rgba(255,255,255,0.4)">
                                        {dayjs(event.event_date).format("DD MMM YYYY")}
                                      </Typography>
                                      <Typography variant="subtitle1" fontWeight="bold" color="white">
                                        {event.title}
                                      </Typography>
                                      {event.description && (
                                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                                          {event.description}
                                        </Typography>
                                      )}
                                    </Box>
                                  </motion.div>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: "center", py: 4 }}>
                              <WorkHistoryIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.2)", mb: 2 }} />
                              <Typography color="rgba(255,255,255,0.5)">
                                Sua timeline será preenchida com suas conquistas
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Conquistas / Badges */}
                    <motion.div
                      key="badges-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Typography variant="h6" fontWeight="bold" color="white" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <EmojiEventsIcon sx={{ color: "#F59E0B" }} />
                              Minhas Conquistas
                            </Typography>
                            <Chip
                              label={`${earnedBadges.length}/${earnedBadges.length + lockedBadges.length}`}
                              size="small"
                              sx={{
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "#FCD34D",
                              }}
                            />
                          </Stack>

                          {/* Progress */}
                          <Box sx={{ mb: 3 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(earnedBadges.length / (earnedBadges.length + lockedBadges.length)) * 100 || 0}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                background: "rgba(255,255,255,0.1)",
                                "& .MuiLinearProgress-bar": {
                                  background: "linear-gradient(90deg, #F59E0B 0%, #EC4899 100%)",
                                  borderRadius: 4,
                                },
                              }}
                            />
                          </Box>

                          {/* Earned Badges */}
                          {earnedBadges.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" sx={{ mb: 2 }}>
                                Conquistados
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                {earnedBadges.map((ub, index) => {
                                  const BadgeIcon = badgeIcons[ub.badge.icon] || EmojiEventsIcon;
                                  return (
                                    <Tooltip
                                      key={ub.id || `earned-${index}`}
                                      title={
                                        <Box>
                                          <Typography fontWeight="bold">{ub.badge.name}</Typography>
                                          <Typography variant="caption">{ub.badge.description}</Typography>
                                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                            +{ub.badge.points} pontos • {dayjs(ub.earned_at).format("DD/MM/YYYY")}
                                          </Typography>
                                        </Box>
                                      }
                                    >
                                      <Box
                                        sx={{
                                          width: 60,
                                          height: 60,
                                          borderRadius: "16px",
                                          background: `${ub.badge.color}20`,
                                          border: `2px solid ${ub.badge.color}`,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                          transition: "transform 0.2s",
                                          "&:hover": { transform: "scale(1.1)" },
                                        }}
                                      >
                                        <BadgeIcon sx={{ fontSize: 28, color: ub.badge.color }} />
                                      </Box>
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}

                          {/* Locked Badges */}
                          {lockedBadges.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" sx={{ mb: 2 }}>
                                A desbloquear
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                {lockedBadges.slice(0, 8).map((badge, index) => {
                                  const BadgeIcon = badgeIcons[badge.icon] || EmojiEventsIcon;
                                  return (
                                    <Tooltip
                                      key={badge.id || `locked-${index}`}
                                      title={
                                        <Box>
                                          <Typography fontWeight="bold">{badge.name}</Typography>
                                          <Typography variant="caption">{badge.description}</Typography>
                                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                            Critério: {badge.criteria}
                                          </Typography>
                                        </Box>
                                      }
                                    >
                                      <Box
                                        sx={{
                                          width: 60,
                                          height: 60,
                                          borderRadius: "16px",
                                          background: "rgba(255,255,255,0.05)",
                                          border: "2px dashed rgba(255,255,255,0.2)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                          position: "relative",
                                        }}
                                      >
                                        <BadgeIcon sx={{ fontSize: 28, color: "rgba(255,255,255,0.2)" }} />
                                        <LockIcon
                                          sx={{
                                            position: "absolute",
                                            bottom: -4,
                                            right: -4,
                                            fontSize: 16,
                                            color: "rgba(255,255,255,0.4)",
                                            background: "#0a0a12",
                                            borderRadius: "50%",
                                            p: 0.3,
                                          }}
                                        />
                                      </Box>
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Stack>

                  {/* Right Column */}
                  <Stack spacing={3}>
                    {/* Aniversariantes do Mês */}
                    <motion.div
                      key="birthdays-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                            <CakeIcon sx={{ color: "#EC4899" }} />
                            Aniversariantes de {dayjs().format("MMMM")}
                          </Typography>
                          {birthdays.length > 0 ? (
                            <Stack
                              spacing={2}
                              sx={{
                                maxHeight: 400,
                                overflowY: "auto",
                                pr: 1,
                                "&::-webkit-scrollbar": {
                                  width: "6px",
                                },
                                "&::-webkit-scrollbar-track": {
                                  background: "rgba(255,255,255,0.05)",
                                  borderRadius: "3px",
                                },
                                "&::-webkit-scrollbar-thumb": {
                                  background: "rgba(236, 72, 153, 0.5)",
                                  borderRadius: "3px",
                                  "&:hover": {
                                    background: "rgba(236, 72, 153, 0.7)",
                                  },
                                },
                              }}
                            >
                              {birthdays.map((bday, index) => (
                                <Stack
                                  key={bday.id || `bday-${index}`}
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                  sx={{
                                    p: 1.5,
                                    borderRadius: "12px",
                                    background: bday.is_today ? "rgba(236, 72, 153, 0.1)" : "transparent",
                                    border: bday.is_today ? "1px solid rgba(236, 72, 153, 0.3)" : "1px solid transparent",
                                  }}
                                >
                                  <Avatar
                                    src={bday.avatar_url}
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
                                    }}
                                  >
                                    {getInitials(bday.name)}
                                  </Avatar>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="white">
                                      {bday.name}
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                      {bday.position}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={bday.is_today ? "Hoje! 🎉" : `Dia ${bday.day}`}
                                    size="small"
                                    sx={{
                                      background: bday.is_today ? "#EC4899" : "rgba(255,255,255,0.1)",
                                      color: "white",
                                      fontWeight: bday.is_today ? "bold" : "normal",
                                    }}
                                  />
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Box sx={{ textAlign: "center", py: 3 }}>
                              <CakeIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.2)", mb: 1 }} />
                              <Typography color="rgba(255,255,255,0.5)" variant="body2">
                                Nenhum aniversariante este mês
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Novos Colaboradores */}
                    <motion.div
                      key="new-employees-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <Card
                        sx={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "20px",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                            <PersonAddIcon sx={{ color: "#10B981" }} />
                            Boas-vindas!
                          </Typography>
                          {newEmployees.length > 0 ? (
                            <Stack spacing={2}>
                              {newEmployees.map((emp, index) => (
                                <Stack key={emp.id || `emp-${index}`} direction="row" spacing={2} alignItems="center">
                                  <Avatar
                                    src={emp.avatar_url}
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                    }}
                                  >
                                    {getInitials(emp.name)}
                                  </Avatar>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="white">
                                      {emp.name}
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                      {emp.position} {emp.department && `• ${emp.department}`}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={emp.days_ago === 0 ? "Hoje!" : `${emp.days_ago}d`}
                                    size="small"
                                    sx={{
                                      background: "rgba(16, 185, 129, 0.2)",
                                      color: "#6EE7B7",
                                    }}
                                  />
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Box sx={{ textAlign: "center", py: 3 }}>
                              <PersonAddIcon sx={{ fontSize: 40, color: "rgba(255,255,255,0.2)", mb: 1 }} />
                              <Typography color="rgba(255,255,255,0.5)" variant="body2">
                                Nenhum novo colaborador recente
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Minha Equipe */}
                    {team.length > 0 && (
                      <motion.div
                        key="team-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <Card
                          sx={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "20px",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="bold" color="white" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                              <GroupsIcon sx={{ color: "#3B82F6" }} />
                              Minha Equipe
                            </Typography>
                            <Stack spacing={2}>
                              {team.slice(0, 5).map((member, index) => (
                                <Stack key={member.id || `member-${index}`} direction="row" spacing={2} alignItems="center">
                                  <Avatar
                                    src={member.avatar_url}
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                                    }}
                                  >
                                    {getInitials(member.name)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="white">
                                      {member.name}
                                    </Typography>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">
                                      {member.position}
                                    </Typography>
                                  </Box>
                                </Stack>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </Stack>
                </Box>
              </AnimatePresence>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

