/**
 * Centralized API client. Every call to the backend goes through here,
 * never through raw fetch() calls scattered across components.
 *
 * Token handling: the access token is stored in memory (a module-level
 * variable). The refresh token is stored in localStorage. This pattern is
 * deliberately chosen:
 *   - Access token in memory: not readable by XSS (unlike localStorage),
 *     lost on page refresh (acceptable — refresh flow handles re-issuing).
 *   - Refresh token in localStorage: survives page refresh, used to silently
 *     re-issue access tokens without making the user log in again.
 * This is a standard SPA auth pattern that balances security and UX.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

let _accessToken: string | null = null;

// ─── Token management ─────────────────────────────────────────────────────────

export function setTokens(accessToken: string, refreshToken: string) {
  _accessToken = accessToken;
  if (typeof window !== 'undefined') {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

export function clearTokens() {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refresh_token');
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
  }
}

async function _parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((e: { msg: string }) => e.msg).join('; ');
    }
    return JSON.stringify(body);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function _refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    _accessToken = data.access_token;
    return data.access_token;
  } catch {
    return null;
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** When true, a FormData body is sent as-is (no JSON.stringify, no Content-Type override) */
  isFormData?: boolean;
  /** When true, the response body is returned as a Blob rather than parsed as JSON */
  expectBlob?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, isFormData, expectBlob, ...rest } = options;

  const buildRequest = (token: string | null): RequestInit => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return {
      ...rest,
      headers,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    };
  };

  let token = _accessToken;
  let response = await fetch(`${API_BASE}${path}`, buildRequest(token));

  // Silently refresh on 401 and retry once.
  if (response.status === 401 && getRefreshToken()) {
    token = await _refreshAccessToken();
    if (token) {
      response = await fetch(`${API_BASE}${path}`, buildRequest(token));
    }
  }

  if (!response.ok) {
    const detail = await _parseError(response);
    throw new ApiError(response.status, detail);
  }

  if (expectBlob) return (await response.blob()) as T;
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ─── Typed endpoint wrappers ──────────────────────────────────────────────────

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface TextPredictionResponse {
  id: string;
  model_variant: string;
  condition: string;
  prediction: string;
  confidence_score: number;
  probabilities: Record<string, number>;
}

export interface ImagePredictionResponse {
  id: string;
  severity: string;
  confidence_score: number;
  probabilities: Record<string, number>;
  model_degraded: boolean;
  warning?: string;
  image_path: string;
}

export interface HistoryItem {
  id: string;
  kind: 'text' | 'image';
  prediction_type: string | null;
  model_variant: string | null;
  severity: string | null;
  prediction_result: string | null;
  confidence_score: number;
  created_at: string;
}

export interface PredictionStats {
  total_predictions: number;
  text_predictions: number;
  image_predictions: number;
  by_condition: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface ModelVariant {
  variant_id: string;
  display_name: string;
  is_default: boolean;
  n_classes: number;
  training_accuracy: number;
  training_auc: number;
  notes: string;
}

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    apiFetch<TokenPair>('/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiFetch<TokenPair>('/login', { method: 'POST', body: data }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, new_password: string) =>
    apiFetch<{ message: string }>('/reset-password', { method: 'POST', body: { token, new_password } }),
};

// User
export const userApi = {
  getProfile: () => apiFetch<UserProfile>('/user/profile'),
  updateProfile: (data: { name?: string; phone?: string }) =>
    apiFetch<UserProfile>('/user/profile', { method: 'PUT', body: data }),
};

// Predictions
export const predictApi = {
  text: (condition: string, inputData: Record<string, unknown>, modelVariant?: string) =>
    apiFetch<TextPredictionResponse>('/predict/text', {
      method: 'POST',
      body: { condition, input_data: inputData, model_variant: modelVariant ?? null },
    }),

  image: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<ImagePredictionResponse>('/predict/image', {
      method: 'POST',
      body: form,
      isFormData: true,
    });
  },

  getVariants: () => apiFetch<Record<string, ModelVariant[]>>('/predict/text/variants'),
  getSchema: (variantId: string) => apiFetch<unknown>(`/predict/text/schema/${variantId}`),
};

// History
export const historyApi = {
  getAll: () => apiFetch<HistoryItem[]>('/history'),
  getStats: () => apiFetch<PredictionStats>('/history/stats'),
  delete: (id: string) => apiFetch<void>(`/history/${id}`, { method: 'DELETE' }),
};

// Reports
export const reportApi = {
  download: async (id: string, filename: string) => {
    const blob = await apiFetch<Blob>(`/report/${id}`, { expectBlob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
