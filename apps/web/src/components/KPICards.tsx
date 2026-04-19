import { useEffect, useRef } from "react";
import gsap from "gsap";

interface KPICardsProps {
  consensus: number;
  disagreement: number;
  evidenceCoverage: number;
}

function tone(value: number, inverse = false) {
  const v = inverse ? 1 - value : value;
  if (v >= 0.7) return { border: "border-[var(--color-vgreen)]/30", glow: "var(--color-vgreen)", text: "text-[var(--color-vgreen)]" };
  if (v >= 0.4) return { border: "border-[var(--color-vyellow)]/30", glow: "var(--color-vyellow)", text: "text-[var(--color-vyellow)]" };
  return { border: "border-[var(--color-vred)]/30", glow: "var(--color-vred)", text: "text-[var(--color-vred)]" };
}

function KPINumber({ value, color }: { value: number; color: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: Math.round(value * 100),
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => { el.textContent = `${Math.round(obj.val)}%`; },
    });
  }, [value]);

  return <p ref={ref} className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-bold ${color}`}>0%</p>;
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
        const t = tone(m.value, m.inverse);
        return (
          <div key={m.label} className={`card p-5 border ${t.border}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">{m.label}</p>
            <KPINumber value={m.value} color={t.text} />
          </div>
        );
      })}
    </div>
  );
}
