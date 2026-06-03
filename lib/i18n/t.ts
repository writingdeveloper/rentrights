export function translate(
  messages: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
  fallback?: Record<string, string>,
): string {
  const template = messages[key] ?? fallback?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
