/** Prefix a site-root path with Vite `base` (e.g. `/av-store/` on GitHub Pages). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const rel = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${rel}`;
}

/** React Router `basename` (no trailing slash). */
export function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL.replace(/\/$/, '');
  return b || undefined;
}
