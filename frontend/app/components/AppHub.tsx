"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PsychologyIcon from "@mui/icons-material/Psychology";

interface AppHubProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const appCards = [
  {
    id: "career",
    title: "Minha Carreira",
    description: "Planeje seu futuro profissional",
    icon: WorkIcon,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  },
  {
    id: "learning",
    title: "Aprendizado",
    description: "Desenvolva novas habilidades",
    icon: SchoolIcon,
    gradient: "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
  },
  {
    id: "growth",
    title: "Crescimento",
    description: "Acompanhe seu progresso",
    icon: TrendingUpIcon,
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  },
  {
    id: "mindset",
    title: "Mindset",
    description: "Fortaleça sua mentalidade",
    icon: PsychologyIcon,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  },
];

export default function AppHub({
  isOpen,
  onClose,
  onLoginClick,
  onSignupClick,
}: AppHubProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, #12121c 0%, #0a0a12 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          pb: 2,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                background:
                  "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Hub de Aplicativos
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.5)" mt={0.5}>
              Escolha uma ferramenta para começar
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: "rgba(255,255,255,0.5)",
              "&:hover": {
                color: "rgba(255,255,255,0.9)",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Stack direction="row" spacing={2} mt={3}>
          <Button
            variant="outlined"
            startIcon={<LoginIcon />}
            onClick={onLoginClick}
            sx={{
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.8)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                borderColor: "#4a9fd9",
                backgroundColor: "rgba(74, 159, 217, 0.1)",
                color: "#4a9fd9",
              },
            }}
          >
            Login
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={onSignupClick}
            sx={{
              background: "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(232, 75, 138, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #ff6b9d 0%, #e84b8a 100%)",
                boxShadow: "0 6px 30px rgba(232, 75, 138, 0.5)",
              },
            }}
          >
            Cadastro
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 4 }}>
        <Grid
          container
          spacing={3}
          sx={{
            alignItems: "stretch",
          }}
        >
          {appCards.map((app) => (
            <Grid
              size={{ xs: 12, sm: 6 }}
              key={app.id}
              sx={{ display: "flex" }}
            >
              <Card
                sx={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  width: "100%",
                  minHeight: 150,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  "&:hover": {
                    transform: "scale(1.02)",
                    borderColor: "rgba(255,255,255,0.2)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: 4,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={3}
                    alignItems="center"
                    width="100%"
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        background: app.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <app.icon sx={{ fontSize: 36, color: "#fff" }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        fontWeight="semibold"
                        color="white"
                      >
                        {app.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="rgba(255,255,255,0.5)"
                        mt={0.5}
                      >
                        {app.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography
          variant="body2"
          textAlign="center"
          color="rgba(255,255,255,0.3)"
          mt={4}
        >
          Acesse sua conta para desbloquear todas as funcionalidades
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
