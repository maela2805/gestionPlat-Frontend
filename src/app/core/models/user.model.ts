export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  active: boolean;
  role?: Role;
  createdAt?: string;
  updatedAt?: string;
}
