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
  Divider,
  CircularProgress,
  Paper,
  Grid,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PrintIcon from "@mui/icons-material/Print";
import {
  payslipAPI,
  PayslipSummary,
  Payslip,
  PayslipItem,
  MONTH_NAMES,
  PAYSLIP_TYPES,
  User,
  authAPI,
} from "@/lib/api";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#10B981" },
    secondary: { main: "#3B82F6" },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

export default function HoleritePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [payslips, setPayslips] = useState<PayslipSummary[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  // Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [earnings, setEarnings] = useState<PayslipItem[]>([]);
  const [deductions, setDeductions] = useState<PayslipItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

    loadPayslips();
  }, [router]);

  useEffect(() => {
    if (mounted) {
      loadPayslips();
    }
  }, [selectedYear, mounted]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await payslipAPI.getMyPayslips(selectedYear);
      if (res.success) {
        setPayslips(res.payslips || []);
        if (res.years && res.years.length > 0) {
          setYears(res.years);
          if (!res.years.includes(selectedYear) && res.years.length > 0) {
            setSelectedYear(res.years[0]);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar holerites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayslip = async (id: string) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const res = await payslipAPI.getPayslipById(id);
      if (res.success) {
        setSelectedPayslip(res.payslip);
        setEarnings(res.earnings || []);
        setDeductions(res.deductions || []);
      }
    } catch (error) {
      console.error("Erro ao carregar holerite:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getPayslipTypeLabel = (type: string) => {
    return PAYSLIP_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getMonthName = (month: number) => {
    return MONTH_NAMES[month - 1] || "";
  };

  // Totais do ano
  const totalGross = payslips.reduce((acc, p) => acc + p.gross_total, 0);
  const totalDeductions = payslips.reduce(
    (acc, p) => acc + p.deduction_total,
    0
  );
  const totalNet = payslips.reduce((acc, p) => acc + p.net_total, 0);

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
                onClick={() => router.push("/hub")}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.05)",
                  "&:hover": { background: "rgba(16, 185, 129, 0.2)" },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <IconButton
                onClick={() => router.push("/hub")}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.05)",
                  "&:hover": { background: "rgba(16, 185, 129, 0.2)" },
                }}
              >
                <HomeIcon />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="white">
                  💰 Meus Holerites
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Consulte seus contracheques
                </Typography>
              </Box>
            </Stack>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                sx={{
                  color: "white",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.1)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(16, 185, 129, 0.5)",
                  },
                }}
              >
                {years.length > 0 ? (
                  years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value={new Date().getFullYear()}>
                    {new Date().getFullYear()}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Content */}
        <Box
          sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: "1400px", mx: "auto" }}
        >
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "20px",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <TrendingUpIcon
                      sx={{ fontSize: 40, color: "#10B981", mb: 1 }}
                    />
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                      Total Proventos ({selectedYear})
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#10B981">
                      {formatCurrency(totalGross)}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "20px",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <TrendingDownIcon
                      sx={{ fontSize: 40, color: "#EF4444", mb: 1 }}
                    />
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                      Total Descontos ({selectedYear})
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#EF4444">
                      {formatCurrency(totalDeductions)}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card
                  sx={{
                    background:
                      "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "20px",
                  }}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <AccountBalanceWalletIcon
                      sx={{ fontSize: 40, color: "#3B82F6", mb: 1 }}
                    />
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                      Total Líquido ({selectedYear})
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                      {formatCurrency(totalNet)}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>

          {/* Payslips List */}
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
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <ReceiptLongIcon sx={{ color: "#10B981", fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold" color="white">
                    Holerites de {selectedYear}
                  </Typography>
                </Stack>
                <Chip
                  label={`${payslips.length} holerites`}
                  sx={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#10B981",
                  }}
                />
              </Stack>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress sx={{ color: "#10B981" }} />
                </Box>
              ) : payslips.length === 0 ? (
                <Alert
                  severity="info"
                  sx={{
                    background: "rgba(59, 130, 246, 0.1)",
                    color: "white",
                    borderRadius: "12px",
                    "& .MuiAlert-icon": { color: "#3B82F6" },
                  }}
                >
                  Nenhum holerite encontrado para {selectedYear}.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Período
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Tipo
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Proventos
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Descontos
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Líquido
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          Ações
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payslips.map((payslip, index) => (
                        <motion.tr
                          key={payslip.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{ display: "table-row" }}
                        >
                          <TableCell
                            sx={{
                              color: "white",
                              borderColor: "rgba(255,255,255,0.08)",
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <CalendarMonthIcon
                                sx={{ color: "#10B981", fontSize: 20 }}
                              />
                              <Box>
                                <Typography fontWeight="bold">
                                  {getMonthName(payslip.reference_month)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="rgba(255,255,255,0.5)"
                                >
                                  {payslip.reference_year}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                          >
                            <Chip
                              label={getPayslipTypeLabel(payslip.payslip_type)}
                              size="small"
                              sx={{
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#10B981",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: "#10B981",
                              fontWeight: "bold",
                              borderColor: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {formatCurrency(payslip.gross_total)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: "#EF4444",
                              fontWeight: "bold",
                              borderColor: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {formatCurrency(payslip.deduction_total)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: "#3B82F6",
                              fontWeight: "bold",
                              borderColor: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {formatCurrency(payslip.net_total)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                          >
                            <IconButton
                              onClick={() => handleViewPayslip(payslip.id)}
                              sx={{ color: "#10B981" }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Detail Modal */}
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background:
                "linear-gradient(135deg, rgba(15, 15, 26, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "24px",
              maxHeight: "90vh",
            },
          }}
        >
          {loadingDetail ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress sx={{ color: "#10B981" }} />
            </Box>
          ) : selectedPayslip ? (
            <>
              <DialogTitle sx={{ pb: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <ReceiptLongIcon sx={{ color: "#10B981", fontSize: 32 }} />
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="white">
                        Holerite -{" "}
                        {getMonthName(selectedPayslip.reference_month)}/
                        {selectedPayslip.reference_year}
                      </Typography>
                      <Typography variant="body2" color="rgba(255,255,255,0.5)">
                        {getPayslipTypeLabel(selectedPayslip.payslip_type)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{ color: "#10B981" }}
                  >
                    Imprimir
                  </Button>
                </Stack>
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                {/* Employee Info */}
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.5)"
                      >
                        Colaborador
                      </Typography>
                      <Typography color="white" fontWeight="bold">
                        {selectedPayslip.employee_name}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.5)"
                      >
                        CPF
                      </Typography>
                      <Typography color="white">
                        {selectedPayslip.employee_cpf}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.5)"
                      >
                        Cargo
                      </Typography>
                      <Typography color="white">
                        {selectedPayslip.position || "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        color="rgba(255,255,255,0.5)"
                      >
                        Filial
                      </Typography>
                      <Typography color="white">
                        {selectedPayslip.branch || "-"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Earnings */}
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="#10B981"
                  mb={1}
                >
                  Proventos
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    mb: 3,
                    background: "rgba(16, 185, 129, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>
                          Descrição
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Ref.
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Valor
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {earnings.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ color: "white" }}>
                            {item.description}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            {item.reference > 0 ? item.reference : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "#10B981", fontWeight: "bold" }}
                          >
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          sx={{ color: "white", fontWeight: "bold" }}
                        >
                          Total Proventos
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "#10B981",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(selectedPayslip.gross_total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Deductions */}
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="#EF4444"
                  mb={1}
                >
                  Descontos
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    mb: 3,
                    background: "rgba(239, 68, 68, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "rgba(255,255,255,0.7)" }}>
                          Descrição
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Ref.
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Valor
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deductions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ color: "white" }}>
                            {item.description}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            {item.reference > 0 ? item.reference : "-"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: "#EF4444", fontWeight: "bold" }}
                          >
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          sx={{ color: "white", fontWeight: "bold" }}
                        >
                          Total Descontos
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "#EF4444",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(selectedPayslip.deduction_total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Net Total */}
                <Paper
                  sx={{
                    p: 3,
                    background:
                      "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
                    borderRadius: "16px",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body1" color="rgba(255,255,255,0.7)">
                    Líquido a Receber
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="#3B82F6">
                    {formatCurrency(selectedPayslip.net_total)}
                  </Typography>
                </Paper>

                {/* Additional Info */}
                {(selectedPayslip.fgts_amount > 0 ||
                  selectedPayslip.inss_base > 0) && (
                  <Paper
                    sx={{
                      p: 2,
                      mt: 3,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="rgba(255,255,255,0.5)"
                      mb={1}
                    >
                      Informações Adicionais
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedPayslip.fgts_amount > 0 && (
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                          >
                            FGTS
                          </Typography>
                          <Typography color="white" fontWeight="bold">
                            {formatCurrency(selectedPayslip.fgts_amount)}
                          </Typography>
                        </Grid>
                      )}
                      {selectedPayslip.inss_base > 0 && (
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                          >
                            Base INSS
                          </Typography>
                          <Typography color="white">
                            {formatCurrency(selectedPayslip.inss_base)}
                          </Typography>
                        </Grid>
                      )}
                      {selectedPayslip.irrf_base > 0 && (
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography
                            variant="caption"
                            color="rgba(255,255,255,0.5)"
                          >
                            Base IRRF
                          </Typography>
                          <Typography color="white">
                            {formatCurrency(selectedPayslip.irrf_base)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 3 }}>
                <Button
                  onClick={() => setDetailOpen(false)}
                  sx={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Fechar
                </Button>
              </DialogActions>
            </>
          ) : null}
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
