const PERSONA_COLORS = [
  "bg-[var(--color-vgreen)]/15 text-[var(--color-vgreen)]",
  "bg-[var(--color-vyellow)]/15 text-[var(--color-vyellow)]",
  "bg-[var(--color-vcyan)]/15 text-[var(--color-vcyan)]",
  "bg-[var(--color-vred)]/15 text-[var(--color-vred)]",
  "bg-[var(--color-vpurple)]/15 text-[var(--color-vpurple)]",
  "bg-emerald-500/15 text-emerald-400",
] as const;

const DOT_COLORS = [
  "bg-[var(--color-vgreen)]",
  "bg-[var(--color-vyellow)]",
  "bg-[var(--color-vcyan)]",
  "bg-[var(--color-vred)]",
  "bg-[var(--color-vpurple)]",
  "bg-emerald-400",
] as const;

export function getPersonaColor(personaId: string): string {
  const hash = [...personaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PERSONA_COLORS[hash % PERSONA_COLORS.length];
}

export function getPersonaDot(personaId: string): string {
  const hash = [...personaId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DOT_COLORS[hash % DOT_COLORS.length];
}

export const sentimentClasses: Record<string, string> = {
  positive: "border-[var(--color-vgreen)]/30 bg-[var(--color-vgreen)]/10 text-[var(--color-vgreen)]",
  mixed: "border-[var(--color-vyellow)]/30 bg-[var(--color-vyellow)]/10 text-[var(--color-vyellow)]",
  negative: "border-[var(--color-vred)]/30 bg-[var(--color-vred)]/10 text-[var(--color-vred)]",
  neutral: "border-[var(--color-surface-border)] bg-[var(--color-surface)]/50 text-[var(--color-text-dim)]",
};
