/** Normalize API / HTTP errors into user-friendly copy. */
export function formatAppError(error: unknown, fallback: string): string {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  const err = error as {
    status?: number;
    message?: string;
    error?: unknown;
  };

  const body = err.error;

  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (body && typeof body === 'object') {
    const payload = body as Record<string, unknown>;

    if (typeof payload['detail'] === 'string' && payload['detail'].trim()) {
      return payload['detail'].trim();
    }

    if (typeof payload['message'] === 'string' && payload['message'].trim()) {
      return payload['message'].trim();
    }

    if (typeof payload['title'] === 'string' && payload['title'].trim()) {
      return payload['title'].trim();
    }

    const errors = payload['errors'];
    if (Array.isArray(errors)) {
      const messages = errors
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean);
      if (messages.length) return messages.join(' ');
    }

    if (errors && typeof errors === 'object') {
      const messages = Object.values(errors as Record<string, unknown>)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
  }

  if (err.status === 0) {
    return 'Unable to reach the server. Check your internet connection and try again.';
  }

  if (err.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (err.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (err.status === 404) {
    return 'The requested information could not be found.';
  }

  if (err.status && err.status >= 500) {
    return 'A server error occurred. Please try again in a moment.';
  }

  if (err.message && !err.message.startsWith('Http failure')) {
    return err.message;
  }

  return fallback;
}
