"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  LinearProgress,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import DescriptionIcon from "@mui/icons-material/Description";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import CakeIcon from "@mui/icons-material/Cake";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import Link from "next/link";
import {
  documentsAPI,
  Document,
  DocumentType,
  userAPI,
  FullProfile,
} from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3B82F6" },
    secondary: { main: "#e84b8a" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

// Configuração dos campos do perfil
const profileFieldConfigs = [
  { key: "nome", label: "Nome Completo", icon: <PersonIcon /> },
  { key: "codinome", label: "Codinome", icon: <BadgeIcon /> },
  { key: "cpf", label: "CPF", icon: <BadgeIcon /> },
  { key: "rg", label: "RG", icon: <BadgeIcon /> },
  { key: "cnh", label: "CNH", icon: <DirectionsCarIcon /> },
  {
    key: "email_empresarial",
    label: "E-mail Empresarial",
    icon: <EmailIcon />,
  },
  { key: "email_pessoal", label: "E-mail Pessoal", icon: <EmailIcon /> },
  { key: "telefone1", label: "Telefone 1", icon: <PhoneIcon /> },
  { key: "telefone2", label: "Telefone 2", icon: <PhoneIcon /> },
  { key: "data_nascimento", label: "Data de Nascimento", icon: <CakeIcon /> },
  { key: "sexo", label: "Sexo", icon: <PersonIcon /> },
  { key: "estado_civil", label: "Estado Civil", icon: <FavoriteIcon /> },
];

// Formatar CPF
const formatCPF = (cpf: string | null | undefined) => {
  if (!cpf) return "-";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(
    6,
    9
  )}-${clean.slice(9)}`;
};

// Formatar telefone
const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return "-";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
};

// Formatar data
const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
};

// Documentos obrigatórios para o colaborador
const requiredDocuments = [
  { type: "rg", label: "RG", priority: "obrigatorio" },
  { type: "cpf", label: "CPF", priority: "obrigatorio" },
  {
    type: "comprovante_residencia",
    label: "Comprovante de Residência",
    priority: "obrigatorio",
  },
  {
    type: "carteira_trabalho",
    label: "Carteira de Trabalho",
    priority: "obrigatorio",
  },
  {
    type: "certidao",
    label: "Certidão (Nascimento/Casamento)",
    priority: "recomendado",
  },
  {
    type: "titulo_eleitor",
    label: "Título de Eleitor",
    priority: "recomendado",
  },
  { type: "cnh", label: "CNH", priority: "opcional" },
  { type: "certificado", label: "Certificados/Diplomas", priority: "opcional" },
];

export default function CarreirasPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsAccordionOpen, setDocsAccordionOpen] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedType, setSelectedType] = useState(requiredDocuments[0].type);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [profileAccordionOpen, setProfileAccordionOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar se está autenticado
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Buscar documentos do usuário
    fetchDocuments();
    fetchDocumentTypes();
    fetchProfile();
    setIsLoading(false);
  }, [router]);

  const fetchDocuments = async () => {
    try {
      const response = await documentsAPI.getMyDocuments();
      if (response.success) {
        setUserDocuments(response.documents);
      }
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const response = await documentsAPI.getTypes();
      if (response.success) {
        setDocumentTypes(response.types);
        if (!response.types.find((type) => type.value === selectedType)) {
          setSelectedType(
            response.types[0]?.value || requiredDocuments[0].type
          );
        }
      }
    } catch (err) {
      console.error("Erro ao buscar tipos de documentos:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getFullProfile();
      if (response.success) {
        setProfile(response.profile);
      }
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      for (const file of Array.from(files)) {
        await documentsAPI.upload(file, selectedType);
      }
      setUploadSuccess("Documento(s) enviado(s) com sucesso!");
      fetchDocuments();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erro ao enviar documento"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    handleFileUpload(event.target.files);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      await documentsAPI.download(doc.id, doc.original_name);
    } catch (err) {
      setUploadError("Erro ao baixar documento");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await documentsAPI.delete(id);
      setUploadSuccess("Documento removido com sucesso!");
      fetchDocuments();
    } catch (err) {
      setUploadError("Erro ao excluir documento");
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileUpload(event.dataTransfer.files);
  };

  const getTypeLabel = (docType: string) => {
    return (
      documentTypes.find((t) => t.value === docType)?.label ||
      requiredDocuments.find((d) => d.type === docType)?.label ||
      docType.toUpperCase()
    );
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <PictureAsPdfIcon sx={{ color: "#F87171" }} />;
      case "png":
      case "jpg":
      case "jpeg":
        return <ImageIcon sx={{ color: "#FBBF24" }} />;
      default:
        return <InsertDriveFileIcon sx={{ color: "#60A5FA" }} />;
    }
  };

  const formatFileSize = (size: number) => {
    if (!size) return "0 KB";
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const documentTypeOptions =
    documentTypes.length > 0
      ? documentTypes
      : requiredDocuments.map((doc) => ({
          value: doc.type,
          label: doc.label,
        }));

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "approved":
        return {
          label: "Aprovado",
          color: "#10B981",
          background: "rgba(16, 185, 129, 0.2)",
        };
      case "pending":
        return {
          label: "Pendente",
          color: "#F59E0B",
          background: "rgba(245, 158, 11, 0.2)",
        };
      case "rejected":
        return {
          label: "Rejeitado",
          color: "#EF4444",
          background: "rgba(239, 68, 68, 0.2)",
        };
      default:
        return {
          label: status,
          color: "#94A3B8",
          background: "rgba(148, 163, 184, 0.2)",
        };
    }
  };

  // Verifica o status do documento
  const getDocumentStatus = (docType: string) => {
    const doc = userDocuments.find((d) => d.type === docType);
    if (!doc) return "ausente";
    return doc.status; // pending, approved, rejected
  };

  // Verifica se o documento foi aprovado
  const isDocumentApproved = (docType: string) => {
    return getDocumentStatus(docType) === "approved";
  };

  // Calcula o progresso de documentação (apenas aprovados contam)
  const getDocumentationProgress = () => {
    const obrigatorios = requiredDocuments.filter(
      (d) => d.priority === "obrigatorio"
    );
    const aprovados = obrigatorios.filter((d) => isDocumentApproved(d.type));
    return {
      total: obrigatorios.length,
      enviados: aprovados.length,
      porcentagem: Math.round((aprovados.length / obrigatorios.length) * 100),
    };
  };

  // Retorna a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#EF4444";
    }
  };

  // Retorna o label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "pending":
        return "Aguardando aprovação";
      case "rejected":
        return "Rejeitado";
      default:
        return "Ausente";
    }
  };

  // Retorna o valor formatado do campo do perfil
  const getProfileFieldValue = (key: string): string => {
    if (!profile) return "-";
    const value = (profile as any)[key];
    if (!value) return "-";

    if (key === "cpf") return formatCPF(value);
    if (key === "telefone1" || key === "telefone2") return formatPhone(value);
    if (key === "data_nascimento") return formatDate(value);
    return value;
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            minHeight: "100vh",
            background:
              "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={48} sx={{ color: "#3B82F6" }} />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            minHeight: "100vh",
            background:
              "linear-gradient(135deg, #0a0a12 0%, #12121c 50%, #0a0a12 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Alert severity="error">{error}</Alert>
        </Box>
      </ThemeProvider>
    );
  }

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
        {/* Background Elements */}
        <Box
          sx={{
            position: "absolute",
            top: -200,
            left: "10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -200,
            right: "10%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Grid Pattern */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            pointerEvents: "none",
          }}
        />

        {/* Home Button */}
        <Box sx={{ position: "absolute", top: 24, left: 24, zIndex: 10 }}>
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
            py: 4,
            px: 2,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: "auto", pt: 8 }}>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Box textAlign="center" mb={6}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{
                    fontFamily: "var(--font-orbitron), sans-serif",
                    background: "linear-gradient(90deg, #3B82F6, #e84b8a)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Minha Carreira
                </Typography>
                <Typography variant="h6" color="rgba(255,255,255,0.5)">
                  Análise do seu bem-estar no trabalho
                </Typography>
              </Box>
            </motion.div>

            {/* Meu Perfil - Accordion (somente leitura) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <Accordion
                expanded={profileAccordionOpen}
                onChange={(_, isExpanded) =>
                  setProfileAccordionOpen(isExpanded)
                }
                sx={{
                  mb: 4,
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "24px !important",
                  "&:before": { display: "none" },
                  "&.Mui-expanded": { margin: "0 0 32px 0" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}
                  sx={{
                    px: 3,
                    py: 2,
                    "& .MuiAccordionSummary-content": {
                      my: 1,
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ width: "100%" }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        background: "rgba(232, 75, 138, 0.2)",
                        color: "#e84b8a",
                      }}
                    >
                      <PersonIcon />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold" color="white">
                        Meu Perfil
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.5)">
                        {profile?.nome || "Carregando..."}
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  {!profile ? (
                    <Box textAlign="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {profileFieldConfigs.map((field, index) => {
                        const value = getProfileFieldValue(field.key);
                        if (
                          value === "-" &&
                          ![
                            "nome",
                            "cpf",
                            "email_empresarial",
                            "telefone1",
                          ].includes(field.key)
                        ) {
                          return null; // Não mostrar campos vazios opcionais
                        }
                        return (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.key}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                            >
                              <Box
                                sx={{
                                  p: 2,
                                  background: "rgba(255,255,255,0.02)",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="center"
                                  mb={0.5}
                                >
                                  <Box
                                    sx={{
                                      color: "rgba(255,255,255,0.4)",
                                      display: "flex",
                                    }}
                                  >
                                    {field.icon}
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.5)"
                                    fontWeight={500}
                                  >
                                    {field.label}
                                  </Typography>
                                </Stack>
                                <Typography
                                  variant="body1"
                                  color="white"
                                  fontWeight={500}
                                  sx={{ ml: 4.5 }}
                                >
                                  {value}
                                </Typography>
                              </Box>
                            </motion.div>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}

                  {/* Link para editar perfil */}
                  <Box sx={{ mt: 3, textAlign: "center" }}>
                    <Link href="/perfil" style={{ textDecoration: "none" }}>
                      <Button
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "#fff",
                          borderRadius: "12px",
                          textTransform: "none",
                          "&:hover": {
                            borderColor: "#e84b8a",
                            background: "rgba(232, 75, 138, 0.1)",
                          },
                        }}
                      >
                        Editar Perfil Completo
                      </Button>
                    </Link>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </motion.div>

            {/* Documentação do Colaborador - Accordion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Accordion
                expanded={docsAccordionOpen}
                onChange={(_, isExpanded) => setDocsAccordionOpen(isExpanded)}
                sx={{
                  mb: 4,
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "24px !important",
                  "&:before": { display: "none" },
                  "&.Mui-expanded": { margin: "0 0 32px 0" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}
                  sx={{
                    px: 3,
                    py: 2,
                    "& .MuiAccordionSummary-content": {
                      my: 1,
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ width: "100%" }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        background: "rgba(59, 130, 246, 0.2)",
                        color: "#3B82F6",
                      }}
                    >
                      <FolderIcon />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold" color="white">
                        Documentação do Colaborador
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.5)">
                        {getDocumentationProgress().enviados}/
                        {getDocumentationProgress().total} documentos aprovados
                      </Typography>
                    </Box>
                    <Chip
                      label={`${getDocumentationProgress().porcentagem}%`}
                      size="small"
                      sx={{
                        mr: 2,
                        fontWeight: 700,
                        background:
                          getDocumentationProgress().porcentagem === 100
                            ? "rgba(16, 185, 129, 0.2)"
                            : getDocumentationProgress().porcentagem >= 50
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                        color:
                          getDocumentationProgress().porcentagem === 100
                            ? "#10B981"
                            : getDocumentationProgress().porcentagem >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                      }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  <input
                    type="file"
                    multiple
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                  />
                  <Box
                    sx={{
                      mb: 3,
                      p: 3,
                      borderRadius: "20px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <Stack spacing={3}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <CloudUploadIcon
                            sx={{ color: "#3B82F6", fontSize: 32 }}
                          />
                          <Box>
                            <Typography variant="h6" color="white">
                              Enviar novos documentos
                            </Typography>
                            <Typography
                              variant="body2"
                              color="rgba(255,255,255,0.6)"
                            >
                              Tamanho máximo: 20MB por arquivo
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={2}
                          alignItems={{ xs: "stretch", md: "center" }}
                          sx={{ width: { xs: "100%", md: "auto" } }}
                        >
                          <FormControl
                            size="small"
                            sx={{
                              minWidth: 200,
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                                color: "#fff",
                              },
                              "& .MuiInputLabel-root": {
                                color: "rgba(255,255,255,0.6)",
                              },
                            }}
                          >
                            <InputLabel id="document-type-label">
                              Tipo do documento
                            </InputLabel>
                            <Select
                              labelId="document-type-label"
                              value={selectedType}
                              label="Tipo do documento"
                              onChange={(event) =>
                                setSelectedType(event.target.value)
                              }
                              sx={{
                                "& .MuiSvgIcon-root": { color: "#fff" },
                              }}
                            >
                              {documentTypeOptions.map((option) => (
                                <MenuItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                              borderRadius: "12px",
                              textTransform: "none",
                              boxShadow: "none",
                            }}
                          >
                            {uploading ? "Enviando..." : "Selecionar arquivos"}
                          </Button>
                        </Stack>
                      </Stack>
                      <Box
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          border: "2px dashed",
                          borderColor: isDragging
                            ? "#3B82F6"
                            : "rgba(255,255,255,0.1)",
                          borderRadius: "16px",
                          p: 4,
                          textAlign: "center",
                          background: isDragging
                            ? "rgba(59, 130, 246, 0.08)"
                            : "rgba(255,255,255,0.02)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <CloudUploadIcon
                          sx={{ fontSize: 48, color: "#3B82F6", mb: 1 }}
                        />
                        <Typography fontWeight="bold" color="white">
                          Arraste e solte os arquivos aqui
                        </Typography>
                        <Typography
                          variant="body2"
                          color="rgba(255,255,255,0.6)"
                        >
                          ou clique para procurar no seu dispositivo
                        </Typography>
                      </Box>
                      {uploadError && (
                        <Alert
                          severity="error"
                          onClose={() => setUploadError(null)}
                          sx={{
                            borderRadius: "12px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                          }}
                        >
                          {uploadError}
                        </Alert>
                      )}
                      {uploadSuccess && (
                        <Alert
                          severity="success"
                          onClose={() => setUploadSuccess(null)}
                          sx={{
                            borderRadius: "12px",
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          {uploadSuccess}
                        </Alert>
                      )}
                    </Stack>
                  </Box>

                  <Box mb={3}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        color="rgba(255,255,255,0.8)"
                      >
                        Documentos enviados
                      </Typography>
                      {uploading && <CircularProgress size={18} />}
                    </Stack>
                    {loadingDocs ? (
                      <Box textAlign="center" py={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : userDocuments.length === 0 ? (
                      <Alert
                        severity="info"
                        sx={{
                          borderRadius: "12px",
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        Você ainda não enviou documentos. Utilize o campo acima
                        para começar.
                      </Alert>
                    ) : (
                      <List dense sx={{ p: 0 }}>
                        {userDocuments.map((doc) => {
                          const statusMeta = getStatusMeta(doc.status);
                          return (
                            <ListItem
                              key={doc.id}
                              sx={{
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "12px",
                                mb: 1,
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                {getFileIcon(doc.original_name)}
                              </ListItemIcon>
                              <ListItemText
                                primary={doc.original_name}
                                secondary={`${getTypeLabel(
                                  doc.type
                                )} • ${formatFileSize(doc.size)} • ${new Date(
                                  doc.created_at
                                ).toLocaleDateString("pt-BR")}`}
                                primaryTypographyProps={{
                                  color: "white",
                                  fontWeight: 500,
                                }}
                                secondaryTypographyProps={{
                                  color: "rgba(255,255,255,0.6)",
                                }}
                              />
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  label={statusMeta.label}
                                  sx={{
                                    background: statusMeta.background,
                                    color: statusMeta.color,
                                    fontWeight: 600,
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadDocument(doc)}
                                  sx={{ color: "#3B82F6" }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  sx={{ color: "#EF4444" }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Box>

                  {/* Progresso Geral */}
                  {!loadingDocs && (
                    <Box mb={3}>
                      <LinearProgress
                        variant="determinate"
                        value={getDocumentationProgress().porcentagem}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "rgba(255,255,255,0.1)",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 4,
                            backgroundColor:
                              getDocumentationProgress().porcentagem === 100
                                ? "#10B981"
                                : getDocumentationProgress().porcentagem >= 50
                                ? "#F59E0B"
                                : "#EF4444",
                          },
                        }}
                      />
                    </Box>
                  )}

                  {/* Lista de Documentos */}
                  <Grid container spacing={2}>
                    {/* Obrigatórios */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="rgba(255,255,255,0.7)"
                        mb={1}
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <ErrorIcon sx={{ fontSize: 16, color: "#EF4444" }} />
                        Documentos Obrigatórios
                      </Typography>
                      <List dense sx={{ p: 0 }}>
                        {requiredDocuments
                          .filter((d) => d.priority === "obrigatorio")
                          .map((doc) => {
                            const status = getDocumentStatus(doc.type);
                            const statusColor = getStatusColor(status);
                            return (
                              <ListItem
                                key={doc.type}
                                sx={{
                                  background: `${statusColor}15`,
                                  borderRadius: "10px",
                                  mb: 1,
                                  border: `1px solid ${statusColor}30`,
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {status === "approved" ? (
                                    <CheckCircleIcon
                                      sx={{ color: "#10B981" }}
                                    />
                                  ) : status === "pending" ? (
                                    <HourglassEmptyIcon
                                      sx={{ color: "#F59E0B" }}
                                    />
                                  ) : status === "rejected" ? (
                                    <CancelIcon sx={{ color: "#EF4444" }} />
                                  ) : (
                                    <ErrorIcon sx={{ color: "#EF4444" }} />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={doc.label}
                                  primaryTypographyProps={{
                                    color: "white",
                                    fontWeight: 500,
                                    fontSize: "0.9rem",
                                  }}
                                  secondary={getStatusLabel(status)}
                                  secondaryTypographyProps={{
                                    color: `${statusColor}CC`,
                                    fontSize: "0.75rem",
                                  }}
                                />
                                {status === "pending" && (
                                  <Chip
                                    label="Pendente"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      background: "rgba(245, 158, 11, 0.2)",
                                      color: "#F59E0B",
                                    }}
                                  />
                                )}
                                {status === "rejected" && (
                                  <Chip
                                    label="Reenviar"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      background: "rgba(239, 68, 68, 0.2)",
                                      color: "#EF4444",
                                    }}
                                  />
                                )}
                              </ListItem>
                            );
                          })}
                      </List>
                    </Grid>

                    {/* Recomendados e Opcionais */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="rgba(255,255,255,0.7)"
                        mb={1}
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <WarningIcon sx={{ fontSize: 16, color: "#F59E0B" }} />
                        Recomendados / Opcionais
                      </Typography>
                      <List dense sx={{ p: 0 }}>
                        {requiredDocuments
                          .filter((d) => d.priority !== "obrigatorio")
                          .map((doc) => {
                            const status = getDocumentStatus(doc.type);
                            const statusColor = getStatusColor(status);
                            const hasDocument = status !== "ausente";
                            return (
                              <ListItem
                                key={doc.type}
                                sx={{
                                  background: hasDocument
                                    ? `${statusColor}15`
                                    : "rgba(255, 255, 255, 0.02)",
                                  borderRadius: "10px",
                                  mb: 1,
                                  border: `1px solid ${
                                    hasDocument
                                      ? `${statusColor}30`
                                      : "rgba(255, 255, 255, 0.05)"
                                  }`,
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {status === "approved" ? (
                                    <CheckCircleIcon
                                      sx={{ color: "#10B981" }}
                                    />
                                  ) : status === "pending" ? (
                                    <HourglassEmptyIcon
                                      sx={{ color: "#F59E0B" }}
                                    />
                                  ) : status === "rejected" ? (
                                    <CancelIcon sx={{ color: "#EF4444" }} />
                                  ) : (
                                    <DescriptionIcon
                                      sx={{ color: "rgba(255,255,255,0.3)" }}
                                    />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={doc.label}
                                  primaryTypographyProps={{
                                    color: "white",
                                    fontWeight: 500,
                                    fontSize: "0.9rem",
                                  }}
                                  secondary={
                                    hasDocument
                                      ? getStatusLabel(status)
                                      : doc.priority === "recomendado"
                                      ? "Recomendado"
                                      : "Opcional"
                                  }
                                  secondaryTypographyProps={{
                                    color: hasDocument
                                      ? `${statusColor}CC`
                                      : "rgba(255, 255, 255, 0.4)",
                                    fontSize: "0.75rem",
                                  }}
                                />
                                {doc.priority === "recomendado" &&
                                  !hasDocument && (
                                    <Chip
                                      label="Recomendado"
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: "0.65rem",
                                        background: "rgba(245, 158, 11, 0.2)",
                                        color: "#F59E0B",
                                      }}
                                    />
                                  )}
                                {status === "pending" && (
                                  <Chip
                                    label="Pendente"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      background: "rgba(245, 158, 11, 0.2)",
                                      color: "#F59E0B",
                                    }}
                                  />
                                )}
                              </ListItem>
                            );
                          })}
                      </List>
                    </Grid>
                  </Grid>

                  {/* Alertas */}
                  {!loadingDocs &&
                    getDocumentationProgress().porcentagem < 100 && (
                      <Alert
                        severity="warning"
                        sx={{
                          mt: 3,
                          borderRadius: "12px",
                          background: "rgba(245, 158, 11, 0.1)",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          "& .MuiAlert-icon": { color: "#F59E0B" },
                        }}
                      >
                        Sua documentação está incompleta. Envie os documentos
                        obrigatórios ausentes.
                      </Alert>
                    )}
                  {!loadingDocs &&
                    getDocumentationProgress().porcentagem === 100 && (
                      <Alert
                        severity="success"
                        sx={{
                          mt: 3,
                          borderRadius: "12px",
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          "& .MuiAlert-icon": { color: "#10B981" },
                        }}
                      >
                        Parabéns! Sua documentação obrigatória está completa.
                      </Alert>
                    )}
                </AccordionDetails>
              </Accordion>
            </motion.div>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
