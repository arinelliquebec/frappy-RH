"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  CircularProgress,
  Fade,
  Skeleton,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  BeachAccess as BeachIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  QuestionAnswer as QuestionIcon,
  AutoAwesome as SparkleIcon,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import {
  chatAPI,
  ChatMessage,
  ChatSession,
  ChatSuggestion,
  ChatContext,
  authAPI,
} from "@/lib/api";

// Cores vibrantes para o tema
const THEME_COLORS = {
  primary: "#6366F1", // Indigo
  secondary: "#8B5CF6", // Violet
  accent: "#EC4899", // Pink
  background: "#0F0F23",
  surface: "#1A1A2E",
  surfaceLight: "#252541",
  text: "#E2E8F0",
  textMuted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
};

// Ícones de contexto
const contextIcons: Record<string, React.ReactNode> = {
  general: <QuestionIcon />,
  vacation: <BeachIcon />,
  learning: <SchoolIcon />,
  pdi: <TrendingUpIcon />,
  payslip: <ReceiptIcon />,
};

const contextLabels: Record<string, string> = {
  general: "Geral",
  vacation: "Férias",
  learning: "Cursos",
  pdi: "PDI",
  payslip: "Holerite",
};

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [context, setContext] = useState<ChatContext>("general");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userName, setUserName] = useState("Colaborador");

  // Scroll para o final das mensagens
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Carrega dados iniciais
  useEffect(() => {
    setMounted(true);

    // Verifica autenticação
    const token = authAPI.getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const user = authAPI.getUser();
    if (user) {
      setUserName(user.name.split(" ")[0]);
    }

    // Só carrega dados se tiver token
    loadSuggestions();
    loadSessions();
  }, [router]);

  const loadSuggestions = async () => {
    try {
      const result = await chatAPI.getSuggestions(context);
      setSuggestions(result.suggestions || []);
    } catch {
      // Usa sugestões padrão em caso de erro
      setSuggestions([
        {
          title: "Início Rápido",
          actions: [
            { label: "Saldo de férias", query: "Qual meu saldo de férias?", icon: "beach" },
            { label: "Cursos disponíveis", query: "Quais cursos posso fazer?", icon: "school" },
          ],
        },
      ]);
    }
  };

  const loadSessions = async () => {
    try {
      const result = await chatAPI.getSessions();
      setSessions(result.sessions || []);
    } catch {
      setSessions([]);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const { session } = await chatAPI.getHistory(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setContext((session.context as ChatContext) || "general");
      setDrawerOpen(false);
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatAPI.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    } catch (error) {
      console.error("Erro ao deletar sessão:", error);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId("");
    setDrawerOpen(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
    };

    const assistantMessage: DisplayMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      await chatAPI.sendMessageStream(
        content,
        currentSessionId || undefined,
        context,
        // onChunk
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        // onComplete
        (fullMessage, newSessionId) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: fullMessage, isStreaming: false }
                : m
            )
          );
          if (newSessionId && newSessionId !== currentSessionId) {
            setCurrentSessionId(newSessionId);
            loadSessions();
          }
          setIsLoading(false);
        },
        // onError
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content: `Desculpe, ocorreu um erro: ${error}. Tente novamente.`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsLoading(false);
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: "Desculpe, ocorreu um erro. Tente novamente.",
                isStreaming: false,
              }
            : m
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleSuggestionClick = (query: string) => {
    sendMessage(query);
  };

  const handleContextChange = (newContext: ChatContext) => {
    setContext(newContext);
    loadSuggestions();
  };

  if (!mounted) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: THEME_COLORS.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: THEME_COLORS.primary }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: THEME_COLORS.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: alpha(THEME_COLORS.surface, 0.8),
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`,
          py: 1.5,
          px: 2,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => router.push("/hub")}
              sx={{ color: THEME_COLORS.textMuted }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${THEME_COLORS.primary}, ${THEME_COLORS.accent})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BotIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: THEME_COLORS.text, fontWeight: 600 }}
                >
                  Frappy IA
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: THEME_COLORS.textMuted }}
                >
                  Assistente de RH
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Novo chat">
              <IconButton onClick={startNewChat} sx={{ color: THEME_COLORS.textMuted }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Histórico">
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ color: THEME_COLORS.textMuted }}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Context chips */}
      <Box sx={{ px: 2, py: 1.5, overflowX: "auto" }}>
        <Stack direction="row" spacing={1}>
          {(Object.keys(contextLabels) as ChatContext[]).map((ctx) => (
            <Chip
              key={ctx}
              icon={contextIcons[ctx] as React.ReactElement}
              label={contextLabels[ctx]}
              onClick={() => handleContextChange(ctx)}
              sx={{
                bgcolor:
                  context === ctx
                    ? alpha(THEME_COLORS.primary, 0.2)
                    : alpha(THEME_COLORS.surfaceLight, 0.5),
                color: context === ctx ? THEME_COLORS.primary : THEME_COLORS.textMuted,
                border: `1px solid ${
                  context === ctx
                    ? alpha(THEME_COLORS.primary, 0.5)
                    : "transparent"
                }`,
                "&:hover": {
                  bgcolor: alpha(THEME_COLORS.primary, 0.15),
                },
                "& .MuiChip-icon": {
                  color: context === ctx ? THEME_COLORS.primary : THEME_COLORS.textMuted,
                },
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 2,
          py: 2,
        }}
      >
        <Container maxWidth="md" sx={{ height: "100%" }}>
          <AnimatePresence>
            {messages.length === 0 ? (
              // Welcome screen
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 4,
                      background: `linear-gradient(135deg, ${THEME_COLORS.primary}, ${THEME_COLORS.accent})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                      boxShadow: `0 8px 32px ${alpha(THEME_COLORS.primary, 0.3)}`,
                    }}
                  >
                    <SparkleIcon sx={{ color: "white", fontSize: 40 }} />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{ color: THEME_COLORS.text, fontWeight: 600, mb: 1 }}
                  >
                    Olá, {userName}! 👋
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: THEME_COLORS.textMuted, mb: 4 }}
                  >
                    Sou a Frappy, sua assistente de RH. Como posso ajudar?
                  </Typography>

                  {/* Suggestions */}
                  {suggestions.map((suggestion, idx) => (
                    <Box key={idx} sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: THEME_COLORS.textMuted, mb: 2 }}
                      >
                        {suggestion.title}
                      </Typography>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        justifyContent="center"
                        gap={1}
                      >
                        {suggestion.actions.map((action, actionIdx) => (
                          <Chip
                            key={actionIdx}
                            label={action.label}
                            onClick={() => handleSuggestionClick(action.query)}
                            sx={{
                              bgcolor: alpha(THEME_COLORS.surfaceLight, 0.8),
                              color: THEME_COLORS.text,
                              border: `1px solid ${alpha(THEME_COLORS.primary, 0.2)}`,
                              "&:hover": {
                                bgcolor: alpha(THEME_COLORS.primary, 0.2),
                                borderColor: THEME_COLORS.primary,
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </motion.div>
            ) : (
              // Messages list
              <Stack spacing={2}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      sx={{
                        flexDirection:
                          message.role === "user" ? "row-reverse" : "row",
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor:
                            message.role === "assistant"
                              ? THEME_COLORS.primary
                              : THEME_COLORS.secondary,
                          width: 32,
                          height: 32,
                        }}
                      >
                        {message.role === "assistant" ? (
                          <BotIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <PersonIcon sx={{ fontSize: 18 }} />
                        )}
                      </Avatar>
                      <Paper
                        sx={{
                          px: 2,
                          py: 1.5,
                          maxWidth: "80%",
                          bgcolor:
                            message.role === "user"
                              ? alpha(THEME_COLORS.primary, 0.2)
                              : THEME_COLORS.surfaceLight,
                          borderRadius: 2,
                          borderTopRightRadius: message.role === "user" ? 0 : 2,
                          borderTopLeftRadius: message.role === "assistant" ? 0 : 2,
                        }}
                      >
                        <Typography
                          sx={{
                            color: THEME_COLORS.text,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {message.content}
                          {message.isStreaming && (
                            <Box
                              component="span"
                              sx={{
                                display: "inline-block",
                                width: 8,
                                height: 16,
                                bgcolor: THEME_COLORS.primary,
                                ml: 0.5,
                                animation: "blink 1s infinite",
                                "@keyframes blink": {
                                  "0%, 50%": { opacity: 1 },
                                  "51%, 100%": { opacity: 0 },
                                },
                              }}
                            />
                          )}
                        </Typography>
                      </Paper>
                    </Stack>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </AnimatePresence>
        </Container>
      </Box>

      {/* Input area */}
      <Box
        sx={{
          bgcolor: alpha(THEME_COLORS.surface, 0.9),
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`,
          p: 2,
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: THEME_COLORS.surfaceLight,
                  borderRadius: 3,
                  color: THEME_COLORS.text,
                  "& fieldset": {
                    borderColor: alpha(THEME_COLORS.primary, 0.2),
                  },
                  "&:hover fieldset": {
                    borderColor: alpha(THEME_COLORS.primary, 0.4),
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: THEME_COLORS.primary,
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: THEME_COLORS.textMuted,
                  opacity: 1,
                },
              }}
            />
            <IconButton
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: THEME_COLORS.primary,
                color: "white",
                width: 48,
                height: 48,
                "&:hover": {
                  bgcolor: alpha(THEME_COLORS.primary, 0.8),
                },
                "&.Mui-disabled": {
                  bgcolor: alpha(THEME_COLORS.primary, 0.3),
                  color: alpha("#ffffff", 0.5),
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: THEME_COLORS.textMuted,
              mt: 1,
            }}
          >
            A Frappy usa IA e pode cometer erros. Verifique informações importantes.
          </Typography>
        </Container>
      </Box>

      {/* History Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            bgcolor: THEME_COLORS.surface,
            borderLeft: `1px solid ${alpha(THEME_COLORS.primary, 0.1)}`,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography
              variant="h6"
              sx={{ color: THEME_COLORS.text, fontWeight: 600 }}
            >
              Conversas
            </Typography>
            <IconButton
              onClick={() => setDrawerOpen(false)}
              sx={{ color: THEME_COLORS.textMuted }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          <List sx={{ mx: -2 }}>
            {!sessions || sessions.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography sx={{ color: THEME_COLORS.textMuted }}>
                  Nenhuma conversa ainda
                </Typography>
              </Box>
            ) : (
              sessions.map((session) => (
                <ListItemButton
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  selected={session.id === currentSessionId}
                  sx={{
                    borderRadius: 0,
                    "&.Mui-selected": {
                      bgcolor: alpha(THEME_COLORS.primary, 0.1),
                    },
                    "&:hover": {
                      bgcolor: alpha(THEME_COLORS.primary, 0.05),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {contextIcons[session.context] || <QuestionIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={session.title}
                    secondary={new Date(session.created_at).toLocaleDateString("pt-BR")}
                    primaryTypographyProps={{
                      sx: {
                        color: THEME_COLORS.text,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                    secondaryTypographyProps={{
                      sx: { color: THEME_COLORS.textMuted, fontSize: 12 },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    sx={{
                      color: THEME_COLORS.textMuted,
                      "&:hover": { color: "#EF4444" },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ))
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}

