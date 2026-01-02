import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
  ME_QUERY,
  VALIDATE_CPF_QUERY,
  GET_USERS_QUERY,
  GET_USER_QUERY,
  GET_COLABORADORES_QUERY,
  GET_COLABORADOR_QUERY,
  SEARCH_COLABORADORES_QUERY,
  GET_FILIAIS_QUERY,
  GET_FULL_PROFILE_QUERY,
  GET_COLABORADOR_PROFILE_QUERY,
  GET_MY_DOCUMENTS_QUERY,
  GET_DOCUMENTS_QUERY,
  GET_DOCUMENT_STATS_QUERY,
  GET_MY_VACATIONS_QUERY,
  GET_MY_VACATION_BALANCE_QUERY,
  GET_VACATIONS_QUERY,
  GET_VACATION_STATS_QUERY,
  GET_TEAM_VACATIONS_QUERY,
  GET_CALENDAR_EVENTS_QUERY,
  GET_SURVEY_QUESTIONS_QUERY,
  GET_MY_SURVEY_RESULTS_QUERY,
  GET_DASHBOARD_STATS_QUERY,
  GET_AUDIT_LOGS_QUERY,
} from "./queries";
import {
  LOGIN_MUTATION,
  SIGNUP_MUTATION,
  ACTIVATE_ACCOUNT_MUTATION,
  LOGOUT_MUTATION,
  CREATE_USER_MUTATION,
  UPDATE_USER_MUTATION,
  DELETE_USER_MUTATION,
  RESET_USER_PASSWORD_MUTATION,
  TOGGLE_USER_ROLE_MUTATION,
  UPDATE_PROFILE_MUTATION,
  UPDATE_FULL_PROFILE_MUTATION,
  UPDATE_COLABORADOR_PROFILE_MUTATION,
  UPLOAD_DOCUMENT_MUTATION,
  DELETE_DOCUMENT_MUTATION,
  APPROVE_DOCUMENT_MUTATION,
  REJECT_DOCUMENT_MUTATION,
  CREATE_VACATION_MUTATION,
  UPDATE_VACATION_MUTATION,
  DELETE_VACATION_MUTATION,
  APPROVE_VACATION_MUTATION,
  CANCEL_VACATION_MUTATION,
  CREATE_CALENDAR_EVENT_MUTATION,
  UPDATE_CALENDAR_EVENT_MUTATION,
  DELETE_CALENDAR_EVENT_MUTATION,
  SUBMIT_SURVEY_MUTATION,
} from "./mutations";

// ============== AUTH HOOKS ==============

export const useMe = () => useQuery(ME_QUERY);

export const useValidateCPF = () => useLazyQuery(VALIDATE_CPF_QUERY);

export const useLogin = () => useMutation(LOGIN_MUTATION);

export const useSignup = () => useMutation(SIGNUP_MUTATION);

export const useActivateAccount = () => useMutation(ACTIVATE_ACCOUNT_MUTATION);

export const useLogout = () => useMutation(LOGOUT_MUTATION);

// ============== USER HOOKS ==============

export const useUsers = (variables?: {
  search?: string;
  page?: number;
  perPage?: number;
}) => useQuery(GET_USERS_QUERY, { variables });

export const useUser = (id: string) =>
  useQuery(GET_USER_QUERY, { variables: { id }, skip: !id });

export const useCreateUser = () => useMutation(CREATE_USER_MUTATION);

export const useUpdateUser = () => useMutation(UPDATE_USER_MUTATION);

export const useDeleteUser = () => useMutation(DELETE_USER_MUTATION);

export const useResetUserPassword = () =>
  useMutation(RESET_USER_PASSWORD_MUTATION);

export const useToggleUserRole = () => useMutation(TOGGLE_USER_ROLE_MUTATION);

// ============== COLABORADORES HOOKS ==============

export const useColaboradores = (variables?: {
  filter?: { search?: string; filial?: string };
  page?: number;
  perPage?: number;
}) => useQuery(GET_COLABORADORES_QUERY, { variables });

export const useColaborador = (id: number) =>
  useQuery(GET_COLABORADOR_QUERY, { variables: { id }, skip: !id });

export const useSearchColaboradores = () =>
  useLazyQuery(SEARCH_COLABORADORES_QUERY);

export const useFiliais = () => useQuery(GET_FILIAIS_QUERY);

// ============== PROFILE HOOKS ==============

export const useFullProfile = () => useQuery(GET_FULL_PROFILE_QUERY);

export const useColaboradorProfile = (colaboradorId: number) =>
  useQuery(GET_COLABORADOR_PROFILE_QUERY, {
    variables: { colaboradorId },
    skip: !colaboradorId,
  });

export const useUpdateProfile = () => useMutation(UPDATE_PROFILE_MUTATION);

export const useUpdateFullProfile = () =>
  useMutation(UPDATE_FULL_PROFILE_MUTATION);

export const useUpdateColaboradorProfile = () =>
  useMutation(UPDATE_COLABORADOR_PROFILE_MUTATION);

// ============== DOCUMENT HOOKS ==============

export const useMyDocuments = () => useQuery(GET_MY_DOCUMENTS_QUERY);

export const useDocuments = (variables?: {
  filter?: { userId?: string; status?: string; type?: string };
  page?: number;
  perPage?: number;
}) => useQuery(GET_DOCUMENTS_QUERY, { variables });

export const useDocumentStats = () => useQuery(GET_DOCUMENT_STATS_QUERY);

export const useUploadDocument = () => useMutation(UPLOAD_DOCUMENT_MUTATION);

export const useDeleteDocument = () => useMutation(DELETE_DOCUMENT_MUTATION);

export const useApproveDocument = () => useMutation(APPROVE_DOCUMENT_MUTATION);

export const useRejectDocument = () => useMutation(REJECT_DOCUMENT_MUTATION);

// ============== VACATION HOOKS ==============

export const useMyVacations = () => useQuery(GET_MY_VACATIONS_QUERY);

export const useMyVacationBalance = () =>
  useQuery(GET_MY_VACATION_BALANCE_QUERY);

export const useVacations = (variables?: {
  filter?: {
    userId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  page?: number;
  perPage?: number;
}) => useQuery(GET_VACATIONS_QUERY, { variables });

export const useVacationStats = () => useQuery(GET_VACATION_STATS_QUERY);

export const useTeamVacations = (month?: number, year?: number) =>
  useQuery(GET_TEAM_VACATIONS_QUERY, { variables: { month, year } });

export const useCreateVacation = () => useMutation(CREATE_VACATION_MUTATION);

export const useUpdateVacation = () => useMutation(UPDATE_VACATION_MUTATION);

export const useDeleteVacation = () => useMutation(DELETE_VACATION_MUTATION);

export const useApproveVacation = () => useMutation(APPROVE_VACATION_MUTATION);

export const useCancelVacation = () => useMutation(CANCEL_VACATION_MUTATION);

// ============== CALENDAR HOOKS ==============

export const useCalendarEvents = (startDate?: string, endDate?: string) =>
  useQuery(GET_CALENDAR_EVENTS_QUERY, { variables: { startDate, endDate } });

export const useCreateCalendarEvent = () =>
  useMutation(CREATE_CALENDAR_EVENT_MUTATION);

export const useUpdateCalendarEvent = () =>
  useMutation(UPDATE_CALENDAR_EVENT_MUTATION);

export const useDeleteCalendarEvent = () =>
  useMutation(DELETE_CALENDAR_EVENT_MUTATION);

// ============== SURVEY HOOKS ==============

export const useSurveyQuestions = () => useQuery(GET_SURVEY_QUESTIONS_QUERY);

export const useMySurveyResults = () => useQuery(GET_MY_SURVEY_RESULTS_QUERY);

export const useSubmitSurvey = () => useMutation(SUBMIT_SURVEY_MUTATION);

// ============== ADMIN HOOKS ==============

export const useDashboardStats = () => useQuery(GET_DASHBOARD_STATS_QUERY);

export const useAuditLogs = (variables?: {
  userId?: string;
  page?: number;
  perPage?: number;
}) => useQuery(GET_AUDIT_LOGS_QUERY, { variables });
