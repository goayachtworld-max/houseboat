/**
 * api-config.ts
 *
 * Single source of truth for the backend API URL.
 *
 * In development (Replit / local):  leave VITE_API_URL unset — falls back to
 * the same origin so the Vite dev proxy keeps working as before.
 *
 * In production:
 *   - Frontend is on cPanel  (e.g. https://yourdomain.com)
 *   - Backend  is on VPS     (e.g. https://api.yourdomain.com)
 *
 * Set VITE_API_URL=https://api.yourdomain.com in your frontend .env.production
 * file (no trailing slash).  The build will bake this value in at compile time.
 */

const raw = import.meta.env.VITE_API_URL as string | undefined;

/**
 * Base URL for all API calls.
 * - When VITE_API_URL is set  → "https://api.yourdomain.com"
 * - When unset (dev / legacy) → "" (same-origin, keeps Vite proxy working)
 */
export const API_ORIGIN: string = raw ? raw.replace(/\/+$/, "") : "";

/**
 * Full /api prefix ready to use in fetch() calls.
 * Usage:  fetch(`${API_BASE}/packages`, { credentials: "include" })
 */
export const API_BASE: string = `${API_ORIGIN}/api`;
