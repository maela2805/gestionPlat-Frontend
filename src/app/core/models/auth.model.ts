import { User } from './user.model';

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleName?: string;
}

export interface AuthResponse {
  token: string;
  type?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}
