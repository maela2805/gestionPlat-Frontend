export interface UserSystem {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  active: boolean;
  roleName: string;
  roleDescription?: string;
  createdAt?: string;
  role?: any;
}

export type User = UserSystem;

export interface SystemRole {
  id: number;
  name: string;
  description?: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleName: string;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  roleName?: string;
  active?: boolean;
  password?: string;
}
