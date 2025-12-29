// API URL: Automatically detect Vercel deployment or use environment variable
const getApiBaseUrl = () => {
  // If custom API URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use localhost Flask server
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  
  // In production on Vercel, use the same domain (serverless functions)
  // This automatically works because API routes are on the same domain
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback
  return '';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error: Failed to connect to API');
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    await apiRequest<{ status: string }>('/api/health');
    return true;
  } catch {
    return false;
  }
}

