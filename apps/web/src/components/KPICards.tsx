interface KPICardsProps {
  consensus: number;
  disagreement: number;
  evidenceCoverage: number;
}

function toneColor(value: number, inverse = false) {
  const v = inverse ? 1 - value : value;
  if (v >= 0.7) return { bg: "bg-emerald-50", text: "text-emerald-700", label: "text-emerald-600" };
  if (v >= 0.4) return { bg: "bg-[#FFB005]/8", text: "text-[#9A6B00]", label: "text-[#FFB005]" };
  return { bg: "bg-[#FA3D1D]/8", text: "text-[#D42E11]", label: "text-[#FA3D1D]" };
}

export function KPICards({ consensus, disagreement, evidenceCoverage }: KPICardsProps) {
  const metrics = [
    { label: "Consensus", value: consensus, inverse: false },
    { label: "Disagreement", value: disagreement, inverse: true },
    { label: "Evidence Coverage", value: evidenceCoverage, inverse: false },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((m) => {
        const tone = toneColor(m.value, m.inverse);
        return (
          <div key={m.label} className={`rounded-3xl ${tone.bg} p-6`}>
            <p className={`font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider ${tone.label}`}>{m.label}</p>
            <p className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-light tracking-tight ${tone.text}`}>{Math.round(m.value * 100)}%</p>
          </div>
        );
      })}
    </div>
  );
}
