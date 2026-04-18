const PERSONA_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-cyan-100 text-cyan-800",
] as const;

const PERSONA_DOT_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
] as const;

export function getPersonaColor(personaId: string): string {
  const hash = [...personaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PERSONA_COLORS[hash % PERSONA_COLORS.length];
}

export function getPersonaDot(personaId: string): string {
  const hash = [...personaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PERSONA_DOT_COLORS[hash % PERSONA_DOT_COLORS.length];
}

export const sentimentClasses: Record<string, string> = {
  positive: "border-green-200 bg-green-50 text-green-700",
  mixed: "border-amber-200 bg-amber-50 text-amber-700",
  negative: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-gray-200 bg-gray-50 text-gray-600",
};
