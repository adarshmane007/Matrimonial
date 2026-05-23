const raw = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_BASE = `${raw.replace(/\/$/, '')}/api`;

if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && /localhost|127\.0\.0\.1/.test(raw)) {
    console.warn(
      '[Sakal Maratha] API URL points to localhost. Set VITE_API_URL before building for production.'
    );
  }
}
