import { AppRole } from './index';

export type AuthFormData = {
  email: string;
  password: string;
};

export type RegisterFormData = AuthFormData & {
  name: string;
  phone: string;
  confirmPassword: string;
  role: AppRole;
};

export type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  phone?: string;
};

export type PasswordStrength = {
  label: string;
  color: string;
  progress: number;
};