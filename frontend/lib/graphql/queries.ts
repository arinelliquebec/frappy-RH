import { gql } from "@apollo/client/core";

// ============== FRAGMENTS ==============

export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    name
    email
    cpf
    company
    position
    role
    createdAt
    updatedAt
  }
`;

export const COLABORADOR_FRAGMENT = gql`
  fragment ColaboradorFields on Colaborador {
    id
    cpf
    nome
    codinome
    emailEmpresarial
    emailPessoal
    telefone1
    telefone2
    rg
    cnh
    sexo
    estadoCivil
    dataNascimento
    cargo
    filial
    ativo
    hasSystemUser
    systemUserId
  }
`;

export const DOCUMENT_FRAGMENT = gql`
  fragment DocumentFields on Document {
    id
    userId
    name
    originalName
    type
    mimeType
    size
    path
    url
    description
    isPublic
    status
    reviewedBy
    reviewedAt
    rejectReason
    createdAt
    updatedAt
  }
`;

export const VACATION_FRAGMENT = gql`
  fragment VacationFields on Vacation {
    id
    userId
    type
    startDate
    endDate
    totalDays
    reason
    status
    approvedBy
    approvedAt
    rejectReason
    attachment
    notes
    createdAt
    updatedAt
    user {
      id
      name
      email
    }
  }
`;

// ============== AUTH QUERIES ==============

export const ME_QUERY = gql`
  ${USER_FRAGMENT}
  query Me {
    me {
      ...UserFields
    }
  }
`;

export const VALIDATE_CPF_QUERY = gql`
  query ValidateCPF($cpf: String!) {
    validateCPF(cpf: $cpf) {
      valid
      colaboradorId
      nome
      hasSystemUser
      message
    }
  }
`;

// ============== USER QUERIES ==============

export const GET_USERS_QUERY = gql`
  ${USER_FRAGMENT}
  query GetUsers($search: String, $page: Int, $perPage: Int) {
    users(search: $search, page: $page, perPage: $perPage) {
      nodes {
        ...UserFields
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
    }
  }
`;

export const GET_USER_QUERY = gql`
  ${USER_FRAGMENT}
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserFields
      documents {
        id
        name
        type
        status
        createdAt
      }
      vacations {
        id
        type
        status
        startDate
        endDate
      }
    }
  }
`;

// ============== COLABORADORES QUERIES ==============

export const GET_COLABORADORES_QUERY = gql`
  ${COLABORADOR_FRAGMENT}
  query GetColaboradores(
    $filter: ColaboradorFilterInput
    $page: Int
    $perPage: Int
  ) {
    colaboradores(filter: $filter, page: $page, perPage: $perPage) {
      nodes {
        ...ColaboradorFields
      }
      totalCount
    }
  }
`;

export const GET_COLABORADOR_QUERY = gql`
  ${COLABORADOR_FRAGMENT}
  query GetColaborador($id: Int!) {
    colaborador(id: $id) {
      ...ColaboradorFields
    }
  }
`;

export const SEARCH_COLABORADORES_QUERY = gql`
  ${COLABORADOR_FRAGMENT}
  query SearchColaboradores($search: String!) {
    searchColaboradores(search: $search) {
      ...ColaboradorFields
    }
  }
`;

export const GET_FILIAIS_QUERY = gql`
  query GetFiliais {
    filiais {
      nome
    }
  }
`;

// ============== PROFILE QUERIES ==============

export const GET_FULL_PROFILE_QUERY = gql`
  query GetFullProfile {
    fullProfile {
      id
      cpf
      nome
      codinome
      emailEmpresarial
      emailPessoal
      telefone1
      telefone2
      rg
      cnh
      sexo
      estadoCivil
      dataNascimento
      cargo
      filial
    }
  }
`;

export const GET_COLABORADOR_PROFILE_QUERY = gql`
  query GetColaboradorProfile($colaboradorId: Int!) {
    colaboradorProfile(colaboradorId: $colaboradorId) {
      id
      cpf
      nome
      codinome
      emailEmpresarial
      emailPessoal
      telefone1
      telefone2
      rg
      cnh
      sexo
      estadoCivil
      dataNascimento
      cargo
      filial
    }
  }
`;

// ============== DOCUMENT QUERIES ==============

export const GET_MY_DOCUMENTS_QUERY = gql`
  ${DOCUMENT_FRAGMENT}
  query GetMyDocuments {
    myDocuments {
      ...DocumentFields
    }
  }
`;

export const GET_DOCUMENTS_QUERY = gql`
  ${DOCUMENT_FRAGMENT}
  query GetDocuments($filter: DocumentFilterInput, $page: Int, $perPage: Int) {
    documents(filter: $filter, page: $page, perPage: $perPage) {
      nodes {
        ...DocumentFields
        user {
          id
          name
          email
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
    }
  }
`;

export const GET_DOCUMENT_STATS_QUERY = gql`
  query GetDocumentStats {
    documentStats {
      totalDocuments
      pendingDocuments
      approvedDocuments
      rejectedDocuments
    }
  }
`;

// ============== VACATION QUERIES ==============

export const GET_MY_VACATIONS_QUERY = gql`
  ${VACATION_FRAGMENT}
  query GetMyVacations {
    myVacations {
      ...VacationFields
    }
  }
`;

export const GET_MY_VACATION_BALANCE_QUERY = gql`
  query GetMyVacationBalance {
    myVacationBalance {
      id
      userId
      totalDays
      usedDays
      pendingDays
      availableDays
      periodStart
      periodEnd
      abonoDays
      usedAbono
    }
  }
`;

export const GET_VACATIONS_QUERY = gql`
  ${VACATION_FRAGMENT}
  query GetVacations($filter: VacationFilterInput, $page: Int, $perPage: Int) {
    vacations(filter: $filter, page: $page, perPage: $perPage) {
      nodes {
        ...VacationFields
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
    }
  }
`;

export const GET_VACATION_STATS_QUERY = gql`
  query GetVacationStats {
    vacationStats {
      totalRequests
      pendingRequests
      approvedRequests
      rejectedRequests
      pendingFerias
      pendingAusencias
    }
  }
`;

export const GET_TEAM_VACATIONS_QUERY = gql`
  ${VACATION_FRAGMENT}
  query GetTeamVacations($month: Int, $year: Int) {
    teamVacations(month: $month, year: $year) {
      ...VacationFields
    }
  }
`;

// ============== CALENDAR QUERIES ==============

export const GET_CALENDAR_EVENTS_QUERY = gql`
  query GetCalendarEvents($startDate: String, $endDate: String) {
    calendarEvents(startDate: $startDate, endDate: $endDate) {
      id
      title
      description
      type
      startDate
      endDate
      color
      allDay
      createdBy
      createdAt
      creator {
        id
        name
      }
    }
  }
`;

// ============== SURVEY QUERIES ==============

export const GET_SURVEY_QUESTIONS_QUERY = gql`
  query GetSurveyQuestions {
    surveyQuestions {
      id
      text
      scaleType
      scaleDirection
      category
    }
  }
`;

export const GET_MY_SURVEY_RESULTS_QUERY = gql`
  query GetMySurveyResults {
    mySurveyResults {
      userId
      overallScore
      categories {
        demandas
        controle
        apoio
        relacionamentos
        papel
        mudanca
      }
      recommendations
      createdAt
    }
  }
`;

// ============== ADMIN QUERIES ==============

export const GET_DASHBOARD_STATS_QUERY = gql`
  query GetDashboardStats {
    dashboardStats {
      totalUsers
      totalAdmins
      totalDocuments
      pendingDocuments
      totalVacations
      pendingVacations
    }
  }
`;

export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs($userId: String, $page: Int, $perPage: Int) {
    auditLogs(userId: $userId, page: $page, perPage: $perPage) {
      id
      adminId
      adminName
      adminEmail
      action
      entityType
      entityId
      entityName
      description
      ipAddress
      createdAt
    }
  }
`;
