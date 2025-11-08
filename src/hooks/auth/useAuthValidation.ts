import { useState, useCallback } from 'react';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateConfirmPassword,
  getPasswordStrength,
} from '@/utils/validation/auth';
import { ValidationErrors } from '@/types/auth.types';

export const useAuthValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const clearError = useCallback((field: keyof ValidationErrors) => {
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validateLoginForm = useCallback((email: string, password: string): boolean => {
    const newErrors: ValidationErrors = {};

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const validateRegisterForm = useCallback((
    name: string,
    phone: string,
    email: string,
    password: string,
    confirmPassword: string
  ): boolean => {
    const newErrors: ValidationErrors = {};

    const nameError = validateName(name);
    if (nameError) newErrors.name = nameError;

    const phoneError = validatePhone(phone);
    if (phoneError) newErrors.phone = phoneError;

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    const confirmError = validateConfirmPassword(password, confirmPassword);
    if (confirmError) newErrors.confirmPassword = confirmError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return {
    errors,
    clearError,
    clearAllErrors,
    validateLoginForm,
    validateRegisterForm,
    getPasswordStrength,
  };
};