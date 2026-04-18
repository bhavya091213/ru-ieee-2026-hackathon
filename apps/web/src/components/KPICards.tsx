interface KPICardsProps {
  consensus: number;
  disagreement: number;
  evidenceCoverage: number;
}

function toneForMetric(value: number, inverse = false) {
  const score = inverse ? 1 - value : value;
  if (score >= 0.7) {
    return "from-emerald-400/20 to-emerald-500/5 text-emerald-100 ring-emerald-400/20";
  }
  if (score >= 0.4) {
    return "from-amber-300/20 to-amber-500/5 text-amber-100 ring-amber-300/20";
  }
  return "from-rose-300/20 to-rose-500/5 text-rose-100 ring-rose-300/20";
}

export function KPICards({
  consensus,
  disagreement,
  evidenceCoverage,
}: KPICardsProps) {
  const metrics = [
    { label: "Consensus", value: consensus, inverse: false },
    { label: "Disagreement", value: disagreement, inverse: true },
    { label: "Evidence coverage", value: evidenceCoverage, inverse: false },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`animate-fade-in rounded-[1.5rem] border border-white/8 bg-gradient-to-br p-6 shadow-lg transition-shadow hover:shadow-xl ${toneForMetric(
            metric.value,
            metric.inverse,
          )}`}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            {metric.label}
          </p>
          <p className="mt-4 font-display text-4xl font-semibold">
            {Math.round(metric.value * 100)}%
          </p>
        </article>
      ))}
    </div>
  );
}
