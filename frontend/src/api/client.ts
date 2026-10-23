import type { ApiResponse, ApiErrorResponse } from './types';

// Read API Base URL from Vite environment variable (defaults to /api/v1 for Vite dev proxy)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;
  requestId?: string;

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: Record<string, any>, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Centralized HTTP request utility with response envelope unwrapping
 * and robust error classification.
 */
export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, body, ...restOptions } = options;

  // Build clean URL with query parameters
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `${API_BASE_URL}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // If body is present and not FormData, default to application/json
  if (body !== undefined && !(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      body: body instanceof FormData ? body : typeof body === 'object' ? JSON.stringify(body) : body,
      headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    let parsedJson: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        parsedJson = await response.json();
      } catch {
        parsedJson = null;
      }
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorCode = 'HTTP_ERROR';
      let errorDetails: Record<string, any> | undefined;
      const requestId = parsedJson?.meta?.request_id || response.headers.get('X-Request-ID') || undefined;

      if (parsedJson) {
        // FastAPI standard error envelope: { error: { code, message, details }, meta: { request_id } }
        if (parsedJson.error) {
          errorCode = parsedJson.error.code || errorCode;
          errorMessage = parsedJson.error.message || errorMessage;
          errorDetails = parsedJson.error.details;
        } else if (parsedJson.detail) {
          // Standard FastAPI HTTPException or validation error
          if (typeof parsedJson.detail === 'string') {
            errorMessage = parsedJson.detail;
          } else if (Array.isArray(parsedJson.detail)) {
            errorMessage = parsedJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
            errorDetails = { errors: parsedJson.detail };
          }
        }
      }

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails, requestId);
    }

    // Unwrap standard FastAPI success envelope: { data: T, meta: { ... } }
    if (parsedJson && typeof parsedJson === 'object' && 'data' in parsedJson) {
      return (parsedJson as ApiResponse<T>).data;
    }

    return parsedJson as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network disconnection or CORS failure
    const isNetworkError = error.name === 'TypeError' || error.message?.includes('fetch');
    const message = isNetworkError
      ? 'Cannot connect to LearnMate backend at ' + API_BASE_URL + '. Is the server running?'
      : error.message || 'An unexpected client error occurred.';

    throw new ApiError(message, 0, 'NETWORK_ERROR', { originalError: error.message });
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    request<T>(endpoint, { method: 'GET', params }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
