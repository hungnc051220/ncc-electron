/**
 * Environment variables validation and configuration
 */

interface EnvConfig {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_SOCKET_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

function validateEnv(): EnvConfig {
  const requiredEnvVars = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  const missingVars: string[] = [];
  
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      missingVars.push(key);
    }
  });

  // if (missingVars.length > 0) {
  //   throw new Error(
  //     `Missing required environment variables: ${missingVars.join(', ')}\n` +
  //     'Please check your .env.local file or deployment configuration.'
  //   );
  // }

  // Validate URL formats
  try {
    new URL(requiredEnvVars.NEXT_PUBLIC_API_URL!);
    new URL(requiredEnvVars.NEXT_PUBLIC_SOCKET_URL!);
  } catch {
    throw new Error('Invalid URL format in environment variables');
  }

  return requiredEnvVars as EnvConfig;
}

// Export validated environment variables
export const env = validateEnv();

// Helper function to get API base URL
export const getApiBaseUrl = (): string => env.NEXT_PUBLIC_API_URL;

// Helper function to get Socket URL
export const getSocketUrl = (): string => env.NEXT_PUBLIC_SOCKET_URL;

// Helper function to check if in production
export const isProduction = (): boolean => env.NODE_ENV === 'production';