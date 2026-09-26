/**
 * Centralized API client for GeoMesh
 * Connects to FastAPI backend at /api (proxied to localhost:8000)
 * Automatically attaches JWT Bearer token
 * Sanitizes errors and converts backend details into clean user-friendly messages
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('GEOMESH_access_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('GEOMESH_access_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('GEOMESH_access_token');
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, message: string, detail: string = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function sanitizeErrorMessage(errorData: any, defaultMsg: string): string {
  if (!errorData) return defaultMsg;
  if (typeof errorData === 'string') return errorData;
  if (errorData.detail) {
    if (typeof errorData.detail === 'string') {
      // Map known backend error details to clean GIS messages
      if (errorData.detail.toLowerCase().includes('not found')) {
        return 'The requested property record or parcel was not found.';
      }
      if (errorData.detail.toLowerCase().includes('invalid ulpin')) {
        return 'Invalid ULPIN format. Must comply with 3D cadastral specifications.';
      }
      return errorData.detail;
    }
    if (Array.isArray(errorData.detail)) {
      return errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
  }
  return defaultMsg;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }
      const readable = response.status === 401
        ? 'Your session has expired. Please log in again.'
        : response.status === 403
        ? 'Your account does not have surveyor access.'
        : response.status === 404
        ? `The requested backend endpoint or record was not found (404): ${endpoint}`
        : sanitizeErrorMessage(errorData, `Request failed with status ${response.status}`);
      throw new ApiError(response.status, readable, JSON.stringify(errorData));
    }

    // Return JSON
    return (await response.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network failure, backend offline, or CORS error
    throw new ApiError(0, 'Unable to connect to Cadastral backend service.', err?.message || 'Network error');
  }
}
