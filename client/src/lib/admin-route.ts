const env = import.meta.env as unknown as Record<string, string | undefined>;

export const ADMIN_PANEL_PATH = env.VITE_ADMIN_PANEL_PATH || '/admin';
