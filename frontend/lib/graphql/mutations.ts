import { gql } from "@apollo/client/core";
import { USER_FRAGMENT, DOCUMENT_FRAGMENT, VACATION_FRAGMENT } from "./queries";

// ============== AUTH MUTATIONS ==============

export const LOGIN_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      token
      user {
        ...UserFields
      }
      error
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      success
      token
      user {
        ...UserFields
      }
      error
    }
  }
`;

export const ACTIVATE_ACCOUNT_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation ActivateAccount($cpf: String!, $password: String!) {
    activateAccount(cpf: $cpf, password: $password) {
      success
      token
      user {
        ...UserFields
      }
      error
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

// ============== USER MUTATIONS ==============

export const CREATE_USER_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
`;

export const UPDATE_USER_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserFields
    }
  }
`;

export const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export const RESET_USER_PASSWORD_MUTATION = gql`
  mutation ResetUserPassword($id: ID!, $newPassword: String!) {
    resetUserPassword(id: $id, newPassword: $newPassword)
  }
`;

export const TOGGLE_USER_ROLE_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation ToggleUserRole($id: ID!) {
    toggleUserRole(id: $id) {
      ...UserFields
    }
  }
`;

// ============== PROFILE MUTATIONS ==============

export const UPDATE_PROFILE_MUTATION = gql`
  ${USER_FRAGMENT}
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      ...UserFields
    }
  }
`;

export const UPDATE_FULL_PROFILE_MUTATION = gql`
  mutation UpdateFullProfile($input: UpdateProfileInput!) {
    updateFullProfile(input: $input) {
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

export const UPDATE_COLABORADOR_PROFILE_MUTATION = gql`
  mutation UpdateColaboradorProfile(
    $colaboradorId: Int!
    $input: UpdateProfileInput!
  ) {
    updateColaboradorProfile(colaboradorId: $colaboradorId, input: $input)
  }
`;

// ============== DOCUMENT MUTATIONS ==============

export const UPLOAD_DOCUMENT_MUTATION = gql`
  ${DOCUMENT_FRAGMENT}
  mutation UploadDocument(
    $file: Upload!
    $type: String!
    $description: String
  ) {
    uploadDocument(file: $file, type: $type, description: $description) {
      ...DocumentFields
    }
  }
`;

export const DELETE_DOCUMENT_MUTATION = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`;

export const APPROVE_DOCUMENT_MUTATION = gql`
  ${DOCUMENT_FRAGMENT}
  mutation ApproveDocument($id: ID!) {
    approveDocument(id: $id) {
      ...DocumentFields
    }
  }
`;

export const REJECT_DOCUMENT_MUTATION = gql`
  ${DOCUMENT_FRAGMENT}
  mutation RejectDocument($id: ID!, $reason: String!) {
    rejectDocument(id: $id, reason: $reason) {
      ...DocumentFields
    }
  }
`;

// ============== VACATION MUTATIONS ==============

export const CREATE_VACATION_MUTATION = gql`
  ${VACATION_FRAGMENT}
  mutation CreateVacation($input: CreateVacationInput!) {
    createVacation(input: $input) {
      ...VacationFields
    }
  }
`;

export const UPDATE_VACATION_MUTATION = gql`
  ${VACATION_FRAGMENT}
  mutation UpdateVacation($id: ID!, $input: UpdateVacationInput!) {
    updateVacation(id: $id, input: $input) {
      ...VacationFields
    }
  }
`;

export const DELETE_VACATION_MUTATION = gql`
  mutation DeleteVacation($id: ID!) {
    deleteVacation(id: $id)
  }
`;

export const APPROVE_VACATION_MUTATION = gql`
  ${VACATION_FRAGMENT}
  mutation ApproveVacation($id: ID!, $input: VacationApprovalInput!) {
    approveVacation(id: $id, input: $input) {
      ...VacationFields
    }
  }
`;

export const CANCEL_VACATION_MUTATION = gql`
  ${VACATION_FRAGMENT}
  mutation CancelVacation($id: ID!) {
    cancelVacation(id: $id) {
      ...VacationFields
    }
  }
`;

// ============== CALENDAR MUTATIONS ==============

export const CREATE_CALENDAR_EVENT_MUTATION = gql`
  mutation CreateCalendarEvent($input: CreateCalendarEventInput!) {
    createCalendarEvent(input: $input) {
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
    }
  }
`;

export const UPDATE_CALENDAR_EVENT_MUTATION = gql`
  mutation UpdateCalendarEvent($id: ID!, $input: UpdateCalendarEventInput!) {
    updateCalendarEvent(id: $id, input: $input) {
      id
      title
      description
      type
      startDate
      endDate
      color
      allDay
    }
  }
`;

export const DELETE_CALENDAR_EVENT_MUTATION = gql`
  mutation DeleteCalendarEvent($id: ID!) {
    deleteCalendarEvent(id: $id)
  }
`;

// ============== SURVEY MUTATIONS ==============

export const SUBMIT_SURVEY_MUTATION = gql`
  mutation SubmitSurvey($answers: String!) {
    submitSurvey(answers: $answers) {
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
