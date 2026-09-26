import { request, setAuthToken, clearAuthToken, getAuthToken } from './api';
import { User, AuthResponse, Role } from '../types';

/**
 * Map backend's UserResponse shape → frontend's User shape.
 * Backend returns: { id: number, name: string, email: string, role: string, created_at: string }
 * Frontend expects: { id: string, username: string, email: string, fullName: string, role: Role, designation?: string }
 */
function mapBackendUser(backendUser: any): User {
  const roleLower = (backendUser.role || '').toLowerCase();
  let frontendRole: Role = 'Citizen';
  if (roleLower === 'admin') frontendRole = 'Admin';
  else if (roleLower === 'surveyor') frontendRole = 'Surveyor';

  const designation =
    frontendRole === 'Admin'
      ? 'National Geospatial Infrastructure Commissioner'
      : frontendRole === 'Surveyor'
      ? 'Directorate of Land Records & Cadastral Mapping'
      : 'Property Owner / Citizen';

  return {
    id: String(backendUser.id ?? backendUser.sub ?? Date.now()),
    username: (backendUser.email || '').split('@')[0],
    email: backendUser.email || '',
    fullName: backendUser.name || backendUser.fullName || backendUser.email || 'User',
    role: frontendRole,
    designation: backendUser.designation || designation,
  };
}

/**
 * Map backend's TokenResponse → frontend's AuthResponse.
 * Backend returns: { access_token, token_type, user: UserResponse }
 */
function mapBackendAuthResponse(resp: any): AuthResponse {
  return {
    access_token: resp.access_token,
    token_type: resp.token_type || 'Bearer',
    user: mapBackendUser(resp.user || {}),
  };
}

export const authService = {
  async login(email: string, password?: string, preferredRole: Role = 'Surveyor'): Promise<AuthResponse> {
    const rawResp = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const mapped = mapBackendAuthResponse(rawResp);
    if (!mapped.access_token) throw new Error('The backend did not return an access token.');
    setAuthToken(mapped.access_token);
    localStorage.setItem('GEOMESH_user', JSON.stringify(mapped.user));
    return mapped;
  },

  async signup(data: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    username: string;
  }): Promise<AuthResponse> {
    const rawResp = await request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: data.fullName || data.username, email: data.email, password: data.password }),
    });
    const mapped = mapBackendAuthResponse(rawResp);
    setAuthToken(mapped.access_token);
    localStorage.setItem('GEOMESH_user', JSON.stringify(mapped.user));
    return mapped;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const rawUser = await request<any>('/auth/me');
      const mapped = mapBackendUser(rawUser);
      localStorage.setItem('GEOMESH_user', JSON.stringify(mapped));
      return mapped;
    } catch {
      clearAuthToken();
      localStorage.removeItem('GEOMESH_user');
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken();
      localStorage.removeItem('GEOMESH_user');
    }
  },
};
