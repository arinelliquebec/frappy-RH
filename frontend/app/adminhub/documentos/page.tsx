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
  TextField,
  Tooltip,
  Skeleton,
  Tabs,
  Tab,
  Collapse,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderIcon from "@mui/icons-material/Folder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityIcon from "@mui/icons-material/Security";
import PendingIcon from "@mui/icons-material/Pending";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import { authAPI, documentsAPI, adminAPI, User, Document } from "@/lib/api";

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

interface UserWithDocs extends User {
  documents?: Document[];
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
}

export default function AdminDocumentosPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Documents state
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [usersWithDocs, setUsersWithDocs] = useState<UserWithDocs[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<Document | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
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

  const loadStats = useCallback(async () => {
    try {
      const res = await documentsAPI.admin.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
    }
  }, []);

  const loadPendingDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await documentsAPI.admin.getPending();
      if (res.success) {
        setPendingDocs(res.documents || []);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos pendentes:", err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadAllDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await documentsAPI.admin.getAll({});
      if (res.success) {
        setAllDocs(res.documents || []);
        // Agrupar por usuário
        const userMap = new Map<string, UserWithDocs>();
        (res.documents || []).forEach((doc) => {
          if (doc.user) {
            const userId = doc.user_id;
            if (!userMap.has(userId)) {
              userMap.set(userId, {
                ...doc.user,
                documents: [],
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
              });
            }
            const userData = userMap.get(userId)!;
            userData.documents!.push(doc);
            if (doc.status === "pending") userData.pendingCount!++;
            else if (doc.status === "approved") userData.approvedCount!++;
            else if (doc.status === "rejected") userData.rejectedCount!++;
          }
        });
        // Ordenar por pendências (mais pendências primeiro)
        const usersArray = Array.from(userMap.values()).sort(
          (a, b) => (b.pendingCount || 0) - (a.pendingCount || 0)
        );
        setUsersWithDocs(usersArray);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && currentUser) {
      loadStats();
      loadPendingDocs();
      loadAllDocs();
    }
  }, [mounted, currentUser, loadStats, loadPendingDocs, loadAllDocs]);

  const handleApprove = async (doc: Document) => {
    try {
      await documentsAPI.admin.approve(doc.id);
      setSnackbar({
        open: true,
        message: "Documento aprovado com sucesso!",
        severity: "success",
      });
      loadStats();
      loadPendingDocs();
      loadAllDocs();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao aprovar documento",
        severity: "error",
      });
    }
  };

  const handleReject = async () => {
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
      loadStats();
      loadPendingDocs();
      loadAllDocs();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Erro ao rejeitar documento",
        severity: "error",
      });
    }
  };

  const handleDownload = async (doc: Document) => {
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rg: "RG",
      cpf: "CPF",
      cnh: "CNH",
      comprovante_residencia: "Comprovante de Residência",
      certidao_nascimento: "Certidão de Nascimento",
      certidao_casamento: "Certidão de Casamento",
      titulo_eleitor: "Título de Eleitor",
      carteira_trabalho: "Carteira de Trabalho",
      pis: "PIS/PASEP",
      certificado: "Certificado",
      diploma: "Diploma",
      outro: "Outro",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981" };
      case "pending":
        return { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" };
      case "rejected":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444" };
      default:
        return { bg: "rgba(107, 114, 128, 0.2)", color: "#6B7280" };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
    };
    return labels[status] || status;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <PictureAsPdfIcon sx={{ color: "#EF4444" }} />;
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
      return <ImageIcon sx={{ color: "#3B82F6" }} />;
    return <InsertDriveFileIcon sx={{ color: "#6B7280" }} />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
              "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)",
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
                        "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #3B82F6 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      mb: 1,
                    }}
                  >
                    Análise de Documentos
                  </Typography>
                  <Typography color="rgba(255,255,255,0.5)">
                    Revise e aprove documentação dos colaboradores
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
                        "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
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
                {/* Pending */}
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
                        >
                          Pendentes
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#F59E0B"
                        >
                          {loading ? <Skeleton width={40} /> : stats.pending}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <PendingIcon sx={{ color: "#F59E0B", fontSize: 24 }} />
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
                        >
                          Aprovados
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#10B981"
                        >
                          {loading ? <Skeleton width={40} /> : stats.approved}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        <CheckCircleIcon
                          sx={{ color: "#10B981", fontSize: 24 }}
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

                {/* Total */}
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
                        >
                          Total
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="#3B82F6"
                        >
                          {loading ? <Skeleton width={40} /> : stats.total}
                        </Typography>
                      </Box>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background: "rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <FolderIcon sx={{ color: "#3B82F6", fontSize: 24 }} />
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
                        "linear-gradient(90deg, #F59E0B 0%, #3B82F6 100%)",
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
                    icon={<FolderIcon />}
                    iconPosition="start"
                    label="Por Colaborador"
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
                        Documentos Aguardando Aprovação
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          loadStats();
                          loadPendingDocs();
                        }}
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

                    {docsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(3)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={80}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : pendingDocs.length === 0 ? (
                      <Alert
                        severity="success"
                        icon={<CheckCircleIcon />}
                        sx={{
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhum documento pendente de aprovação! 🎉
                      </Alert>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Colaborador</TableCell>
                              <TableCell>Documento</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Tamanho</TableCell>
                              <TableCell>Enviado em</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pendingDocs.map((doc) => (
                              <TableRow key={doc.id}>
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
                                          "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      {doc.user?.name
                                        ? getInitials(doc.user.name)
                                        : "?"}
                                    </Avatar>
                                    <Typography color="white" fontWeight={500}>
                                      {doc.user?.name || "Usuário"}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                  >
                                    {getFileIcon(doc.original_name)}
                                    <Tooltip title={doc.original_name}>
                                      <Typography
                                        color="rgba(255,255,255,0.7)"
                                        fontSize="0.875rem"
                                        sx={{
                                          maxWidth: 150,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {doc.original_name}
                                      </Typography>
                                    </Tooltip>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={getTypeLabel(doc.type)}
                                    size="small"
                                    sx={{
                                      background: "rgba(59, 130, 246, 0.2)",
                                      color: "#3B82F6",
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    color="rgba(255,255,255,0.5)"
                                    fontSize="0.875rem"
                                  >
                                    {formatFileSize(doc.size)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    color="rgba(255,255,255,0.5)"
                                    fontSize="0.875rem"
                                  >
                                    {formatDate(doc.created_at)}
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
                                        onClick={() => handleDownload(doc)}
                                        sx={{ color: "#3B82F6" }}
                                      >
                                        <DownloadIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Aprovar">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleApprove(doc)}
                                        sx={{
                                          color: "#10B981",
                                          "&:hover": {
                                            background:
                                              "rgba(16, 185, 129, 0.1)",
                                          },
                                        }}
                                      >
                                        <CheckCircleIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Rejeitar">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setRejectingDoc(doc);
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
                                        <CancelIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </TabPanel>

                {/* By User Tab */}
                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={3}
                    >
                      <Typography variant="h6" color="white">
                        Documentos por Colaborador
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllDocs}
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

                    {docsLoading ? (
                      <Stack spacing={2}>
                        {[...Array(5)].map((_, i) => (
                          <Skeleton
                            key={i}
                            height={60}
                            sx={{ borderRadius: 2 }}
                          />
                        ))}
                      </Stack>
                    ) : usersWithDocs.length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          background: "rgba(59, 130, 246, 0.1)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "12px",
                        }}
                      >
                        Nenhum documento enviado ainda
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        {usersWithDocs.map((userData) => (
                          <Card
                            key={userData.id}
                            sx={{
                              background: "rgba(255,255,255,0.02)",
                              border: `1px solid ${
                                userData.pendingCount! > 0
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
                                      width: 44,
                                      height: 44,
                                      background:
                                        "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                                    }}
                                  >
                                    {getInitials(userData.name)}
                                  </Avatar>
                                  <Box>
                                    <Typography color="white" fontWeight={600}>
                                      {userData.name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="rgba(255,255,255,0.5)"
                                    >
                                      {userData.documents?.length || 0}{" "}
                                      documento
                                      {(userData.documents?.length || 0) !== 1
                                        ? "s"
                                        : ""}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  {userData.pendingCount! > 0 && (
                                    <Chip
                                      size="small"
                                      label={`${
                                        userData.pendingCount
                                      } pendente${
                                        userData.pendingCount! > 1 ? "s" : ""
                                      }`}
                                      sx={{
                                        background: "rgba(245, 158, 11, 0.2)",
                                        color: "#F59E0B",
                                        fontWeight: 600,
                                      }}
                                    />
                                  )}
                                  {userData.approvedCount! > 0 && (
                                    <Chip
                                      size="small"
                                      label={`${
                                        userData.approvedCount
                                      } aprovado${
                                        userData.approvedCount! > 1 ? "s" : ""
                                      }`}
                                      sx={{
                                        background: "rgba(16, 185, 129, 0.2)",
                                        color: "#10B981",
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
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Documento</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Data</TableCell>
                                        <TableCell align="right">
                                          Ações
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {userData.documents?.map((doc) => {
                                        const statusStyle = getStatusColor(
                                          doc.status
                                        );
                                        return (
                                          <TableRow key={doc.id}>
                                            <TableCell>
                                              <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                              >
                                                {getFileIcon(doc.original_name)}
                                                <Tooltip
                                                  title={doc.original_name}
                                                >
                                                  <Typography
                                                    color="rgba(255,255,255,0.7)"
                                                    fontSize="0.8rem"
                                                    sx={{
                                                      maxWidth: 120,
                                                      overflow: "hidden",
                                                      textOverflow: "ellipsis",
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {doc.original_name}
                                                  </Typography>
                                                </Tooltip>
                                              </Stack>
                                            </TableCell>
                                            <TableCell>
                                              <Typography
                                                color="rgba(255,255,255,0.5)"
                                                fontSize="0.8rem"
                                              >
                                                {getTypeLabel(doc.type)}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                size="small"
                                                label={getStatusLabel(
                                                  doc.status
                                                )}
                                                sx={{
                                                  background: statusStyle.bg,
                                                  color: statusStyle.color,
                                                  fontWeight: 600,
                                                  fontSize: "0.65rem",
                                                  height: 22,
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Typography
                                                color="rgba(255,255,255,0.4)"
                                                fontSize="0.8rem"
                                              >
                                                {formatDate(doc.created_at)}
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
                                                      handleDownload(doc)
                                                    }
                                                    sx={{ color: "#3B82F6" }}
                                                  >
                                                    <DownloadIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                                {doc.status === "pending" && (
                                                  <>
                                                    <Tooltip title="Aprovar">
                                                      <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                          handleApprove(doc)
                                                        }
                                                        sx={{
                                                          color: "#10B981",
                                                        }}
                                                      >
                                                        <CheckCircleIcon fontSize="small" />
                                                      </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Rejeitar">
                                                      <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                          setRejectingDoc(doc);
                                                          setRejectDialogOpen(
                                                            true
                                                          );
                                                        }}
                                                        sx={{
                                                          color: "#EF4444",
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
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            </Collapse>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </TabPanel>
              </Card>
            </motion.div>
          </Box>
        </Box>

        {/* Reject Dialog */}
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
              minWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ color: "#EF4444" }}>
            Rejeitar Documento
          </DialogTitle>
          <DialogContent>
            <Typography color="rgba(255,255,255,0.7)" mb={2}>
              Você está rejeitando o documento{" "}
              <strong style={{ color: "#fff" }}>
                {rejectingDoc?.original_name}
              </strong>{" "}
              de{" "}
              <strong style={{ color: "#fff" }}>
                {rejectingDoc?.user?.name}
              </strong>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Documento ilegível, fora da validade..."
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
                setRejectingDoc(null);
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
