/**
 * Runtime validation utilities
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  // Vietnamese phone number pattern
  const phoneRegex = /^(\+84|84|0)(\d{9,10})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateRequired<T>(value: T, fieldName: string): T {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}