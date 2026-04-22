"use client";

import { useEffect, useRef, useState } from "react";

type LogoItem = {
  id: string;
  label: string;
  url: string;
  alt: string;
};

export function LogoMarquee({ logos }: { logos: LogoItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemSetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [repeat, setRepeat] = useState(2);
  const [setWidth, setSetWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    function updateRepeat() {
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      const measuredSetWidth = itemSetRef.current?.scrollWidth ?? 0;

      if (!containerWidth || !measuredSetWidth) return;

      const neededSets = Math.ceil((containerWidth * 3) / measuredSetWidth) + 2;
      setRepeat(Math.max(2, neededSets));
      setSetWidth(measuredSetWidth);
    }

    updateRepeat();
    const resizeObserver = new ResizeObserver(updateRepeat);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (itemSetRef.current) resizeObserver.observe(itemSetRef.current);

    return () => resizeObserver.disconnect();
  }, [logos.length]);

  useEffect(() => {
    if (!setWidth) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    let position = 0;
    const pixelsPerSecond = 42;

    function animate(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      if (!isPaused) {
        position += (pixelsPerSecond * delta) / 1000;
        if (position >= setWidth) {
          position -= setWidth;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${-position}px, 0, 0)`;
        }
      }

      animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPaused, setWidth]);

  if (logos.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={trackRef} className="flex w-max items-center will-change-transform">
        <div ref={itemSetRef} className="flex shrink-0 items-center gap-5 pr-5">
          {logos.map((logo, logoIndex) => (
            <LogoCard key={`measure-${logo.id}-${logoIndex}`} logo={logo} />
          ))}
        </div>
        {Array.from({ length: repeat }).map((_, setIndex) => (
          <div key={`set-${setIndex}`} className="flex shrink-0 items-center gap-5 pr-5">
            {logos.map((logo, logoIndex) => (
              <LogoCard key={`${setIndex}-${logo.id}-${logoIndex}`} logo={logo} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogoCard({ logo }: { logo: LogoItem }) {
  return (
    <div
      className="flex h-20 w-40 shrink-0 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 px-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]"
      title={logo.label}
    >
      <img
        src={logo.url}
        alt={logo.alt}
        className="max-h-12 max-w-full object-contain grayscale transition duration-300 hover:grayscale-0"
        loading="lazy"
      />
    </div>
  );
}
