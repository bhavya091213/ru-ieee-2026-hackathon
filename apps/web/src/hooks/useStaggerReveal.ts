import { useEffect, useRef } from "react";
import gsap from "gsap";

export function useStaggerReveal(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const children = el.querySelectorAll("[data-reveal]");
    if (children.length === 0) return;

    gsap.set(children, { opacity: 0, y: 20 });
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power2.out",
      delay: 0.1,
    });
  }, deps);

  return containerRef;
}

export function useCountUp(
  targetRef: React.RefObject<HTMLElement | null>,
  endValue: number,
  duration = 1.2,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: endValue,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = `${Math.round(obj.val)}%`;
      },
    });
  }, [endValue, duration, ...deps]);
}
