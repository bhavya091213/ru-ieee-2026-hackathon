const PERSONA_COLORS = [
  "bg-cyan-400 text-cyan-950",
  "bg-amber-300 text-amber-950",
  "bg-emerald-300 text-emerald-950",
  "bg-rose-300 text-rose-950",
  "bg-violet-300 text-violet-950",
] as const;

export function getPersonaColor(personaId: string): string {
  const hash = [...personaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PERSONA_COLORS[hash % PERSONA_COLORS.length];
}

export const sentimentClasses: Record<string, string> = {
  positive: "border-emerald-400/60 bg-emerald-500/10 text-emerald-200",
  neutral: "border-slate-500/60 bg-slate-500/10 text-slate-200",
  negative: "border-rose-400/60 bg-rose-500/10 text-rose-200",
};
