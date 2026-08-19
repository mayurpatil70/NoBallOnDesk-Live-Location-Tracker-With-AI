const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ success: boolean; token: string; user: { username: string; role: string } }>(
      '/api/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),

  me: (token: string) =>
    request<{ success: boolean; user: { username: string; role: string } }>(
      '/api/me',
      {},
      token
    ),

  getHistory: (token: string) =>
    request<{ success: boolean; history: LocationEntry[] }>(
      '/api/history',
      {},
      token
    ),

  getLocations: (token: string) =>
    request<{ success: boolean; users: ConnectedUser[] }>(
      '/api/locations',
      {},
      token
    ),

  createTraceLink: (token: string) =>
    request<{ success: boolean; token: string; url: string }>(
      '/api/trace/create',
      { method: 'POST' },
      token
    ),

  getTraceResults: (traceToken: string, authToken: string) =>
    request<{ success: boolean; locations: TraceEntry[]; createdAt: string }>(
      `/api/trace/${traceToken}/results`,
      {},
      authToken
    ),

  deleteTrace: (traceToken: string, authToken: string) =>
    request<{ success: boolean }>(
      `/api/trace/${traceToken}`,
      { method: 'DELETE' },
      authToken
    ),
};

export interface LocationEntry {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface ConnectedUser {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  username: string;
  timestamp: string;
}

export interface TraceEntry {
  lat: number;
  lng: number;
  accuracy: number;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export const BACKEND_BASE = BACKEND_URL;
