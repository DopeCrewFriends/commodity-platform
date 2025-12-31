// API URL: Automatically detect Vercel deployment or use environment variable
const getApiBaseUrl = () => {
  // If custom API URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Always use the same origin (works for both dev and production)
  // In development with Vite, this will be http://localhost:3000
  // In production on Vercel, this will be the Vercel domain
  // Vercel serverless functions work on the same domain
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for server-side rendering
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
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
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, options.method || 'GET'); // Debug log
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('API Response:', response.status, response.statusText); // Debug log

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error); // Debug log
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to connect')) {
        const isDev = import.meta.env.DEV;
        const message = isDev 
          ? 'Failed to connect to API. Make sure you are running `vercel dev` (not just `npm run dev`). The API routes only work with Vercel dev server.'
          : 'Failed to connect to API. The API may not be deployed or there is a network issue.';
        throw new Error(message);
      }
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

