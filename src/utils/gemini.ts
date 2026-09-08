const GEMINI_KEY_LS = 'organizador.geminiKey';

export function getGeminiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  if (envKey) return envKey;
  try { return localStorage.getItem(GEMINI_KEY_LS) ?? ''; } catch { return ''; }
}
