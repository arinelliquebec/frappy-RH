"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IconButton,
  Badge,
  Drawer,
  Box,
  Typography,
  Stack,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Tooltip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  BeachAccess as VacationIcon,
  Description as DocumentIcon,
  Campaign as NewsIcon,
  Settings as SystemIcon,
  DoneAll as ReadAllIcon,
  Delete as DeleteIcon,
  Circle as UnreadIcon,
  NotificationsActive as PushIcon,
  NotificationsOff as PushOffIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import {
  notificationsAPI,
  AppNotification,
  NotificationType,
  NotificationPreferences,
} from "@/lib/api";

const typeConfig: Record<
  NotificationType,
  { icon: typeof InfoIcon; color: string; bgColor: string }
> = {
  info: { icon: InfoIcon, color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.1)" },
  success: { icon: SuccessIcon, color: "#10B981", bgColor: "rgba(16, 185, 129, 0.1)" },
  warning: { icon: WarningIcon, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)" },
  error: { icon: ErrorIcon, color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  vacation: { icon: VacationIcon, color: "#8B5CF6", bgColor: "rgba(139, 92, 246, 0.1)" },
  document: { icon: DocumentIcon, color: "#EC4899", bgColor: "rgba(236, 72, 153, 0.1)" },
  news: { icon: NewsIcon, color: "#06B6D4", bgColor: "rgba(6, 182, 212, 0.1)" },
  system: { icon: SystemIcon, color: "#64748B", bgColor: "rgba(100, 116, 139, 0.1)" },
};

interface NotificationBellProps {
  color?: string;
}

export default function NotificationBell({ color = "#fff" }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Verificar permissão de push ao montar
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Carregar preferências ao abrir settings
  useEffect(() => {
    if (settingsOpen) {
      notificationsAPI.getPreferences().then((res) => {
        if (res.success) {
          setPreferences(res.preferences);
        }
      });
    }
  }, [settingsOpen]);

  // Solicitar permissão de push
  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Este navegador não suporta notificações push");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        // Mostrar notificação de teste
        new Notification("Notificações ativadas! 🔔", {
          body: "Você receberá alertas de novas notificações.",
          icon: "/favicon.ico",
        });

        // Salvar preferência
        if (preferences) {
          await notificationsAPI.updatePreferences({ push_notifications: true });
          setPreferences({ ...preferences, push_notifications: true });
        }
      }
    } catch (err) {
      console.error("Erro ao solicitar permissão:", err);
    }
  };

  // Desativar push
  const disablePush = async () => {
    if (preferences) {
      await notificationsAPI.updatePreferences({ push_notifications: false });
      setPreferences({ ...preferences, push_notifications: false });
    }
  };

  // Atualizar preferência
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    setSavingPrefs(true);
    try {
      await notificationsAPI.updatePreferences({ [key]: value });
      setPreferences({ ...preferences, [key]: value });
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Buscar contagem de não lidas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.count);
      }
    } catch {
      // Silenciosamente ignora erros de autenticação
    }
  }, []);

  // Buscar notificações
  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const res = await notificationsAPI.getAll({
        page: currentPage,
        limit: 15,
      });

      if (res.success) {
        if (reset) {
          setNotifications(res.notifications || []);
          setPage(1);
        } else {
          setNotifications((prev) => [...prev, ...(res.notifications || [])]);
        }
        setUnreadCount(res.unread_count);
        setHasMore(currentPage < res.pagination.total_pages);
      }
    } catch {
      // Silenciosamente ignora erros de autenticação
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Buscar contagem ao montar e a cada 30 segundos
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Buscar notificações ao abrir o drawer
  useEffect(() => {
    if (open) {
      fetchNotifications(true);
    }
  }, [open]);

  // Marcar como lida
  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.read) return;

    try {
      await notificationsAPI.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  // Clicar na notificação
  const handleClick = async (notification: AppNotification) => {
    await handleMarkAsRead(notification);
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  // Marcar todas como lidas
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  };

  // Deletar notificação
  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  // Formatar data relativa
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ color }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 10,
                minWidth: 18,
                height: 18,
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 400 },
            background: "rgba(18, 18, 28, 0.98)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <NotificationsIcon sx={{ color: "#10B981" }} />
            <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
              Notificações
            </Typography>
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={`${unreadCount} novas`}
                sx={{
                  bgcolor: "rgba(16, 185, 129, 0.2)",
                  color: "#10B981",
                  fontSize: 11,
                }}
              />
            )}
          </Stack>
          <Stack direction="row" gap={0.5}>
            {unreadCount > 0 && (
              <Tooltip title="Marcar todas como lidas">
                <IconButton
                  size="small"
                  onClick={handleMarkAllAsRead}
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <ReadAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: "rgba(255,255,255,0.6)" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Lista de notificações */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} sx={{ color: "#10B981" }} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 8,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <NotificationsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography>Nenhuma notificação</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const config = typeConfig[notification.type] || typeConfig.info;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <ListItem
                        sx={{
                          py: 1.5,
                          px: 2,
                          cursor: notification.link ? "pointer" : "default",
                          bgcolor: notification.read
                            ? "transparent"
                            : "rgba(16, 185, 129, 0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.03)",
                          },
                        }}
                        onClick={() => handleClick(notification)}
                      >
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: config.bgColor,
                            }}
                          >
                            <Icon sx={{ fontSize: 20, color: config.color }} />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack
                              component="span"
                              direction="row"
                              alignItems="center"
                              gap={1}
                              sx={{ display: "inline-flex" }}
                            >
                              {!notification.read && (
                                <UnreadIcon
                                  sx={{ fontSize: 8, color: "#10B981" }}
                                />
                              )}
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  color: "#fff",
                                  fontWeight: notification.read ? 400 : 600,
                                }}
                              >
                                {notification.title}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Stack component="span" sx={{ display: "flex" }}>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  color: "rgba(255,255,255,0.6)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {notification.message}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.4)", mt: 0.5 }}
                              >
                                {formatRelativeTime(notification.created_at)}
                              </Typography>
                            </Stack>
                          }
                        />
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            sx={{
                              color: "rgba(255,255,255,0.3)",
                              "&:hover": { color: "#EF4444" },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItem>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </List>
          )}

          {/* Carregar mais */}
          {hasMore && notifications.length > 0 && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Button
                size="small"
                onClick={() => {
                  setPage((p) => p + 1);
                  fetchNotifications();
                }}
                disabled={loading}
                sx={{ color: "#10B981" }}
              >
                {loading ? (
                  <CircularProgress size={16} sx={{ color: "#10B981" }} />
                ) : (
                  "Carregar mais"
                )}
              </Button>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<SystemIcon />}
            onClick={() => setSettingsOpen(true)}
            sx={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "#fff",
              "&:hover": {
                borderColor: "#10B981",
                bgcolor: "rgba(16, 185, 129, 0.1)",
              },
            }}
          >
            Configurar Notificações
          </Button>
        </Box>
      </Drawer>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
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
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <SystemIcon sx={{ color: "#10B981" }} />
            <Typography variant="h6" sx={{ color: "#fff" }}>
              Configurar Notificações
            </Typography>
          </Stack>
          <IconButton
            onClick={() => setSettingsOpen(false)}
            sx={{ color: "rgba(255,255,255,0.6)" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {/* Push Notifications Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{ color: "#fff", fontWeight: 600, mb: 2 }}
            >
              Notificações Push do Navegador
            </Typography>

            {pushPermission === "denied" ? (
              <Alert
                severity="warning"
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  color: "#F59E0B",
                  "& .MuiAlert-icon": { color: "#F59E0B" },
                }}
              >
                As notificações foram bloqueadas. Para ativá-las, vá nas configurações do seu navegador e permita notificações para este site.
              </Alert>
            ) : pushPermission === "granted" ? (
              <Stack spacing={2}>
                <Alert
                  severity="success"
                  icon={<PushIcon />}
                  sx={{
                    bgcolor: "rgba(16, 185, 129, 0.1)",
                    color: "#10B981",
                    "& .MuiAlert-icon": { color: "#10B981" },
                  }}
                >
                  Notificações push ativadas! Você receberá alertas mesmo quando o site estiver em segundo plano.
                </Alert>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences?.push_notifications ?? true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          requestPushPermission();
                        } else {
                          disablePush();
                        }
                      }}
                      sx={{
                        "& .Mui-checked": { color: "#10B981" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#10B981" },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                      Receber notificações push
                    </Typography>
                  }
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Alert
                  severity="info"
                  icon={<PushOffIcon />}
                  sx={{
                    bgcolor: "rgba(59, 130, 246, 0.1)",
                    color: "#3B82F6",
                    "& .MuiAlert-icon": { color: "#3B82F6" },
                  }}
                >
                  Ative as notificações push para receber alertas mesmo quando o site estiver em segundo plano.
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<PushIcon />}
                  onClick={requestPushPermission}
                  sx={{
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    },
                  }}
                >
                  Ativar Notificações Push
                </Button>
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 3 }} />

          {/* Preferences Section */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ color: "#fff", fontWeight: 600, mb: 2 }}
            >
              Preferências de Notificação
            </Typography>

            {preferences ? (
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.vacation_notifications}
                      onChange={(e) => updatePreference("vacation_notifications", e.target.checked)}
                      disabled={savingPrefs}
                      sx={{
                        "& .Mui-checked": { color: "#8B5CF6" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#8B5CF6" },
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <VacationIcon sx={{ fontSize: 18, color: "#8B5CF6" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Férias e Ausências
                      </Typography>
                    </Stack>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.document_notifications}
                      onChange={(e) => updatePreference("document_notifications", e.target.checked)}
                      disabled={savingPrefs}
                      sx={{
                        "& .Mui-checked": { color: "#EC4899" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#EC4899" },
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <DocumentIcon sx={{ fontSize: 18, color: "#EC4899" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Documentos
                      </Typography>
                    </Stack>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.news_notifications}
                      onChange={(e) => updatePreference("news_notifications", e.target.checked)}
                      disabled={savingPrefs}
                      sx={{
                        "& .Mui-checked": { color: "#06B6D4" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#06B6D4" },
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <NewsIcon sx={{ fontSize: 18, color: "#06B6D4" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Comunicados
                      </Typography>
                    </Stack>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.reminder_notifications}
                      onChange={(e) => updatePreference("reminder_notifications", e.target.checked)}
                      disabled={savingPrefs}
                      sx={{
                        "& .Mui-checked": { color: "#F59E0B" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#F59E0B" },
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <WarningIcon sx={{ fontSize: 18, color: "#F59E0B" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Lembretes
                      </Typography>
                    </Stack>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email_notifications}
                      onChange={(e) => updatePreference("email_notifications", e.target.checked)}
                      disabled={savingPrefs}
                      sx={{
                        "& .Mui-checked": { color: "#3B82F6" },
                        "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#3B82F6" },
                      }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      <InfoIcon sx={{ fontSize: 18, color: "#3B82F6" }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Notificações por E-mail
                      </Typography>
                    </Stack>
                  }
                />
              </Stack>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={24} sx={{ color: "#10B981" }} />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Button
            onClick={() => setSettingsOpen(false)}
            sx={{ color: "rgba(255,255,255,0.7)" }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

