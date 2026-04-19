const PERSONA_COLORS = [
  "bg-[#0358F7]/10 text-[#0358F7]",
  "bg-[#FFB005]/10 text-[#B87A00]",
  "bg-[#C679C4]/15 text-[#9B4E99]",
  "bg-[#FA3D1D]/10 text-[#D42E11]",
  "bg-[#5092C7]/15 text-[#3A6F9A]",
  "bg-[#FD02F5]/10 text-[#C502C0]",
] as const;

const PERSONA_DOT_COLORS = [
  "bg-[#0358F7]",
  "bg-[#FFB005]",
  "bg-[#C679C4]",
  "bg-[#FA3D1D]",
  "bg-[#5092C7]",
  "bg-[#FD02F5]",
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
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  mixed: "border-[#FFB005]/20 bg-[#FFB005]/8 text-[#9A6B00]",
  negative: "border-[#FA3D1D]/20 bg-[#FA3D1D]/8 text-[#D42E11]",
  neutral: "border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.45)]",
};
