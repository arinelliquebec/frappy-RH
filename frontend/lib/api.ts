const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api";

// Tipos
export interface User {
  id: string;
  colaborador_id?: number;
  name: string;
  email: string;
  email_empresarial?: string;
  cpf: string;
  company?: string;
  position?: string; // Cargo do colaborador
  role: string;
  has_system_user?: boolean;
  ativo?: boolean;
  filial?: string;
  data_nascimento?: string;
  created_at: string | null;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
  temp_password?: string;
}

export interface SignupData {
  name: string;
  email: string;
  cpf: string;
  password: string;
  company?: string;
  answers: Record<number, number>;
}

export interface LoginData {
  cpf: string; // Login agora é via CPF
  password: string;
  remember_me?: boolean;
}

export interface ActivateData {
  cpf: string;
  password: string;
}

export interface ActivateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface Question {
  id: number;
  text: string;
  scale_type: "frequency" | "agreement";
  scale_direction: "normal" | "inverted";
  category: string;
}

export interface SurveyResults {
  user_id: string;
  overall_score: number;
  categories: Record<string, number>;
  recommendations: string[];
  created_at: string;
}

// Helper para fazer requests
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro na requisição");
  }

  return data;
}

// Auth API
export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await fetchAPI<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.token) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await fetchAPI<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.token) {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  },

  activate: async (data: ActivateData): Promise<ActivateResponse> => {
    // Não envia token para rota de ativação (é pública)
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"
      }/auth/activate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Erro ao ativar conta");
    }
    return result;
  },

  validateCPF: async (
    cpf: string
  ): Promise<{
    success: boolean;
    valid: boolean;
    already_registered?: boolean;
    name?: string;
    message?: string;
    error?: string;
  }> => {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"
      }/auth/validate-cpf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      }
    );
    const result = await response.json();
    return result;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  },

  getUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: (): boolean => {
    return !!authAPI.getToken();
  },
};

// Perfil completo da pessoa física
export interface FullProfile {
  id: number;
  nome: string;
  email_empresarial?: string;
  email_pessoal?: string;
  codinome?: string;
  sexo?: string;
  data_nascimento?: string;
  estado_civil?: string;
  cpf?: string;
  rg?: string;
  cnh?: string;
  telefone1?: string;
  telefone2?: string;
  data_cadastro?: string;
  data_atualizacao?: string;
  tipo_pessoa?: number;
}

// User API
export const userAPI = {
  getProfile: async (): Promise<{ success: boolean; user: User }> => {
    return fetchAPI("/user/profile");
  },

  getFullProfile: async (): Promise<{
    success: boolean;
    user: User;
    profile: FullProfile;
  }> => {
    return fetchAPI("/user/profile/full");
  },

  updateProfile: async (data: {
    name?: string;
    company?: string;
  }): Promise<{ success: boolean; user: User }> => {
    return fetchAPI("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateFullProfile: async (
    data: Partial<FullProfile>
  ): Promise<{ success: boolean; profile: FullProfile; error?: string }> => {
    return fetchAPI("/user/profile/full", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// Survey API
export const surveyAPI = {
  getQuestions: async (): Promise<{
    success: boolean;
    questions: Question[];
  }> => {
    return fetchAPI("/survey/questions");
  },

  getStatus: async (): Promise<{ success: boolean; completed: boolean }> => {
    return fetchAPI("/survey/status");
  },

  submit: async (
    answers: Record<number, number>
  ): Promise<{
    success: boolean;
    message?: string;
    score?: number;
    error?: string;
  }> => {
    return fetchAPI("/survey/submit", {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  getResults: async (): Promise<{
    success: boolean;
    results: SurveyResults;
  }> => {
    return fetchAPI("/survey/results");
  },
};

// Admin Types
export interface DashboardStats {
  total_users: number;
  total_admins: number;
  recent_logs: number;
  recent_users: number;
  active_users: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  ip_address?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

export interface AuditLogsResponse extends PaginatedResponse<AuditLog> {
  logs: AuditLog[];
}

// Admin API
export const adminAPI = {
  getStats: async (): Promise<{ success: boolean; stats: DashboardStats }> => {
    return fetchAPI("/admin/stats");
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    filial?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<UsersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.role) query.set("role", params.role);
    if (params?.filial) query.set("filial", params.filial);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortOrder) query.set("sortOrder", params.sortOrder);
    return fetchAPI(`/admin/users?${query.toString()}`);
  },

  getUserById: async (
    id: string
  ): Promise<{ success: boolean; user: User; profile: FullProfile }> => {
    return fetchAPI(`/admin/users/${id}`);
  },

  getFiliais: async (): Promise<{ success: boolean; filiais: string[] }> => {
    return fetchAPI("/admin/colaboradores/filiais");
  },

  getColaboradorById: async (
    colaboradorId: number
  ): Promise<{
    success: boolean;
    profile: {
      id: number;
      cpf: string | null;
      nome: string | null;
      codinome: string | null;
      email_empresarial: string | null;
      email_pessoal: string | null;
      telefone1: string | null;
      telefone2: string | null;
      rg: string | null;
      cnh: string | null;
      sexo: string | null;
      estado_civil: string | null;
      data_nascimento: string | null;
      cargo: string | null;
      filial: string | null;
      ativo: boolean | null;
    };
  }> => {
    return fetchAPI(`/admin/colaboradores/${colaboradorId}`);
  },

  updateColaboradorProfile: async (
    colaboradorId: number,
    data: {
      nome?: string;
      codinome?: string;
      email_empresarial?: string;
      email_pessoal?: string;
      telefone1?: string;
      telefone2?: string;
      rg?: string;
      cnh?: string;
      sexo?: string;
      estado_civil?: string;
      data_nascimento?: string;
      cargo?: string;
      filial?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/admin/colaboradores/${colaboradorId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    id: string,
    data: Partial<User & { password?: string }>
  ): Promise<{ success: boolean; user: User; message: string }> => {
    return fetchAPI(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateUserRole: async (
    id: string,
    role: string
  ): Promise<{ success: boolean; user: User; message: string }> => {
    return fetchAPI(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },

  updateUserProfile: async (
    id: string,
    data: Partial<FullProfile>
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/admin/users/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  createUser: async (data: {
    name: string;
    email: string;
    cpf: string;
    password: string;
    role: "user" | "admin";
    email_pessoal?: string;
    codinome?: string;
    sexo?: string;
    data_nascimento?: string;
    estado_civil?: string;
    rg?: string;
    cnh?: string;
    telefone1?: string;
    telefone2?: string;
  }): Promise<{ success: boolean; message: string; user?: User }> => {
    return fetchAPI("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  searchColaboradores: async (
    search: string
  ): Promise<{
    success: boolean;
    colaboradores: {
      id: number;
      nome: string | null;
      cpf: string | null;
      email_empresarial: string | null;
      email_pessoal: string | null;
      codinome: string | null;
      sexo: string | null;
      data_nascimento: string | null;
      estado_civil: string | null;
      rg: string | null;
      cnh: string | null;
      telefone1: string | null;
      telefone2: string | null;
      has_system_user: boolean;
    }[];
  }> => {
    return fetchAPI(
      `/admin/colaboradores/search?search=${encodeURIComponent(search)}`
    );
  },

  resetUserPassword: async (
    id: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/admin/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  deleteUser: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    entityType?: string;
    adminId?: string;
  }): Promise<AuditLogsResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.search) query.set("search", params.search);
    if (params?.action) query.set("action", params.action);
    if (params?.entityType) query.set("entityType", params.entityType);
    if (params?.adminId) query.set("adminId", params.adminId);
    return fetchAPI(`/admin/logs?${query.toString()}`);
  },
};

// Vacation Types
export type VacationType =
  | "ferias"
  | "abono"
  | "licenca"
  | "atestado"
  | "folga"
  | "home_office";
export type VacationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled"
  | "interrupted";

export interface VacationBalance {
  id: number;
  user_id: string;
  total_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  abono_days: number;
  used_abono: number;
  period_start: string;
  period_end: string;
}

export interface VacationSettings {
  id: string;
  total_days_per_year: number;
  min_days_per_request: number;
  max_days_per_request: number;
  max_splits: number;
  min_advance_days: number;
  allow_weekend_start: boolean;
  allow_sell_vacation: boolean;
  max_sell_days: number;
  min_sell_days: number;
  allow_abono: boolean;
  max_abono_days: number;
  abono_requires_approval: boolean;
  period_months: number;
  allow_carry_over: boolean;
  max_carry_over_days: number;
  welcome_message: string;
  rules_message: string;
}

export interface Vacation {
  id: number;
  user_id: number;
  user?: User;
  type: VacationType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: VacationStatus;
  approved_by?: number;
  approver?: User;
  approved_at?: string;
  reject_reason?: string;
  notes?: string;
  created_at: string;
  // Campos de interrupção
  interrupted_at?: string;
  interrupted_by?: string;
  actual_days?: number;
  interrupt_reason?: string;
}

export interface VacationRequest {
  type: VacationType;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
}

export interface VacationStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_days_used: number;
}

export interface TeamVacation {
  user_id: number;
  user_name: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface VacationListResponse {
  vacations: Vacation[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type VacationSellStatus = "pending" | "approved" | "rejected";

export interface VacationSellRequest {
  id: string;
  user_id: string;
  user?: User;
  days_to_sell: number;
  reason?: string;
  status: VacationSellStatus;
  approved_by?: string;
  approver?: User;
  approved_at?: string;
  reject_reason?: string;
  period_year: number;
  created_at: string;
  updated_at: string;
}

// Vacation API
export const vacationAPI = {
  getBalance: async (): Promise<{
    success: boolean;
    balance: VacationBalance;
  }> => {
    return fetchAPI("/vacation/balance");
  },

  getStats: async (): Promise<{ success: boolean; stats: VacationStats }> => {
    return fetchAPI("/vacation/stats");
  },

  getMyVacations: async (params?: {
    page?: number;
    per_page?: number;
    status?: VacationStatus;
    type?: VacationType;
  }): Promise<VacationListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.per_page) query.set("per_page", params.per_page.toString());
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    return fetchAPI(`/vacation/my?${query.toString()}`);
  },

  getVacationById: async (
    id: number
  ): Promise<{ success: boolean; vacation: Vacation }> => {
    return fetchAPI(`/vacation/${id}`);
  },

  create: async (
    data: VacationRequest
  ): Promise<{ success: boolean; vacation: Vacation; message: string }> => {
    return fetchAPI("/vacation/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  cancel: async (
    id: number
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/vacation/${id}/cancel`, {
      method: "PUT",
    });
  },

  getTeamVacations: async (
    month?: number,
    year?: number
  ): Promise<{ success: boolean; vacations: TeamVacation[] }> => {
    const query = new URLSearchParams();
    if (month) query.set("month", month.toString());
    if (year) query.set("year", year.toString());
    return fetchAPI(`/vacation/team?${query.toString()}`);
  },

  // Admin/Manager functions
  getPendingApprovals: async (): Promise<{
    success: boolean;
    vacations: Vacation[];
  }> => {
    return fetchAPI("/vacation/admin/pending");
  },

  approveOrReject: async (
    id: string,
    status: "approved" | "rejected",
    rejectReason?: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/vacation/admin/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({ status, reject_reason: rejectReason }),
    });
  },

  // Admin full control
  getAllVacations: async (params?: {
    month?: number;
    year?: number;
    user_id?: string;
    status?: string;
  }): Promise<{ success: boolean; vacations: Vacation[] }> => {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", params.month.toString());
    if (params?.year) query.set("year", params.year.toString());
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.status) query.set("status", params.status);
    return fetchAPI(`/vacation/admin/all?${query.toString()}`);
  },

  getAllUsersForAdmin: async (): Promise<{
    success: boolean;
    users: { id: string; name: string; email: string; cpf: string }[];
  }> => {
    return fetchAPI("/vacation/admin/users");
  },

  adminCreate: async (data: {
    user_id: string;
    type: VacationType;
    start_date: string;
    end_date: string;
    status: VacationStatus;
    reason?: string;
    notes?: string;
  }): Promise<{ success: boolean; vacation: Vacation; message: string }> => {
    return fetchAPI("/vacation/admin/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  adminUpdate: async (
    id: string,
    data: {
      type?: VacationType;
      start_date?: string;
      end_date?: string;
      status?: VacationStatus;
      reason?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; vacation: Vacation; message: string }> => {
    return fetchAPI(`/vacation/admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  adminDelete: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/vacation/admin/${id}`, {
      method: "DELETE",
    });
  },

  interruptVacation: async (
    id: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    actual_days: number;
    days_returned: number;
  }> => {
    return fetchAPI(`/vacation/admin/${id}/interrupt`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  // Venda de férias
  createSellRequest: async (data: {
    days_to_sell: number;
    reason?: string;
  }): Promise<{ success: boolean; message: string; request: VacationSellRequest }> => {
    return fetchAPI("/vacation/sell", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getMySellRequests: async (): Promise<{
    success: boolean;
    requests: VacationSellRequest[];
  }> => {
    return fetchAPI("/vacation/sell/my");
  },

  getPendingSellRequests: async (): Promise<{
    success: boolean;
    requests: VacationSellRequest[];
  }> => {
    return fetchAPI("/vacation/admin/sell/pending");
  },

  getAllSellRequests: async (userId?: string): Promise<{
    success: boolean;
    requests: VacationSellRequest[];
  }> => {
    const query = userId ? `?user_id=${userId}` : "";
    return fetchAPI(`/vacation/admin/sell/all${query}`);
  },

  approveSellRequest: async (
    id: string,
    status: "approved" | "rejected",
    rejectReason?: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/vacation/admin/sell/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({ status, reject_reason: rejectReason }),
    });
  },

  updateSellRequest: async (
    id: string,
    daysToSell: number
  ): Promise<{ success: boolean; message: string; request: VacationSellRequest }> => {
    return fetchAPI(`/vacation/admin/sell/${id}`, {
      method: "PUT",
      body: JSON.stringify({ days_to_sell: daysToSell }),
    });
  },

  // Admin - Gerenciamento de Saldos
  admin: {
    getAllBalances: async (): Promise<{
      success: boolean;
      balances: (VacationBalance & { user_name: string; user_email: string })[];
    }> => {
      return fetchAPI("/vacation/admin/balances");
    },

    getBalance: async (userId: string): Promise<{
      success: boolean;
      balance: VacationBalance;
      user: { id: string; name: string; email: string };
    }> => {
      return fetchAPI(`/vacation/admin/balance/${userId}`);
    },

    updateBalance: async (
      userId: string,
      data: {
        total_days?: number;
        used_days?: number;
        pending_days?: number;
        available_days?: number;
        abono_days?: number;
        period_start?: string;
        period_end?: string;
      }
    ): Promise<{ success: boolean; message: string; balance: VacationBalance }> => {
      return fetchAPI(`/vacation/admin/balance/${userId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    searchUsers: async (query: string): Promise<{
      success: boolean;
      users: { id: string; name: string; email: string }[];
    }> => {
      return fetchAPI(`/vacation/admin/users/search?q=${encodeURIComponent(query)}`);
    },

    getSettings: async (): Promise<{
      success: boolean;
      settings: VacationSettings;
    }> => {
      return fetchAPI("/vacation/admin/settings");
    },

    updateSettings: async (settings: Partial<VacationSettings>): Promise<{
      success: boolean;
      message: string;
      settings: VacationSettings;
    }> => {
      return fetchAPI("/vacation/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
  },
};

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: string; // meta, feriado, evento, treinamento
  start_date: string;
  end_date: string;
  color?: string;
  all_day: boolean;
  created_by: string;
  created_by_user?: User;
  created_at: string;
}

// Calendar API
export const calendarAPI = {
  getEvents: async (
    month?: number,
    year?: number
  ): Promise<{ success: boolean; events: CalendarEvent[] }> => {
    const query = new URLSearchParams();
    if (month) query.set("month", month.toString());
    if (year) query.set("year", year.toString());
    return fetchAPI(`/calendar/events?${query.toString()}`);
  },

  create: async (data: {
    title: string;
    description?: string;
    type: string;
    start_date: string;
    end_date: string;
    color?: string;
    all_day?: boolean;
  }): Promise<{ success: boolean; event: CalendarEvent; message: string }> => {
    return fetchAPI("/calendar/admin/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      type?: string;
      start_date?: string;
      end_date?: string;
      color?: string;
      all_day?: boolean;
    }
  ): Promise<{ success: boolean; event: CalendarEvent; message: string }> => {
    return fetchAPI(`/calendar/admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/calendar/admin/${id}`, {
      method: "DELETE",
    });
  },
};

// Document Types
export type DocumentStatus = "pending" | "approved" | "rejected";

export interface Document {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  type: string;
  mime_type: string;
  size: number;
  path: string;
  description?: string;
  status: DocumentStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  created_at: string;
  user?: User;
}

export interface DocumentType {
  value: string;
  label: string;
}

// Documents API
export const documentsAPI = {
  getMyDocuments: async (): Promise<{
    success: boolean;
    documents: Document[];
  }> => {
    return fetchAPI("/documents");
  },

  getTypes: async (): Promise<{ success: boolean; types: DocumentType[] }> => {
    return fetchAPI("/documents/types");
  },

  upload: async (
    file: File,
    type: string,
    description?: string
  ): Promise<{ success: boolean; document: Document; message: string }> => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (description) {
      formData.append("description", description);
    }

    const response = await fetch(`${API_URL}/documents`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Erro ao fazer upload");
    }
    return data;
  },

  download: async (id: string, filename: string): Promise<void> => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await fetch(`${API_URL}/documents/${id}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao baixar documento");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  delete: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/documents/${id}`, {
      method: "DELETE",
    });
  },

  // Admin endpoints
  admin: {
    getAll: async (params?: {
      status?: DocumentStatus;
      user_id?: string;
    }): Promise<{ success: boolean; documents: Document[] }> => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.user_id) query.set("user_id", params.user_id);
      return fetchAPI(`/documents/admin?${query.toString()}`);
    },

    getPending: async (): Promise<{
      success: boolean;
      documents: Document[];
    }> => {
      return fetchAPI("/documents/admin/pending");
    },

    getStats: async (): Promise<{
      success: boolean;
      stats: {
        pending: number;
        approved: number;
        rejected: number;
        total: number;
      };
    }> => {
      return fetchAPI("/documents/admin/stats");
    },

    approve: async (
      id: string
    ): Promise<{ success: boolean; message: string; document: Document }> => {
      return fetchAPI(`/documents/admin/${id}/approve`, {
        method: "PUT",
      });
    },

    reject: async (
      id: string,
      reason?: string
    ): Promise<{ success: boolean; message: string; document: Document }> => {
      return fetchAPI(`/documents/admin/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
    },

    download: async (id: string, filename: string): Promise<void> => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const response = await fetch(
        `${API_URL}/documents/admin/${id}/download`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao baixar documento");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },

    delete: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/documents/admin/${id}`, {
        method: "DELETE",
      });
    },
  },
};

// Types para News
export type NewsCategory =
  | "geral"
  | "rh"
  | "beneficios"
  | "eventos"
  | "treinamento"
  | "urgente";
export type NewsPriority = "normal" | "high" | "urgent";

export interface News {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: NewsCategory;
  priority: NewsPriority;
  image_url: string;
  author_name: string;
  filial: string;
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  pinned: boolean;
  view_count: number;
  viewed?: boolean;
  reactions?: Record<string, number>;
  user_reaction?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsStats {
  total_news: number;
  published: number;
  drafts: number;
  total_views: number;
  total_reactions: number;
  top_news: News[];
}

// News API
export const newsAPI = {
  // Listar notícias publicadas
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: NewsCategory;
  }): Promise<{
    success: boolean;
    news: News[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.category) query.set("category", params.category);
    return fetchAPI(`/news?${query.toString()}`);
  },

  // Obter notícia específica
  getById: async (id: string): Promise<{ success: boolean; news: News }> => {
    return fetchAPI(`/news/${id}`);
  },

  // Reagir a uma notícia
  react: async (
    id: string,
    reaction: string
  ): Promise<{
    success: boolean;
    reactions: Record<string, number>;
    user_reaction: string;
  }> => {
    return fetchAPI(`/news/${id}/react`, {
      method: "POST",
      body: JSON.stringify({ reaction }),
    });
  },

  // Admin endpoints
  admin: {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      status?: "published" | "draft" | "expired";
      category?: NewsCategory;
    }): Promise<{
      success: boolean;
      news: News[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }> => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.status) query.set("status", params.status);
      if (params?.category) query.set("category", params.category);
      return fetchAPI(`/news/admin?${query.toString()}`);
    },

    getStats: async (): Promise<{ success: boolean; stats: NewsStats }> => {
      return fetchAPI("/news/admin/stats");
    },

    create: async (data: {
      title: string;
      summary?: string;
      content: string;
      category?: NewsCategory;
      priority?: NewsPriority;
      image_url?: string;
      filial?: string;
      published?: boolean;
      pinned?: boolean;
      expires_at?: string;
    }): Promise<{ success: boolean; news: News }> => {
      return fetchAPI("/news/admin", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update: async (
      id: string,
      data: {
        title?: string;
        summary?: string;
        content?: string;
        category?: NewsCategory;
        priority?: NewsPriority;
        image_url?: string;
        filial?: string;
        published?: boolean;
        pinned?: boolean;
        expires_at?: string;
      }
    ): Promise<{ success: boolean; news: News }> => {
      return fetchAPI(`/news/admin/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    publish: async (
      id: string,
      published: boolean
    ): Promise<{ success: boolean; news: News }> => {
      return fetchAPI(`/news/admin/${id}/publish`, {
        method: "PUT",
        body: JSON.stringify({ published }),
      });
    },

    delete: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/news/admin/${id}`, {
        method: "DELETE",
      });
    },
  },
};

// Types para Notifications
export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "vacation"
  | "document"
  | "news"
  | "system";
export type NotificationCategory =
  | "general"
  | "vacation"
  | "document"
  | "news"
  | "approval"
  | "reminder"
  | "alert";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link: string;
  icon: string;
  read: boolean;
  read_at: string | null;
  archived: boolean;
  expires_at: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  vacation_notifications: boolean;
  document_notifications: boolean;
  news_notifications: boolean;
  reminder_notifications: boolean;
}

// Notifications API
export const notificationsAPI = {
  // Listar minhas notificações
  getAll: async (params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
    category?: NotificationCategory;
  }): Promise<{
    success: boolean;
    notifications: AppNotification[];
    unread_count: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.unread) query.set("unread", "true");
    if (params?.category) query.set("category", params.category);
    return fetchAPI(`/notifications?${query.toString()}`);
  },

  // Obter contagem de não lidas
  getUnreadCount: async (): Promise<{ success: boolean; count: number }> => {
    return fetchAPI("/notifications/count");
  },

  // Marcar como lida
  markAsRead: async (
    id: string
  ): Promise<{ success: boolean; notification: AppNotification }> => {
    return fetchAPI(`/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  // Marcar todas como lidas
  markAllAsRead: async (): Promise<{
    success: boolean;
    message: string;
    affected: number;
  }> => {
    return fetchAPI("/notifications/read-all", {
      method: "PUT",
    });
  },

  // Arquivar notificação
  archive: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/notifications/${id}/archive`, {
      method: "PUT",
    });
  },

  // Deletar notificação
  delete: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/notifications/${id}`, {
      method: "DELETE",
    });
  },

  // Obter preferências
  getPreferences: async (): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> => {
    return fetchAPI("/notifications/preferences");
  },

  // Atualizar preferências
  updatePreferences: async (
    data: Partial<Omit<NotificationPreferences, "id" | "user_id">>
  ): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> => {
    return fetchAPI("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Admin endpoints
  admin: {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      user_id?: string;
    }): Promise<{
      success: boolean;
      notifications: AppNotification[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }> => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.user_id) query.set("user_id", params.user_id);
      return fetchAPI(`/notifications/admin?${query.toString()}`);
    },

    create: async (data: {
      user_ids?: string[];
      all_users?: boolean;
      title: string;
      message: string;
      type?: NotificationType;
      category?: NotificationCategory;
      link?: string;
      icon?: string;
    }): Promise<{ success: boolean; message: string; created: number }> => {
      return fetchAPI("/notifications/admin", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    delete: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/notifications/admin/${id}`, {
        method: "DELETE",
      });
    },
  },
};

// Analytics API Types
export interface PeopleAnalyticsMetrics {
  headcount: {
    total: number;
    users: number;
    admins: number;
    por_filial: Array<{ filial: string; count: number }>;
    por_cargo: Array<{ cargo: string; count: number }>;
  };
  turnover: {
    count: number;
    rate: number;
    by_month: Array<{ month: string; count: number; rate: number }>;
  };
  retention: {
    rate: number;
  };
  tenure: {
    average_months: number;
    distribution: Array<{ range: string; count: number }>;
  };
  hiring: {
    new_hires_year: number;
    by_month: Array<{ month: string; count: number }>;
  };
  demographics: {
    genero: { masculino: number; feminino: number; nao_identificado: number };
    faixa_etaria: Array<{ faixa: string; count: number }>;
  };
}

export interface EngagementMetrics {
  users: {
    total: number;
    active_7d: number;
    active_30d: number;
    engagement_rate_7d: number;
    engagement_rate_30d: number;
  };
  news: {
    total_views: number;
    total_reactions: number;
    recent_views: number;
    recent_reactions: number;
    top_news: Array<{
      id: string;
      title: string;
      view_count: number;
      reactions: number;
      engagement: number;
    }>;
    by_category: Array<{
      category: string;
      views: number;
      reactions: number;
      score: number;
    }>;
  };
  activity: {
    vacation_requests_30d: number;
    documents_uploaded_30d: number;
    notifications_sent_30d: number;
    notifications_read_rate: number;
    by_day_of_week: Array<{ day: string; count: number }>;
    by_hour: Array<{ hour: number; count: number }>;
  };
}

// Analytics API
export const analyticsAPI = {
  getOverview: async (): Promise<{
    success: boolean;
    overview: {
      headcount: { colaboradores: number; usuarios: number };
      pendencias: { ferias: number; documentos: number };
      comunicados: { ativos: number };
      notificacoes: { nao_lidas: number };
      atividade_recente: {
        novos_usuarios: number;
        novas_ferias: number;
        novos_documentos: number;
      };
      top_filiais: Array<{ filial: string; count: number }>;
    };
  }> => {
    return fetchAPI("/analytics/overview");
  },

  getPeople: async (): Promise<{
    success: boolean;
    metrics: PeopleAnalyticsMetrics;
  }> => {
    return fetchAPI("/analytics/people");
  },

  getEngagement: async (): Promise<{
    success: boolean;
    metrics: EngagementMetrics;
  }> => {
    return fetchAPI("/analytics/engagement");
  },

  getHR: async (): Promise<{
    success: boolean;
    metrics: {
      headcount: {
        total: number;
        users: number;
        admins: number;
        por_filial: Array<{ filial: string; count: number }>;
        por_cargo: Array<{ cargo: string; count: number }>;
      };
      demographics: {
        genero: {
          masculino: number;
          feminino: number;
          nao_identificado: number;
        };
        faixa_etaria: Array<{ faixa: string; count: number }>;
      };
    };
  }> => {
    return fetchAPI("/analytics/hr");
  },

  getVacation: async (): Promise<{
    success: boolean;
    metrics: {
      total: number;
      aprovadas: number;
      pendentes: number;
      media_dias: number;
      por_mes: Array<{ mes: string; count: number }>;
      por_tipo: Array<{ type: string; count: number }>;
    };
  }> => {
    return fetchAPI("/analytics/vacation");
  },

  getDocuments: async (): Promise<{
    success: boolean;
    metrics: {
      total: number;
      aprovados: number;
      pendentes: number;
      rejeitados: number;
      por_tipo: Array<{ type: string; count: number }>;
      por_mes: Array<{ month: string; count: number }>;
    };
  }> => {
    return fetchAPI("/analytics/documents");
  },

  getNews: async (): Promise<{
    success: boolean;
    metrics: {
      total: number;
      publicados: number;
      total_views: number;
      total_reacoes: number;
      por_categoria: Array<{ category: string; count: number }>;
      top_news: Array<{ id: string; title: string; view_count: number }>;
    };
  }> => {
    return fetchAPI("/analytics/news");
  },
};

// ==================== E-LEARNING ====================

export type LessonType = "video" | "text" | "pdf" | "quiz" | "download" | "link";
export type CourseLevel = "iniciante" | "intermediario" | "avancado";

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  intro_video_url?: string;
  category: string;
  level: CourseLevel;
  duration: number;
  published: boolean;
  featured: boolean;
  requirements: string;
  target_audience: string;
  instructor_id: string;
  instructor_name: string;
  enrollment_count: number;
  rating: number;
  rating_count: number;
  modules?: Module[];
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  type: LessonType;
  content: string;
  video_url: string;
  duration: number;
  order: number;
  is_free: boolean;
  quiz_id?: string;
  quiz?: Quiz;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  passing_score: number;
  time_limit: number;
  attempts_allowed: number;
  shuffle_questions: boolean;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  type: "multiple" | "single" | "true_false" | "text";
  text: string;
  explanation: string;
  points: number;
  order: number;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_at?: string;
  last_accessed_at?: string;
  user_rating?: number;
  user_review?: string;
  user?: User;
  course?: Course;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
  time_spent: number;
  video_time: number;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_no: string;
  issued_at: string;
  valid_until?: string;
  user?: User;
  course?: Course;
}

export interface LearningStats {
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  total_lessons: number;
  total_quizzes: number;
  average_rating: number;
  certificates_issued: number;
}

export const learningAPI = {
  // Colaborador
  getCourses: async (params?: {
    category?: string;
    level?: string;
    search?: string;
    featured?: boolean;
  }): Promise<{ success: boolean; courses: Course[] }> => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.level) query.set("level", params.level);
    if (params?.search) query.set("search", params.search);
    if (params?.featured) query.set("featured", "true");
    return fetchAPI(`/learning/courses?${query.toString()}`);
  },

  getCourseById: async (
    id: string
  ): Promise<{
    success: boolean;
    course: Course;
    enrolled: boolean;
    enrollment?: Enrollment;
  }> => {
    return fetchAPI(`/learning/courses/${id}`);
  },

  enrollInCourse: async (
    courseId: string
  ): Promise<{
    success: boolean;
    message: string;
    enrollment: Enrollment;
  }> => {
    return fetchAPI(`/learning/courses/${courseId}/enroll`, { method: "POST" });
  },

  getMyEnrollments: async (): Promise<{
    success: boolean;
    enrollments: Enrollment[];
  }> => {
    return fetchAPI("/learning/enrollments");
  },

  getLessonContent: async (
    lessonId: string
  ): Promise<{
    success: boolean;
    lesson: Lesson;
    progress: LessonProgress;
  }> => {
    return fetchAPI(`/learning/lessons/${lessonId}`);
  },

  updateLessonProgress: async (
    lessonId: string,
    data: { completed?: boolean; video_time?: number; time_spent?: number }
  ): Promise<{ success: boolean; progress: LessonProgress }> => {
    return fetchAPI(`/learning/lessons/${lessonId}/progress`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  submitQuiz: async (
    quizId: string,
    answers: Record<string, string[]>
  ): Promise<{
    success: boolean;
    score: number;
    passed: boolean;
    total_points: number;
    earned_points: number;
  }> => {
    return fetchAPI(`/learning/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  getMyCertificates: async (): Promise<{
    success: boolean;
    certificates: Certificate[];
  }> => {
    return fetchAPI("/learning/certificates");
  },

  generateCertificate: async (
    courseId: string
  ): Promise<{
    success: boolean;
    certificate: Certificate;
  }> => {
    return fetchAPI(`/learning/courses/${courseId}/certificate`, {
      method: "POST",
    });
  },

  rateCourse: async (
    courseId: string,
    rating: number,
    review?: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/learning/courses/${courseId}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, review }),
    });
  },

  // Admin
  admin: {
    getStats: async (): Promise<{
      success: boolean;
      stats: LearningStats;
      top_courses: Course[];
      recent_enrollments: Enrollment[];
    }> => {
      return fetchAPI("/learning/admin/stats");
    },

    getAllCourses: async (): Promise<{
      success: boolean;
      courses: Course[];
    }> => {
      return fetchAPI("/learning/admin/courses");
    },

    getCourseDetails: async (
      id: string
    ): Promise<{
      success: boolean;
      course: Course;
      enrollment_count: number;
      completed_count: number;
      enrollments: Enrollment[];
    }> => {
      return fetchAPI(`/learning/admin/courses/${id}`);
    },

    createCourse: async (
      data: Partial<Course>
    ): Promise<{
      success: boolean;
      course: Course;
      message: string;
    }> => {
      return fetchAPI("/learning/admin/courses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateCourse: async (
      id: string,
      data: Partial<Course>
    ): Promise<{
      success: boolean;
      course: Course;
      message: string;
    }> => {
      return fetchAPI(`/learning/admin/courses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    deleteCourse: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/learning/admin/courses/${id}`, { method: "DELETE" });
    },

    createModule: async (
      courseId: string,
      data: Partial<Module>
    ): Promise<{ success: boolean; module: Module; message: string }> => {
      return fetchAPI(`/learning/admin/courses/${courseId}/modules`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateModule: async (
      moduleId: string,
      data: Partial<Module>
    ): Promise<{ success: boolean; module: Module; message: string }> => {
      return fetchAPI(`/learning/admin/modules/${moduleId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    deleteModule: async (
      moduleId: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/learning/admin/modules/${moduleId}`, {
        method: "DELETE",
      });
    },

    createLesson: async (
      moduleId: string,
      data: Partial<Lesson>
    ): Promise<{ success: boolean; lesson: Lesson; message: string }> => {
      return fetchAPI(`/learning/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateLesson: async (
      lessonId: string,
      data: Partial<Lesson>
    ): Promise<{ success: boolean; lesson: Lesson; message: string }> => {
      return fetchAPI(`/learning/admin/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    deleteLesson: async (
      lessonId: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/learning/admin/lessons/${lessonId}`, {
        method: "DELETE",
      });
    },

    uploadImage: async (
      file: File,
      onProgress?: (progress: number) => void
    ): Promise<{
      success: boolean;
      image_url: string;
      filename: string;
      size: number;
      message: string;
    }> => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const formData = new FormData();
      formData.append("image", file);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.message || "Erro ao fazer upload"));
            }
          } catch {
            reject(new Error("Erro ao processar resposta"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Erro de rede ao fazer upload"));
        });

        xhr.open("POST", `${API_URL}/learning/admin/upload/image`);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    },

    uploadVideo: async (
      file: File,
      onProgress?: (progress: number) => void
    ): Promise<{
      success: boolean;
      video_url: string;
      filename: string;
      size: number;
      message: string;
    }> => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const formData = new FormData();
      formData.append("video", file);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Timeout de 30 minutos para uploads grandes
        xhr.timeout = 30 * 60 * 1000;

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.message || "Erro ao fazer upload"));
            }
          } catch {
            reject(new Error("Erro ao processar resposta"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(
            new Error("Erro de rede ao fazer upload. Verifique sua conexão.")
          );
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload demorou muito. Tente um arquivo menor."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelado."));
        });

        xhr.open("POST", `${API_URL}/learning/admin/upload/video`);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    },

    createQuiz: async (
      data: Partial<Quiz>
    ): Promise<{
      success: boolean;
      quiz: Quiz;
      message: string;
    }> => {
      return fetchAPI("/learning/admin/quizzes", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateQuiz: async (
      quizId: string,
      data: Partial<Quiz>
    ): Promise<{ success: boolean; quiz: Quiz; message: string }> => {
      return fetchAPI(`/learning/admin/quizzes/${quizId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    addQuestion: async (
      quizId: string,
      data: {
        type: string;
        text: string;
        explanation?: string;
        points?: number;
        options: Array<{ text: string; is_correct: boolean }>;
      }
    ): Promise<{
      success: boolean;
      question: QuizQuestion;
      message: string;
    }> => {
      return fetchAPI(`/learning/admin/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};

// ==================== HOLERITE/CONTRACHEQUE ====================

export interface PayslipItem {
  id: string;
  payslip_id: string;
  type: "earning" | "deduction";
  code: string;
  description: string;
  reference: number;
  amount: number;
}

export interface Payslip {
  id: string;
  user_id: string;
  colaborador_id: number;
  employee_name: string;
  employee_cpf: string;
  position: string;
  department: string;
  branch: string;
  admission_date: string | null;
  reference_month: number;
  reference_year: number;
  payment_date: string | null;
  payslip_type: string;
  gross_total: number;
  deduction_total: number;
  net_total: number;
  inss_base: number;
  irrf_base: number;
  fgts_base: number;
  fgts_amount: number;
  worked_days: number;
  base_salary: number;
  status: string;
  items?: PayslipItem[];
  created_at: string;
}

export interface PayslipSummary {
  id: string;
  reference_month: number;
  reference_year: number;
  payslip_type: string;
  gross_total: number;
  deduction_total: number;
  net_total: number;
  payment_date: string | null;
  status: string;
}

export const payslipAPI = {
  // Colaborador
  getMyPayslips: async (
    year?: number
  ): Promise<{
    success: boolean;
    payslips: PayslipSummary[];
    years: number[];
  }> => {
    const query = new URLSearchParams();
    if (year) query.set("year", year.toString());
    return fetchAPI(`/payslip?${query.toString()}`);
  },

  getPayslipById: async (
    id: string
  ): Promise<{
    success: boolean;
    payslip: Payslip;
    earnings: PayslipItem[];
    deductions: PayslipItem[];
  }> => {
    return fetchAPI(`/payslip/${id}`);
  },

  // Admin
  admin: {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      year?: number;
      month?: number;
      colaborador_id?: string;
      search?: string;
    }): Promise<{
      success: boolean;
      payslips: Payslip[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }> => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.year) query.set("year", params.year.toString());
      if (params?.month) query.set("month", params.month.toString());
      if (params?.colaborador_id)
        query.set("colaborador_id", params.colaborador_id);
      if (params?.search) query.set("search", params.search);
      return fetchAPI(`/payslip/admin?${query.toString()}`);
    },

    getStats: async (
      year?: number
    ): Promise<{
      success: boolean;
      stats: {
        year: number;
        total_payslips: number;
        total_gross: number;
        total_deductions: number;
        total_net: number;
        by_month: { month: number; count: number; total: number }[];
      };
      years: number[];
    }> => {
      const query = new URLSearchParams();
      if (year) query.set("year", year.toString());
      return fetchAPI(`/payslip/admin/stats?${query.toString()}`);
    },

    create: async (
      data: Partial<Payslip> & { items?: Partial<PayslipItem>[] }
    ): Promise<{
      success: boolean;
      payslip: Payslip;
      message: string;
    }> => {
      return fetchAPI("/payslip/admin", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    import: async (
      payslips: Array<Partial<Payslip> & { items?: Partial<PayslipItem>[] }>
    ): Promise<{
      success: boolean;
      message: string;
      created: number;
      errors: string[];
    }> => {
      return fetchAPI("/payslip/admin/import", {
        method: "POST",
        body: JSON.stringify({ payslips }),
      });
    },

    delete: async (
      id: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/payslip/admin/${id}`, { method: "DELETE" });
    },
  },
};

export const PAYSLIP_TYPES = [
  { value: "mensal", label: "Mensal" },
  { value: "13_primeira", label: "13º - 1ª Parcela" },
  { value: "13_segunda", label: "13º - 2ª Parcela" },
  { value: "ferias", label: "Férias" },
  { value: "rescisao", label: "Rescisão" },
  { value: "adiantamento", label: "Adiantamento" },
];

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// ==================== PDI (PLANO DE DESENVOLVIMENTO INDIVIDUAL) ====================

export type PDIStatus =
  | "draft"
  | "pending"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";
export type GoalStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type GoalPriority = "low" | "medium" | "high";
export type ActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface PDIAction {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  action_type: string;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  resource_url: string;
  resource_name: string;
  notes: string;
  evidence: string;
  created_at: string;
}

export interface PDIGoal {
  id: string;
  pdi_id: string;
  title: string;
  description: string;
  category: string;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  due_date: string | null;
  completed_at: string | null;
  success_criteria: string;
  actions: PDIAction[];
  created_at: string;
}

export interface PDICheckin {
  id: string;
  pdi_id: string;
  author_id: string;
  author?: User;
  checkin_date: string;
  checkin_type: string;
  progress: string;
  challenges: string;
  next_steps: string;
  manager_notes: string;
  created_at: string;
}

export interface PDI {
  id: string;
  user_id: string;
  user?: User;
  manager_id: string | null;
  manager?: User;
  title: string;
  description: string;
  period_start: string;
  period_end: string;
  status: PDIStatus;
  overall_progress: number;
  manager_feedback: string;
  employee_feedback: string;
  approved_at: string | null;
  completed_at: string | null;
  goals: PDIGoal[];
  checkins: PDICheckin[];
  created_at: string;
}

export interface PDISummary {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: PDIStatus;
  overall_progress: number;
  goals_count: number;
  goals_completed: number;
  user_name?: string;
  manager_name?: string;
}

export const pdiAPI = {
  // Colaborador
  getMyPDIs: async (params?: {
    status?: string;
    year?: number;
  }): Promise<{ success: boolean; pdis: PDISummary[]; years: number[] }> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.year) query.set("year", params.year.toString());
    return fetchAPI(`/pdi?${query.toString()}`);
  },

  getPDIById: async (id: string): Promise<{ success: boolean; pdi: PDI }> => {
    return fetchAPI(`/pdi/${id}`);
  },

  create: async (data: {
    title: string;
    description?: string;
    period_start: string;
    period_end: string;
    manager_id?: string;
  }): Promise<{ success: boolean; pdi: PDI; message: string }> => {
    return fetchAPI("/pdi", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      period_start?: string;
      period_end?: string;
      employee_feedback?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  submit: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/${id}/submit`, { method: "PUT" });
  },

  // Metas
  addGoal: async (
    pdiId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      priority?: GoalPriority;
      due_date?: string;
      success_criteria?: string;
    }
  ): Promise<{ success: boolean; goal: PDIGoal; message: string }> => {
    return fetchAPI(`/pdi/${pdiId}/goals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateGoal: async (
    goalId: string,
    data: Partial<PDIGoal>
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/goals/${goalId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteGoal: async (
    goalId: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/goals/${goalId}`, { method: "DELETE" });
  },

  // Ações
  addAction: async (
    goalId: string,
    data: {
      title: string;
      description?: string;
      action_type?: string;
      due_date?: string;
      resource_url?: string;
      resource_name?: string;
    }
  ): Promise<{ success: boolean; action: PDIAction; message: string }> => {
    return fetchAPI(`/pdi/goals/${goalId}/actions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateAction: async (
    actionId: string,
    data: Partial<PDIAction>
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/actions/${actionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteAction: async (
    actionId: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/pdi/actions/${actionId}`, { method: "DELETE" });
  },

  // Check-ins
  addCheckin: async (
    pdiId: string,
    data: {
      progress: string;
      challenges: string;
      next_steps: string;
      checkin_type?: string;
    }
  ): Promise<{ success: boolean; checkin: PDICheckin; message: string }> => {
    return fetchAPI(`/pdi/${pdiId}/checkin`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Gestor
  manager: {
    getTeamPDIs: async (params?: {
      status?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      success: boolean;
      pdis: PDISummary[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }> => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      return fetchAPI(`/pdi/manager/team?${query.toString()}`);
    },

    getPDIById: async (id: string): Promise<{ success: boolean; pdi: PDI }> => {
      return fetchAPI(`/pdi/manager/${id}`);
    },

    approve: async (
      id: string,
      feedback?: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/pdi/manager/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ feedback }),
      });
    },

    reject: async (
      id: string,
      feedback?: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchAPI(`/pdi/manager/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ feedback }),
      });
    },

    addCheckin: async (
      pdiId: string,
      data: {
        progress?: string;
        challenges?: string;
        next_steps?: string;
        manager_notes?: string;
      }
    ): Promise<{ success: boolean; checkin: PDICheckin; message: string }> => {
      return fetchAPI(`/pdi/manager/${pdiId}/checkin`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  // Admin
  admin: {
    getAll: async (params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      success: boolean;
      pdis: PDISummary[];
      stats: {
        total: number;
        draft: number;
        pending: number;
        approved: number;
        in_progress: number;
        completed: number;
      };
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      };
    }> => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.search) query.set("search", params.search);
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      return fetchAPI(`/pdi/admin?${query.toString()}`);
    },
  },
};

export const PDI_STATUSES = [
  { value: "draft", label: "Rascunho", color: "#6B7280" },
  { value: "pending", label: "Aguardando Aprovação", color: "#F59E0B" },
  { value: "approved", label: "Aprovado", color: "#10B981" },
  { value: "in_progress", label: "Em Andamento", color: "#3B82F6" },
  { value: "completed", label: "Concluído", color: "#8B5CF6" },
  { value: "cancelled", label: "Cancelado", color: "#EF4444" },
];

export const GOAL_PRIORITIES = [
  { value: "high", label: "Alta", color: "#EF4444" },
  { value: "medium", label: "Média", color: "#F59E0B" },
  { value: "low", label: "Baixa", color: "#10B981" },
];

export const GOAL_CATEGORIES = [
  "Técnica",
  "Comportamental",
  "Liderança",
  "Comunicação",
  "Gestão de Tempo",
  "Criatividade",
  "Trabalho em Equipe",
  "Análise de Dados",
  "Idiomas",
  "Certificações",
];

export const ACTION_TYPES = [
  { value: "curso", label: "Curso Online" },
  { value: "livro", label: "Livro" },
  { value: "mentoria", label: "Mentoria" },
  { value: "projeto", label: "Projeto Prático" },
  { value: "workshop", label: "Workshop" },
  { value: "certificacao", label: "Certificação" },
  { value: "treinamento", label: "Treinamento Interno" },
  { value: "evento", label: "Evento/Conferência" },
  { value: "outro", label: "Outro" },
];

export const COURSE_CATEGORIES = [
  "Desenvolvimento Pessoal",
  "Liderança",
  "Tecnologia",
  "Compliance",
  "Segurança do Trabalho",
  "Qualidade",
  "Vendas",
  "Atendimento ao Cliente",
  "Processos",
  "Onboarding",
];

export const COURSE_LEVELS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

// ==================== PORTAL DO COLABORADOR ====================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  criteria: string;
  points: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge: Badge;
  earned_at: string;
}

export interface CareerEvent {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string;
  event_date: string;
  icon: string;
  color: string;
  metadata?: string;
  created_at: string;
}

export interface Birthday {
  id: string;
  name: string;
  position: string;
  department: string;
  avatar_url: string;
  day: number;
  is_today: boolean;
}

export interface NewEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  avatar_url: string;
  hire_date: string;
  days_ago: number;
}

export interface PortalDashboard {
  user: {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    avatar_url: string;
    hire_date: string;
    birth_date: string;
    bio: string;
  };
  stats: {
    tempo_de_casa: number;
    ferias_disponiveis: number;
    cursos_concluidos: number;
    certificados: number;
    badges: number;
    pontos_totais: number;
  };
  badges: UserBadge[];
  career_events: CareerEvent[];
}

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  department: string;
  avatar_url: string;
}

export const portalAPI = {
  getDashboard: async (): Promise<{ success: boolean; dashboard: PortalDashboard }> => {
    return fetchAPI("/portal/dashboard");
  },

  getBirthdays: async (): Promise<{ success: boolean; month: number; birthdays: Birthday[] }> => {
    return fetchAPI("/portal/birthdays");
  },

  getNewEmployees: async (): Promise<{ success: boolean; new_employees: NewEmployee[] }> => {
    return fetchAPI("/portal/new-employees");
  },

  getBadges: async (): Promise<{
    success: boolean;
    earned_badges: UserBadge[];
    locked_badges: Badge[];
    total_earned: number;
    total_available: number;
  }> => {
    return fetchAPI("/portal/badges");
  },

  getAllBadges: async (): Promise<{ success: boolean; badges: Badge[] }> => {
    return fetchAPI("/portal/badges/all");
  },

  getTimeline: async (): Promise<{ success: boolean; events: CareerEvent[] }> => {
    return fetchAPI("/portal/timeline");
  },

  getTeam: async (): Promise<{ success: boolean; department: string; team_members: TeamMember[] }> => {
    return fetchAPI("/portal/team");
  },

  updateProfile: async (data: {
    phone?: string;
    bio?: string;
    avatar_url?: string;
  }): Promise<{ success: boolean; user: User }> => {
    return fetchAPI("/portal/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  admin: {
    createBadge: async (data: Partial<Badge>): Promise<{ success: boolean; badge: Badge }> => {
      return fetchAPI("/portal/admin/badges", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    awardBadge: async (userId: string, badgeId: string): Promise<{ success: boolean; user_badge: UserBadge }> => {
      return fetchAPI("/portal/admin/badges/award", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, badge_id: badgeId }),
      });
    },

    addCareerEvent: async (data: {
      user_id: string;
      event_type: string;
      title: string;
      description: string;
      event_date: string;
      icon?: string;
      color?: string;
    }): Promise<{ success: boolean; event: CareerEvent }> => {
      return fetchAPI("/portal/admin/timeline", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};

// ==================== CHAT IA (Azure OpenAI) ====================

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  context: string;
  is_active: boolean;
  messages?: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  message: string;
  session_id: string;
  tokens?: number;
}

export interface QuickAction {
  label: string;
  query: string;
  icon?: string;
}

export interface ChatSuggestion {
  title: string;
  description?: string;
  actions: QuickAction[];
}

export type ChatContext = "general" | "vacation" | "learning" | "pdi" | "payslip";

export const chatAPI = {
  // Enviar mensagem (resposta completa)
  sendMessage: async (
    message: string,
    sessionId?: string,
    context?: ChatContext
  ): Promise<ChatResponse> => {
    return fetchAPI("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: sessionId,
        context: context || "general",
      }),
    });
  },

  // Enviar mensagem com streaming (SSE)
  sendMessageStream: async (
    message: string,
    sessionId?: string,
    context?: ChatContext,
    onChunk?: (content: string) => void,
    onComplete?: (fullMessage: string, newSessionId: string) => void,
    onError?: (error: string) => void
  ): Promise<void> => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api"}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            context: context || "general",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar mensagem");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = "";
      let newSessionId = sessionId || "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                if (onComplete) onComplete(fullMessage, newSessionId);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.session_id) {
                  newSessionId = parsed.session_id;
                }
                if (parsed.content) {
                  fullMessage += parsed.content;
                  if (onChunk) onChunk(parsed.content);
                }
                if (parsed.error) {
                  if (onError) onError(parsed.error);
                }
              } catch {
                // Ignora linhas mal formatadas
              }
            }
          }
        }
      }

      if (onComplete) onComplete(fullMessage, newSessionId);
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }
  },

  // Obter sessões de chat
  getSessions: async (): Promise<{ success: boolean; sessions: ChatSession[] }> => {
    const sessions = await fetchAPI<ChatSession[]>("/chat/sessions");
    return { success: true, sessions };
  },

  // Obter histórico de uma sessão
  getHistory: async (
    sessionId: string
  ): Promise<{
    success: boolean;
    session: {
      id: string;
      title: string;
      context: string;
      messages: ChatMessage[];
      created_at: string;
    };
  }> => {
    const session = await fetchAPI<{
      id: string;
      title: string;
      context: string;
      messages: ChatMessage[];
      created_at: string;
    }>(`/chat/sessions/${sessionId}`);
    return { success: true, session };
  },

  // Deletar sessão
  deleteSession: async (
    sessionId: string
  ): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  // Obter sugestões contextuais
  getSuggestions: async (
    context?: ChatContext
  ): Promise<{ success: boolean; suggestions: ChatSuggestion[] }> => {
    const query = context ? `?context=${context}` : "";
    const suggestions = await fetchAPI<ChatSuggestion[]>(`/chat/suggestions${query}`);
    return { success: true, suggestions };
  },
};

export default {
  auth: authAPI,
  user: userAPI,
  survey: surveyAPI,
  admin: adminAPI,
  vacation: vacationAPI,
  calendar: calendarAPI,
  documents: documentsAPI,
  news: newsAPI,
  notifications: notificationsAPI,
  analytics: analyticsAPI,
  learning: learningAPI,
  payslip: payslipAPI,
  pdi: pdiAPI,
  portal: portalAPI,
  chat: chatAPI,
};
