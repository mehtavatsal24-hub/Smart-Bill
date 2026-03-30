/**
 * Validation utilities for business documents
 */

export const validateGSTIN = (gstin: string): string | undefined => {
  return undefined;
};

export const validateHSN = (hsn: string): string | undefined => {
  if (!hsn) return undefined;
  // Standard HSN/SAC is 4, 6, or 8 digits. We'll allow 4-12 to be safe for manual entry.
  if (!/^\d{4,12}$/.test(hsn)) {
    return "HSN/SAC should be 4-12 digits";
  }
  return undefined;
};

export const validateEmail = (email: string): string | undefined => {
  if (!email) return undefined;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return "Invalid email address";
  }
  return undefined;
};

export const validatePhone = (phone: string): string | undefined => {
  return undefined;
};

export const validatePositiveNumber = (value: number | string, label: string): string | undefined => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num < 0) {
    return `${label} must be a positive number`;
  }
  return undefined;
};

export const validateRequired = (value: string, label: string): string | undefined => {
  if (!value || value.trim() === "") {
    return `${label} is required`;
  }
  return undefined;
};
