const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '';
const API_TIMEOUT_MS = 15000;

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const apiRequest = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      signal: controller.signal,
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        body.message || `Request failed (${response.status}).`,
        response.status,
        body,
      );
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 0, {});
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error.message || 'Network error. Check your connection.', 0, {});
  } finally {
    clearTimeout(timeout);
  }
};

export default apiRequest;
export { ApiError };
