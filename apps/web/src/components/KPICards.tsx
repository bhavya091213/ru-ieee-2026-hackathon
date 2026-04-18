interface KPICardsProps {
  consensus: number;
  disagreement: number;
  evidenceCoverage: number;
}

function tone(value: number, inverse = false) {
  const v = inverse ? 1 - value : value;
  if (v >= 0.7) return "border-green-200 bg-green-50 text-green-700";
  if (v >= 0.4) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function labelColor(value: number, inverse = false) {
  const v = inverse ? 1 - value : value;
  if (v >= 0.7) return "text-green-600";
  if (v >= 0.4) return "text-amber-600";
  return "text-red-600";
}

export function KPICards({ consensus, disagreement, evidenceCoverage }: KPICardsProps) {
  const metrics = [
    { label: "Consensus", value: consensus, inverse: false },
    { label: "Disagreement", value: disagreement, inverse: true },
    { label: "Evidence Coverage", value: evidenceCoverage, inverse: false },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className={`rounded-xl border p-5 ${tone(m.value, m.inverse)}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${labelColor(m.value, m.inverse)}`}>{m.label}</p>
          <p className="mt-2 text-3xl font-bold">{Math.round(m.value * 100)}%</p>
        </div>
      ))}
    </div>
  );
}
