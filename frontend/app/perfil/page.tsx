"use client";

import { useState, useEffect } from "react";
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
  Skeleton,
  Chip,
  TextField,
  Button,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import CakeIcon from "@mui/icons-material/Cake";
import WorkIcon from "@mui/icons-material/Work";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import {
  userAPI,
  documentsAPI,
  vacationAPI,
  FullProfile,
  User,
  Document,
  DocumentType,
  VacationBalance,
} from "@/lib/api";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e84b8a" },
    secondary: { main: "#3B82F6" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

// Campos que NÃO podem ser editados por usuários comuns
// Administradores podem editar TODOS os campos (exceto CPF por segurança)
const LOCKED_FIELDS_FOR_USERS = [
  "nome",
  "cpf",
  "email_empresarial",
  "telefone1",
  "data_nascimento",
];

// Campos que NUNCA podem ser editados (nem por admin)
const ALWAYS_LOCKED_FIELDS = ["cpf"];

interface ProfileFieldConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  editable: boolean;
}

const fieldConfigs: ProfileFieldConfig[] = [
  {
    key: "nome",
    label: "Nome Completo",
    icon: <PersonIcon />,
    editable: false,
  },
  { key: "codinome", label: "Codinome", icon: <BadgeIcon />, editable: true },
  { key: "cpf", label: "CPF", icon: <BadgeIcon />, editable: false },
  { key: "rg", label: "RG", icon: <BadgeIcon />, editable: true },
  { key: "cnh", label: "CNH", icon: <DirectionsCarIcon />, editable: true },
  {
    key: "email_empresarial",
    label: "E-mail Empresarial",
    icon: <EmailIcon />,
    editable: false,
  },
  {
    key: "email_pessoal",
    label: "E-mail Pessoal",
    icon: <EmailIcon />,
    editable: true,
  },
  {
    key: "telefone1",
    label: "Telefone 1",
    icon: <PhoneIcon />,
    editable: false,
  },
  {
    key: "telefone2",
    label: "Telefone 2",
    icon: <PhoneIcon />,
    editable: true,
  },
  {
    key: "data_nascimento",
    label: "Data de Nascimento",
    icon: <CakeIcon />,
    editable: false,
  },
  { key: "sexo", label: "Sexo", icon: <PersonIcon />, editable: true },
  {
    key: "estado_civil",
    label: "Estado Civil",
    icon: <FavoriteIcon />,
    editable: true,
  },
];

const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    borderRadius: "12px",
    backgroundColor: "rgba(255,255,255,0.03)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#3B82F6" },
    "&.Mui-disabled": {
      backgroundColor: "rgba(255,255,255,0.02)",
      "& fieldset": { borderColor: "rgba(255,255,255,0.05)" },
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.5)",
    "&.Mui-focused": { color: "#3B82F6" },
  },
  "& .MuiInputBase-input.Mui-disabled": {
    color: "rgba(255,255,255,0.5)",
    WebkitTextFillColor: "rgba(255,255,255,0.5)",
  },
};

export default function PerfilPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<FullProfile>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para documentos
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("outros");
  const [isDragging, setIsDragging] = useState(false);
  const [vacationBalance, setVacationBalance] = useState<VacationBalance | null>(null);

  // Verifica se o usuário é admin
  const isAdmin = user?.role === "admin";

  // Verifica se um campo é editável pelo usuário atual
  // Admins podem editar TODOS os campos (exceto CPF por segurança)
  const isFieldEditableByUser = (fieldKey: string, fieldEditable: boolean) => {
    // CPF nunca pode ser editado (segurança)
    if (ALWAYS_LOCKED_FIELDS.includes(fieldKey)) return false;

    // Admin pode editar todos os outros campos
    if (isAdmin) return true;

    // Usuários comuns seguem a config do campo
    return fieldEditable;
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchProfile();
    fetchDocuments();
    fetchDocumentTypes();
    fetchVacationBalance();
  }, [router]);

  const fetchVacationBalance = async () => {
    try {
      const response = await vacationAPI.getBalance();
      if (response.success) {
        setVacationBalance(response.balance);
      }
    } catch {
      // Silenciosamente ignora erros
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const response = await documentsAPI.getMyDocuments();
      if (response.success) {
        setDocuments(response.documents);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const response = await documentsAPI.getTypes();
      if (response.success) {
        setDocumentTypes(response.types);
      }
    } catch (err) {
      console.error("Erro ao carregar tipos:", err);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await documentsAPI.upload(file, selectedType);
      }
      setSuccessMessage("Documento(s) enviado(s) com sucesso!");
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await documentsAPI.download(doc.id, doc.original_name);
    } catch (err) {
      setError("Erro ao baixar documento");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      await documentsAPI.delete(id);
      setSuccessMessage("Documento excluído com sucesso!");
      fetchDocuments();
    } catch (err) {
      setError("Erro ao excluir documento");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf"))
      return <PictureAsPdfIcon sx={{ color: "#ef4444" }} />;
    if (mimeType.includes("image"))
      return <ImageIcon sx={{ color: "#3B82F6" }} />;
    return <InsertDriveFileIcon sx={{ color: "#10B981" }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const fetchProfile = async () => {
    try {
      // Carrega o usuário do localStorage para ter acesso ao role
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }

      const response = await userAPI.getFullProfile();
      if (response.success) {
        // Preserva o role do localStorage se o backend não retornar
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser({
            ...response.user,
            role: response.user.role || parsedUser.role,
          });
        } else {
          setUser(response.user);
        }
        setProfile(response.profile);
        setEditedProfile(response.profile);
      } else {
        setError("Erro ao carregar perfil");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({ ...profile });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({ ...profile });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await userAPI.updateFullProfile(editedProfile);
      if (response.success) {
        setProfile(response.profile);
        setEditedProfile(response.profile);
        setIsEditing(false);
        setSuccessMessage("Perfil atualizado com sucesso!");
      } else {
        setError(response.error || "Erro ao salvar perfil");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Gerar iniciais do nome para o avatar
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const getFieldValue = (key: string): string => {
    const value = isEditing
      ? (editedProfile as any)[key]
      : (profile as any)?.[key];

    if (key === "cpf") return formatCPF(value as string);
    if (key === "telefone1" || key === "telefone2")
      return formatPhone(value as string);
    return (value as string) || "";
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
            top: -200,
            left: "20%",
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
            right: "20%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232, 75, 138, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        {/* Navigation */}
        <Box
          sx={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 10,
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 8,
            px: 2,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: "100%", maxWidth: 800 }}
          >
            {/* Header Card */}
            <Card
              sx={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                mb: 3,
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {loading ? (
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Skeleton variant="circular" width={100} height={100} />
                    <Box>
                      <Skeleton variant="text" width={200} height={40} />
                      <Skeleton variant="text" width={150} height={24} />
                    </Box>
                  </Stack>
                ) : (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={3}
                    alignItems={{ xs: "center", sm: "flex-start" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Avatar
                        sx={{
                          width: 100,
                          height: 100,
                          background:
                            "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
                          fontSize: "2rem",
                          fontWeight: 700,
                          boxShadow: "0 8px 32px rgba(232, 75, 138, 0.4)",
                        }}
                      >
                        {profile?.nome ? getInitials(profile.nome) : "??"}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          color="white"
                          mb={0.5}
                        >
                          {profile?.nome || "Carregando..."}
                        </Typography>
                        {profile?.codinome && (
                          <Chip
                            label={profile.codinome}
                            size="small"
                            sx={{
                              background: "rgba(59, 130, 246, 0.2)",
                              color: "#3B82F6",
                              fontWeight: 600,
                              mr: 1,
                            }}
                          />
                        )}
                        <Typography
                          variant="body1"
                          color="rgba(255,255,255,0.5)"
                        >
                          CPF: {formatCPF(profile?.cpf)}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Edit/Save Buttons */}
                    <Stack direction="row" spacing={1}>
                      {!isEditing ? (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={handleEdit}
                          sx={{
                            borderColor: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            borderRadius: "12px",
                            textTransform: "none",
                            "&:hover": {
                              borderColor: "#3B82F6",
                              background: "rgba(59, 130, 246, 0.1)",
                            },
                          }}
                        >
                          Editar
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                            disabled={saving}
                            sx={{
                              borderColor: "rgba(255,255,255,0.2)",
                              color: "#fff",
                              borderRadius: "12px",
                              textTransform: "none",
                              "&:hover": {
                                borderColor: "#ef4444",
                                background: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{
                              background:
                                "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                              borderRadius: "12px",
                              textTransform: "none",
                              "&:hover": {
                                background:
                                  "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              },
                            }}
                          >
                            {saving ? "Salvando..." : "Salvar"}
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ mb: 3, borderRadius: "12px" }}
              >
                {error}
              </Alert>
            )}

            {/* Profile Details */}
            <Card
              sx={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "24px",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="white"
                  mb={3}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <WorkIcon sx={{ color: "#3B82F6" }} />
                  Informações Pessoais
                  {isEditing && (
                    <Chip
                      label="Modo Edição"
                      size="small"
                      sx={{
                        ml: 2,
                        background: "rgba(16, 185, 129, 0.2)",
                        color: "#10B981",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Typography>

                {loading ? (
                  <Stack spacing={2}>
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} variant="text" height={50} />
                    ))}
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 2,
                    }}
                  >
                    {fieldConfigs.map((field, index) => (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Box sx={{ position: "relative" }}>
                          <TextField
                            fullWidth
                            label={field.label}
                            value={getFieldValue(field.key)}
                            onChange={(e) =>
                              handleFieldChange(field.key, e.target.value)
                            }
                            disabled={
                              !isEditing ||
                              !isFieldEditableByUser(field.key, field.editable)
                            }
                            InputProps={{
                              startAdornment: (
                                <Box
                                  sx={{
                                    color: isFieldEditableByUser(
                                      field.key,
                                      field.editable
                                    )
                                      ? "rgba(255,255,255,0.4)"
                                      : "rgba(255,255,255,0.2)",
                                    mr: 1,
                                    display: "flex",
                                  }}
                                >
                                  {field.icon}
                                </Box>
                              ),
                              endAdornment: !isFieldEditableByUser(
                                field.key,
                                field.editable
                              ) && (
                                <LockIcon
                                  sx={{
                                    fontSize: 16,
                                    color: "rgba(255,255,255,0.2)",
                                  }}
                                />
                              ),
                            }}
                            sx={textFieldStyles}
                          />
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                )}

                {/* Legend */}
                {isEditing && (
                  <Box
                    sx={{
                      mt: 3,
                      pt: 2,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <Stack direction="row" spacing={3} flexWrap="wrap">
                      {isAdmin ? (
                        <>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <EditIcon sx={{ fontSize: 14, color: "#10B981" }} />
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              Modo Admin: Todos os campos editáveis (exceto CPF)
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <LockIcon
                              sx={{
                                fontSize: 14,
                                color: "rgba(255,255,255,0.3)",
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              CPF bloqueado (segurança)
                            </Typography>
                          </Stack>
                        </>
                      ) : (
                        <>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <LockIcon
                              sx={{
                                fontSize: 14,
                                color: "rgba(255,255,255,0.3)",
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              Campo bloqueado (não editável)
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <EditIcon sx={{ fontSize: 14, color: "#10B981" }} />
                            <Typography
                              variant="caption"
                              color="rgba(255,255,255,0.4)"
                            >
                              Campo editável
                            </Typography>
                          </Stack>
                        </>
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Card de Saldo de Férias */}
            {vacationBalance && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <Card
                  sx={{
                    mb: 3,
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "24px",
                    overflow: "hidden",
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="white"
                      mb={3}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <BeachAccessIcon sx={{ color: "#10B981" }} />
                      Saldo de Férias
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                        gap: 2,
                      }}
                    >
                      {/* Total de Dias */}
                      <Box
                        sx={{
                          p: 2,
                          background: "rgba(16, 185, 129, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="#10B981">
                          {vacationBalance.total_days}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">
                          Dias Totais
                        </Typography>
                      </Box>

                      {/* Dias Usados */}
                      <Box
                        sx={{
                          p: 2,
                          background: "rgba(239, 68, 68, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="#EF4444">
                          {vacationBalance.used_days}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">
                          Dias Usados
                        </Typography>
                      </Box>

                      {/* Dias Pendentes */}
                      <Box
                        sx={{
                          p: 2,
                          background: "rgba(245, 158, 11, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                          {vacationBalance.pending_days}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">
                          Dias Pendentes
                        </Typography>
                      </Box>

                      {/* Dias Disponíveis */}
                      <Box
                        sx={{
                          p: 2,
                          background: "rgba(59, 130, 246, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                          {vacationBalance.available_days}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">
                          Dias Disponíveis
                        </Typography>
                      </Box>
                    </Box>

                    {/* Barra de progresso */}
                    <Box sx={{ mt: 3 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="rgba(255,255,255,0.7)">
                          Férias utilizadas
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="#10B981">
                          {Math.round((vacationBalance.used_days / vacationBalance.total_days) * 100)}%
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 10,
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: 5,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${(vacationBalance.used_days / vacationBalance.total_days) * 100}%`,
                            background: "linear-gradient(90deg, #10B981 0%, #3B82F6 100%)",
                            borderRadius: 5,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.4)"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Período: {new Date(vacationBalance.period_start).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(vacationBalance.period_end).toLocaleDateString("pt-BR")}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Seção de Documentos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card
                sx={{
                  mt: 3,
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "24px",
                  overflow: "hidden",
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="white"
                    mb={3}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <FolderIcon sx={{ color: "#3B82F6" }} />
                    Meus Documentos
                  </Typography>

                  {/* Seleção de tipo + Área de Upload */}
                  <Stack spacing={2} mb={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          "&.Mui-focused": { color: "#3B82F6" },
                        }}
                      >
                        Tipo de Documento
                      </InputLabel>
                      <Select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        label="Tipo de Documento"
                        sx={{
                          color: "#fff",
                          borderRadius: "12px",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.1)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.2)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#3B82F6",
                          },
                          "& .MuiSvgIcon-root": {
                            color: "rgba(255,255,255,0.5)",
                          },
                        }}
                      >
                        {documentTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Drag & Drop Zone */}
                    <Box
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      sx={{
                        border: isDragging
                          ? "2px dashed #3B82F6"
                          : "2px dashed rgba(255,255,255,0.15)",
                        borderRadius: "16px",
                        p: 4,
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        background: isDragging
                          ? "rgba(59, 130, 246, 0.1)"
                          : "rgba(255,255,255,0.02)",
                        "&:hover": {
                          borderColor: "rgba(255,255,255,0.3)",
                          background: "rgba(255,255,255,0.03)",
                        },
                      }}
                      onClick={() =>
                        document.getElementById("file-input")?.click()
                      }
                    >
                      <input
                        id="file-input"
                        type="file"
                        multiple
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                      {uploading ? (
                        <CircularProgress size={40} sx={{ color: "#3B82F6" }} />
                      ) : (
                        <>
                          <CloudUploadIcon
                            sx={{
                              fontSize: 48,
                              color: isDragging
                                ? "#3B82F6"
                                : "rgba(255,255,255,0.3)",
                              mb: 1,
                            }}
                          />
                          <Typography
                            color="rgba(255,255,255,0.6)"
                            variant="body1"
                          >
                            {isDragging
                              ? "Solte os arquivos aqui"
                              : "Arraste e solte arquivos aqui"}
                          </Typography>
                          <Typography
                            color="rgba(255,255,255,0.4)"
                            variant="body2"
                          >
                            ou clique para selecionar
                          </Typography>
                          <Typography
                            color="rgba(255,255,255,0.3)"
                            variant="caption"
                            sx={{ mt: 1, display: "block" }}
                          >
                            PDF, JPG, PNG, DOC, DOCX (máx. 20MB)
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Stack>

                  <Divider
                    sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }}
                  />

                  {/* Lista de Documentos */}
                  <Typography
                    variant="subtitle2"
                    color="rgba(255,255,255,0.5)"
                    mb={2}
                  >
                    Documentos Enviados ({documents.length})
                  </Typography>

                  {loadingDocs ? (
                    <Stack spacing={1}>
                      {[...Array(3)].map((_, i) => (
                        <Skeleton
                          key={i}
                          variant="rectangular"
                          height={60}
                          sx={{ borderRadius: "12px" }}
                        />
                      ))}
                    </Stack>
                  ) : documents.length === 0 ? (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      <DescriptionIcon
                        sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}
                      />
                      <Typography>Nenhum documento enviado ainda</Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {documents.map((doc, index) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <ListItem
                            sx={{
                              background: "rgba(255,255,255,0.02)",
                              borderRadius: "12px",
                              mb: 1,
                              border: "1px solid rgba(255,255,255,0.05)",
                              "&:hover": {
                                background: "rgba(255,255,255,0.04)",
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {getFileIcon(doc.mime_type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  color="white"
                                  fontWeight={500}
                                >
                                  {doc.name}
                                </Typography>
                              }
                              secondary={
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  mt={0.5}
                                >
                                  <Chip
                                    label={
                                      documentTypes.find(
                                        (t) => t.value === doc.type
                                      )?.label || doc.type
                                    }
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      background: "rgba(59, 130, 246, 0.2)",
                                      color: "#3B82F6",
                                    }}
                                  />
                                  <Chip
                                    label={
                                      doc.status === "approved"
                                        ? "Aprovado"
                                        : doc.status === "pending"
                                        ? "Pendente"
                                        : "Rejeitado"
                                    }
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      background:
                                        doc.status === "approved"
                                          ? "rgba(16, 185, 129, 0.2)"
                                          : doc.status === "pending"
                                          ? "rgba(245, 158, 11, 0.2)"
                                          : "rgba(239, 68, 68, 0.2)",
                                      color:
                                        doc.status === "approved"
                                          ? "#10B981"
                                          : doc.status === "pending"
                                          ? "#F59E0B"
                                          : "#EF4444",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.4)"
                                  >
                                    {formatFileSize(doc.size)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="rgba(255,255,255,0.3)"
                                  >
                                    •{" "}
                                    {new Date(
                                      doc.created_at
                                    ).toLocaleDateString("pt-BR")}
                                  </Typography>
                                </Stack>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Stack direction="row" spacing={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownload(doc)}
                                  sx={{
                                    color: "rgba(255,255,255,0.5)",
                                    "&:hover": {
                                      color: "#10B981",
                                      background: "rgba(16, 185, 129, 0.1)",
                                    },
                                  }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  sx={{
                                    color: "rgba(255,255,255,0.5)",
                                    "&:hover": {
                                      color: "#ef4444",
                                      background: "rgba(239, 68, 68, 0.1)",
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </motion.div>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </Box>

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={4000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ borderRadius: "12px" }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
