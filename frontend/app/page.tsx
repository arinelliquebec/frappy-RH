"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Avatar, Stack, Typography, Menu, MenuItem, Divider } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import GridViewIcon from "@mui/icons-material/GridView";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { authAPI, userAPI, User } from "@/lib/api";

// Tema customizado do MaterialUI
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#e84b8a",
    },
    secondary: {
      main: "#7C6AEF",
    },
  },
  typography: {
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
});

// Variantes de animação
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const letterVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.5 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 100,
    },
  },
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 1.5,
      duration: 0.6,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.95,
  },
};

const glowVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Função para gerar partículas - reduzido para 10
const generateParticles = () =>
  Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

// Função para gerar estrelas da galáxia - reduzido de 200 para 80
const generateStars = () =>
  Array.from({ length: 80 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    opacity: Math.random() * 0.8 + 0.2,
    twinkleDuration: Math.random() * 3 + 2,
    twinkleDelay: Math.random() * 5,
  }));

// Função para gerar nebulosas - reduzido para 3
const generateNebulas = () =>
  Array.from({ length: 3 }, (_, i) => ({
    id: i,
    size: Math.random() * 400 + 200,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: ['rgba(59, 130, 246, 0.15)', 'rgba(139, 92, 246, 0.12)', 'rgba(236, 72, 153, 0.1)'][i],
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));

// Componente de estrela memoizado para evitar re-renders
const Star = memo(({ star }: { star: { id: number; size: number; x: number; y: number; opacity: number; twinkleDuration: number; twinkleDelay: number } }) => (
  <div
    className="absolute rounded-full bg-white star-twinkle"
    style={{
      width: star.size,
      height: star.size,
      left: `${star.x}%`,
      top: `${star.y}%`,
      opacity: star.opacity,
      willChange: 'opacity',
      animationDuration: `${star.twinkleDuration}s`,
      animationDelay: `${star.twinkleDelay}s`,
      boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px rgba(255,255,255,0.3)` : 'none',
    }}
  />
));
Star.displayName = 'Star';

export default function Home() {
  const frappLetters = ["F", "r", "a", "p", "p"];
  const youLetters = ["Y", "O", "U", "!"];

  const router = useRouter();

  // Gerar partículas apenas no cliente para evitar hydration mismatch
  const [particles, setParticles] = useState<ReturnType<typeof generateParticles>>([]);
  const [stars, setStars] = useState<ReturnType<typeof generateStars>>([]);
  const [nebulas, setNebulas] = useState<ReturnType<typeof generateNebulas>>([]);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [warpLines, setWarpLines] = useState<Array<{ id: number; angle: number; delay: number }>>([]);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    setParticles(generateParticles());
    setStars(generateStars());
    setNebulas(generateNebulas());
    setMounted(true);

    // Verificar autenticação
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      // Buscar dados atualizados do usuário (para garantir role atualizado)
      userAPI.getProfile().then((response) => {
        if (response.success && response.user) {
          setUser(response.user);
          localStorage.setItem("user", JSON.stringify(response.user));
        }
      }).catch(() => {
        // Se falhar, usa os dados do localStorage
      });
    }
  }, []);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
    handleMenuClose();
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

  // Função para criar efeito de transição warp - otimizado
  const handleWarpTransition = (destination: string) => {
    // Gerar linhas de warp - reduzido de 60 para 24 para melhor performance
    const lines = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      angle: (i * 15) + Math.random() * 5, // 360 graus / 24 linhas
      delay: Math.random() * 0.2,
    }));
    setWarpLines(lines);
    setIsTransitioning(true);

    // Navegar após a animação
    setTimeout(() => {
      router.push(destination);
    }, 1000);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a12]">
        {/* Galaxy Background - Animated Stars & Nebulas */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#030014]">
          {/* Base gradient - deep space */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
                linear-gradient(180deg, #030014 0%, #0a0a20 50%, #030014 100%)
              `,
            }}
          />

          {/* Animated Nebulas - usando CSS animations */}
          {mounted && nebulas.map((nebula) => (
            <div
              key={`nebula-${nebula.id}`}
              className="absolute rounded-full pointer-events-none nebula-animate"
              style={{
                width: nebula.size,
                height: nebula.size,
                left: `${nebula.x}%`,
                top: `${nebula.y}%`,
                background: `radial-gradient(circle, ${nebula.color} 0%, transparent 70%)`,
                filter: "blur(60px)",
                animationDuration: `${nebula.duration}s`,
                animationDelay: `${nebula.delay}s`,
              }}
            />
          ))}

          {/* Milky Way band */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(
                  135deg,
                  transparent 0%,
                  transparent 35%,
                  rgba(139, 92, 246, 0.1) 40%,
                  rgba(59, 130, 246, 0.15) 45%,
                  rgba(6, 182, 212, 0.1) 50%,
                  rgba(139, 92, 246, 0.1) 55%,
                  transparent 60%,
                  transparent 100%
                )
              `,
            }}
          />

          {/* Animated Stars - usando CSS animations para melhor performance */}
          {mounted && stars.map((star) => (
            <Star key={`star-${star.id}`} star={star} />
          ))}

          {/* Shooting stars - usando CSS animations */}
          {mounted && (
            <>
              <div
                className="absolute w-1 h-1 bg-white rounded-full shooting-star"
                style={{
                  boxShadow: "0 0 6px #fff, 0 0 12px #fff",
                  top: "20%",
                  left: "-5%",
                  animationDelay: "0s",
                  animationDuration: "2s",
                }}
              />
              <div
                className="absolute w-0.5 h-0.5 bg-white rounded-full shooting-star"
                style={{
                  boxShadow: "0 0 4px #fff, 0 0 8px #fff",
                  top: "40%",
                  left: "-5%",
                  animationDelay: "5s",
                  animationDuration: "1.5s",
                }}
              />
            </>
          )}

          {/* Central galaxy glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.2) 30%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(3, 0, 20, 0.4) 100%)",
            }}
          />
        </div>

        {/* Header - Hub Link */}
        <motion.header
          className="absolute top-0 left-0 z-50 p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div
            onClick={() => handleWarpTransition("/hub")}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <motion.div
              className="p-2 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#e84b8a]/20 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.1, borderColor: "rgba(255,255,255,0.3)" }}
              transition={{ duration: 0.2 }}
            >
              <GridViewIcon sx={{ fontSize: 24, color: "#fff" }} />
            </motion.div>
            <motion.span
              className="text-xl font-medium tracking-[0.3em] uppercase"
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
              whileHover={{ letterSpacing: "0.4em" }}
              transition={{ duration: 0.3 }}
            >
              hub
            </motion.span>
          </div>
        </motion.header>

        {/* User Avatar - Top Right */}
        {mounted && isAuthenticated && user && (
          <motion.div
            className="absolute top-0 right-0 z-50 p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              onClick={handleMenuClick}
              sx={{
                cursor: "pointer",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50px",
                py: 0.8,
                px: 2,
                pr: 1,
                transition: "all 0.2s ease",
                "&:hover": {
                  background: "rgba(255,255,255,0.1)",
                  borderColor: "rgba(255,255,255,0.2)",
                },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={600}
                color="white"
                sx={{
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.name}
              </Typography>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, #e84b8a 0%, #ff6b9d 100%)",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                {getInitials(user.name)}
              </Avatar>
            </Stack>

            {/* Dropdown Menu */}
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
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  minWidth: 200,
                  "& .MuiMenuItem-root": {
                    color: "rgba(255,255,255,0.8)",
                    py: 1.5,
                    px: 2,
                    "&:hover": {
                      background: "rgba(255,255,255,0.05)",
                    },
                  },
                },
              }}
            >
              <div style={{ padding: "12px 16px" }}>
                <Typography variant="body2" color="rgba(255,255,255,0.5)">
                  Logado como
                </Typography>
                <Typography variant="body1" fontWeight={600} color="white">
                  {user.name}
                </Typography>
                {user.email && (
                  <Typography variant="caption" color="rgba(255,255,255,0.4)">
                    {user.email}
                  </Typography>
                )}
              </div>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
              <MenuItem onClick={() => { handleMenuClose(); router.push("/hub"); }}>
                <GridViewIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Hub de Aplicativos
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); router.push("/perfil"); }}>
                <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Meu Perfil
              </MenuItem>
              {user.role === "admin" && (
                <MenuItem onClick={() => { handleMenuClose(); router.push("/admin"); }}>
                  <AdminPanelSettingsIcon sx={{ mr: 1.5, fontSize: 20, color: "#e84b8a" }} />
                  Painel Admin
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout} sx={{ color: "#e84b8a !important" }}>
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                Sair
              </MenuItem>
            </Menu>
          </motion.div>
        )}

        {/* Efeito de spotlight no topo */}
        <motion.div
          className="spotlight"
          variants={glowVariants}
          animate="animate"
        />

        {/* Partículas flutuantes - só renderiza após montado no cliente */}
        {mounted &&
          particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="particle bg-white/10"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          ))}

        {/* Gradiente de fundo adicional */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a12]/80 pointer-events-none" />

        {/* Conteúdo principal */}
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
          {/* Logo FrappYOU! */}
          <motion.div
            className="flex items-baseline justify-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Frapp */}
            <div className="flex">
              {frappLetters.map((letter, index) => (
                <motion.span
                  key={`frapp-${index}`}
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight"
                  style={{
                    backgroundImage: `linear-gradient(135deg,
                      #2563EB 0%,
                      #3B82F6 40%,
                      #6366F1 80%,
                      #7C3AED 100%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    textShadow: "0 0 40px rgba(59, 130, 246, 0.5)",
                  }}
                  variants={letterVariants}
                  whileHover={{
                    scale: 1.1,
                    textShadow: "0 0 60px rgba(59, 130, 246, 0.8)",
                    transition: { duration: 0.2 },
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* YOU! */}
            <div className="flex items-baseline">
              {youLetters.map((letter, index) => (
                <motion.span
                  key={`you-${index}`}
                  className={`font-black tracking-tight ${
                    index === 0
                      ? "text-[4.125rem] sm:text-[4.875rem] md:text-[6.375rem] lg:text-[8.375rem]"
                      : "text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
                  }`}
                  style={{
                    backgroundImage: `linear-gradient(135deg,
                      #e84b8a 0%,
                      #ff6b9d 50%,
                      #e84b8a 100%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    textShadow: "0 0 40px rgba(232, 75, 138, 0.4)",
                  }}
                  variants={letterVariants}
                  whileHover={{
                    scale: 1.1,
                    textShadow: "0 0 60px rgba(232, 75, 138, 0.7)",
                    transition: { duration: 0.2 },
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="mt-6 text-lg sm:text-xl text-white/60 text-center max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            Transforme seu potencial em sucesso
          </motion.p>

          {/* Card Hub / Login Hub */}
          <motion.div
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: "60px" }}
          >
            <div
              onClick={() => handleWarpTransition(isAuthenticated ? "/hub" : "/login")}
              className="cursor-pointer flex items-center gap-4"
              style={{
                transition: "all 0.3s ease",
              }}
            >
              {/* Ícone Grid - igual ao do canto superior */}
              <GridViewIcon sx={{ fontSize: 32, color: "#fff" }} />

              {/* Texto */}
              <span
                style={{
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontSize: "1.5rem",
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textTransform: "uppercase",
                }}
              >
                {isAuthenticated ? "HUB" : "LOGIN HUB"}
              </span>
            </div>
          </motion.div>

          {/* Decoração inferior */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-white/20"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>
        </main>

        {/* Efeitos de borda com glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#e84b8a]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />

        {/* Warp Transition Overlay */}
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Background escurecendo */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0.8, 1] }}
              transition={{ duration: 1.2, times: [0, 0.3, 0.8, 1] }}
            />

            {/* Linhas de warp convergindo para o centro */}
            {warpLines.map((line) => (
              <motion.div
                key={line.id}
                className="absolute"
                style={{
                  left: "50%",
                  top: "50%",
                  width: "200vw",
                  height: "3px",
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    rgba(59, 130, 246, 0.8) 30%,
                    rgba(139, 92, 246, 1) 50%,
                    rgba(236, 72, 153, 0.8) 70%,
                    transparent 100%
                  )`,
                  transformOrigin: "center center",
                  transform: `rotate(${line.angle}deg)`,
                  boxShadow: "0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
                }}
                initial={{
                  scaleX: 0,
                  opacity: 0,
                }}
                animate={{
                  scaleX: [0, 0.5, 1.5],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: line.delay,
                  ease: "easeIn",
                }}
              />
            ))}

            {/* Flash central */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "white",
                boxShadow: "0 0 60px 30px rgba(255,255,255,0.8), 0 0 100px 60px rgba(139, 92, 246, 0.6), 0 0 140px 90px rgba(59, 130, 246, 0.4)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 50],
                opacity: [0, 1, 1],
              }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                ease: "easeIn",
              }}
            />

            {/* Tunnel effect - círculos expandindo - reduzido para 3 */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`tunnel-${i}`}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{
                  borderColor: i % 2 === 0 ? "rgba(59, 130, 246, 0.6)" : "rgba(139, 92, 246, 0.6)",
                  boxShadow: `0 0 20px ${i % 2 === 0 ? "rgba(59, 130, 246, 0.4)" : "rgba(139, 92, 246, 0.4)"}`,
                }}
                initial={{
                  width: 0,
                  height: 0,
                  opacity: 0
                }}
                animate={{
                  width: ["0vw", "300vw"],
                  height: ["0vw", "300vw"],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 1,
                  delay: 0.3 + i * 0.1,
                  ease: "easeOut",
                }}
              />
            ))}

            {/* Estrelas streaking - reduzido para 12 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30; // Distribuição uniforme
              const distance = 60;
              return (
                <motion.div
                  key={`streak-${i}`}
                  className="absolute top-1/2 left-1/2 bg-white rounded-full"
                  style={{
                    width: "3px",
                    height: "3px",
                    boxShadow: "0 0 8px #fff",
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: Math.cos(angle * Math.PI / 180) * distance + "vw",
                    y: Math.sin(angle * Math.PI / 180) * distance + "vh",
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 + i * 0.02,
                    ease: "easeIn",
                  }}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </ThemeProvider>
  );
}
